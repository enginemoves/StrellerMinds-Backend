import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as request from 'supertest';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { I18nModule, I18nJsonLoader } from 'nestjs-i18n';
import { CqrsModule } from '@nestjs/cqrs';
import * as path from 'path';

import { CertificateModule } from './certificate.module';
import { Certificate } from './entities/certificate.entity';
import { User } from '../users/entities/user.entity';
import { Course } from '../courses/entities/course.entity';
import { AuthModule } from '../auth/auth.module';

describe('Certificate E2E Tests', () => {
  let app: INestApplication;
  let certificateRepository: Repository<Certificate>;
  let userRepository: Repository<User>;
  let courseRepository: Repository<Course>;
  let accessToken: string;
  let testUser: User;
  let testCourse: Course;

  const mockUser = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@test.com',
    password: 'test123',
    role: 'user',
  };

  const mockCourse = {
    title: 'Introduction to TypeScript',
    description: 'Learn TypeScript from basics to advanced',
    duration: 40,
    level: 'beginner',
    price: 99.99,
    instructorId: 'instructor-id',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Certificate, User, Course],
          synchronize: true,
        }),
        I18nModule.forRoot({
          fallbackLanguage: 'en',
          loader: I18nJsonLoader,
          loaderOptions: {
            path: path.join(__dirname, '..', 'i18n', 'locales'),
            watch: false,
          },
        }),
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
        CqrsModule,
        CertificateModule,
        AuthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());

    certificateRepository = moduleFixture.get<Repository<Certificate>>(
      getRepositoryToken(Certificate),
    );
    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));
    courseRepository = moduleFixture.get<Repository<Course>>(getRepositoryToken(Course));

    await app.init();

    // Create test user
    testUser = userRepository.create(mockUser);
    testUser = await userRepository.save(testUser);

    // Create test course
    testCourse = courseRepository.create(mockCourse);
    testCourse = await courseRepository.save(testCourse);

    // Get access token for authenticated requests
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: mockUser.email,
        password: mockUser.password,
      });
    
    accessToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up certificates before each test
    await certificateRepository.clear();
  });

  describe('POST /certificates', () => {
    const createCertificateDto = {
      userId: '', // Will be set to testUser.id
      courseId: '', // Will be set to testCourse.id
      language: 'en',
      grade: 95,
      instructorName: 'Jane Smith',
      certificateType: 'completion',
    };

    beforeEach(() => {
      createCertificateDto.userId = testUser.id;
      createCertificateDto.courseId = testCourse.id;
    });

    it('should generate a certificate successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/certificates')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createCertificateDto)
        .expect(201);

      expect(response.body).toMatchObject({
        userId: testUser.id,
        courseId: testCourse.id,
        certificateNumber: expect.stringMatching(/^INT-\d{4}-\d{4}$/),
        isValid: true,
        metadata: expect.objectContaining({
          userName: `${mockUser.firstName} ${mockUser.lastName}`,
          courseName: mockCourse.title,
          language: 'en',
          grade: 95,
        }),
      });

      expect(response.body.pdfUrl).toBeDefined();
      expect(response.body.qrCode).toBeDefined();
      expect(response.body.checksum).toBeDefined();
    });

    it('should return 400 if certificate already exists', async () => {
      // Create first certificate
      await request(app.getHttpServer())
        .post('/certificates')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createCertificateDto)
        .expect(201);

      // Try to create duplicate
      await request(app.getHttpServer())
        .post('/certificates')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createCertificateDto)
        .expect(400);
    });

    it('should return 404 if user not found', async () => {
      await request(app.getHttpServer())
        .post('/certificates')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          ...createCertificateDto,
          userId: 'non-existent-user-id',
        })
        .expect(404);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .post('/certificates')
        .send(createCertificateDto)
        .expect(401);
    });

    it('should validate required fields', async () => {
      await request(app.getHttpServer())
        .post('/certificates')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          userId: testUser.id,
          // Missing courseId
        })
        .expect(400);
    });

    it('should support different languages', async () => {
      const spanishDto = {
        ...createCertificateDto,
        language: 'es',
      };

      const response = await request(app.getHttpServer())
        .post('/certificates')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(spanishDto)
        .expect(201);

      expect(response.body.metadata.language).toBe('es');
    });
  });

  describe('GET /certificates/:id/verify', () => {
    let testCertificate: Certificate;

    beforeEach(async () => {
      // Create a test certificate
      const response = await request(app.getHttpServer())
        .post('/certificates')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          userId: testUser.id,
          courseId: testCourse.id,
          language: 'en',
          grade: 90,
        });

      testCertificate = response.body;
    });

    it('should verify a valid certificate (public endpoint)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/certificates/${testCertificate.id}/verify`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: testCertificate.id,
        certificateNumber: testCertificate.certificateNumber,
        userId: testUser.id,
        courseId: testCourse.id,
        isValid: true,
        metadata: expect.objectContaining({
          userName: `${mockUser.firstName} ${mockUser.lastName}`,
          courseName: mockCourse.title,
        }),
      });
    });

    it('should return 404 for non-existent certificate', async () => {
      await request(app.getHttpServer())
        .get('/certificates/non-existent-id/verify')
        .expect(404);
    });

    it('should work without authentication (public endpoint)', async () => {
      await request(app.getHttpServer())
        .get(`/certificates/${testCertificate.id}/verify`)
        .expect(200);
    });
  });

  describe('GET /certificates/:id', () => {
    let testCertificate: Certificate;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/certificates')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          userId: testUser.id,
          courseId: testCourse.id,
          language: 'en',
        });

      testCertificate = response.body;
    });

    it('should return certificate details', async () => {
      const response = await request(app.getHttpServer())
        .get(`/certificates/${testCertificate.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: testCertificate.id,
        userId: testUser.id,
        courseId: testCourse.id,
        isValid: true,
      });
    });

    it('should return 404 for non-existent certificate', async () => {
      await request(app.getHttpServer())
        .get('/certificates/non-existent-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get(`/certificates/${testCertificate.id}`)
        .expect(401);
    });
  });

  describe('GET /certificates/:id/pdf', () => {
    let testCertificate: Certificate;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/certificates')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          userId: testUser.id,
          courseId: testCourse.id,
          language: 'en',
        });

      testCertificate = response.body;
    });

    it('should return PDF URL for valid certificate', async () => {
      const response = await request(app.getHttpServer())
        .get(`/certificates/${testCertificate.id}/pdf`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('pdfUrl');
      expect(typeof response.body.pdfUrl).toBe('string');
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get(`/certificates/${testCertificate.id}/pdf`)
        .expect(401);
    });
  });

  describe('GET /certificates/user/:userId', () => {
    beforeEach(async () => {
      // Create multiple certificates for user
      await request(app.getHttpServer())
        .post('/certificates')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          userId: testUser.id,
          courseId: testCourse.id,
          language: 'en',
        });

      // Create another course and certificate
      const anotherCourse = await courseRepository.save({
        title: 'Advanced JavaScript',
        description: 'Advanced JS concepts',
        duration: 60,
        level: 'advanced',
        price: 149.99,
        instructorId: 'instructor-id',
      });

      await request(app.getHttpServer())
        .post('/certificates')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          userId: testUser.id,
          courseId: anotherCourse.id,
          language: 'es',
          grade: 88,
        });
    });

    it('should return user certificates ordered by creation date', async () => {
      const response = await request(app.getHttpServer())
        .get(`/certificates/user/${testUser.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].userId).toBe(testUser.id);
      expect(response.body[1].userId).toBe(testUser.id);
      
      // Should be ordered by createdAt DESC
      expect(new Date(response.body[0].createdAt).getTime())
        .toBeGreaterThanOrEqual(new Date(response.body[1].createdAt).getTime());
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get(`/certificates/user/${testUser.id}`)
        .expect(401);
    });
  });

  describe('PATCH /certificates/:id/revoke', () => {
    let testCertificate: Certificate;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/certificates')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          userId: testUser.id,
          courseId: testCourse.id,
        });

      testCertificate = response.body;
    });

    it('should revoke a certificate', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/certificates/${testCertificate.id}/revoke`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.message).toContain('revoked successfully');

      // Verify certificate is invalid
      const certificate = await certificateRepository.findOne({
        where: { id: testCertificate.id },
      });
      expect(certificate.isValid).toBe(false);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .patch(`/certificates/${testCertificate.id}/revoke`)
        .expect(401);
    });
  });

  describe('GET /certificates/stats/overview', () => {
    beforeEach(async () => {
      // Create certificates with different languages and types
      await request(app.getHttpServer())
        .post('/certificates')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          userId: testUser.id,
          courseId: testCourse.id,
          language: 'en',
        });

      await request(app.getHttpServer())
        .post('/certificates')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          userId: testUser.id,
          courseId: testCourse.id,
          language: 'es',
        });
    });

    it('should return certificate statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/certificates/stats/overview')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        total: expect.any(Number),
        valid: expect.any(Number),
        invalid: expect.any(Number),
        byLanguage: expect.any(Object),
        byType: expect.any(Object),
      });

      expect(response.body.total).toBeGreaterThanOrEqual(2);
      expect(response.body.valid).toBeGreaterThanOrEqual(2);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/certificates/stats/overview')
        .expect(401);
    });
  });

  describe('QR Code Verification Flow', () => {
    let testCertificate: Certificate;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/certificates')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          userId: testUser.id,
          courseId: testCourse.id,
          language: 'en',
          grade: 92,
        });

      testCertificate = response.body;
    });

    it('should generate QR code pointing to verification endpoint', async () => {
      expect(testCertificate.qrCode).toBeDefined();
      expect(testCertificate.qrCode).toContain('/verify');

      // Extract certificate ID from QR code URL
      const qrUrl = testCertificate.qrCode;
      const matches = qrUrl.match(/\/certificates\/([^\/]+)\/verify/);
      expect(matches).toBeTruthy();
      expect(matches[1]).toBe(testCertificate.id);
    });

    it('should verify certificate through QR code URL', async () => {
      // Simulate scanning QR code and accessing verification URL
      const response = await request(app.getHttpServer())
        .get(`/certificates/${testCertificate.id}/verify`)
        .expect(200);

      expect(response.body.isValid).toBe(true);
      expect(response.body.metadata.grade).toBe(92);
    });
  });

  describe('Snapshot Tests', () => {
    let testCertificate: Certificate;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/certificates')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          userId: testUser.id,
          courseId: testCourse.id,
          language: 'en',
          grade: 88,
          instructorName: 'Dr. Jane Smith',
          certificateType: 'completion',
        });

      testCertificate = response.body;
    });

    it('should match certificate metadata snapshot', async () => {
      const response = await request(app.getHttpServer())
        .get(`/certificates/${testCertificate.id}/verify`)
        .expect(200);

      // Remove dynamic fields for snapshot consistency
      const sanitizedMetadata = {
        ...response.body,
        id: '[UUID]',
        issueDate: '[DATE]',
        createdAt: '[DATE]',
        certificateNumber: '[CERTIFICATE_NUMBER]',
        qrCode: '[QR_URL]',
        checksum: '[CHECKSUM]',
        pdfUrl: '[PDF_URL]',
        metadata: {
          ...response.body.metadata,
          completionDate: '[DATE]',
        },
      };

      expect(sanitizedMetadata).toMatchSnapshot('certificate-metadata');
    });

    it('should match QR payload structure snapshot', () => {
      const qrPayload = {
        certificateId: testCertificate.id,
        verificationUrl: testCertificate.qrCode,
        urlPattern: '/certificates/:id/verify',
      };

      // Sanitize for snapshot
      const sanitizedPayload = {
        ...qrPayload,
        certificateId: '[UUID]',
        verificationUrl: qrPayload.verificationUrl.replace(testCertificate.id, '[UUID]'),
      };

      expect(sanitizedPayload).toMatchSnapshot('qr-payload');
    });
  });
});
