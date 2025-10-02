import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockGoogle = {
    name: 'google',
    validate: jest.fn().mockResolvedValue({ email: 'google@test.com' }),
    login: jest.fn().mockResolvedValue({ token: 'google-token' }),
  };

  const mockFacebook = {
    name: 'facebook',
    validate: jest.fn().mockResolvedValue({ email: 'fb@test.com' }),
    login: jest.fn().mockResolvedValue({ token: 'facebook-token' }),
  };

  const mockApple = {
    name: 'apple',
    validate: jest.fn().mockResolvedValue({ email: 'apple@test.com' }),
    login: jest.fn().mockResolvedValue({ token: 'apple-token' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: 'AUTH_STRATEGIES', useValue: [mockGoogle, mockFacebook, mockApple] },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // --- Validate ---
  it('should validate with Google', async () => {
    const result = await service.validate('google', {});
    expect(result).toEqual({ email: 'google@test.com' });
    expect(mockGoogle.validate).toHaveBeenCalled();
  });

  it('should validate with Facebook', async () => {
    const result = await service.validate('facebook', {});
    expect(result).toEqual({ email: 'fb@test.com' });
    expect(mockFacebook.validate).toHaveBeenCalled();
  });

  it('should validate with Apple', async () => {
    const result = await service.validate('apple', {});
    expect(result).toEqual({ email: 'apple@test.com' });
    expect(mockApple.validate).toHaveBeenCalled();
  });

  it('should throw BadRequestException if strategy is missing in validate()', async () => {
    await expect(service.validate('unknown', {})).rejects.toThrow(BadRequestException);
  });

  // --- Login ---
  it('should login with Google', async () => {
    const user = { email: 'google@test.com' };
    const result = await service.login('google', user);
    expect(result).toEqual({ token: 'google-token' });
    expect(mockGoogle.login).toHaveBeenCalledWith(user);
  });

  it('should login with Facebook', async () => {
    const user = { email: 'fb@test.com' };
    const result = await service.login('facebook', user);
    expect(result).toEqual({ token: 'facebook-token' });
    expect(mockFacebook.login).toHaveBeenCalledWith(user);
  });

  it('should login with Apple', async () => {
    const user = { email: 'apple@test.com' };
    const result = await service.login('apple', user);
    expect(result).toEqual({ token: 'apple-token' });
    expect(mockApple.login).toHaveBeenCalledWith(user);
  });

  it('should throw BadRequestException if strategy is missing in login()', async () => {
    await expect(service.login('unknown', {})).rejects.toThrow(BadRequestException);
  });

  // --- Register ---
  it('should register user if strategy supports it', async () => {
    const mockRegister = jest.fn().mockResolvedValue({ token: 'new-token' });
    const mockCustomStrategy = { name: 'local', validate: jest.fn(), login: jest.fn(), register: mockRegister };
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: 'AUTH_STRATEGIES', useValue: [mockCustomStrategy] },
      ],
    }).compile();
    const customService = module.get<AuthService>(AuthService);
    const result = await customService.register('local', { email: 'user@test.com' });
    expect(result).toEqual({ token: 'new-token' });
    expect(mockRegister).toHaveBeenCalled();
  });

  it('should throw BadRequestException if register is not supported', async () => {
    await expect(service.register('google', {})).rejects.toThrow(BadRequestException);
  });

  // --- Edge Cases ---
  it('should throw BadRequestException if login called with empty user', async () => {
    await expect(service.login('google', null as any)).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if validate called with null payload', async () => {
    await expect(service.validate('facebook', null as any)).rejects.toThrow(BadRequestException);
  });
});
