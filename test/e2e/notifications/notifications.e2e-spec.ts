import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { EventEmitterModule, EventEmitter2 } from '@nestjs/event-emitter';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as io from 'socket.io-client';
import { Socket } from 'socket.io-client';

// Test imports
import { NotificationsModule } from '../../../src/notifications/notifications.module';
import { AuthModule } from '../../../src/auth/auth.module';
import { UsersModule } from '../../../src/users/users.module';
import { EnrollmentModule } from '../../../src/enrollment/enrollment.module';
import { CoursesModule } from '../../../src/courses/courses.module';

// Services
import { AuthService } from '../../../src/auth/auth.service';
import { EnrollmentService } from '../../../src/enrollment/enrollment.service';
import { NotificationsService } from '../../../src/notifications/services/notifications.service';
import { UsersService } from '../../../src/users/services/users.service';

// Test entities
import { NotificationSubscription, NotificationEventType, SubscriptionScope } from '../../../src/notifications/entities/notification-subscription.entity';
import { NotificationEvent, DeliveryStatus } from '../../../src/notifications/entities/notification-event.entity';
import { User } from '../../../src/users/entities/user.entity';
import { Course } from '../../../src/courses/entities/course.entity';
import { Enrollment } from '../../../src/enrollment/entities/enrollment.entity';

