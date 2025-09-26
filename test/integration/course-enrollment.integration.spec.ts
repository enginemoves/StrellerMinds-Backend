import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AuthModule } from '../../src/auth/auth.module';
import { UsersModule } from '../../src/users/users.module';
import { CoursesModule } from '../../src/courses/courses.module';
import { EnrollmentModule } from '../../src/enrollment/enrollment.module';
import { ProgressModule } from '../../src/progress/progress.module';
import { PaymentModule } from '../../src/payment/payment.module';
import { User } from '../../src/users/entities/user.entity';
import { Course } from '../../src/courses/entities/course.entity';
import { Enrollment } from '../../src/enrollment/entities/enrollment.entity';
import { Progress } from '../../src/progress/entities/progress.entity';
import { PaymentEntity } from '../../src/payment/entities/payment.entity';
import { DatabaseTestModule } from '../utils/database-test.module';

describe('Course Enrollment Integration Tests', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let userRepository: Repository<User>;
  let courseRepository: Repository<Course>;
  let enrollmentRepository: Repository<Enrollment>;
  let progressRepository: Repository<Progress>;
  let paymentRepository: Repository<PaymentEntity>;

  let testUser: User;
  let testInstructor: User;
  let accessToken: string;
  let instructorToken: string;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        DatabaseTestModule,
        TypeOrmModule.forFeature([User, Course, Enrollment, Progress, PaymentEntity]),
        AuthModule,
        UsersModule,
        CoursesModule,
        EnrollmentModule,
        ProgressModule,
        PaymentModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    userRepository = moduleRef.get<Repository<User>>(getRepositoryToken(User));
    courseRepository = moduleRef.get<Repository<Course>>(getRepositoryToken(Course));
    enrollmentRepository = moduleRef.get<Repository<Enrollment>>(getRepositoryToken(Enrollment));
    progressRepository = moduleRef.get<Repository<Progress>>(getRepositoryToken(Progress));
    paymentRepository = moduleRef.get<Repository<PaymentEntity>>(getRepositoryToken(PaymentEntity));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean database before each test
    await progressRepository.clear();
    await enrollmentRepository.clear();
    await paymentRepository.clear();
    await courseRepository.clear();
    await userRepository.clear();

    // Create test users
    await setupTestUsers();
  });

  async function setupTestUsers() {
    // Create student user
    const studentResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'student@example.com',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'Student',
        name: 'Test Student',
        role: 'student',
      })
      .expect(201);

    testUser = await userRepository.findOne({
      where: { email: 'student@example.com' },
    });
    accessToken = studentResponse.body.access_token;

    // Create instructor user
    const instructorResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'instructor@example.com',
        password: 'SecurePass123!',
        firstName: 'Test',
        lastName: 'Instructor',
        name: 'Test Instructor',
        role: 'instructor',
      })
      .expect(201);

    testInstructor = await userRepository.findOne({
      where: { email: 'instructor@example.com' },
    });
    instructorToken = instructorResponse.body.access_token;
  }

  async function createTestCourse(overrides = {}) {
    const courseData = {
      title: 'Test Course',
      description: 'A comprehensive test course',
      instructorId: testInstructor.id,
      price: 99.99,
      currency: 'USD',
      level: 'beginner',
      category: 'programming',
      duration: 40,
      tags: ['javascript', 'web-development'],
      isPublished: true,
      ...overrides,
    };

    const response = await request(app.getHttpServer())
      .post('/courses')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send(courseData)
      .expect(201);

    return response.body;
  }

  describe('Course Enrollment Flow', () => {
    it('should complete full enrollment flow for paid course', async () => {
      // Step 1: Create a course
      const course = await createTestCourse({
        title: 'Paid Course',
        price: 49.99,
      });

      // Step 2: Initiate course enrollment (should create payment)
      const enrollmentResponse = await request(app.getHttpServer())
        .post('/enrollments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          courseId: course.id,
          paymentMethodId: 'pm_test_card_visa',
        })
        .expect(201);

      expect(enrollmentResponse.body).toMatchObject({
        id: expect.any(String),
        studentId: testUser.id,
        courseId: course.id,
        status: 'pending',
        paymentStatus: 'pending',
      });

      // Step 3: Verify payment was created
      const payment = await paymentRepository.findOne({
        where: { 
          userId: testUser.id,
          courseId: course.id,
        },
      });

      expect(payment).toBeDefined();
      expect(payment.amount).toBe(4999); // Amount in cents
      expect(payment.currency).toBe('USD');
      expect(payment.type).toBe('course_purchase');

      // Step 4: Simulate successful payment
      await request(app.getHttpServer())
        .post(`/payments/${payment.id}/process`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          paymentMethodId: 'pm_test_card_visa',
          confirm: true,
        })
        .expect(200);

      // Step 5: Verify enrollment status updated
      const updatedEnrollment = await enrollmentRepository.findOne({
        where: { id: enrollmentResponse.body.id },
      });

      expect(updatedEnrollment.status).toBe('enrolled');
      expect(updatedEnrollment.paymentStatus).toBe('paid');

      // Step 6: Verify user can access course content
      const courseAccessResponse = await request(app.getHttpServer())
        .get(`/courses/${course.id}/content`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(courseAccessResponse.body).toBeDefined();

      // Step 7: Verify progress tracking is initialized
      const progress = await progressRepository.findOne({
        where: { 
          userId: testUser.id,
          courseId: course.id,
        },
      });

      expect(progress).toBeDefined();
      expect(progress.completionPercentage).toBe(0);
      expect(progress.status).toBe('in_progress');
    });

    it('should allow enrollment in free courses without payment', async () => {
      // Create free course
      const course = await createTestCourse({
        title: 'Free Course',
        price: 0,
        isFree: true,
      });

      // Enroll in free course
      const enrollmentResponse = await request(app.getHttpServer())
        .post('/enrollments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          courseId: course.id,
        })
        .expect(201);

      expect(enrollmentResponse.body).toMatchObject({
        studentId: testUser.id,
        courseId: course.id,
        status: 'enrolled',
        paymentStatus: 'free',
      });

      // Verify no payment was created for free course
      const paymentCount = await paymentRepository.count({
        where: { 
          userId: testUser.id,
          courseId: course.id,
        },
      });

      expect(paymentCount).toBe(0);

      // Verify immediate access to course content
      await request(app.getHttpServer())
        .get(`/courses/${course.id}/content`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should prevent duplicate enrollment', async () => {
      const course = await createTestCourse();

      // First enrollment
      await request(app.getHttpServer())
        .post('/enrollments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          courseId: course.id,
          paymentMethodId: 'pm_test_card_visa',
        })
        .expect(201);

      // Attempt duplicate enrollment
      const duplicateResponse = await request(app.getHttpServer())
        .post('/enrollments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          courseId: course.id,
          paymentMethodId: 'pm_test_card_visa',
        })
        .expect(400);

      expect(duplicateResponse.body.message).toContain('already enrolled');

      // Verify only one enrollment exists
      const enrollmentCount = await enrollmentRepository.count({
        where: {
          studentId: testUser.id,
          courseId: course.id,
        },
      });

      expect(enrollmentCount).toBe(1);
    });

    it('should handle course capacity limits', async () => {
      const course = await createTestCourse({
        title: 'Limited Capacity Course',
        maxStudents: 2,
      });

      // Create additional students
      const students = [];
      for (let i = 0; i < 3; i++) {
        const studentResponse = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: `student${i}@example.com`,
            password: 'SecurePass123!',
            firstName: 'Student',
            lastName: `${i}`,
            name: `Student ${i}`,
            role: 'student',
          })
          .expect(201);

        students.push(studentResponse.body);
      }

      // First two enrollments should succeed
      for (let i = 0; i < 2; i++) {
        await request(app.getHttpServer())
          .post('/enrollments')
          .set('Authorization', `Bearer ${students[i].access_token}`)
          .send({
            courseId: course.id,
            paymentMethodId: 'pm_test_card_visa',
          })
          .expect(201);
      }

      // Third enrollment should fail due to capacity
      const capacityResponse = await request(app.getHttpServer())
        .post('/enrollments')
        .set('Authorization', `Bearer ${students[2].access_token}`)
        .send({
          courseId: course.id,
          paymentMethodId: 'pm_test_card_visa',
        })
        .expect(400);

      expect(capacityResponse.body.message).toContain('capacity');
    });

    it('should enforce prerequisite requirements', async () => {
      // Create prerequisite course
      const prerequisiteCourse = await createTestCourse({
        title: 'Prerequisite Course',
        isFree: true,
      });

      // Create main course with prerequisite
      const mainCourse = await createTestCourse({
        title: 'Advanced Course',
        prerequisites: [prerequisiteCourse.id],
      });

      // Attempt to enroll in main course without prerequisite
      const rejectionResponse = await request(app.getHttpServer())
        .post('/enrollments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          courseId: mainCourse.id,
          paymentMethodId: 'pm_test_card_visa',
        })
        .expect(400);

      expect(rejectionResponse.body.message).toContain('prerequisite');

      // Complete prerequisite course
      await request(app.getHttpServer())
        .post('/enrollments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          courseId: prerequisiteCourse.id,
        })
        .expect(201);

      // Complete the prerequisite course
      await request(app.getHttpServer())
        .put(`/progress/${prerequisiteCourse.id}/complete`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Now enrollment in main course should succeed
      await request(app.getHttpServer())
        .post('/enrollments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          courseId: mainCourse.id,
          paymentMethodId: 'pm_test_card_visa',
        })
        .expect(201);
    });
  });

  describe('Course Progress and Completion', () => {
    let enrolledCourse: any;

    beforeEach(async () => {
      enrolledCourse = await createTestCourse({
        title: 'Progress Tracking Course',
        isFree: true,
      });

      // Enroll user in course
      await request(app.getHttpServer())
        .post('/enrollments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          courseId: enrolledCourse.id,
        })
        .expect(201);
    });

    it('should track lesson completion progress', async () => {
      // Create lessons for the course
      const lessons = [];
      for (let i = 1; i <= 5; i++) {
        const lessonResponse = await request(app.getHttpServer())
          .post(`/courses/${enrolledCourse.id}/lessons`)
          .set('Authorization', `Bearer ${instructorToken}`)
          .send({
            title: `Lesson ${i}`,
            content: `Content for lesson ${i}`,
            order: i,
          })
          .expect(201);

        lessons.push(lessonResponse.body);
      }

      // Complete lessons one by one
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post(`/progress/lessons/${lessons[i].id}/complete`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        // Check progress
        const progressResponse = await request(app.getHttpServer())
          .get(`/progress/courses/${enrolledCourse.id}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);

        const expectedPercentage = ((i + 1) / lessons.length) * 100;
        expect(progressResponse.body.completionPercentage).toBe(expectedPercentage);
      }

      // Complete remaining lessons
      for (let i = 3; i < lessons.length; i++) {
        await request(app.getHttpServer())
          .post(`/progress/lessons/${lessons[i].id}/complete`)
          .set('Authorization', `Bearer ${accessToken}`)
          .expect(200);
      }

      // Verify course completion
      const finalProgressResponse = await request(app.getHttpServer())
        .get(`/progress/courses/${enrolledCourse.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(finalProgressResponse.body.completionPercentage).toBe(100);
      expect(finalProgressResponse.body.status).toBe('completed');
      expect(finalProgressResponse.body.completedAt).toBeDefined();
    });

    it('should handle quiz submissions and grading', async () => {
      // Create a quiz for the course
      const quizResponse = await request(app.getHttpServer())
        .post(`/courses/${enrolledCourse.id}/quizzes`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({
          title: 'Course Quiz',
          questions: [
            {
              question: 'What is 2 + 2?',
              options: ['3', '4', '5', '6'],
              correctAnswer: 1,
              points: 10,
            },
            {
              question: 'What is the capital of France?',
              options: ['London', 'Berlin', 'Paris', 'Madrid'],
              correctAnswer: 2,
              points: 10,
            },
          ],
          passingScore: 15,
        })
        .expect(201);

      const quiz = quizResponse.body;

      // Submit quiz answers
      const submissionResponse = await request(app.getHttpServer())
        .post(`/progress/quizzes/${quiz.id}/submit`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          answers: [1, 2], // Both correct answers
        })
        .expect(200);

      expect(submissionResponse.body).toMatchObject({
        score: 20,
        passed: true,
        totalQuestions: 2,
        correctAnswers: 2,
      });

      // Verify progress was updated
      const progressResponse = await request(app.getHttpServer())
        .get(`/progress/courses/${enrolledCourse.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(progressResponse.body.quizzes).toContainEqual({
        quizId: quiz.id,
        score: 20,
        passed: true,
        attempts: 1,
      });
    });

    it('should calculate time spent on course', async () => {
      // Start course session
      await request(app.getHttpServer())
        .post(`/progress/courses/${enrolledCourse.id}/start-session`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Simulate some time passing
      await new Promise(resolve => setTimeout(resolve, 100));

      // End course session
      await request(app.getHttpServer())
        .post(`/progress/courses/${enrolledCourse.id}/end-session`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Check time tracking
      const progressResponse = await request(app.getHttpServer())
        .get(`/progress/courses/${enrolledCourse.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(progressResponse.body.timeSpent).toBeGreaterThan(0);
      expect(progressResponse.body.lastAccessedAt).toBeDefined();
    });

    it('should generate completion certificate', async () => {
      // Complete the course (mock completion)
      await request(app.getHttpServer())
        .put(`/progress/courses/${enrolledCourse.id}/complete`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Request certificate generation
      const certificateResponse = await request(app.getHttpServer())
        .post(`/certificates/generate`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          courseId: enrolledCourse.id,
          userId: testUser.id,
        })
        .expect(201);

      expect(certificateResponse.body).toMatchObject({
        id: expect.any(String),
        userId: testUser.id,
        courseId: enrolledCourse.id,
        certificateNumber: expect.any(String),
        status: 'issued',
        recipientName: testUser.name,
        recipientEmail: testUser.email,
      });

      // Verify certificate can be downloaded
      await request(app.getHttpServer())
        .get(`/certificates/${certificateResponse.body.id}/download`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });
  });

  describe('Enrollment Management', () => {
    it('should allow unenrollment with refund handling', async () => {
      const course = await createTestCourse({
        title: 'Refundable Course',
        price: 99.99,
        refundPolicy: '30_days',
      });

      // Enroll in course
      const enrollmentResponse = await request(app.getHttpServer())
        .post('/enrollments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          courseId: course.id,
          paymentMethodId: 'pm_test_card_visa',
        })
        .expect(201);

      // Process payment
      const payment = await paymentRepository.findOne({
        where: { 
          userId: testUser.id,
          courseId: course.id,
        },
      });

      await request(app.getHttpServer())
        .post(`/payments/${payment.id}/process`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          paymentMethodId: 'pm_test_card_visa',
          confirm: true,
        })
        .expect(200);

      // Request unenrollment with refund
      const unenrollResponse = await request(app.getHttpServer())
        .delete(`/enrollments/${enrollmentResponse.body.id}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          reason: 'Changed my mind',
          requestRefund: true,
        })
        .expect(200);

      expect(unenrollResponse.body.message).toContain('unenrolled');
      expect(unenrollResponse.body.refundStatus).toBe('pending');

      // Verify enrollment status
      const updatedEnrollment = await enrollmentRepository.findOne({
        where: { id: enrollmentResponse.body.id },
      });

      expect(updatedEnrollment.status).toBe('unenrolled');
      expect(updatedEnrollment.unenrolledAt).toBeDefined();
    });

    it('should list user enrollments with filtering', async () => {
      // Create multiple courses and enroll
      const courses = [];
      for (let i = 1; i <= 3; i++) {
        const course = await createTestCourse({
          title: `Course ${i}`,
          isFree: true,
        });

        await request(app.getHttpServer())
          .post('/enrollments')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ courseId: course.id })
          .expect(201);

        courses.push(course);
      }

      // Complete one course
      await request(app.getHttpServer())
        .put(`/progress/courses/${courses[0].id}/complete`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      // Get all enrollments
      const allEnrollmentsResponse = await request(app.getHttpServer())
        .get('/enrollments/my-enrollments')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(allEnrollmentsResponse.body.length).toBe(3);

      // Filter by status
      const activeEnrollmentsResponse = await request(app.getHttpServer())
        .get('/enrollments/my-enrollments?status=enrolled')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(activeEnrollmentsResponse.body.length).toBe(3);

      // Filter by completion status
      const completedEnrollmentsResponse = await request(app.getHttpServer())
        .get('/enrollments/my-enrollments?completed=true')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(completedEnrollmentsResponse.body.length).toBe(1);
    });

    it('should handle enrollment analytics for instructors', async () => {
      const course = await createTestCourse({
        title: 'Analytics Course',
        isFree: true,
      });

      // Create multiple students and enroll them
      const students = [];
      for (let i = 1; i <= 10; i++) {
        const studentResponse = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: `analytics-student${i}@example.com`,
            password: 'SecurePass123!',
            firstName: 'Student',
            lastName: `${i}`,
            name: `Student ${i}`,
            role: 'student',
          })
          .expect(201);

        await request(app.getHttpServer())
          .post('/enrollments')
          .set('Authorization', `Bearer ${studentResponse.body.access_token}`)
          .send({ courseId: course.id })
          .expect(201);

        students.push(studentResponse.body);
      }

      // Get enrollment analytics
      const analyticsResponse = await request(app.getHttpServer())
        .get(`/courses/${course.id}/analytics/enrollments`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .expect(200);

      expect(analyticsResponse.body).toMatchObject({
        totalEnrollments: 10,
        activeEnrollments: 10,
        completedEnrollments: 0,
        enrollmentRate: expect.any(Number),
        averageProgress: expect.any(Number),
      });
    });
  });

  describe('Enrollment Edge Cases', () => {
    it('should handle concurrent enrollment attempts', async () => {
      const course = await createTestCourse({
        title: 'Concurrent Enrollment Test',
        maxStudents: 1,
      });

      // Create multiple students
      const students = [];
      for (let i = 0; i < 3; i++) {
        const studentResponse = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: `concurrent${i}@example.com`,
            password: 'SecurePass123!',
            firstName: 'Student',
            lastName: `${i}`,
            name: `Student ${i}`,
            role: 'student',
          })
          .expect(201);

        students.push(studentResponse.body);
      }

      // Attempt concurrent enrollments
      const enrollmentPromises = students.map(student =>
        request(app.getHttpServer())
          .post('/enrollments')
          .set('Authorization', `Bearer ${student.access_token}`)
          .send({
            courseId: course.id,
            paymentMethodId: 'pm_test_card_visa',
          })
      );

      const responses = await Promise.allSettled(enrollmentPromises);
      
      // Only one should succeed due to capacity limit
      const successful = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 201
      ).length;

      expect(successful).toBe(1);

      // Verify only one enrollment exists
      const enrollmentCount = await enrollmentRepository.count({
        where: { courseId: course.id },
      });

      expect(enrollmentCount).toBe(1);
    });

    it('should handle enrollment during course archival', async () => {
      const course = await createTestCourse({
        title: 'Archival Test Course',
        isFree: true,
      });

      // Archive the course
      await request(app.getHttpServer())
        .put(`/courses/${course.id}/archive`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .expect(200);

      // Attempt enrollment in archived course
      const enrollmentResponse = await request(app.getHttpServer())
        .post('/enrollments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ courseId: course.id })
        .expect(400);

      expect(enrollmentResponse.body.message).toContain('archived');
    });

    it('should handle enrollment with expired course', async () => {
      const course = await createTestCourse({
        title: 'Expired Course',
        isFree: true,
        enrollmentDeadline: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      });

      const enrollmentResponse = await request(app.getHttpServer())
        .post('/enrollments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ courseId: course.id })
        .expect(400);

      expect(enrollmentResponse.body.message).toContain('deadline');
    });
  });
});
