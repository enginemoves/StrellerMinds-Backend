import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CertificateService } from './certificate.service';
import { PdfGeneratorService } from './pdf-generator.service';
import { S3StorageService } from './s3-storage.service';
import { Certificate } from '../entities/certificate.entity';
import { User } from '../../users/entities/user.entity';
import { Course } from '../../courses/entities/course.entity';
import { CreateCertificateDto } from '../dto/create-certificate.dto';

describe('CertificateService', () => {
  let service: CertificateService;
  let certificateRepository: jest.Mocked<Repository<Certificate>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let courseRepository: jest.Mocked<Repository<Course>>;
  let pdfGenerator: jest.Mocked<PdfGeneratorService>;
  let s3Storage: jest.Mocked<S3StorageService>;
  let configService: jest.Mocked<ConfigService>;
  let i18nService: jest.Mocked<I18nService>;

  const mockUser = {
    id: 'user-id',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
  };

  const mockCourse = {
    id: 'course-id',
    title: 'Introduction to JavaScript',
    description: 'Basic JavaScript course',
  };

  const mockCertificate = {
    id: 'cert-id',
    certificateNumber: 'INT-2024-0001',
    userId: 'user-id',
    courseId: 'course-id',
    issueDate: new Date(),
    pdfUrl: 'https://s3.amazonaws.com/cert-id.pdf',
    qrCode: 'https://api.example.com/certificates/cert-id/verify',
    checksum: 'abc123def456',
    metadata: {
      courseName: 'Introduction to JavaScript',
      userName: 'John Doe',
      completionDate: new Date(),
      certificateType: 'completion',
      issuingInstitution: 'StrellerMinds Academy',
      language: 'en',
    },
    isValid: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockCertificateRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockUserRepository = {
      findOne: jest.fn(),
    };

    const mockCourseRepository = {
      findOne: jest.fn(),
    };

    const mockPdfGenerator = {
      generateCertificatePDF: jest.fn(),
    };

    const mockS3Storage = {
      uploadCertificate: jest.fn(),
      verifyCertificate: jest.fn(),
      getSignedUrl: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const mockI18nService = {
      t: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificateService,
        {
          provide: getRepositoryToken(Certificate),
          useValue: mockCertificateRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Course),
          useValue: mockCourseRepository,
        },
        {
          provide: PdfGeneratorService,
          useValue: mockPdfGenerator,
        },
        {
          provide: S3StorageService,
          useValue: mockS3Storage,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: I18nService,
          useValue: mockI18nService,
        },
      ],
    }).compile();

    service = module.get<CertificateService>(CertificateService);
    certificateRepository = module.get(getRepositoryToken(Certificate));
    userRepository = module.get(getRepositoryToken(User));
    courseRepository = module.get(getRepositoryToken(Course));
    pdfGenerator = module.get(PdfGeneratorService);
    s3Storage = module.get(S3StorageService);
    configService = module.get(ConfigService);
    i18nService = module.get(I18nService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateCertificate', () => {
    const createCertificateDto: CreateCertificateDto = {
      userId: 'user-id',
      courseId: 'course-id',
      language: 'en',
      grade: 95,
      instructorName: 'Jane Smith',
    };

    beforeEach(() => {
      userRepository.findOne.mockResolvedValue(mockUser as any);
      courseRepository.findOne.mockResolvedValue(mockCourse as any);
      certificateRepository.findOne.mockResolvedValue(null);
      pdfGenerator.generateCertificatePDF.mockResolvedValue(Buffer.from('pdf-content'));
      s3Storage.uploadCertificate.mockResolvedValue({
        url: 'https://s3.amazonaws.com/cert-id.pdf',
        checksum: 'abc123def456',
      });
      certificateRepository.create.mockReturnValue(mockCertificate as any);
      certificateRepository.save.mockResolvedValue(mockCertificate as any);
      configService.get.mockReturnValue('https://api.example.com');
      i18nService.t.mockReturnValue('StrellerMinds Academy');
    });

    it('should generate a certificate successfully', async () => {
      const result = await service.generateCertificate(createCertificateDto);

      expect(result).toEqual(mockCertificate);
      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 'user-id' } });
      expect(courseRepository.findOne).toHaveBeenCalledWith({ where: { id: 'course-id' } });
      expect(pdfGenerator.generateCertificatePDF).toHaveBeenCalled();
      expect(s3Storage.uploadCertificate).toHaveBeenCalled();
      expect(certificateRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if certificate already exists', async () => {
      certificateRepository.findOne.mockResolvedValue(mockCertificate as any);

      await expect(service.generateCertificate(createCertificateDto))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.generateCertificate(createCertificateDto))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if course not found', async () => {
      courseRepository.findOne.mockResolvedValue(null);

      await expect(service.generateCertificate(createCertificateDto))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('verifyCertificate', () => {
    it('should verify certificate successfully', async () => {
      certificateRepository.findOne.mockResolvedValue(mockCertificate as any);
      s3Storage.verifyCertificate.mockResolvedValue({ exists: true });

      const result = await service.verifyCertificate('cert-id');

      expect(result).toEqual({
        id: mockCertificate.id,
        certificateNumber: mockCertificate.certificateNumber,
        userId: mockCertificate.userId,
        courseId: mockCertificate.courseId,
        issueDate: mockCertificate.issueDate,
        qrCode: mockCertificate.qrCode,
        checksum: mockCertificate.checksum,
        metadata: mockCertificate.metadata,
        isValid: true,
        createdAt: mockCertificate.createdAt,
      });
    });

    it('should mark certificate as invalid if not found in S3', async () => {
      certificateRepository.findOne.mockResolvedValue(mockCertificate as any);
      s3Storage.verifyCertificate.mockResolvedValue({ exists: false });

      const result = await service.verifyCertificate('cert-id');

      expect(result.isValid).toBe(false);
      expect(certificateRepository.update).toHaveBeenCalledWith('cert-id', { isValid: false });
    });

    it('should throw NotFoundException for invalid certificate', async () => {
      certificateRepository.findOne.mockResolvedValue(null);

      await expect(service.verifyCertificate('cert-id'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('getCertificate', () => {
    it('should return certificate if found', async () => {
      certificateRepository.findOne.mockResolvedValue(mockCertificate as any);

      const result = await service.getCertificate('cert-id');

      expect(result).toEqual(mockCertificate);
    });

    it('should throw NotFoundException if certificate not found', async () => {
      certificateRepository.findOne.mockResolvedValue(null);

      await expect(service.getCertificate('cert-id'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserCertificates', () => {
    it('should return user certificates', async () => {
      const certificates = [mockCertificate];
      certificateRepository.find.mockResolvedValue(certificates as any);

      const result = await service.getUserCertificates('user-id');

      expect(result).toEqual(certificates);
      expect(certificateRepository.find).toHaveBeenCalledWith({
        where: { userId: 'user-id', isValid: true },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('revokeCertificate', () => {
    it('should revoke certificate successfully', async () => {
      certificateRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.revokeCertificate('cert-id');

      expect(certificateRepository.update).toHaveBeenCalledWith(
        { id: 'cert-id' },
        { isValid: false }
      );
    });

    it('should throw NotFoundException if certificate not found', async () => {
      certificateRepository.update.mockResolvedValue({ affected: 0 } as any);

      await expect(service.revokeCertificate('cert-id'))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('getCertificatePdfUrl', () => {
    it('should return PDF URL for valid certificate', async () => {
      certificateRepository.findOne.mockResolvedValue(mockCertificate as any);
      s3Storage.getSignedUrl.mockResolvedValue('https://signed-url.com');

      const result = await service.getCertificatePdfUrl('cert-id');

      expect(result).toBe('https://signed-url.com');
    });

    it('should throw BadRequestException for invalid certificate', async () => {
      const invalidCertificate = { ...mockCertificate, isValid: false };
      certificateRepository.findOne.mockResolvedValue(invalidCertificate as any);

      await expect(service.getCertificatePdfUrl('cert-id'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('getCertificateStats', () => {
    it('should return certificate statistics', async () => {
      certificateRepository.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(95); // valid

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(),
      };

      certificateRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);
      
      mockQueryBuilder.getRawMany
        .mockResolvedValueOnce([
          { language: 'en', count: '50' },
          { language: 'es', count: '30' },
          { language: 'fr', count: '15' },
        ])
        .mockResolvedValueOnce([
          { type: 'completion', count: '80' },
          { type: 'achievement', count: '15' },
        ]);

      const result = await service.getCertificateStats();

      expect(result).toEqual({
        total: 100,
        valid: 95,
        invalid: 5,
        byLanguage: {
          en: 50,
          es: 30,
          fr: 15,
        },
        byType: {
          completion: 80,
          achievement: 15,
        },
      });
    });
  });
});
