import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    validateUser: jest.fn(),
    login: jest.fn(),
    register: jest.fn(),
    googleLogin: jest.fn(),
    facebookLogin: jest.fn(),
    appleLogin: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService }
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should login successfully', async () => {
    const mockUser = { email: 'test@example.com' };
    const mockResponse = { access_token: 'token', refresh_token: 'refresh', expires_in: 3600, user: mockUser };
    mockAuthService.validateUser.mockResolvedValue(mockUser);
    mockAuthService.login.mockResolvedValue(mockResponse);

    const result = await controller.login({ email: 'test@example.com', password: 'password' });
    expect(authService.validateUser).toHaveBeenCalledWith('test@example.com', 'password');
    expect(authService.login).toHaveBeenCalledWith(mockUser);
    expect(result).toEqual(mockResponse);
  });

  it('should throw UnauthorizedException when login fails', async () => {
    mockAuthService.validateUser.mockResolvedValue(null);
    await expect(controller.login({ email: 'test@example.com', password: 'wrong' }))
      .rejects.toThrow(UnauthorizedException);
  });

  it('should register successfully', async () => {
    const registerDto = { email: 'new@example.com', password: 'StrongP@ss123', firstName: 'John', lastName: 'Doe' };
    const mockResponse = { access_token: 'token', refresh_token: 'refresh', expires_in: 3600, user: { id: 'new-id', email: 'new@example.com' } };
    mockAuthService.register.mockResolvedValue(mockResponse);

    const result = await controller.register(registerDto);
    expect(authService.register).toHaveBeenCalledWith('new@example.com', 'StrongP@ss123', { firstName: 'John', lastName: 'Doe' });
    expect(result).toEqual(mockResponse);
  });

  it('should throw BadRequestException when register fails', async () => {
    mockAuthService.register.mockRejectedValue(new BadRequestException());
    await expect(controller.register({ email: 'new@example.com', password: 'weak' })).rejects.toThrow(BadRequestException);
  });

  it('should handle Google login', async () => {
    const mockResponse = { userId: '123', token: 'google_token' };
    mockAuthService.googleLogin.mockResolvedValue(mockResponse);
    const result = await controller.googleLogin({ token: 'valid_google_token' });
    expect(result).toEqual(mockResponse);
    expect(authService.googleLogin).toHaveBeenCalledWith('valid_google_token');
  });

  it('should handle Facebook login', async () => {
    const mockResponse = { userId: '123', token: 'fb_token' };
    mockAuthService.facebookLogin.mockResolvedValue(mockResponse);
    const result = await controller.facebookLogin({ token: 'valid_fb_token' });
    expect(result).toEqual(mockResponse);
    expect(authService.facebookLogin).toHaveBeenCalledWith('valid_fb_token');
  });

  it('should handle Apple login', async () => {
    const mockResponse = { userId: '123', token: 'apple_token' };
    mockAuthService.appleLogin.mockResolvedValue(mockResponse);
    const result = await controller.appleLogin({ token: 'valid_apple_token' });
    expect(result).toEqual(mockResponse);
    expect(authService.appleLogin).toHaveBeenCalledWith('valid_apple_token');
  });
});