describe('Notifications E2E', () => {
  let app: INestApplication;
  let authService: AuthService;
  let enrollmentService: EnrollmentService;
  let notificationsService: NotificationsService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let eventEmitter: EventEmitter2;

  // Test clients
  let clientSocket: Socket;
  let unauthorizedSocket: Socket;
  let instructorSocket: Socket;

  // Test data
  let testUser: User;
  let instructorUser: User;
  let testCourse: Course;
  let accessToken: string;
  let instructorToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            type: 'sqlite',
            database: ':memory:',
            entities: [User, NotificationSubscription, NotificationEvent, Course, Enrollment],
            synchronize: true,
            dropSchema: true,
          }),
        }),
        JwtModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            secret: configService.get<string>('JWT_SECRET') || 'test-secret',
            signOptions: { expiresIn: '1h' },
          }),
        }),
        EventEmitterModule.forRoot(),
        CqrsModule,
        NotificationsModule,
        AuthModule,
        UsersModule,
        EnrollmentModule,
        CoursesModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Get services
    authService = moduleFixture.get<AuthService>(AuthService);
    enrollmentService = moduleFixture.get<EnrollmentService>(EnrollmentService);
    notificationsService = moduleFixture.get<NotificationsService>(NotificationsService);
    usersService = moduleFixture.get<UsersService>(UsersService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    eventEmitter = moduleFixture.get<EventEmitter2>(EventEmitter2);

    await app.listen(0); // Random port

    const server = app.getHttpServer();
    const address = server.address();
    const port = typeof address === 'string' ? address : address?.port;

    // Create test users
    testUser = {
      id: 'student-uuid-123',
      email: 'student@test.com',
      firstName: 'Test',
      lastName: 'Student',
      roles: ['student']
    } as User;

    instructorUser = {
      id: 'instructor-uuid-123',
      email: 'instructor@test.com',
      firstName: 'Test',
      lastName: 'Instructor',
      roles: ['instructor']
    } as User;

    // Generate test tokens
    accessToken = jwtService.sign({
      sub: testUser.id,
      email: testUser.email,
      roles: testUser.roles,
    });

    instructorToken = jwtService.sign({
      sub: instructorUser.id,
      email: instructorUser.email,
      roles: instructorUser.roles,
    });

    testCourse = {
      id: 'test-course-1',
      name: 'Test Course',
      title: 'Advanced TypeScript',
      description: 'A test course for notifications',
    } as Course;

    // Mock enrollment for testing
    jest.spyOn(enrollmentService, 'findAll').mockResolvedValue([
      {
        id: 'enrollment-1',
        studentId: testUser.id,
        courseId: testCourse.id,
        status: 'ENROLLED',
        enrolledAt: new Date(),
        paymentStatus: 'PAID'
      } as Enrollment
    ]);

    console.log(`Test server running on port ${port}`);
  });

  afterAll(async () => {
    if (clientSocket?.connected) {
      clientSocket.disconnect();
    }
    if (unauthorizedSocket?.connected) {
      unauthorizedSocket.disconnect();
    }
    if (instructorSocket?.connected) {
      instructorSocket.disconnect();
    }
    await app.close();
  });

  describe('WebSocket Authentication', () => {
    it('should reject connection without auth token', (done) => {
      const server = app.getHttpServer();
      const address = server.address();
      const port = typeof address === 'string' ? address : address?.port;

      unauthorizedSocket = io(`http://localhost:${port}/ws`, {
        transports: ['websocket'],
      });

      unauthorizedSocket.on('connect', () => {
        done(new Error('Should not connect without auth token'));
      });

      unauthorizedSocket.on('connect_error', (error) => {
        expect(error).toBeDefined();
        done();
      });

      unauthorizedSocket.on('disconnect', (reason) => {
        expect(reason).toBeDefined();
        done();
      });
    });

    it('should accept connection with valid JWT token', (done) => {
      const server = app.getHttpServer();
      const address = server.address();
      const port = typeof address === 'string' ? address : address?.port;

      clientSocket = io(`http://localhost:${port}/ws`, {
        auth: {
          token: accessToken,
        },
        transports: ['websocket'],
      });

      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        done();
      });

      clientSocket.on('connect_error', (error) => {
        done(new Error(`Connection failed: ${error.message}`));
      });
    });

    it('should receive initial unread count on connection', (done) => {
      clientSocket.on('notification:unread_count', (data) => {
        expect(data).toHaveProperty('count');
        expect(typeof data.count).toBe('number');
        done();
      });
    });
  });

  describe('Room Management', () => {
    it('should allow user to join course room when enrolled', (done) => {
      clientSocket.emit('notification:join_course', { courseId: testCourse.id }, (response) => {
        expect(response.success).toBe(true);
        expect(response.message).toBe('Joined course notifications');
        done();
      });
    });

    it('should reject joining course room when not enrolled', (done) => {
      clientSocket.emit('notification:join_course', { courseId: 'non-enrolled-course' }, (response) => {
        expect(response.success).toBe(false);
        expect(response.message).toBe('Not enrolled in course');
        done();
      });
    });

    it('should allow user to leave course room', (done) => {
      clientSocket.emit('notification:leave_course', { courseId: testCourse.id }, (response) => {
        expect(response.success).toBe(true);
        expect(response.message).toBe('Left course notifications');
        done();
      });
    });
  });

  describe('Real-time Notifications', () => {
    beforeEach(async () => {
      if (!clientSocket?.connected) {
        const server = app.getHttpServer();
        const address = server.address();
        const port = typeof address === 'string' ? address : address?.port;

        clientSocket = io(`http://localhost:${port}/ws`, {
          auth: { token: accessToken },
          transports: ['websocket'],
        });

        await new Promise<void>(resolve => {
          clientSocket.on('connect', () => resolve());
        });
      }
    });

    it('should receive course enrollment notification', (done) => {
      clientSocket.on('notification:new', (notification) => {
        expect(notification.eventType).toBe(NotificationEventType.COURSE_ENROLLMENT);
        expect(notification.scope).toBe(SubscriptionScope.USER);
        expect(notification.title).toBe('Course Enrollment Completed');
        expect(notification.data.courseId).toBe(testCourse.id);
        done();
      });

      // Emit course enrollment event
      eventEmitter.emit('course.enrollment.completed', {
        userId: testUser.id,
        courseId: testCourse.id,
        courseName: testCourse.name,
        enrollmentType: 'premium',
      });
    });

    it('should receive lesson published notification', (done) => {
      // Join course room first
      clientSocket.emit('notification:join_course', { courseId: testCourse.id }, () => {
        clientSocket.on('notification:new', (notification) => {
          expect(notification.eventType).toBe(NotificationEventType.COURSE_LESSON_PUBLISHED);
          expect(notification.scope).toBe(SubscriptionScope.COURSE);
          expect(notification.title).toBe('New Lesson Published');
          expect(notification.data.lessonTitle).toBe('Introduction to Generics');
          done();
        });

        // Emit lesson published event
        eventEmitter.emit('course.lesson.published', {
          courseId: testCourse.id,
          courseName: testCourse.name,
          lessonId: 'lesson-uuid-123',
          lessonTitle: 'Introduction to Generics',
        });
      });
    });

    it('should receive quiz graded notification', (done) => {
      clientSocket.on('notification:new', (notification) => {
        expect(notification.eventType).toBe(NotificationEventType.QUIZ_GRADED);
        expect(notification.scope).toBe(SubscriptionScope.USER);
        expect(notification.title).toBe('Quiz Graded');
        expect(notification.data.score).toBe(85);
        expect(notification.data.maxScore).toBe(100);
        done();
      });

      // Emit quiz graded event
      eventEmitter.emit('quiz.graded', {
        userId: testUser.id,
        quizId: 'quiz-uuid-123',
        quizTitle: 'TypeScript Basics Quiz',
        courseId: testCourse.id,
        score: 85,
        maxScore: 100,
      });
    });

    it('should receive live session starting notification', (done) => {
      const startTime = new Date(Date.now() + 15 * 60 * 1000);

      // Join course room first
      clientSocket.emit('notification:join_course', { courseId: testCourse.id }, () => {
        clientSocket.on('notification:new', (notification) => {
          expect(notification.eventType).toBe(NotificationEventType.LIVE_SESSION_STARTING);
          expect(notification.scope).toBe(SubscriptionScope.COURSE);
          expect(notification.title).toBe('Live Session Starting Soon');
          expect(notification.data.sessionTitle).toBe('Office Hours');
          done();
        });

        // Emit live session starting event
        eventEmitter.emit('live.session.starting', {
          courseId: testCourse.id,
          courseName: testCourse.name,
          sessionId: 'session-uuid-123',
          sessionTitle: 'Office Hours',
          startTime,
        });
      });
    });

    it('should handle multiple users in same course room', async () => {
      const server = app.getHttpServer();
      const address = server.address();
      const port = typeof address === 'string' ? address : address?.port;

      instructorSocket = io(`http://localhost:${port}/ws`, {
        auth: { token: instructorToken },
        transports: ['websocket'],
      });

      await new Promise<void>(resolve => {
        instructorSocket.on('connect', () => resolve());
      });

      let studentReceived = false;
      let instructorReceived = false;

      const checkCompletion = () => {
        if (studentReceived && instructorReceived) {
          expect(studentReceived).toBe(true);
          expect(instructorReceived).toBe(true);
        }
      };

      clientSocket.on('notification:new', (notification) => {
        if (notification.eventType === NotificationEventType.COURSE_LESSON_PUBLISHED) {
          studentReceived = true;
          checkCompletion();
        }
      });

      instructorSocket.on('notification:new', (notification) => {
        if (notification.eventType === NotificationEventType.COURSE_LESSON_PUBLISHED) {
          instructorReceived = true;
          checkCompletion();
        }
      });

      // Join both to course room
      await Promise.all([
        new Promise<void>(resolve => {
          clientSocket.emit('notification:join_course', { courseId: testCourse.id }, () => resolve());
        }),
        new Promise<void>(resolve => {
          instructorSocket.emit('notification:join_course', { courseId: testCourse.id }, () => resolve());
        })
      ]);

      // Emit event that should go to both
      eventEmitter.emit('course.lesson.published', {
        courseId: testCourse.id,
        courseName: testCourse.name,
        lessonId: 'lesson-uuid-456',
        lessonTitle: 'Advanced Patterns',
      });

      await new Promise(resolve => setTimeout(resolve, 500));
      checkCompletion();
    });
  });

  describe('Notification Management', () => {
    it('should mark notification as read', (done) => {
      const testNotificationId = 'notification-uuid-123';

      clientSocket.on('notification:unread_count', (data) => {
        expect(typeof data.count).toBe('number');
        done();
      });

      clientSocket.emit('notification:mark_read', { notificationId: testNotificationId }, (response) => {
        // Should handle gracefully even if notification doesn't exist
        expect(response).toBeDefined();
      });
    });

    it('should handle invalid notification ID', (done) => {
      clientSocket.emit('notification:mark_read', { notificationId: 'invalid-id' }, (response) => {
        expect(response.success).toBe(false);
        expect(response.message).toBe('Failed to mark as read');
        done();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid course ID when joining room', (done) => {
      clientSocket.emit('notification:join_course', { courseId: 'invalid-course-id' }, (response) => {
        expect(response.success).toBe(false);
        expect(response.message).toBe('Not enrolled in course');
        done();
      });
    });

    it('should handle missing data gracefully', (done) => {
      clientSocket.emit('notification:join_course', {}, (response) => {
        expect(response.success).toBe(false);
        done();
      });
    });
  });

  describe('Performance Tests', () => {
    it('should handle rapid successive notifications', async () => {
      let receivedCount = 0;
      const expectedCount = 10;

      clientSocket.on('notification:new', () => {
        receivedCount++;
      });

      // Emit multiple notifications rapidly
      for (let i = 0; i < expectedCount; i++) {
        eventEmitter.emit('quiz.graded', {
          userId: testUser.id,
          quizId: `quiz-${i}`,
          quizTitle: `Quiz ${i}`,
          score: 80 + i,
          maxScore: 100,
        });
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      expect(receivedCount).toBe(expectedCount);
    });

    it('should maintain performance with multiple concurrent connections', async () => {
      const server = app.getHttpServer();
      const address = server.address();
      const port = typeof address === 'string' ? address : address?.port;

      const userCount = 3;
      const sockets: Socket[] = [];

      // Create multiple connections
      for (let i = 0; i < userCount; i++) {
        const token = jwtService.sign({
          sub: `user-${i}`,
          email: `user${i}@test.com`,
          roles: ['student'],
        });

        const socket = io(`http://localhost:${port}/ws`, {
          auth: { token },
          transports: ['websocket'],
        });
        
        sockets.push(socket);
      }

      // Wait for all to connect
      await Promise.all(sockets.map(socket => 
        new Promise<void>(resolve => {
          socket.on('connect', () => resolve());
        })
      ));

      // All should be connected
      sockets.forEach(socket => {
        expect(socket.connected).toBe(true);
      });

      // Cleanup
      sockets.forEach(socket => socket.disconnect());
    });
  });

  describe('Room Scoping Tests', () => {
    it('should only deliver course notifications to enrolled users', async () => {
      const server = app.getHttpServer();
      const address = server.address();
      const port = typeof address === 'string' ? address : address?.port;

      // Create a user not enrolled in the test course
      const nonEnrolledToken = jwtService.sign({
        sub: 'non-enrolled-user',
        email: 'nonenrolled@test.com',
        roles: ['student'],
      });

      const nonEnrolledSocket = io(`http://localhost:${port}/ws`, {
        auth: { token: nonEnrolledToken },
        transports: ['websocket'],
      });

      await new Promise<void>(resolve => {
        nonEnrolledSocket.on('connect', () => resolve());
      });

      let enrolledUserReceived = false;
      let nonEnrolledUserReceived = false;

      clientSocket.on('notification:new', (notification) => {
        if (notification.eventType === NotificationEventType.COURSE_LESSON_PUBLISHED) {
          enrolledUserReceived = true;
        }
      });

      nonEnrolledSocket.on('notification:new', (notification) => {
        if (notification.eventType === NotificationEventType.COURSE_LESSON_PUBLISHED) {
          nonEnrolledUserReceived = true;
        }
      });

      // Join enrolled user to course room
      await new Promise<void>(resolve => {
        clientSocket.emit('notification:join_course', { courseId: testCourse.id }, () => resolve());
      });

      // Try to join non-enrolled user to course room (should fail)
      await new Promise<void>(resolve => {
        nonEnrolledSocket.emit('notification:join_course', { courseId: testCourse.id }, (response) => {
          expect(response.success).toBe(false);
          resolve();
        });
      });

      // Emit course-specific notification
      eventEmitter.emit('course.lesson.published', {
        courseId: testCourse.id,
        courseName: testCourse.name,
        lessonId: 'lesson-scoping-test',
        lessonTitle: 'Scoping Test Lesson',
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      expect(enrolledUserReceived).toBe(true);
      expect(nonEnrolledUserReceived).toBe(false);

      nonEnrolledSocket.disconnect();
    });
  });
});
