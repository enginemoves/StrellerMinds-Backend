import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { Certificate } from '../entities/certificate.entity';
import { CreateCertificateDto, CertificateMetadataDto } from '../dto/create-certificate.dto';
import { PdfGeneratorService } from './pdf-generator.service';
import { S3StorageService } from './s3-storage.service';
import { User } from '../../users/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CertificateService {
  private readonly logger = new Logger(CertificateService.name);

  constructor(
    @InjectRepository(Certificate)
    private certificateRepository: Repository<Certificate>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    private pdfGenerator: PdfGeneratorService,
    private s3Storage: S3StorageService,
    private configService: ConfigService,
    private i18n: I18nService,
  ) {}

  /**
   * Generate and store a new certificate
   */
  async generateCertificate(dto: CreateCertificateDto): Promise<Certificate> {
    this.logger.log(`Generating certificate for user ${dto.userId} and course ${dto.courseId}`);

    try {
      // Check if certificate already exists
      const existingCertificate = await this.certificateRepository.findOne({
        where: { userId: dto.userId, courseId: dto.courseId }
      });

      if (existingCertificate) {
        throw new BadRequestException('Certificate already exists for this user and course');
      }

      // Get user and course details
      const user = await this.userRepository.findOne({ where: { id: dto.userId } });
      const course = await this.courseRepository.findOne({ where: { id: dto.courseId } });

      if (!user || !course) {
        throw new NotFoundException('User or course not found');
      }

      // Generate certificate ID and number
      const certificateId = uuidv4();
      const certificateNumber = await this.generateCertificateNumber(course.title);

      // Prepare certificate data
      const certificateData = {
        userName: `${user.firstName} ${user.lastName}`,
        courseName: course.title,
        completionDate: new Date(),
        issueDate: new Date(),
        certificateId,
        grade: dto.grade,
        instructorName: dto.instructorName,
        language: dto.language || 'en'
      };

      // Generate PDF
      const pdfBuffer = await this.pdfGenerator.generateCertificatePDF(certificateData);

      // Upload to S3
      const { url: pdfUrl, checksum } = await this.s3Storage.uploadCertificate(
        certificateId,
        pdfBuffer,
        {
          userId: dto.userId,
          courseId: dto.courseId,
          userName: certificateData.userName,
          courseName: certificateData.courseName,
          language: dto.language || 'en'
        }
      );

      // Generate QR code data
      const baseUrl = this.configService.get<string>('APP_BASE_URL', 'https://api.strellerminds.com');
      const qrCode = `${baseUrl}/certificates/${certificateId}/verify`;

      // Create certificate metadata
      const metadata = {
        courseName: certificateData.courseName,
        userName: certificateData.userName,
        completionDate: certificateData.completionDate,
        grade: dto.grade,
        instructorName: dto.instructorName,
        certificateType: dto.certificateType || 'completion',
        issuingInstitution: this.i18n.t('certificates.branding.institution', { lang: dto.language || 'en' }),
        language: dto.language || 'en'
      };

      // Save certificate to database
      const certificate = this.certificateRepository.create({
        id: certificateId,
        certificateNumber,
        userId: dto.userId,
        courseId: dto.courseId,
        issueDate: new Date(),
        pdfUrl,
        qrCode,
        checksum,
        metadata,
        isValid: true
      });

      const savedCertificate = await this.certificateRepository.save(certificate);
      
      this.logger.log(`Certificate generated successfully: ${certificateId}`);
      return savedCertificate;

    } catch (error) {
      this.logger.error(`Failed to generate certificate: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Verify certificate authenticity and return metadata
   */
  async verifyCertificate(certificateId: string): Promise<CertificateMetadataDto> {
    this.logger.log(`Verifying certificate: ${certificateId}`);

    try {
      const certificate = await this.certificateRepository.findOne({
        where: { id: certificateId, isValid: true }
      });

      if (!certificate) {
        throw new NotFoundException('Certificate not found or invalid');
      }

      // Verify S3 existence
      const s3Verification = await this.s3Storage.verifyCertificate(certificateId);
      
      if (!s3Verification.exists) {
        this.logger.warn(`Certificate ${certificateId} not found in S3`);
        // Mark as invalid but still return metadata
        await this.certificateRepository.update(certificateId, { isValid: false });
      }

      return {
        id: certificate.id,
        certificateNumber: certificate.certificateNumber,
        userId: certificate.userId,
        courseId: certificate.courseId,
        issueDate: certificate.issueDate,
        qrCode: certificate.qrCode,
        checksum: certificate.checksum,
        metadata: certificate.metadata,
        isValid: certificate.isValid && s3Verification.exists,
        createdAt: certificate.createdAt
      };

    } catch (error) {
      this.logger.error(`Failed to verify certificate: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get certificate by ID
   */
  async getCertificate(certificateId: string): Promise<Certificate> {
    const certificate = await this.certificateRepository.findOne({
      where: { id: certificateId }
    });

    if (!certificate) {
      throw new NotFoundException('Certificate not found');
    }

    return certificate;
  }

  /**
   * Get certificates for a user
   */
  async getUserCertificates(userId: string): Promise<Certificate[]> {
    return this.certificateRepository.find({
      where: { userId, isValid: true },
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Get certificates for a course
   */
  async getCourseCertificates(courseId: string): Promise<Certificate[]> {
    return this.certificateRepository.find({
      where: { courseId, isValid: true },
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Revoke a certificate (mark as invalid)
   */
  async revokeCertificate(certificateId: string): Promise<void> {
    const result = await this.certificateRepository.update(
      { id: certificateId },
      { isValid: false }
    );

    if (result.affected === 0) {
      throw new NotFoundException('Certificate not found');
    }

    this.logger.log(`Certificate revoked: ${certificateId}`);
  }

  /**
   * Get certificate PDF URL (with signed URL for temporary access)
   */
  async getCertificatePdfUrl(certificateId: string): Promise<string> {
    const certificate = await this.getCertificate(certificateId);
    
    if (!certificate.isValid) {
      throw new BadRequestException('Certificate is not valid');
    }

    // Return direct URL or generate signed URL
    return this.s3Storage.getSignedUrl(certificateId);
  }

  /**
   * Generate unique certificate number
   */
  private async generateCertificateNumber(courseTitle: string): Promise<string> {
    const year = new Date().getFullYear();
    const coursePrefix = courseTitle
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 3)
      .toUpperCase();
    
    // Get count of certificates issued this year for this course
    const count = await this.certificateRepository.count({
      where: {
        certificateNumber: Like(`${coursePrefix}-${year}-%`),
      },
    });

    return `${coursePrefix}-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * Regenerate certificate (for updates or corrections)
   */
  async regenerateCertificate(certificateId: string, updates?: Partial<CreateCertificateDto>): Promise<Certificate> {
    const existingCertificate = await this.getCertificate(certificateId);
    
    // Mark old certificate as invalid
    await this.certificateRepository.update(certificateId, { isValid: false });
    
    // Generate new certificate with updates
    const dto: CreateCertificateDto = {
      userId: existingCertificate.userId,
      courseId: existingCertificate.courseId,
      language: existingCertificate.metadata.language,
      grade: existingCertificate.metadata.grade,
      instructorName: existingCertificate.metadata.instructorName,
      certificateType: existingCertificate.metadata.certificateType,
      ...updates
    };

    return this.generateCertificate(dto);
  }

  /**
   * Get certificate statistics
   */
  async getCertificateStats(): Promise<{
    total: number;
    valid: number;
    invalid: number;
    byLanguage: Record<string, number>;
    byType: Record<string, number>;
  }> {
    const total = await this.certificateRepository.count();
    const valid = await this.certificateRepository.count({ where: { isValid: true } });
    const invalid = total - valid;

    // Get language distribution
    const languageStats = await this.certificateRepository
      .createQueryBuilder('cert')
      .select("cert.metadata->>'language' as language, COUNT(*) as count")
      .where('cert.isValid = :isValid', { isValid: true })
      .groupBy("cert.metadata->>'language'")
      .getRawMany();

    const byLanguage = languageStats.reduce((acc, stat) => {
      acc[stat.language || 'unknown'] = parseInt(stat.count);
      return acc;
    }, {});

    // Get type distribution
    const typeStats = await this.certificateRepository
      .createQueryBuilder('cert')
      .select("cert.metadata->>'certificateType' as type, COUNT(*) as count")
      .where('cert.isValid = :isValid', { isValid: true })
      .groupBy("cert.metadata->>'certificateType'")
      .getRawMany();

    const byType = typeStats.reduce((acc, stat) => {
      acc[stat.type || 'completion'] = parseInt(stat.count);
      return acc;
    }, {});

    return {
      total,
      valid,
      invalid,
      byLanguage,
      byType
    };
  }
}
