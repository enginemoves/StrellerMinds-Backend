import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AuthModule } from '../../src/auth/auth.module';
import { UsersModule } from '../../src/users/users.module';
import { PaymentModule } from '../../src/payment/payment.module';
import { CoursesModule } from '../../src/courses/courses.module';
import { EnrollmentModule } from '../../src/enrollment/enrollment.module';
import { User } from '../../src/users/entities/user.entity';
import { Course } from '../../src/courses/entities/course.entity';
import { PaymentEntity, PaymentStatus, PaymentType } from '../../src/payment/entities/payment.entity';
import { InvoiceEntity } from '../../src/payment/entities/invoice.entity';
import { SubscriptionEntity } from '../../src/payment/entities/subscription.entity';
import { Enrollment } from '../../src/enrollment/entities/enrollment.entity';
import { DatabaseTestModule } from '../utils/database-test.module';

describe('Payment Processing Integration Tests', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let userRepository: Repository<User>;
  let courseRepository: Repository<Course>;
  let paymentRepository: Repository<PaymentEntity>;
  let invoiceRepository: Repository<InvoiceEntity>;
  let subscriptionRepository: Repository<SubscriptionEntity>;
  let enrollmentRepository: Repository<Enrollment>;

  let testStudent: User;
  let testInstructor: User;
  let studentToken: string;
  let instructorToken: string;

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
          PaymentEntity,
          InvoiceEntity,
          SubscriptionEntity,
          Enrollment,
        ]),
        AuthModule,
        UsersModule,
        PaymentModule,
        CoursesModule,
        EnrollmentModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    userRepository = moduleRef.get<Repository<User>>(getRepositoryToken(User));
    courseRepository = moduleRef.get<Repository<Course>>(getRepositoryToken(Course));
    paymentRepository = moduleRef.get<Repository<PaymentEntity>>(getRepositoryToken(PaymentEntity));
    invoiceRepository = moduleRef.get<Repository<InvoiceEntity>>(getRepositoryToken(InvoiceEntity));
    subscriptionRepository = moduleRef.get<Repository<SubscriptionEntity>>(getRepositoryToken(SubscriptionEntity));
    enrollmentRepository = moduleRef.get<Repository<Enrollment>>(getRepositoryToken(Enrollment));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean database before each test
    await invoiceRepository.clear();
    await subscriptionRepository.clear();
    await paymentRepository.clear();
    await enrollmentRepository.clear();
    await courseRepository.clear();
    await userRepository.clear();

    await setupTestUsers();
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
  }

  async function createTestCourse(overrides = {}) {
    const courseData = {
      title: 'Payment Test Course',
      description: 'A course for testing payment processing',
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

  describe('Course Purchase Payment Flow', () => {
    it('should complete full course purchase flow with card payment', async () => {
      const course = await createTestCourse({
        title: 'Premium Course',
        price: 149.99,
      });

      // Step 1: Create payment for course purchase
      const paymentResponse = await request(app.getHttpServer())
        .post('/payments/course-purchase')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: course.id,
          amount: 14999, // Amount in cents
          currency: 'USD',
          paymentMethodId: 'pm_card_visa',
          customerEmail: testStudent.email,
          customerName: testStudent.name,
        })
        .expect(201);

      expect(paymentResponse.body).toMatchObject({
        id: expect.any(String),
        userId: testStudent.id,
        courseId: course.id,
        amount: 14999,
        currency: 'USD',
        status: PaymentStatus.PENDING,
        type: PaymentType.COURSE_PURCHASE,
        stripePaymentIntentId: expect.any(String),
      });

      const paymentId = paymentResponse.body.id;

      // Step 2: Process the payment
      const processResponse = await request(app.getHttpServer())
        .post(`/payments/${paymentId}/process`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          paymentMethodId: 'pm_card_visa',
          confirm: true,
        })
        .expect(200);

      expect(processResponse.body).toMatchObject({
        id: paymentId,
        status: PaymentStatus.COMPLETED,
        completedAt: expect.any(String),
      });

      // Step 3: Verify payment record in database
      const savedPayment = await paymentRepository.findOne({
        where: { id: paymentId },
      });

      expect(savedPayment.status).toBe(PaymentStatus.COMPLETED);
      expect(savedPayment.completedAt).toBeDefined();

      // Step 4: Verify enrollment was created automatically
      const enrollment = await enrollmentRepository.findOne({
        where: {
          studentId: testStudent.id,
          courseId: course.id,
        },
      });

      expect(enrollment).toBeDefined();
      expect(enrollment.status).toBe('enrolled');
      expect(enrollment.paymentStatus).toBe('paid');

      // Step 5: Verify invoice was generated
      const invoice = await invoiceRepository.findOne({
        where: { paymentId: paymentId },
      });

      expect(invoice).toBeDefined();
      expect(invoice.amount).toBe(14999);
      expect(invoice.status).toBe('paid');
    });

    it('should handle payment failure gracefully', async () => {
      const course = await createTestCourse({
        title: 'Failed Payment Course',
        price: 99.99,
      });

      // Create payment
      const paymentResponse = await request(app.getHttpServer())
        .post('/payments/course-purchase')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: course.id,
          amount: 9999,
          currency: 'USD',
          paymentMethodId: 'pm_card_visa_chargeDeclined',
        })
        .expect(201);

      const paymentId = paymentResponse.body.id;

      // Attempt to process payment (should fail)
      const processResponse = await request(app.getHttpServer())
        .post(`/payments/${paymentId}/process`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          paymentMethodId: 'pm_card_visa_chargeDeclined',
          confirm: true,
        })
        .expect(400);

      expect(processResponse.body.message).toContain('failed');

      // Verify payment status
      const failedPayment = await paymentRepository.findOne({
        where: { id: paymentId },
      });

      expect(failedPayment.status).toBe(PaymentStatus.FAILED);
      expect(failedPayment.failureReason).toBeDefined();

      // Verify no enrollment was created
      const enrollmentCount = await enrollmentRepository.count({
        where: {
          studentId: testStudent.id,
          courseId: course.id,
        },
      });

      expect(enrollmentCount).toBe(0);
    });

    it('should handle payment with discount coupon', async () => {
      const course = await createTestCourse({
        title: 'Discounted Course',
        price: 200.00,
      });

      const originalAmount = 20000; // $200 in cents
      const discountAmount = 5000; // $50 discount
      const finalAmount = originalAmount - discountAmount;

      const paymentResponse = await request(app.getHttpServer())
        .post('/payments/course-purchase')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: course.id,
          amount: finalAmount,
          currency: 'USD',
          paymentMethodId: 'pm_card_visa',
          couponCode: 'SAVE50',
          discountAmount: discountAmount,
        })
        .expect(201);

      expect(paymentResponse.body).toMatchObject({
        amount: finalAmount,
        discountAmount: discountAmount,
        couponCode: 'SAVE50',
      });

      // Process payment
      await request(app.getHttpServer())
        .post(`/payments/${paymentResponse.body.id}/process`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          paymentMethodId: 'pm_card_visa',
          confirm: true,
        })
        .expect(200);

      // Verify invoice includes discount information
      const invoice = await invoiceRepository.findOne({
        where: { paymentId: paymentResponse.body.id },
      });

      expect(invoice.metadata).toMatchObject({
        originalAmount: originalAmount,
        discountAmount: discountAmount,
        couponCode: 'SAVE50',
      });
    });

    it('should handle international payments with currency conversion', async () => {
      const course = await createTestCourse({
        title: 'International Course',
        price: 99.99,
        currency: 'EUR',
      });

      const paymentResponse = await request(app.getHttpServer())
        .post('/payments/course-purchase')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: course.id,
          amount: 9999, // €99.99 in cents
          currency: 'EUR',
          paymentMethodId: 'pm_card_visa',
          billingAddress: 'Berlin, Germany',
        })
        .expect(201);

      expect(paymentResponse.body).toMatchObject({
        currency: 'EUR',
        billingAddress: 'Berlin, Germany',
      });

      await request(app.getHttpServer())
        .post(`/payments/${paymentResponse.body.id}/process`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          paymentMethodId: 'pm_card_visa',
          confirm: true,
        })
        .expect(200);

      // Verify currency is maintained throughout the process
      const savedPayment = await paymentRepository.findOne({
        where: { id: paymentResponse.body.id },
      });

      expect(savedPayment.currency).toBe('EUR');
    });

    it('should handle payment with tax calculation', async () => {
      const course = await createTestCourse({
        title: 'Taxable Course',
        price: 100.00,
      });

      const baseAmount = 10000; // $100
      const taxAmount = 825; // $8.25 (8.25% tax)
      const totalAmount = baseAmount + taxAmount;

      const paymentResponse = await request(app.getHttpServer())
        .post('/payments/course-purchase')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: course.id,
          amount: totalAmount,
          currency: 'USD',
          taxAmount: taxAmount,
          paymentMethodId: 'pm_card_visa',
          billingAddress: 'California, USA',
        })
        .expect(201);

      expect(paymentResponse.body).toMatchObject({
        amount: totalAmount,
        taxAmount: taxAmount,
      });

      await request(app.getHttpServer())
        .post(`/payments/${paymentResponse.body.id}/process`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          paymentMethodId: 'pm_card_visa',
          confirm: true,
        })
        .expect(200);

      // Verify tax information in invoice
      const invoice = await invoiceRepository.findOne({
        where: { paymentId: paymentResponse.body.id },
      });

      expect(invoice.taxAmount).toBe(taxAmount);
      expect(invoice.metadata.taxRate).toBeDefined();
    });
  });

  describe('Subscription Payment Flow', () => {
    it('should create and process subscription payment', async () => {
      // Create subscription
      const subscriptionResponse = await request(app.getHttpServer())
        .post('/payments/subscriptions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          planId: 'premium_monthly',
          priceId: 'price_premium_monthly',
          paymentMethodId: 'pm_card_visa',
        })
        .expect(201);

      expect(subscriptionResponse.body).toMatchObject({
        id: expect.any(String),
        userId: testStudent.id,
        planId: 'premium_monthly',
        status: 'active',
        currentPeriodStart: expect.any(String),
        currentPeriodEnd: expect.any(String),
      });

      // Verify subscription was saved
      const subscription = await subscriptionRepository.findOne({
        where: { id: subscriptionResponse.body.id },
      });

      expect(subscription).toBeDefined();
      expect(subscription.status).toBe('active');

      // Verify initial payment was created
      const payment = await paymentRepository.findOne({
        where: {
          userId: testStudent.id,
          subscriptionId: subscription.id,
          type: PaymentType.SUBSCRIPTION,
        },
      });

      expect(payment).toBeDefined();
      expect(payment.status).toBe(PaymentStatus.COMPLETED);
    });

    it('should handle subscription renewal payment', async () => {
      // Create subscription
      const subscriptionResponse = await request(app.getHttpServer())
        .post('/payments/subscriptions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          planId: 'premium_monthly',
          priceId: 'price_premium_monthly',
          paymentMethodId: 'pm_card_visa',
        })
        .expect(201);

      const subscriptionId = subscriptionResponse.body.id;

      // Simulate subscription renewal
      const renewalResponse = await request(app.getHttpServer())
        .post(`/payments/subscriptions/${subscriptionId}/renew`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(renewalResponse.body).toMatchObject({
        paymentId: expect.any(String),
        status: 'completed',
        amount: expect.any(Number),
      });

      // Verify renewal payment was created
      const renewalPayment = await paymentRepository.findOne({
        where: { id: renewalResponse.body.paymentId },
      });

      expect(renewalPayment.type).toBe(PaymentType.SUBSCRIPTION);
      expect(renewalPayment.metadata.renewalFor).toBe(subscriptionId);
    });

    it('should handle subscription cancellation and refunds', async () => {
      // Create subscription
      const subscriptionResponse = await request(app.getHttpServer())
        .post('/payments/subscriptions')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          planId: 'premium_monthly',
          priceId: 'price_premium_monthly',
          paymentMethodId: 'pm_card_visa',
        })
        .expect(201);

      const subscriptionId = subscriptionResponse.body.id;

      // Cancel subscription with refund
      const cancellationResponse = await request(app.getHttpServer())
        .delete(`/payments/subscriptions/${subscriptionId}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          reason: 'Not satisfied with service',
          requestRefund: true,
        })
        .expect(200);

      expect(cancellationResponse.body).toMatchObject({
        status: 'cancelled',
        refundAmount: expect.any(Number),
        refundStatus: 'processing',
      });

      // Verify subscription status
      const cancelledSubscription = await subscriptionRepository.findOne({
        where: { id: subscriptionId },
      });

      expect(cancelledSubscription.status).toBe('cancelled');
      expect(cancelledSubscription.cancelledAt).toBeDefined();

      // Verify refund payment was created
      const refundPayment = await paymentRepository.findOne({
        where: {
          subscriptionId: subscriptionId,
          type: PaymentType.REFUND,
        },
      });

      expect(refundPayment).toBeDefined();
      expect(refundPayment.status).toBe(PaymentStatus.PROCESSING);
    });
  });

  describe('Payment Security and Validation', () => {
    it('should prevent duplicate payments for same course', async () => {
      const course = await createTestCourse({
        title: 'Duplicate Prevention Course',
        price: 99.99,
      });

      // First payment
      const firstPaymentResponse = await request(app.getHttpServer())
        .post('/payments/course-purchase')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: course.id,
          amount: 9999,
          currency: 'USD',
          paymentMethodId: 'pm_card_visa',
        })
        .expect(201);

      // Process first payment
      await request(app.getHttpServer())
        .post(`/payments/${firstPaymentResponse.body.id}/process`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          paymentMethodId: 'pm_card_visa',
          confirm: true,
        })
        .expect(200);

      // Attempt second payment for same course
      const duplicateResponse = await request(app.getHttpServer())
        .post('/payments/course-purchase')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: course.id,
          amount: 9999,
          currency: 'USD',
          paymentMethodId: 'pm_card_visa',
        })
        .expect(400);

      expect(duplicateResponse.body.message).toContain('already purchased');
    });

    it('should validate payment amounts against course price', async () => {
      const course = await createTestCourse({
        title: 'Price Validation Course',
        price: 199.99,
      });

      // Attempt payment with incorrect amount
      const invalidPaymentResponse = await request(app.getHttpServer())
        .post('/payments/course-purchase')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: course.id,
          amount: 5000, // $50 instead of $199.99
          currency: 'USD',
          paymentMethodId: 'pm_card_visa',
        })
        .expect(400);

      expect(invalidPaymentResponse.body.message).toContain('amount mismatch');
    });

    it('should handle payment timeout scenarios', async () => {
      const course = await createTestCourse({
        title: 'Timeout Test Course',
        price: 99.99,
      });

      // Create payment
      const paymentResponse = await request(app.getHttpServer())
        .post('/payments/course-purchase')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: course.id,
          amount: 9999,
          currency: 'USD',
          paymentMethodId: 'pm_card_visa',
        })
        .expect(201);

      // Simulate payment timeout
      await request(app.getHttpServer())
        .post(`/payments/${paymentResponse.body.id}/timeout`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      // Verify payment status
      const timedOutPayment = await paymentRepository.findOne({
        where: { id: paymentResponse.body.id },
      });

      expect(timedOutPayment.status).toBe(PaymentStatus.FAILED);
      expect(timedOutPayment.failureReason).toContain('timeout');
    });

    it('should handle payment method validation', async () => {
      const course = await createTestCourse({
        title: 'Payment Method Test Course',
        price: 99.99,
      });

      // Test with invalid payment method
      const invalidMethodResponse = await request(app.getHttpServer())
        .post('/payments/course-purchase')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: course.id,
          amount: 9999,
          currency: 'USD',
          paymentMethodId: 'pm_invalid_method',
        })
        .expect(400);

      expect(invalidMethodResponse.body.message).toContain('invalid payment method');
    });
  });

  describe('Payment Analytics and Reporting', () => {
    beforeEach(async () => {
      // Create multiple courses and payments for analytics testing
      const courses = [];
      for (let i = 1; i <= 3; i++) {
        const course = await createTestCourse({
          title: `Analytics Course ${i}`,
          price: 50 * i, // $50, $100, $150
        });
        courses.push(course);

        // Create successful payment for each course
        const paymentResponse = await request(app.getHttpServer())
          .post('/payments/course-purchase')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            courseId: course.id,
            amount: 50 * i * 100, // Convert to cents
            currency: 'USD',
            paymentMethodId: 'pm_card_visa',
          })
          .expect(201);

        await request(app.getHttpServer())
          .post(`/payments/${paymentResponse.body.id}/process`)
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            paymentMethodId: 'pm_card_visa',
            confirm: true,
          })
          .expect(200);
      }
    });

    it('should generate payment analytics for instructors', async () => {
      const analyticsResponse = await request(app.getHttpServer())
        .get('/payments/analytics/instructor')
        .set('Authorization', `Bearer ${instructorToken}`)
        .query({
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        })
        .expect(200);

      expect(analyticsResponse.body).toMatchObject({
        totalRevenue: 30000, // $300 in cents
        totalTransactions: 3,
        averageTransactionValue: 10000, // $100 average
        courseRevenue: expect.arrayContaining([
          expect.objectContaining({
            courseId: expect.any(String),
            revenue: expect.any(Number),
            transactions: expect.any(Number),
          }),
        ]),
        paymentMethods: expect.objectContaining({
          card: 3,
        }),
      });
    });

    it('should provide payment history for users', async () => {
      const historyResponse = await request(app.getHttpServer())
        .get('/payments/my-payments')
        .set('Authorization', `Bearer ${studentToken}`)
        .query({
          page: 1,
          limit: 10,
          status: 'completed',
        })
        .expect(200);

      expect(historyResponse.body).toMatchObject({
        payments: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            amount: expect.any(Number),
            currency: 'USD',
            status: PaymentStatus.COMPLETED,
            type: PaymentType.COURSE_PURCHASE,
            completedAt: expect.any(String),
          }),
        ]),
        pagination: {
          total: 3,
          page: 1,
          limit: 10,
          totalPages: 1,
        },
      });
    });

    it('should generate detailed payment reports', async () => {
      const reportResponse = await request(app.getHttpServer())
        .get('/payments/reports/detailed')
        .set('Authorization', `Bearer ${instructorToken}`)
        .query({
          format: 'json',
          groupBy: 'course',
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        })
        .expect(200);

      expect(reportResponse.body).toMatchObject({
        summary: {
          totalRevenue: 30000,
          totalTransactions: 3,
          successRate: 100,
        },
        breakdown: expect.arrayContaining([
          expect.objectContaining({
            courseTitle: expect.any(String),
            revenue: expect.any(Number),
            transactions: expect.any(Number),
            averageTransactionValue: expect.any(Number),
          }),
        ]),
        trends: {
          daily: expect.any(Array),
          weekly: expect.any(Array),
        },
      });
    });
  });

  describe('Refund Processing', () => {
    let completedPayment: PaymentEntity;

    beforeEach(async () => {
      const course = await createTestCourse({
        title: 'Refundable Course',
        price: 99.99,
      });

      // Create and complete a payment
      const paymentResponse = await request(app.getHttpServer())
        .post('/payments/course-purchase')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          courseId: course.id,
          amount: 9999,
          currency: 'USD',
          paymentMethodId: 'pm_card_visa',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/payments/${paymentResponse.body.id}/process`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          paymentMethodId: 'pm_card_visa',
          confirm: true,
        })
        .expect(200);

      completedPayment = await paymentRepository.findOne({
        where: { id: paymentResponse.body.id },
      });
    });

    it('should process full refund request', async () => {
      const refundResponse = await request(app.getHttpServer())
        .post(`/payments/${completedPayment.id}/refund`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          reason: 'Not satisfied with course quality',
          amount: completedPayment.amount, // Full refund
        })
        .expect(200);

      expect(refundResponse.body).toMatchObject({
        refundId: expect.any(String),
        amount: completedPayment.amount,
        status: 'processing',
        reason: 'Not satisfied with course quality',
      });

      // Verify refund payment record
      const refundPayment = await paymentRepository.findOne({
        where: {
          id: refundResponse.body.refundId,
          type: PaymentType.REFUND,
        },
      });

      expect(refundPayment).toBeDefined();
      expect(refundPayment.amount).toBe(-completedPayment.amount);
    });

    it('should process partial refund request', async () => {
      const partialAmount = Math.floor(completedPayment.amount * 0.5); // 50% refund

      const refundResponse = await request(app.getHttpServer())
        .post(`/payments/${completedPayment.id}/refund`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          reason: 'Partial course completion',
          amount: partialAmount,
        })
        .expect(200);

      expect(refundResponse.body.amount).toBe(partialAmount);

      // Verify partial refund
      const refundPayment = await paymentRepository.findOne({
        where: { id: refundResponse.body.refundId },
      });

      expect(refundPayment.amount).toBe(-partialAmount);
    });

    it('should handle refund within allowed time window', async () => {
      // Test refund policy (e.g., 30-day refund window)
      const refundResponse = await request(app.getHttpServer())
        .post(`/payments/${completedPayment.id}/refund`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          reason: 'Within refund policy',
          amount: completedPayment.amount,
        })
        .expect(200);

      expect(refundResponse.body.status).toBe('processing');
    });

    it('should reject refund outside allowed time window', async () => {
      // Simulate old payment (beyond refund window)
      await paymentRepository.update(
        { id: completedPayment.id },
        {
          completedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
        }
      );

      const refundResponse = await request(app.getHttpServer())
        .post(`/payments/${completedPayment.id}/refund`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          reason: 'Late refund request',
          amount: completedPayment.amount,
        })
        .expect(400);

      expect(refundResponse.body.message).toContain('refund window');
    });
  });

  describe('Payment Webhook Handling', () => {
    it('should handle successful payment webhook from Stripe', async () => {
      const webhookPayload = {
        id: 'evt_test_webhook',
        object: 'event',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_payment_intent',
            amount: 9999,
            currency: 'usd',
            status: 'succeeded',
            metadata: {
              courseId: 'test-course-id',
              userId: testStudent.id,
            },
          },
        },
      };

      const webhookResponse = await request(app.getHttpServer())
        .post('/payments/webhook/stripe')
        .set('stripe-signature', 'test_signature')
        .send(webhookPayload)
        .expect(200);

      expect(webhookResponse.body.received).toBe(true);
    });

    it('should handle failed payment webhook from Stripe', async () => {
      const webhookPayload = {
        id: 'evt_test_webhook_failed',
        object: 'event',
        type: 'payment_intent.payment_failed',
        data: {
          object: {
            id: 'pi_test_payment_intent_failed',
            amount: 9999,
            currency: 'usd',
            status: 'requires_payment_method',
            last_payment_error: {
              message: 'Your card was declined.',
            },
            metadata: {
              courseId: 'test-course-id',
              userId: testStudent.id,
            },
          },
        },
      };

      const webhookResponse = await request(app.getHttpServer())
        .post('/payments/webhook/stripe')
        .set('stripe-signature', 'test_signature')
        .send(webhookPayload)
        .expect(200);

      expect(webhookResponse.body.received).toBe(true);
    });
  });
});
