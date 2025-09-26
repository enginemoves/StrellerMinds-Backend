import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as fs from 'fs';
import * as path from 'path';

import { AuthModule } from '../../src/auth/auth.module';
import { UsersModule } from '../../src/users/users.module';
import { CoursesModule } from '../../src/courses/courses.module';
import { CertificationModule } from '../../src/certification/certification.module';
import { CertificateModule } from '../../src/certificate/certificate.module';
import { ProgressModule } from '../../src/progress/progress.module';
import { User } from '../../src/users/entities/user.entity';
import { Course } from '../../src/courses/entities/course.entity';
import { Certificate } from '../../src/certification/entities/certificate.entity';
import { CertificationType } from '../../src/certification/entities/certification-type.entity';
import { CertificateVerification } from '../../src/certification/entities/certificate-verification.entity';
import { Progress } from '../../src/progress/entities/progress.entity';
import { DatabaseTestModule } from '../utils/database-test.module';

describe('Certificate Generation and Verification Integration Tests', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let userRepository: Repository<User>;
  let courseRepository: Repository<Course>;
  let certificateRepository: Repository<Certificate>;
  let certificationTypeRepository: Repository<CertificationType>;
  let verificationRepository: Repository<CertificateVerification>;
  let progressRepository: Repository<Progress>;

  let testStudent: User;
  let testInstructor: User;
  let studentToken: string;
  let instructorToken: string;
  let adminToken: string;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        DatabaseTestModule,
        TypeOrmModule.forFeature([
          User,
          Course,
          Certificate,
          CertificationType,
          CertificateVerification,
          Progress,
        ]),
        AuthModule,
        UsersModule,
        CoursesModule,
        CertificationModule,
        CertificateModule,
        ProgressModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    userRepository = moduleRef.get<Repository<User>>(getRepositoryToken(User));
    courseRepository = moduleRef.get<Repository<Course>>(getRepositoryToken(Course));
    certificateRepository = moduleRef.get<Repository<Certificate>>(getRepositoryToken(Certificate));
    certificationTypeRepository = moduleRef.get<Repository<CertificationType>>(getRepositoryToken(CertificationType));
    verificationRepository = moduleRef.get<Repository<CertificateVerification>>(getRepositoryToken(CertificateVerification));
    progressRepository = moduleRef.get<Repository<Progress>>(getRepositoryToken(Progress));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean database before each test
    await verificationRepository.clear();
    await certificateRepository.clear();
    await certificationTypeRepository.clear();
    await progressRepository.clear();
    await courseRepository.clear();
    await userRepository.clear();

    await setupTestUsers();
    await setupCertificationTypes();
  });

  async function setupTestUsers() {
    // Create student
    const studentResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'student@example.com',
        password: 'SecurePass123!',
        firstName: 'John',
        lastName: 'Student',
        name: 'John Student',
        role: 'student',
      })
      .expect(201);

    testStudent = await userRepository.findOne({
      where: { email: 'student@example.com' },
    });
    studentToken = studentResponse.body.access_token;

    // Create instructor
    const instructorResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'instructor@example.com',
        password: 'SecurePass123!',
        firstName: 'Jane',
        lastName: 'Instructor',
        name: 'Jane Instructor',
        role: 'instructor',
      })
      .expect(201);

    testInstructor = await userRepository.findOne({
      where: { email: 'instructor@example.com' },
    });
    instructorToken = instructorResponse.body.access_token;

    // Create admin
    const adminResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'admin@example.com',
        password: 'SecurePass123!',
        firstName: 'Admin',
        lastName: 'User',
        name: 'Admin User',
        role: 'admin',
      })
      .expect(201);

    adminToken = adminResponse.body.access_token;
  }

  async function setupCertificationTypes() {
    const certificationTypes = [
      {
        name: 'Course Completion',
        description: 'Certificate awarded upon course completion',
        category: 'completion',
        validityPeriod: 365 * 24 * 60 * 60 * 1000, // 1 year in milliseconds
        requirements: {
          minScore: 70,
          completionPercentage: 100,
          quizzesRequired: true,
        },
      },
      {
        name: 'Professional Certification',
        description: 'Advanced certification for professionals',
        category: 'professional',
        validityPeriod: 2 * 365 * 24 * 60 * 60 * 1000, // 2 years
        requirements: {
          minScore: 85,
          completionPercentage: 100,
          quizzesRequired: true,
          projectsRequired: true,
        },
      },
    ];

    for (const typeData of certificationTypes) {
      await certificationTypeRepository.save(
        certificationTypeRepository.create(typeData)
      );
    }
  }

  async function createTestCourse(overrides = {}) {
    const courseData = {
      title: 'Test Course for Certification',
      description: 'A comprehensive test course',
      instructorId: testInstructor.id,
      price: 0,
      level: 'intermediate',
      category: 'programming',
      duration: 40,
      tags: ['javascript', 'certification'],
      isPublished: true,
      isFree: true,
      ...overrides,
    };

    const response = await request(app.getHttpServer())
      .post('/courses')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send(courseData)
      .expect(201);

    return response.body;
  }

  async function completeCourseLearning(courseId: string, userToken: string) {
    // Enroll in course
    await request(app.getHttpServer())
      .post('/enrollments')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ courseId })
      .expect(201);

    // Complete course progress
    await request(app.getHttpServer())
      .put(`/progress/courses/${courseId}/complete`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        score: 85,
        completionPercentage: 100,
      })
      .expect(200);
  }

  describe('Certificate Generation Flow', () => {
    it('should generate certificate upon course completion', async () => {
      const course = await createTestCourse({
        title: 'Certification Course',
        certificatesEnabled: true,
      });

      await completeCourseLearning(course.id, studentToken);

      // Request certificate generation
      const certificateResponse = await request(app.getHttpServer())
        .post('/certificates/generate')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: course.id,
          certificationTypeId: 'auto', // Auto-select based on course completion
        })
        .expect(201);

      expect(certificateResponse.body).toMatchObject({
        id: expect.any(String),
        userId: testStudent.id,
        courseId: course.id,
        certificateNumber: expect.stringMatching(/^CERT-\d{4}-[A-Z0-9]{8}$/),
        recipientName: testStudent.name,
        recipientEmail: testStudent.email,
        status: 'issued',
        issuedAt: expect.any(String),
      });

      // Verify certificate was saved in database
      const savedCertificate = await certificateRepository.findOne({
        where: { id: certificateResponse.body.id },
      });

      expect(savedCertificate).toBeDefined();
      expect(savedCertificate.verificationHash).toBeDefined();
      expect(savedCertificate.certificateUrl).toBeDefined();

      // Verify certificate file was generated
      if (savedCertificate.certificateUrl) {
        const filePath = path.join(process.cwd(), savedCertificate.certificateUrl);
        expect(fs.existsSync(filePath)).toBe(true);
      }
    });

    it('should generate professional certification with enhanced requirements', async () => {
      const course = await createTestCourse({
        title: 'Professional Development Course',
        certificatesEnabled: true,
        requiresProject: true,
      });

      await completeCourseLearning(course.id, studentToken);

      // Submit required project
      await request(app.getHttpServer())
        .post(`/courses/${course.id}/projects/submit`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          title: 'Final Project',
          description: 'My course completion project',
          submissionUrl: 'https://github.com/student/final-project',
        })
        .expect(201);

      // Get professional certification type
      const profCertType = await certificationTypeRepository.findOne({
        where: { name: 'Professional Certification' },
      });

      // Request professional certificate
      const certificateResponse = await request(app.getHttpServer())
        .post('/certificates/generate')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: course.id,
          certificationTypeId: profCertType.id,
        })
        .expect(201);

      expect(certificateResponse.body).toMatchObject({
        certificationTypeId: profCertType.id,
        status: 'issued',
        metadata: expect.objectContaining({
          courseId: course.id,
          courseName: course.title,
          instructorName: testInstructor.name,
          score: expect.any(Number),
        }),
      });

      // Verify expiration date is set (2 years for professional cert)
      const certificate = await certificateRepository.findOne({
        where: { id: certificateResponse.body.id },
      });

      expect(certificate.expiresAt).toBeDefined();
      const expirationTime = new Date(certificate.expiresAt).getTime();
      const issuedTime = new Date(certificate.issuedAt).getTime();
      const twoYears = 2 * 365 * 24 * 60 * 60 * 1000;
      
      expect(expirationTime - issuedTime).toBeCloseTo(twoYears, -5); // Allow small variance
    });

    it('should prevent certificate generation for incomplete courses', async () => {
      const course = await createTestCourse({
        title: 'Incomplete Course',
        certificatesEnabled: true,
      });

      // Enroll but don't complete
      await request(app.getHttpServer())
        .post('/enrollments')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ courseId: course.id })
        .expect(201);

      // Attempt certificate generation
      const certificateResponse = await request(app.getHttpServer())
        .post('/certificates/generate')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: course.id,
        })
        .expect(400);

      expect(certificateResponse.body.message).toContain('requirements not met');
    });

    it('should prevent duplicate certificates for same course', async () => {
      const course = await createTestCourse({
        title: 'No Duplicate Certs Course',
        certificatesEnabled: true,
      });

      await completeCourseLearning(course.id, studentToken);

      // First certificate generation
      await request(app.getHttpServer())
        .post('/certificates/generate')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ courseId: course.id })
        .expect(201);

      // Second certificate generation attempt
      const duplicateResponse = await request(app.getHttpServer())
        .post('/certificates/generate')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ courseId: course.id })
        .expect(400);

      expect(duplicateResponse.body.message).toContain('already exists');

      // Verify only one certificate exists
      const certificateCount = await certificateRepository.count({
        where: {
          userId: testStudent.id,
          courseId: course.id,
        },
      });

      expect(certificateCount).toBe(1);
    });

    it('should generate batch certificates for multiple students', async () => {
      const course = await createTestCourse({
        title: 'Batch Certificate Course',
        certificatesEnabled: true,
      });

      // Create multiple students and complete course
      const students = [];
      for (let i = 1; i <= 5; i++) {
        const studentResponse = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: `batch-student${i}@example.com`,
            password: 'SecurePass123!',
            firstName: 'Batch',
            lastName: `Student${i}`,
            name: `Batch Student${i}`,
            role: 'student',
          })
          .expect(201);

        students.push(studentResponse.body);

        await completeCourseLearning(course.id, studentResponse.body.access_token);
      }

      // Generate batch certificates (instructor action)
      const batchResponse = await request(app.getHttpServer())
        .post('/certificates/generate-batch')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          courseId: course.id,
          studentIds: students.map(s => s.user.id),
        })
        .expect(201);

      expect(batchResponse.body).toMatchObject({
        generated: 5,
        failed: 0,
        certificates: expect.arrayContaining([
          expect.objectContaining({
            userId: expect.any(String),
            certificateNumber: expect.any(String),
            status: 'issued',
          }),
        ]),
      });

      // Verify all certificates were created
      const certificateCount = await certificateRepository.count({
        where: { courseId: course.id },
      });

      expect(certificateCount).toBe(5);
    });
  });

  describe('Certificate Verification System', () => {
    let testCertificate: Certificate;

    beforeEach(async () => {
      const course = await createTestCourse({
        title: 'Verification Test Course',
        certificatesEnabled: true,
      });

      await completeCourseLearning(course.id, studentToken);

      const certificateResponse = await request(app.getHttpServer())
        .post('/certificates/generate')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ courseId: course.id })
        .expect(201);

      testCertificate = await certificateRepository.findOne({
        where: { id: certificateResponse.body.id },
      });
    });

    it('should verify certificate by certificate number', async () => {
      const verificationResponse = await request(app.getHttpServer())
        .get(`/certificates/verify/${testCertificate.certificateNumber}`)
        .expect(200);

      expect(verificationResponse.body).toMatchObject({
        valid: true,
        certificate: {
          id: testCertificate.id,
          certificateNumber: testCertificate.certificateNumber,
          recipientName: testCertificate.recipientName,
          recipientEmail: testCertificate.recipientEmail,
          status: 'issued',
          issuedAt: expect.any(String),
        },
        verification: {
          verifiedAt: expect.any(String),
          verificationMethod: 'certificate_number',
        },
      });

      // Verify that verification record was created
      const verificationRecord = await verificationRepository.findOne({
        where: { certificateId: testCertificate.id },
      });

      expect(verificationRecord).toBeDefined();
      expect(verificationRecord.verificationMethod).toBe('certificate_number');
      expect(verificationRecord.verifierInfo).toBeDefined();
    });

    it('should verify certificate by hash', async () => {
      const verificationResponse = await request(app.getHttpServer())
        .get(`/certificates/verify/hash/${testCertificate.verificationHash}`)
        .expect(200);

      expect(verificationResponse.body).toMatchObject({
        valid: true,
        certificate: {
          id: testCertificate.id,
          certificateNumber: testCertificate.certificateNumber,
        },
        verification: {
          verificationMethod: 'hash',
        },
      });
    });

    it('should handle verification of invalid certificate number', async () => {
      const invalidResponse = await request(app.getHttpServer())
        .get('/certificates/verify/INVALID-CERT-NUMBER')
        .expect(404);

      expect(invalidResponse.body).toMatchObject({
        valid: false,
        message: 'Certificate not found',
      });
    });

    it('should handle verification of revoked certificate', async () => {
      // Revoke the certificate
      await request(app.getHttpServer())
        .put(`/certificates/${testCertificate.id}/revoke`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          reason: 'Fraudulent submission detected',
        })
        .expect(200);

      const verificationResponse = await request(app.getHttpServer())
        .get(`/certificates/verify/${testCertificate.certificateNumber}`)
        .expect(200);

      expect(verificationResponse.body).toMatchObject({
        valid: false,
        certificate: {
          status: 'revoked',
          revocationReason: 'Fraudulent submission detected',
        },
      });
    });

    it('should verify certificate with QR code', async () => {
      // Generate QR code for certificate
      const qrResponse = await request(app.getHttpServer())
        .get(`/certificates/${testCertificate.id}/qr-code`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(qrResponse.body).toMatchObject({
        qrCodeUrl: expect.any(String),
        verificationUrl: expect.any(String),
      });

      // Verify using QR code data
      const qrVerificationResponse = await request(app.getHttpServer())
        .post('/certificates/verify/qr')
        .send({
          qrData: qrResponse.body.verificationUrl,
        })
        .expect(200);

      expect(qrVerificationResponse.body).toMatchObject({
        valid: true,
        certificate: {
          id: testCertificate.id,
        },
        verification: {
          verificationMethod: 'qr_code',
        },
      });
    });

    it('should track verification statistics', async () => {
      // Perform multiple verifications
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .get(`/certificates/verify/${testCertificate.certificateNumber}`)
          .expect(200);
      }

      // Get verification statistics
      const statsResponse = await request(app.getHttpServer())
        .get(`/certificates/${testCertificate.id}/verification-stats`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(statsResponse.body).toMatchObject({
        totalVerifications: 5,
        verificationMethods: {
          certificate_number: 5,
        },
        lastVerifiedAt: expect.any(String),
        verificationHistory: expect.arrayContaining([
          expect.objectContaining({
            verifiedAt: expect.any(String),
            verificationMethod: 'certificate_number',
          }),
        ]),
      });
    });
  });

  describe('Certificate Management', () => {
    it('should list user certificates with filtering', async () => {
      // Create multiple courses and certificates
      const courses = [];
      for (let i = 1; i <= 3; i++) {
        const course = await createTestCourse({
          title: `Certificate Course ${i}`,
          certificatesEnabled: true,
        });

        await completeCourseLearning(course.id, studentToken);

        await request(app.getHttpServer())
          .post('/certificates/generate')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({ courseId: course.id })
          .expect(201);

        courses.push(course);
      }

      // Get all certificates
      const allCertificatesResponse = await request(app.getHttpServer())
        .get('/certificates/my-certificates')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(allCertificatesResponse.body.length).toBe(3);

      // Filter by status
      const activeCertificatesResponse = await request(app.getHttpServer())
        .get('/certificates/my-certificates?status=issued')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(activeCertificatesResponse.body.length).toBe(3);

      // Filter by course
      const courseCertificatesResponse = await request(app.getHttpServer())
        .get(`/certificates/my-certificates?courseId=${courses[0].id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(courseCertificatesResponse.body.length).toBe(1);
    });

    it('should download certificate as PDF', async () => {
      const course = await createTestCourse({
        title: 'PDF Download Course',
        certificatesEnabled: true,
      });

      await completeCourseLearning(course.id, studentToken);

      const certificateResponse = await request(app.getHttpServer())
        .post('/certificates/generate')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ courseId: course.id })
        .expect(201);

      // Download certificate
      const downloadResponse = await request(app.getHttpServer())
        .get(`/certificates/${certificateResponse.body.id}/download`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(downloadResponse.headers['content-type']).toBe('application/pdf');
      expect(downloadResponse.headers['content-disposition']).toContain('attachment');
      expect(downloadResponse.body.length).toBeGreaterThan(0);
    });

    it('should handle certificate sharing', async () => {
      const course = await createTestCourse({
        title: 'Sharing Test Course',
        certificatesEnabled: true,
      });

      await completeCourseLearning(course.id, studentToken);

      const certificateResponse = await request(app.getHttpServer())
        .post('/certificates/generate')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ courseId: course.id })
        .expect(201);

      // Share certificate
      const shareResponse = await request(app.getHttpServer())
        .post(`/certificates/${certificateResponse.body.id}/share`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          platform: 'linkedin',
          message: 'Just completed an amazing course!',
        })
        .expect(200);

      expect(shareResponse.body).toMatchObject({
        shareUrl: expect.any(String),
        platform: 'linkedin',
        shareableContent: expect.objectContaining({
          title: expect.any(String),
          description: expect.any(String),
          imageUrl: expect.any(String),
        }),
      });
    });

    it('should handle certificate renewal for expired certificates', async () => {
      const course = await createTestCourse({
        title: 'Renewable Course',
        certificatesEnabled: true,
      });

      await completeCourseLearning(course.id, studentToken);

      // Create certificate with short expiration
      const certificateResponse = await request(app.getHttpServer())
        .post('/certificates/generate')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: course.id,
          validityPeriod: 1000, // 1 second
        })
        .expect(201);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Verify certificate is expired
      const verificationResponse = await request(app.getHttpServer())
        .get(`/certificates/verify/${certificateResponse.body.certificateNumber}`)
        .expect(200);

      expect(verificationResponse.body).toMatchObject({
        valid: false,
        certificate: {
          status: 'expired',
        },
      });

      // Renew certificate
      const renewalResponse = await request(app.getHttpServer())
        .post(`/certificates/${certificateResponse.body.id}/renew`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(renewalResponse.body).toMatchObject({
        id: expect.any(String),
        status: 'issued',
        issuedAt: expect.any(String),
        expiresAt: expect.any(String),
      });

      // Verify renewed certificate is valid
      const renewedVerificationResponse = await request(app.getHttpServer())
        .get(`/certificates/verify/${renewalResponse.body.certificateNumber}`)
        .expect(200);

      expect(renewedVerificationResponse.body.valid).toBe(true);
    });
  });

  describe('Certificate Security and Compliance', () => {
    it('should maintain certificate audit trail', async () => {
      const course = await createTestCourse({
        title: 'Audit Trail Course',
        certificatesEnabled: true,
      });

      await completeCourseLearning(course.id, studentToken);

      const certificateResponse = await request(app.getHttpServer())
        .post('/certificates/generate')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ courseId: course.id })
        .expect(201);

      const certificateId = certificateResponse.body.id;

      // Perform various actions that should be audited
      await request(app.getHttpServer())
        .get(`/certificates/verify/${certificateResponse.body.certificateNumber}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/certificates/${certificateId}/download`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      // Get audit trail
      const auditResponse = await request(app.getHttpServer())
        .get(`/certificates/${certificateId}/audit-trail`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(auditResponse.body).toMatchObject({
        certificateId: certificateId,
        events: expect.arrayContaining([
          expect.objectContaining({
            action: 'certificate_generated',
            timestamp: expect.any(String),
            actor: testStudent.id,
          }),
          expect.objectContaining({
            action: 'certificate_verified',
            timestamp: expect.any(String),
          }),
          expect.objectContaining({
            action: 'certificate_downloaded',
            timestamp: expect.any(String),
            actor: testStudent.id,
          }),
        ]),
      });
    });

    it('should validate certificate authenticity with blockchain integration', async () => {
      const course = await createTestCourse({
        title: 'Blockchain Verified Course',
        certificatesEnabled: true,
        blockchainVerification: true,
      });

      await completeCourseLearning(course.id, studentToken);

      const certificateResponse = await request(app.getHttpServer())
        .post('/certificates/generate')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: course.id,
          enableBlockchainVerification: true,
        })
        .expect(201);

      expect(certificateResponse.body).toMatchObject({
        blockchainTxHash: expect.any(String),
        blockchainNetwork: 'testnet',
      });

      // Verify blockchain transaction
      const blockchainVerificationResponse = await request(app.getHttpServer())
        .get(`/certificates/${certificateResponse.body.id}/blockchain-verification`)
        .expect(200);

      expect(blockchainVerificationResponse.body).toMatchObject({
        isValid: true,
        transactionHash: certificateResponse.body.blockchainTxHash,
        blockNumber: expect.any(Number),
        confirmations: expect.any(Number),
      });
    });

    it('should handle certificate fraud detection', async () => {
      const course = await createTestCourse({
        title: 'Fraud Detection Course',
        certificatesEnabled: true,
      });

      await completeCourseLearning(course.id, studentToken);

      const certificateResponse = await request(app.getHttpServer())
        .post('/certificates/generate')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ courseId: course.id })
        .expect(201);

      // Simulate suspicious verification patterns
      const suspiciousIps = [
        '192.168.1.1',
        '10.0.0.1',
        '172.16.0.1',
        '203.0.113.1',
      ];

      for (const ip of suspiciousIps) {
        await request(app.getHttpServer())
          .get(`/certificates/verify/${certificateResponse.body.certificateNumber}`)
          .set('X-Forwarded-For', ip)
          .expect(200);
      }

      // Check fraud detection alerts
      const fraudAlertResponse = await request(app.getHttpServer())
        .get(`/certificates/${certificateResponse.body.id}/fraud-alerts`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(fraudAlertResponse.body).toMatchObject({
        alertLevel: expect.stringMatching(/^(low|medium|high)$/),
        alerts: expect.arrayContaining([
          expect.objectContaining({
            type: 'unusual_verification_pattern',
            severity: expect.any(String),
            description: expect.any(String),
          }),
        ]),
      });
    });
  });
});
