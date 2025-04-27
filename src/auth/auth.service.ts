import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthResponseDto } from './dto/auth-response.dto';
import { EmailService } from '../email/email.service';
import { PasswordValidationService } from './password-validation.service';

@Injectable()
export class AuthService {
  private refreshTokens: Map<string, string> = new Map(); // Stores hashed refresh tokens

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly passwordValidationService: PasswordValidationService,
  ) { }



  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findOne(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

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
      throw new BadRequestException(error.message || 'Error sending welcome email');
    }

    return user;
  }

  async validatePassword(password: string): Promise<boolean> {
    const validationResult = this.passwordValidationService.validatePassword(password);

    if (!validationResult.isValid) {
      throw new BadRequestException({
        message: 'Password does not meet requirements',
        errors: validationResult.errors
      });
    }

    return true;
  }

  async register(email: string, password: string, userData?: any): Promise<AuthResponseDto> {
    // First validate the password
    await this.validatePassword(password);

    // Check if user already exists
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await this.usersService.create({
      email,
      password: hashedPassword,
      ...userData
    });

    // Generate tokens and return login response
    return this.login(user);
  }

  async generateTokens(userId: string) {
    const accessToken = this.jwtService.sign({ sub: userId }, { expiresIn: '1h' });
    const refreshToken = this.jwtService.sign(
      { sub: userId },
      { secret: process.env.REFRESH_TOKEN_SECRET, expiresIn: '7d' }
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

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    // Find the user
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Validate new password
    await this.validatePassword(newPassword);

    // Hash and update the password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.usersService.updatePassword(userId, hashedPassword);

    // Invalidate refresh tokens
    this.refreshTokens.delete(userId);

    return true;
  }
}