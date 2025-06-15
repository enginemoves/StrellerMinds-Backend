import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import * as QRCode from 'qrcode';
import * as Handlebars from 'handlebars';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class CertificateService {
  private readonly logger = new Logger(CertificateService.name);
  private browser: puppeteer.Browser;

  constructor(
    @InjectRepository(Certificate)
    private certificateRepository: Repository<Certificate>,
    @InjectRepository(CertificateTemplate)
    private templateRepository: Repository<CertificateTemplate>,
  ) {
    this.initializeBrowser();
  }

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  private async initializeBrowser() {
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      this.logger.log('Puppeteer browser initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize browser:', error);
    }
  }

  async generateCertificate(createCertificateDto: CreateCertificateDto, baseUrl: string): Promise<Certificate> {
    try {
      this.logger.log(`Generating certificate for user: ${createCertificateDto.userId}`);

      // Check if certificate already exists
      const existingCertificate = await this.certificateRepository.findOne({
        where: {
          userId: createCertificateDto.userId,
          courseId: createCertificateDto.courseId,
          isRevoked: false,
        },
      });

      if (existingCertificate) {
        throw new BadRequestException('Certificate already exists for this user and course');
      }

      // Generate certificate number
      const certificateNumber = await this.generateCertificateNumber();

      // Get template
      const template = await this.getTemplate(createCertificateDto.templateId);

      // Create verification URL and QR code
      const verificationUrl = `${baseUrl}/certificates/verify/${certificateNumber}`;
      const qrCodeData = await this.generateQRCode(verificationUrl);

      // Create certificate record
      const certificate = this.certificateRepository.create({
        userId: createCertificateDto.userId,
        courseId: createCertificateDto.courseId,
        certificateNumber,
        recipientName: createCertificateDto.recipientName,
        courseName: createCertificateDto.courseName,
        completionDate: new Date(createCertificateDto.completionDate),
        issueDate: new Date(),
        verificationUrl,
        qrCodeData,
        templateId: template.id,
        brandConfig: createCertificateDto.brandConfig || {},
      });

      const savedCertificate = await this.certificateRepository.save(certificate);

      // Generate PDF
      const pdfPath = await this.generatePDF(savedCertificate, template);
      savedCertificate.pdfPath = pdfPath;

      await this.certificateRepository.save(savedCertificate);

      this.logger.log(`Certificate generated successfully: ${certificateNumber}`);
      return savedCertificate;
    } catch (error) {
      this.logger.error('Error generating certificate:', error);
      throw error;
    }
  }

  async verifyCertificate(certificateNumber: string): Promise<any> {
    const certificate = await this.certificateRepository.findOne({
      where: { certificateNumber, isRevoked: false },
    });

    if (!certificate) {
      throw new NotFoundException('Certificate not found or has been revoked');
    }

    return {
      valid: true,
      certificateNumber: certificate.certificateNumber,
      recipientName: certificate.recipientName,
      courseName: certificate.courseName,
      completionDate: certificate.completionDate,
      issueDate: certificate.issueDate,
      verificationUrl: certificate.verificationUrl,
    };
  }

  async revokeCertificate(certificateId: string, reason: string): Promise<void> {
    const certificate = await this.certificateRepository.findOne({
      where: { id: certificateId },
    });

    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }

    certificate.isRevoked = true;
    certificate.revokedAt = new Date();
    certificate.revokedReason = reason;

    await this.certificateRepository.save(certificate);
    this.logger.log(`Certificate revoked: ${certificate.certificateNumber}`);
  }

  async getCertificatesByUser(userId: string): Promise<Certificate[]> {
    return this.certificateRepository.find({
      where: { userId, isRevoked: false },
      order: { createdAt: 'DESC' },
    });
  }

  async downloadCertificate(certificateId: string): Promise<string> {
    const certificate = await this.certificateRepository.findOne({
      where: { id: certificateId, isRevoked: false },
    });

    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }

    if (!certificate.pdfPath) {
      throw new BadRequestException('Certificate PDF not available');
    }

    return certificate.pdfPath;
  }

  private async generateCertificateNumber(): Promise<string> {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `CERT-${timestamp}-${random}`;
  }

  private async getTemplate(templateId?: string): Promise<CertificateTemplate> {
    if (templateId) {
      const template = await this.templateRepository.findOne({
        where: { id: templateId, isActive: true },
      });
      if (template) return template;
    }

    // Get default template
    const defaultTemplate = await this.templateRepository.findOne({
      where: { isDefault: true, isActive: true },
    });

    if (!defaultTemplate) {
      // Create default template if none exists
      return this.createDefaultTemplate();
    }

    return defaultTemplate;
  }

  private async createDefaultTemplate(): Promise<CertificateTemplate> {
    const defaultTemplate = this.templateRepository.create({
      name: 'Default Certificate Template',
      description: 'Standard certificate template',
      htmlTemplate: this.getDefaultHtmlTemplate(),
      cssStyles: this.getDefaultCssStyles(),
      isDefault: true,
      isActive: true,
      createdBy: 'system',
    });

    return this.templateRepository.save(defaultTemplate);
  }

  private async generateQRCode(data: string): Promise<string> {
    try {
      return await QRCode.toDataURL(data, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        width: 200,
      });
    } catch (error) {
      this.logger.error('Error generating QR code:', error);
      throw new BadRequestException('Failed to generate QR code');
    }
  }

  private async generatePDF(certificate: Certificate, template: CertificateTemplate): Promise<string> {
    try {
      if (!this.browser) {
        await this.initializeBrowser();
      }

      // Compile template
      const compiledTemplate = Handlebars.compile(template.htmlTemplate);
      const html = compiledTemplate({
        certificateNumber: certificate.certificateNumber,
        recipientName: certificate.recipientName,
        courseName: certificate.courseName,
        completionDate: certificate.completionDate.toLocaleDateString(),
        issueDate: certificate.issueDate.toLocaleDateString(),
        qrCodeData: certificate.qrCodeData,
        verificationUrl: certificate.verificationUrl,
        ...certificate.brandConfig,
      });

      // Create full HTML document
      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>${template.cssStyles}</style>
        </head>
        <body>
          ${html}
        </body>
        </html>
      `;

      // Generate PDF
      const page = await this.browser.newPage();
      await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

      // Ensure certificates directory exists
      const certificatesDir = path.join(process.cwd(), 'uploads', 'certificates');
      await fs.mkdir(certificatesDir, { recursive: true });

      const pdfPath = path.join(certificatesDir, `${certificate.certificateNumber}.pdf`);
      
      await page.pdf({
        path: pdfPath,
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in',
        },
      });

      await page.close();

      this.logger.log(`PDF generated: ${pdfPath}`);
      return pdfPath;
    } catch (error) {
      this.logger.error('Error generating PDF:', error);
      throw new BadRequestException('Failed to generate certificate PDF');
    }
  }

  private getDefaultHtmlTemplate(): string {
    return `
      <div class="certificate">
        <div class="certificate-header">
          {{#if logoUrl}}
            <img src="{{logoUrl}}" alt="Organization Logo" class="logo">
          {{/if}}
          <h1 class="title">Certificate of Completion</h1>
          {{#if organizationName}}
            <p class="organization">{{organizationName}}</p>
          {{/if}}
        </div>

        <div class="certificate-body">
          <p class="presentation">This is to certify that</p>
          <h2 class="recipient-name">{{recipientName}}</h2>
          <p class="completion-text">has successfully completed the course</p>
          <h3 class="course-name">{{courseName}}</h3>
          <p class="completion-date">on {{completionDate}}</p>
        </div>

        <div class="certificate-footer">
          <div class="signature-section">
            {{#if signatureUrl}}
              <img src="{{signatureUrl}}" alt="Signature" class="signature">
            {{/if}}
            {{#if signatoryName}}
              <p class="signatory-name">{{signatoryName}}</p>
            {{/if}}
            {{#if signatoryTitle}}
              <p class="signatory-title">{{signatoryTitle}}</p>
            {{/if}}
          </div>

          <div class="verification-section">
            <img src="{{qrCodeData}}" alt="Verification QR Code" class="qr-code">
            <p class="certificate-number">Certificate No: {{certificateNumber}}</p>
            <p class="verification-url">Verify at: {{verificationUrl}}</p>
            <p class="issue-date">Issued on: {{issueDate}}</p>
          </div>
        </div>
      </div>
    `;
  }

  private getDefaultCssStyles(): string {
    return `
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Open+Sans:wght@400;600&display=swap');

      .certificate {
        width: 1000px;
        height: 707px;
        margin: 0 auto;
        padding: 60px;
        font-family: 'Open Sans', sans-serif;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        background-image: 
          radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
        border: 3px solid #2c3e50;
        border-radius: 15px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        position: relative;
        overflow: hidden;
      }

      .certificate::before {
        content: '';
        position: absolute;
        top: 20px;
        left: 20px;
        right: 20px;
        bottom: 20px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 10px;
        pointer-events: none;
      }

      .certificate-header {
        text-align: center;
        margin-bottom: 40px;
        position: relative;
        z-index: 1;
      }

      .logo {
        max-height: 80px;
        margin-bottom: 20px;
      }

      .title {
        font-family: 'Playfair Display', serif;
        font-size: 48px;
        font-weight: 700;
        color: #fff;
        margin: 0 0 10px 0;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
      }

      .organization {
        font-size: 18px;
        color: rgba(255, 255, 255, 0.9);
        margin: 0;
        font-weight: 600;
      }

      .certificate-body {
        text-align: center;
        margin-bottom: 40px;
        position: relative;
        z-index: 1;
      }

      .presentation {
        font-size: 20px;
        color: rgba(255, 255, 255, 0.9);
        margin: 0 0 20px 0;
        font-style: italic;
      }

      .recipient-name {
        font-family: 'Playfair Display', serif;
        font-size: 42px;
        font-weight: 700;
        color: #fff;
        margin: 0 0 20px 0;
        text-decoration: underline;
        text-decoration-color: rgba(255, 255, 255, 0.5);
        text-underline-offset: 10px;
      }

      .completion-text {
        font-size: 18px;
        color: rgba(255, 255, 255, 0.9);
        margin: 0 0 15px 0;
      }

      .course-name {
        font-family: 'Playfair Display', serif;
        font-size: 32px;
        font-weight: 700;
        color: #fff;
        margin: 0 0 20px 0;
        font-style: italic;
      }

      .completion-date {
        font-size: 18px;
        color: rgba(255, 255, 255, 0.9);
        margin: 0;
        font-weight: 600;
      }

      .certificate-footer {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        position: relative;
        z-index: 1;
      }

      .signature-section {
        text-align: left;
        flex: 1;
      }

      .signature {
        max-height: 60px;
        margin-bottom: 10px;
      }

      .signatory-name {
        font-size: 16px;
        font-weight: 600;
        color: #fff;
        margin: 0 0 5px 0;
        border-top: 2px solid rgba(255, 255, 255, 0.5);
        padding-top: 5px;
        display: inline-block;
        min-width: 200px;
      }

      .signatory-title {
        font-size: 14px;
        color: rgba(255, 255, 255, 0.8);
        margin: 0;
      }

      .verification-section {
        text-align: right;
        flex: 1;
      }

      .qr-code {
        width: 80px;
        height: 80px;
        background: white;
        padding: 8px;
        border-radius: 8px;
        margin-bottom: 10px;
      }

      .certificate-number,
      .verification-url,
      .issue-date {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.8);
        margin: 2px 0;
        font-family: monospace;
      }

      .verification-url {
        word-break: break-all;
        max-width: 200px;
        margin-left: auto;
      }
    `;
  }
}
