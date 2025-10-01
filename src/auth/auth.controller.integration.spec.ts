import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';

describe('AuthController (Integration)', () => {
  let app: INestApplication;
  let authService: AuthService;

  const mockAuthService = {
    validate: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AuthModule],
    })
      .overrideProvider(AuthService)
      .useValue(mockAuthService)
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    authService = moduleRef.get<AuthService>(AuthService);
  });

  afterAll(async () => {
    await app.close();
  });

  // --- Email/Password Login & Register ---
  it('POST /auth/login should login successfully', async () => {
    const user = { email: 'user@test.com', password: 'password' };
    mockAuthService.validate.mockResolvedValue(user);
    mockAuthService.login.mockResolvedValue({ token: 'jwt-token' });

    return request(app.getHttpServer())
      .post('/auth/login')
      .send(user)
      .expect(201)
      .expect({ token: 'jwt-token' });
  });

  it('POST /auth/register should register successfully', async () => {
    const user = { email: 'new@test.com', password: 'StrongP@ss123' };
    mockAuthService.register.mockResolvedValue({ token: 'new-jwt-token' });

    return request(app.getHttpServer())
      .post('/auth/register')
      .send(user)
      .expect(201)
      .expect({ token: 'new-jwt-token' });
  });

  // --- Google OAuth ---
  it('POST /auth/google/login should login successfully', async () => {
    const user = { email: 'google@test.com' };
    mockAuthService.login.mockResolvedValue({ token: 'google-token' });

    return request(app.getHttpServer())
      .post('/auth/google/login')
      .send(user)
      .expect(201)
      .expect({ token: 'google-token' });
  });

  it('POST /auth/google/register should register successfully', async () => {
    const user = { email: 'google@test.com' };
    mockAuthService.register.mockResolvedValue({ token: 'new-google-token' });

    return request(app.getHttpServer())
      .post('/auth/google/register')
      .send(user)
      .expect(201)
      .expect({ token: 'new-google-token' });
  });

  // --- Facebook OAuth ---
  it('POST /auth/facebook/login should login successfully', async () => {
    const user = { email: 'fb@test.com' };
    mockAuthService.login.mockResolvedValue({ token: 'facebook-token' });

    return request(app.getHttpServer())
      .post('/auth/facebook/login')
      .send(user)
      .expect(201)
      .expect({ token: 'facebook-token' });
  });

  it('POST /auth/facebook/register should register successfully', async () => {
    const user = { email: 'fb@test.com' };
    mockAuthService.register.mockResolvedValue({ token: 'new-facebook-token' });

    return request(app.getHttpServer())
      .post('/auth/facebook/register')
      .send(user)
      .expect(201)
      .expect({ token: 'new-facebook-token' });
  });

  // --- Apple OAuth ---
  it('POST /auth/apple/login should login successfully', async () => {
    const user = { email: 'apple@test.com' };
    mockAuthService.login.mockResolvedValue({ token: 'apple-token' });

    return request(app.getHttpServer())
      .post('/auth/apple/login')
      .send(user)
      .expect(201)
      .expect({ token: 'apple-token' });
  });

  it('POST /auth/apple/register should register successfully', async () => {
    const user = { email: 'apple@test.com' };
    mockAuthService.register.mockResolvedValue({ token: 'new-apple-token' });

    return request(app.getHttpServer())
      .post('/auth/apple/register')
      .send(user)
      .expect(201)
      .expect({ token: 'new-apple-token' });
  });
});
