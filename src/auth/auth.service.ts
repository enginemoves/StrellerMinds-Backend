import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { UsersService } from 'src/users/services/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthResponseDto } from './dto/auth-response.dto';
import { EmailService } from 'src/email/email.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm'; 
import { RefreshToken } from './entities/refresh-token.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    try {
      await this.emailService.sendEmail({
        to: user.email,
        subject: 'Welcome to Our Platform',
        templateName: 'welcome',
        context: {
          name: user.firstName,
          year: new Date().getFullYear(),
        },
      });
      
    } catch (error) {
      // Log error but don't stop the login process
      console.error('Error sending welcome email:', error);
    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Please verify your email first');
    }

    return user;
  }
}

  // async generateTokens(userId: string) {
  //   const accessToken = this.jwtService.sign({ sub: userId }, { expiresIn: '1h' });
  //   const refreshToken = this.jwtService.sign(
  //     { sub: userId, type: 'refresh' },
  //     { secret: process.env.REFRESH_TOKEN_SECRET, expiresIn: '7d' }
  //   );

  //   // Hash the refresh token before storing
  //   const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    
  //   // Store refresh token in database with expiration date
  //   const expiresAt = new Date();
  //   expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
    
  //   // Check if there's an existing token for this user and revoke it
  //   await this.revokeUserRefreshTokens(userId);
    
  //   // Create new refresh token
  //   const tokenEntity = this.refreshTokenRepository.create({
  //     userId,
  //     token: hashedRefreshToken,
  //     expiresAt,
  //     isRevoked: false
  //   });
    
  //   await this.refreshTokenRepository.save(tokenEntity);
  // }
  async generateTokens(user) {
    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '1h',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('REFRESH_TOKEN_SECRET'),
        expiresIn: '7d',
      }),
    ]);

    // Hash the refresh token before storing
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    
    // Store the hashed refresh token in the database
    await this.usersService.updateRefreshToken(user.id, hashedRefreshToken);

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1 hour in seconds
    };
  }

  async login(user: any): Promise<AuthResponseDto> {
    const tokens = await this.generateTokens(user);
    
    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: tokens.expiresIn,
      user: {
        id: user.id,
        email: user.email,
        roles: user.roles,
      },
    }
  }

  async refreshToken(userId: string, refreshToken: string) {
    try {
      // Verify the token signature first
      await this.jwtService.verify(refreshToken, {
        secret: process.env.REFRESH_TOKEN_SECRET
      });
      
      // Find stored token for this user
      const tokenEntity = await this.refreshTokenRepository.findOne({
        where: { 
          userId,
          isRevoked: false,
          expiresAt: MoreThan(new Date()) // Only valid tokens
        }
      });
      
      if (!tokenEntity) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }
      
      // Verify that the provided token matches the stored hash
      const isTokenValid = await bcrypt.compare(refreshToken, tokenEntity.token);
      if (!isTokenValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      
      // Implement token rotation - revoke current token
      await this.refreshTokenRepository.update(tokenEntity.id, { isRevoked: true });
      
      // Generate new tokens
      return this.generateTokens(userId);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
  
  async revokeUserRefreshTokens(userId: string): Promise<void> {
    try {
      await this.refreshTokenRepository.update(
        { userId, isRevoked: false },
        { isRevoked: true }
      );
    } catch (error) {
      throw new InternalServerErrorException('Error revoking refresh tokens');
    }
  }
  
  // async logout(userId: string): Promise<void> {
  //   // Revoke all refresh tokens for the user during logout
  //   await this.revokeUserRefreshTokens(userId);
  //   const user = await this.usersService.findOne(userId);
  //   if (!user || !user.refreshToken) {
  //     throw new UnauthorizedException('Invalid refresh token');
  //   }

  //   const refreshTokenMatches = await bcrypt.compare(
  //     refreshToken,
  //     user.refreshToken,
  //   );

  //   if (!refreshTokenMatches) {
  //     throw new UnauthorizedException('Invalid refresh token');
  //   }

  //   return this.generateTokens(user);
  // }

  async logout(userId: string) {
    await this.usersService.updateRefreshToken(userId, null);
    return { message: 'Logged out successfully' };
  }

  async validateToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      return payload;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}

