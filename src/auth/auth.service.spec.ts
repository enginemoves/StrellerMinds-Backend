import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PasswordValidationService } from './password-validation.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcryptjs';

jest.mock('bcryptjs');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let passwordValidationService: PasswordValidationService;
  let emailService: EmailService;

  beforeEach(async () => {
    const usersServiceMock = {
      findOne: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      updatePassword: jest.fn(),

      userRepository: {}
    };

    const jwtServiceMock = {
      sign: jest.fn().mockReturnValue('test-token'),
      verify: jest.fn().mockReturnValue({ sub: 'test-id' }),

      options: {},
      logger: {
        error: jest.fn(),
        warn: jest.fn(),
        log: jest.fn()
      },
      mergeJwtOptions: jest.fn(),
      overrideSecretFromOptions: jest.fn(),
      getSecretKey: jest.fn()
    };

    const passwordValidationServiceMock = {
      validatePassword: jest.fn(),

      MIN_LENGTH: 8,
      MIN_SCORE: 3
    };

    const emailServiceMock = {
      sendEmail: jest.fn().mockResolvedValue({})
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: usersServiceMock
        },
        {
          provide: JwtService,
          useValue: jwtServiceMock
        },
        {
          provide: EmailService,
          useValue: emailServiceMock
        },
        {
          provide: PasswordValidationService,
          useValue: passwordValidationServiceMock
        }
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    passwordValidationService = module.get<PasswordValidationService>(PasswordValidationService);
    emailService = module.get<EmailService>(EmailService);

    // Mock bcrypt functions
    (bcrypt.compare as jest.Mock).mockImplementation((plainText, hash) =>
      Promise.resolve(plainText === 'correctPassword')
    );
    (bcrypt.hash as jest.Mock).mockImplementation((text) =>
      Promise.resolve(`hashed-${text}`)
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validatePassword', () => {
    it('should call passwordValidationService and return true for valid password', async () => {
      (passwordValidationService.validatePassword as jest.Mock).mockReturnValue({ isValid: true, errors: [], score: 4 });

      const result = await service.validatePassword('StrongP@ssw0rd');

      expect(result).toBe(true);
      expect(passwordValidationService.validatePassword).toHaveBeenCalledWith('StrongP@ssw0rd');
    });

    it('should throw BadRequestException for invalid password', async () => {
      (passwordValidationService.validatePassword as jest.Mock).mockReturnValue({
        isValid: false,
        errors: ['Password is too weak'],
        score: 2
      });

      await expect(service.validatePassword('weakpass')).rejects.toThrow(BadRequestException);
      expect(passwordValidationService.validatePassword).toHaveBeenCalledWith('weakpass');
    });
  });

  describe('register', () => {
    it('should validate password, check for existing user, hash password, and create user', async () => {
      // Setup
      jest.spyOn(service, 'validatePassword').mockResolvedValue(true);
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);
      (usersService.create as jest.Mock).mockResolvedValue({ id: 'new-user-id', email: 'test@example.com' });
      jest.spyOn(service, 'login').mockResolvedValue({
        access_token: 'test-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        user: { id: 'new-user-id', email: 'test@example.com' }
      });

      // Execute
      const result = await service.register('test@example.com', 'StrongP@ssw0rd', { firstName: 'Test' });

      // Assert
      expect(service.validatePassword).toHaveBeenCalledWith('StrongP@ssw0rd');
      expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(bcrypt.hash).toHaveBeenCalledWith('StrongP@ssw0rd', 10);
      expect(usersService.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'hashed-StrongP@ssw0rd',
        firstName: 'Test'
      });
      expect(service.login).toHaveBeenCalled();
      expect(result).toEqual({
        access_token: 'test-token',
        refresh_token: 'refresh-token',
        expires_in: 3600,
        user: { id: 'new-user-id', email: 'test@example.com' }
      });
    });

    it('should throw BadRequestException if user already exists', async () => {
      // Setup
      jest.spyOn(service, 'validatePassword').mockResolvedValue(true);
      (usersService.findByEmail as jest.Mock).mockResolvedValue({ id: 'existing-id', email: 'test@example.com' });

      // Execute & Assert
      await expect(service.register('test@example.com', 'StrongP@ssw0rd'))
        .rejects.toThrow(BadRequestException);

      expect(service.validatePassword).toHaveBeenCalledWith('StrongP@ssw0rd');
      expect(usersService.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(usersService.create).not.toHaveBeenCalled();
    });
  });

  describe('changePassword', () => {
    it('should change password when current password is valid', async () => {
      // Setup
      (usersService.findById as jest.Mock).mockResolvedValue({
        id: 'user-id',
        password: 'hashed-correctPassword'
      });
      jest.spyOn(service, 'validatePassword').mockResolvedValue(true);

      // Execute
      const result = await service.changePassword('user-id', 'correctPassword', 'NewStrongP@ss123');

      // Assert
      expect(usersService.findById).toHaveBeenCalledWith('user-id');
      expect(bcrypt.compare).toHaveBeenCalledWith('correctPassword', 'hashed-correctPassword');
      expect(service.validatePassword).toHaveBeenCalledWith('NewStrongP@ss123');
      expect(bcrypt.hash).toHaveBeenCalledWith('NewStrongP@ss123', 10);
      expect(usersService.updatePassword).toHaveBeenCalledWith('user-id', 'hashed-NewStrongP@ss123');
      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      // Setup
      (usersService.findById as jest.Mock).mockResolvedValue(null);

      // Execute & Assert
      await expect(service.changePassword('user-id', 'currentPass', 'newPass'))
        .rejects.toThrow(UnauthorizedException);

      expect(usersService.updatePassword).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if current password is incorrect', async () => {
      // Setup
      (usersService.findById as jest.Mock).mockResolvedValue({
        id: 'user-id',
        password: 'hashed-correctPassword'
      });


      const validatePasswordSpy = jest.spyOn(service, 'validatePassword');

      // Execute & Assert
      await expect(service.changePassword('user-id', 'wrongPassword', 'newPass'))
        .rejects.toThrow(BadRequestException);


      expect(validatePasswordSpy).not.toHaveBeenCalled();
      expect(usersService.updatePassword).not.toHaveBeenCalled();
    });
  });
});