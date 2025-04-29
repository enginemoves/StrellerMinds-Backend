import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/services/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockUser = {
    id: '1',
    email: 'test@example.com',
    password: 'hashedPassword',
    roles: ['STUDENT'],
    isEmailVerified: true,
  };

  const mockTokens = {
    accessToken: 'mockAccessToken',
    refreshToken: 'mockRefreshToken',
    expiresIn: 3600,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByEmail: jest.fn(),
            findOne: jest.fn(),
            updateRefreshToken: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('testSecret'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('validateUser', () => {
    it('should validate user credentials successfully', async () => {
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password');
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

      await expect(
        service.validateUser('test@example.com', 'wrongPassword'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for unverified email', async () => {
      const unverifiedUser = { ...mockUser, isEmailVerified: false };
      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(unverifiedUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);

      await expect(
        service.validateUser('test@example.com', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('generateTokens', () => {
    it('should generate tokens with correct claims', async () => {
      jest.spyOn(jwtService, 'signAsync').mockResolvedValue('mockToken');
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashedToken');
      jest.spyOn(usersService, 'updateRefreshToken').mockResolvedValue();

      const result = await service.generateTokens(mockUser);

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        {
          sub: mockUser.id,
          email: mockUser.email,
          roles: mockUser.roles,
        },
        expect.any(Object),
      );
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn', 3600);
    });
  });

  describe('login', () => {
    it('should return auth response with tokens and user info', async () => {
      jest.spyOn(service, 'generateTokens').mockResolvedValue(mockTokens);

      const result = await service.login(mockUser);

      expect(result).toEqual({
        access_token: mockTokens.accessToken,
        refresh_token: mockTokens.refreshToken,
        expires_in: mockTokens.expiresIn,
        user: {
          id: mockUser.id,
          email: mockUser.email,
          roles: mockUser.roles,
        },
      });
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens successfully', async () => {
      jest.spyOn(usersService, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true);
      jest.spyOn(service, 'generateTokens').mockResolvedValue(mockTokens);

      const result = await service.refreshToken('1', 'validRefreshToken');
      expect(result).toEqual(mockTokens);
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      jest.spyOn(usersService, 'findOne').mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false);

      await expect(
        service.refreshToken('1', 'invalidRefreshToken'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateToken', () => {
    it('should validate token successfully', async () => {
      const mockPayload = { sub: '1', email: 'test@example.com' };
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue(mockPayload);

      const result = await service.validateToken('validToken');
      expect(result).toEqual(mockPayload);
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      jest.spyOn(jwtService, 'verifyAsync').mockRejectedValue(new Error());

      await expect(service.validateToken('invalidToken')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
