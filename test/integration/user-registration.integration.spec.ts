import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AuthModule } from '../../src/auth/auth.module';
import { UsersModule } from '../../src/users/users.module';
import { EmailModule } from '../../src/email/email.module';
import { User } from '../../src/users/entities/user.entity';
import { RefreshToken } from '../../src/auth/entities/refresh-token.entity';
import { DatabaseTestModule } from '../utils/database-test.module';

describe('User Registration Integration Tests', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let userRepository: Repository<User>;
  let refreshTokenRepository: Repository<RefreshToken>;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        DatabaseTestModule,
        TypeOrmModule.forFeature([User, RefreshToken]),
        AuthModule,
        UsersModule,
        EmailModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    userRepository = moduleRef.get<Repository<User>>(getRepositoryToken(User));
    refreshTokenRepository = moduleRef.get<Repository<RefreshToken>>(getRepositoryToken(RefreshToken));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean database before each test
    await refreshTokenRepository.clear();
    await userRepository.clear();
  });

  describe('Complete User Registration Flow', () => {
    const validUserData = {
      email: 'john.doe@example.com',
      password: 'SecurePass123!',
      firstName: 'John',
      lastName: 'Doe',
      name: 'John Doe',
    };

    it('should complete full registration flow successfully', async () => {
      // Step 1: Register user
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(validUserData)
        .expect(201);

      expect(registerResponse.body).toMatchObject({
        access_token: expect.any(String),
        refresh_token: expect.any(String),
        user: {
          id: expect.any(String),
          email: validUserData.email,
          firstName: validUserData.firstName,
          lastName: validUserData.lastName,
          name: validUserData.name,
          role: 'student',
          isEmailVerified: false,
          accountStatus: 'active',
        },
      });

      // Step 2: Verify user exists in database
      const savedUser = await userRepository.findOne({
        where: { email: validUserData.email },
      });

      expect(savedUser).toBeDefined();
      expect(savedUser.email).toBe(validUserData.email);
      expect(savedUser.firstName).toBe(validUserData.firstName);
      expect(savedUser.lastName).toBe(validUserData.lastName);
      expect(savedUser.isEmailVerified).toBe(false);
      expect(savedUser.role).toBe('student');

      // Step 3: Verify refresh token is created
      const refreshToken = await refreshTokenRepository.findOne({
        where: { userId: savedUser.id },
      });

      expect(refreshToken).toBeDefined();
      expect(refreshToken.token).toBe(registerResponse.body.refresh_token);

      // Step 4: Verify access token can be used to access protected routes
      const profileResponse = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${registerResponse.body.access_token}`)
        .expect(200);

      expect(profileResponse.body).toMatchObject({
        id: savedUser.id,
        email: validUserData.email,
        firstName: validUserData.firstName,
        lastName: validUserData.lastName,
      });
    });

    it('should handle email verification flow', async () => {
      // Register user
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(validUserData)
        .expect(201);

      const userId = registerResponse.body.user.id;

      // Simulate email verification
      const verificationResponse = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({
          token: 'mock-verification-token',
          userId: userId,
        })
        .expect(200);

      expect(verificationResponse.body.message).toContain('verified');

      // Verify user is marked as verified in database
      const verifiedUser = await userRepository.findOne({
        where: { id: userId },
      });

      expect(verifiedUser.isEmailVerified).toBe(true);
    });

    it('should prevent duplicate email registration', async () => {
      // First registration
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(validUserData)
        .expect(201);

      // Second registration with same email
      const duplicateResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send(validUserData)
        .expect(409);

      expect(duplicateResponse.body.message).toContain('already exists');

      // Verify only one user exists
      const userCount = await userRepository.count({
        where: { email: validUserData.email },
      });
      expect(userCount).toBe(1);
    });

    it('should validate password strength requirements', async () => {
      const weakPasswords = [
        '123456',
        'password',
        'abc123',
        'qwerty',
        'Password1', // Missing special character
        'password123!', // Missing uppercase
        'PASSWORD123!', // Missing lowercase
        'Password!', // Too short
      ];

      for (const weakPassword of weakPasswords) {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            ...validUserData,
            email: `test${Date.now()}@example.com`, // Unique email
            password: weakPassword,
          })
          .expect(400);

        expect(response.body.message).toContain('Password');
      }

      // Verify no users were created with weak passwords
      const userCount = await userRepository.count();
      expect(userCount).toBe(0);
    });

    it('should sanitize and validate user input', async () => {
      const maliciousData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        firstName: '<script>alert("xss")</script>John',
        lastName: 'Doe\'; DROP TABLE users; --',
        name: 'John Doe',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(maliciousData)
        .expect(201);

      const savedUser = await userRepository.findOne({
        where: { email: maliciousData.email },
      });

      // Verify input was sanitized
      expect(savedUser.firstName).not.toContain('<script>');
      expect(savedUser.firstName).not.toContain('alert');
      expect(savedUser.lastName).not.toContain('DROP TABLE');
      expect(savedUser.lastName).not.toContain('--');
    });

    it('should handle concurrent registration attempts', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        request(app.getHttpServer())
          .post('/auth/register')
          .send({
            ...validUserData,
            email: `user${i}@example.com`,
          })
      );

      const responses = await Promise.allSettled(promises);
      const successful = responses.filter(r => r.status === 'fulfilled').length;
      
      expect(successful).toBe(5);

      // Verify all users were created
      const userCount = await userRepository.count();
      expect(userCount).toBe(5);
    });

    it('should handle registration with different user roles', async () => {
      const roles = ['student', 'instructor'];

      for (const role of roles) {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            ...validUserData,
            email: `${role}@example.com`,
            role: role,
          })
          .expect(201);

        expect(response.body.user.role).toBe(role);

        const savedUser = await userRepository.findOne({
          where: { email: `${role}@example.com` },
        });

        expect(savedUser.role).toBe(role);
      }
    });

    it('should generate unique user IDs', async () => {
      const userIds = new Set();
      
      for (let i = 0; i < 10; i++) {
        const response = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            ...validUserData,
            email: `user${i}@example.com`,
          })
          .expect(201);

        userIds.add(response.body.user.id);
      }

      expect(userIds.size).toBe(10);
    });

    it('should handle international characters in names', async () => {
      const internationalData = {
        email: 'international@example.com',
        password: 'SecurePass123!',
        firstName: 'José',
        lastName: 'García-Müller',
        name: 'José García-Müller',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(internationalData)
        .expect(201);

      const savedUser = await userRepository.findOne({
        where: { email: internationalData.email },
      });

      expect(savedUser.firstName).toBe('José');
      expect(savedUser.lastName).toBe('García-Müller');
    });

    it('should set appropriate default values', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'defaults@example.com',
          password: 'SecurePass123!',
          firstName: 'Default',
          lastName: 'User',
          name: 'Default User',
        })
        .expect(201);

      const savedUser = await userRepository.findOne({
        where: { email: 'defaults@example.com' },
      });

      expect(savedUser.role).toBe('student');
      expect(savedUser.isEmailVerified).toBe(false);
      expect(savedUser.accountStatus).toBe('active');
      expect(savedUser.createdAt).toBeInstanceOf(Date);
      expect(savedUser.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Registration Edge Cases', () => {
    it('should handle registration during high load', async () => {
      const startTime = Date.now();
      
      const promises = Array.from({ length: 50 }, (_, i) =>
        request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: `load${i}@example.com`,
            password: 'SecurePass123!',
            firstName: 'Load',
            lastName: 'Test',
            name: 'Load Test',
          })
      );

      const responses = await Promise.allSettled(promises);
      const endTime = Date.now();
      
      const successful = responses.filter(r => r.status === 'fulfilled').length;
      const duration = endTime - startTime;
      
      expect(successful).toBe(50);
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      
      // Verify all users were created correctly
      const userCount = await userRepository.count();
      expect(userCount).toBe(50);
    });

    it('should handle very long email addresses', async () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: longEmail,
          password: 'SecurePass123!',
          firstName: 'Long',
          lastName: 'Email',
          name: 'Long Email',
        });

      // Should either accept it or reject with proper validation error
      if (response.status === 201) {
        const savedUser = await userRepository.findOne({
          where: { email: longEmail },
        });
        expect(savedUser).toBeDefined();
      } else {
        expect(response.status).toBe(400);
        expect(response.body.message).toContain('email');
      }
    });

    it('should handle registration with empty optional fields', async () => {
      const minimalData = {
        email: 'minimal@example.com',
        password: 'SecurePass123!',
        firstName: 'Min',
        lastName: 'Imal',
        name: 'Min Imal',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(minimalData)
        .expect(201);

      const savedUser = await userRepository.findOne({
        where: { email: minimalData.email },
      });

      expect(savedUser).toBeDefined();
      expect(savedUser.bio).toBeNull();
      expect(savedUser.phoneNumber).toBeNull();
      expect(savedUser.avatar).toBeNull();
    });
  });

  describe('Registration Security Tests', () => {
    it('should rate limit registration attempts', async () => {
      const email = 'ratelimit@example.com';
      
      // Make rapid registration attempts
      const promises = Array.from({ length: 20 }, () =>
        request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: email,
            password: 'SecurePass123!',
            firstName: 'Rate',
            lastName: 'Limit',
            name: 'Rate Limit',
          })
      );

      const responses = await Promise.allSettled(promises);
      
      // Should have some rate limiting (not all should succeed)
      const successful = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 201
      ).length;
      
      const rateLimited = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 429
      ).length;

      expect(successful).toBeLessThan(20);
      expect(rateLimited).toBeGreaterThan(0);
    });

    it('should not leak sensitive information in error messages', async () => {
      // Try to register with existing email
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'SecurePass123!',
          firstName: 'Existing',
          lastName: 'User',
          name: 'Existing User',
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'existing@example.com',
          password: 'SecurePass123!',
          firstName: 'Another',
          lastName: 'User',
          name: 'Another User',
        })
        .expect(409);

      // Error message should not leak database details
      expect(response.body.message).not.toContain('database');
      expect(response.body.message).not.toContain('SQL');
      expect(response.body.message).not.toContain('constraint');
    });

    it('should hash passwords securely', async () => {
      const password = 'SecurePass123!';
      
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'password@example.com',
          password: password,
          firstName: 'Password',
          lastName: 'Test',
          name: 'Password Test',
        })
        .expect(201);

      const savedUser = await userRepository.findOne({
        where: { email: 'password@example.com' },
      });

      // Password should be hashed, not stored in plain text
      expect(savedUser.password).not.toBe(password);
      expect(savedUser.password).toMatch(/^\$2[aby]\$.{56}$/); // bcrypt hash pattern
    });
  });
});
