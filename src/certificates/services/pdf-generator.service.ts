import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import * as PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import { Certificate } from '../entities/certificate.entity';

interface CertificateData {
  userName: string;
  courseName: string;
  completionDate: Date;
  issueDate: Date;
  certificateId: string;
  grade?: number;
  instructorName?: string;
  language: string;
}

@Injectable()
export class PdfGeneratorService {
  private readonly logger = new Logger(PdfGeneratorService.name);
  private readonly baseUrl: string;

  constructor(
    private configService: ConfigService,
    private i18n: I18nService
  ) {
    this.baseUrl = this.configService.get<string>('APP_BASE_URL', 'https://api.strellerminds.com');
  }

  /**
   * Generate a PDF certificate with branding, QR code, and localized content
   */
  async generateCertificatePDF(data: CertificateData): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        const chunks: Buffer[] = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Generate QR code
        const verificationUrl = `${this.baseUrl}/certificates/${data.certificateId}/verify`;
        const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
          width: 150,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });

        // Extract base64 data
        const qrBase64 = qrCodeDataUrl.split(',')[1];
        const qrBuffer = Buffer.from(qrBase64, 'base64');

        await this.generateCertificateContent(doc, data, qrBuffer);
        
        doc.end();
        
      } catch (error) {
        this.logger.error(`Failed to generate PDF: ${error.message}`, error.stack);
        reject(error);
      }
    });
  }

  /**
   * Generate the certificate content with branding and layout
   */
  private async generateCertificateContent(doc: PDFKit.PDFDocument, data: CertificateData, qrBuffer: Buffer): Promise<void> {
    const { language } = data;
    
    // Colors and styling
    const primaryColor = '#1e40af'; // Blue
    const accentColor = '#fbbf24'; // Gold
    const textColor = '#1f2937'; // Dark gray

    // Header with branding
    await this.addHeader(doc, language, primaryColor, accentColor);
    
    // Certificate title
    doc.fontSize(36)
       .fillColor(primaryColor)
       .font('Helvetica-Bold')
       .text(
         this.i18n.t('certificates.certificate.title', { lang: language }),
         0, 150, { align: 'center' }
       );

    // Decorative line
    doc.moveTo(150, 200)
       .lineTo(650, 200)
       .strokeColor(accentColor)
       .lineWidth(3)
       .stroke();

    // Award text
    doc.fontSize(18)
       .fillColor(textColor)
       .font('Helvetica')
       .text(
         this.i18n.t('certificates.certificate.awarded_to', { lang: language }),
         0, 230, { align: 'center' }
       );

    // Recipient name (prominent)
    doc.fontSize(32)
       .fillColor(primaryColor)
       .font('Helvetica-Bold')
       .text(data.userName, 0, 270, { align: 'center' });

    // Course completion text
    doc.fontSize(18)
       .fillColor(textColor)
       .font('Helvetica')
       .text(
         this.i18n.t('certificates.certificate.for_completion', { lang: language }),
         0, 320, { align: 'center' }
       );

    // Course name (prominent)
    doc.fontSize(24)
       .fillColor(primaryColor)
       .font('Helvetica-Bold')
       .text(data.courseName, 0, 350, { align: 'center' });

    // Certificate details in columns
    await this.addCertificateDetails(doc, data, language, textColor);
    
    // QR Code
    doc.image(qrBuffer, 650, 400, { width: 100, height: 100 });
    
    // QR instruction
    doc.fontSize(10)
       .fillColor(textColor)
       .font('Helvetica')
       .text(
         this.i18n.t('certificates.certificate.qr_instruction', { lang: language }),
         580, 510, { width: 150, align: 'center' }
       );

    // Footer with verification info
    await this.addFooter(doc, data, language, textColor);

    // Add signatures section
    await this.addSignatures(doc, language, textColor);
  }

  /**
   * Add branded header with logo and institution name
   */
  private async addHeader(doc: PDFKit.PDFDocument, language: string, primaryColor: string, accentColor: string): Promise<void> {
    // Institution name
    doc.fontSize(28)
       .fillColor(primaryColor)
       .font('Helvetica-Bold')
       .text(
         this.i18n.t('certificates.branding.institution', { lang: language }),
         0, 50, { align: 'center' }
       );

    // Slogan
    doc.fontSize(14)
       .fillColor(accentColor)
       .font('Helvetica-Oblique')
       .text(
         this.i18n.t('certificates.branding.slogan', { lang: language }),
         0, 85, { align: 'center' }
       );

    // Decorative elements
    doc.circle(100, 75, 30)
       .strokeColor(accentColor)
       .lineWidth(2)
       .stroke();
    
    doc.circle(700, 75, 30)
       .strokeColor(accentColor)
       .lineWidth(2)
       .stroke();
  }

  /**
   * Add certificate details in organized layout
   */
  private async addCertificateDetails(doc: PDFKit.PDFDocument, data: CertificateData, language: string, textColor: string): Promise<void> {
    const leftColumn = 150;
    const rightColumn = 450;
    const detailY = 420;
    
    // Left column
    doc.fontSize(12)
       .fillColor(textColor)
       .font('Helvetica-Bold')
       .text(this.i18n.t('certificates.certificate.completion_date', { lang: language }) + ':', leftColumn, detailY)
       .font('Helvetica')
       .text(data.completionDate.toLocaleDateString(language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'fr-FR'), leftColumn, detailY + 15);

    doc.font('Helvetica-Bold')
       .text(this.i18n.t('certificates.certificate.certificate_id', { lang: language }) + ':', leftColumn, detailY + 40)
       .font('Helvetica')
       .text(data.certificateId, leftColumn, detailY + 55);

    // Right column
    if (data.grade) {
      doc.font('Helvetica-Bold')
         .text(this.i18n.t('certificates.certificate.grade', { lang: language }) + ':', rightColumn, detailY)
         .font('Helvetica')
         .text(`${data.grade}%`, rightColumn, detailY + 15);
    }

    if (data.instructorName) {
      doc.font('Helvetica-Bold')
         .text(this.i18n.t('certificates.certificate.instructor', { lang: language }) + ':', rightColumn, detailY + 40)
         .font('Helvetica')
         .text(data.instructorName, rightColumn, detailY + 55);
    }
  }

  /**
   * Add signature section
   */
  private async addSignatures(doc: PDFKit.PDFDocument, language: string, textColor: string): Promise<void> {
    const signatureY = 480;
    
    // Signature lines and titles
    const positions = [
      { x: 150, title: this.i18n.t('certificates.signatures.dean', { lang: language }) },
      { x: 350, title: this.i18n.t('certificates.signatures.director', { lang: language }) },
      { x: 550, title: this.i18n.t('certificates.signatures.registrar', { lang: language }) }
    ];

    positions.forEach(pos => {
      // Signature line
      doc.moveTo(pos.x, signatureY)
         .lineTo(pos.x + 120, signatureY)
         .strokeColor(textColor)
         .lineWidth(1)
         .stroke();

      // Title
      doc.fontSize(10)
         .fillColor(textColor)
         .font('Helvetica')
         .text(pos.title, pos.x, signatureY + 10, { width: 120, align: 'center' });
    });
  }

  /**
   * Add footer with verification and copyright info
   */
  private async addFooter(doc: PDFKit.PDFDocument, data: CertificateData, language: string, textColor: string): Promise<void> {
    const footerY = 530;
    
    // Verification text
    doc.fontSize(10)
       .fillColor(textColor)
       .font('Helvetica')
       .text(
         this.i18n.t('certificates.certificate.verified_by', { lang: language }),
         0, footerY, { align: 'center' }
       );

    // Issue date
    doc.text(
      this.i18n.t('certificates.footer.issued_on', { 
        lang: language,
        args: { date: data.issueDate.toLocaleDateString(language === 'en' ? 'en-US' : language === 'es' ? 'es-ES' : 'fr-FR') }
      }),
      0, footerY + 15, { align: 'center' }
    );

    // Copyright
    doc.text(
      this.i18n.t('certificates.footer.copyright', { 
        lang: language,
        args: { year: new Date().getFullYear() }
      }),
      0, footerY + 30, { align: 'center' }
    );
  }
}
