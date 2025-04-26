import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
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

@Injectable()
export class AuthService {
  private refreshTokens: Map<string, string> = new Map(); // Stores hashed refresh tokens

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    @InjectRepository(AuthToken)
    private readonly authTokenRepository: Repository<AuthToken>,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findOne(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid credentials');

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
      throw new BadRequestException('Error sending welcome email');
    }

    return user;
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

    // Store refresh token securely (hashed)
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    this.refreshTokens.set(userId, hashedRefreshToken);

    return { accessToken, refreshToken };
  }

  async login(user: any): Promise<AuthResponseDto> {
    const tokens = await this.generateTokens(user.id);
    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: 3600, // 1 hour in seconds
      user: { id: user.id, email: user.email },
    };
  }

  async refreshToken(userId: string, refreshToken: string) {
    const storedToken = this.refreshTokens.get(userId);
    if (!storedToken || !(await bcrypt.compare(refreshToken, storedToken))) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return this.generateTokens(userId); // Issue new tokens and rotate refresh token
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
