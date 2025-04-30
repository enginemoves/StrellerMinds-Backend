import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { UsersService } from 'src/users/services/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { EmailService } from 'src/email/email.service';
import { v4 as uuidv4 } from 'uuid';
import { addMinutes } from 'date-fns';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthToken } from './entities/auth-token.entity';
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
     
    @InjectRepository(AuthToken)
    private readonly authTokenRepository: Repository<AuthToken>,

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

    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid credentials');

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

  async generateTokens(userId: string) {
    const accessToken = this.jwtService.sign(
      { sub: userId },
      { expiresIn: '1h' },
    );
    const refreshToken = this.jwtService.sign(
      { sub: userId },
      { secret: process.env.REFRESH_TOKEN_SECRET, expiresIn: '7d' },
    );
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

  async forgotPassword(email: string) {
    const user = await this.usersService.findOne(email);
    if (!user) {
      throw new NotFoundException('User with this email does not exist.');
    }

    const token = uuidv4(); // generate random token
    const expiresAt = addMinutes(new Date(), 15); // expires in 15 minutes

    const resetToken = this.authTokenRepository.create({
      user,
      token,
      expiresAt,
      purpose: 'reset_password',
      isRevoked: false,
    });

    await this.authTokenRepository.save(resetToken);

    await this.emailService.sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      templateName: 'reset-password',
      context: {
        name: user.firstName,
        token: token,
      },
    });

    return { message: 'Password reset email sent' };
  }

  async validateResetToken(token: string) {
    const authToken = await this.authTokenRepository.findOne({
      where: { token, purpose: 'reset_password', isRevoked: false },
      relations: ['user'],
    });

    if (!authToken || authToken.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired password reset token.');
    }

    return authToken.user;
  }

  async resetPassword(token: string, newPassword: string) {
    const authToken = await this.authTokenRepository.findOne({
      where: { token, purpose: 'reset_password', isRevoked: false },
      relations: ['user'],
    });

    if (!authToken || authToken.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired password reset token.');
    }

    const user = authToken.user;

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(user.id, hashedPassword);

    authToken.isRevoked = true;
    await this.authTokenRepository.save(authToken);

    return { message: 'Password successfully reset' };
  }

  // Request Password Reset
  async requestPasswordReset(email: string) {
    const user = await this.usersService.findOne(email);
    if (!user) {
      throw new NotFoundException('User with this email does not exist.');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = addMinutes(new Date(), 15);

    // Create the reset token entity
    const resetToken = this.authTokenRepository.create({
      user,
      token,
      expiresAt,
      purpose: 'reset_password',
    });

    await this.authTokenRepository.save(resetToken);

    // Send password reset email
    await this.emailService.sendEmail({
      to: user.email,
      subject: 'Password Reset Request',
      templateName: 'reset-password', // Assuming you're using templates for email
      context: {
        name: user.firstName,
        token: token,
      },
    });

    return { message: 'Password reset email sent' };
  }
}

