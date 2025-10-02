import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module'; // adjust if needed
import { AuthService } from '../../src/auth/auth.service';

describe('Course Enrollment (e2e)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let jwtToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    authService = moduleFixture.get<AuthService>(AuthService);

    // Mock login or create a test user and get JWT token
    jwtToken = (
      await authService.login('local', { email: 'test@example.com' } as any)
    ).token;
  });

  afterAll(async () => {
    await app.close();
  });

  // --- Normal Flows ---
  it('/enrollment POST should enroll a user in a course', async () => {
    const enrollmentPayload = {
      courseId: 'course_123',
      userId: 'user_123',
    };

    return request(app.getHttpServer())
      .post('/enrollment')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send(enrollmentPayload)
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('id');
        expect(res.body.courseId).toBe('course_123');
        expect(res.body.userId).toBe('user_123');
      });
  });

  it('/enrollment GET should return user enrollments', async () => {
    return request(app.getHttpServer())
      .get('/enrollment/user/user_123')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body[0]).toHaveProperty('courseId', 'course_123');
      });
  });

  it('/enrollment/:id DELETE should remove an enrollment', async () => {
    const enrollmentId = 'enroll_123'; // Replace with actual enrollment id from POST

    return request(app.getHttpServer())
      .delete(`/enrollment/${enrollmentId}`)
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('message', 'Enrollment removed');
      });
  });

  // --- Edge Cases ---
  it('/enrollment POST should fail if courseId is missing', async () => {
    const payload = { userId: 'user_123' };

    return request(app.getHttpServer())
      .post('/enrollment')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send(payload)
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toContain('courseId must be defined');
      });
  });

  it('/enrollment POST should fail if userId is missing', async () => {
    const payload = { courseId: 'course_123' };

    return request(app.getHttpServer())
      .post('/enrollment')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send(payload)
      .expect(400)
      .expect((res) => {
        expect(res.body.message).toContain('userId must be defined');
      });
  });

  it('/enrollment GET should return empty array if user has no enrollments', async () => {
    return request(app.getHttpServer())
      .get('/enrollment/user/non_existing_user')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(0);
      });
  });

  it('/enrollment/:id DELETE should return 404 if enrollment does not exist', async () => {
    return request(app.getHttpServer())
      .delete('/enrollment/non_existing_id')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(404)
      .expect((res) => {
        expect(res.body.message).toContain('Enrollment not found');
      });
  });

  it('/enrollment POST should fail without JWT token', async () => {
    const payload = { courseId: 'course_123', userId: 'user_123' };

    return request(app.getHttpServer())
      .post('/enrollment')
      .send(payload)
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toContain('Unauthorized');
      });
  });

  it('/enrollment GET should fail without JWT token', async () => {
    return request(app.getHttpServer())
      .get('/enrollment/user/user_123')
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toContain('Unauthorized');
      });
  });
});
