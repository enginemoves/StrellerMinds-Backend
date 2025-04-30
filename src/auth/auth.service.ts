import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthResponseDto } from './dto/auth-response.dto';
import { EmailService } from 'src/email/email.service';
import { User } from '../users/entities/user.entity'; // <== make sure you import User entity

@Injectable()
export class AuthService {
  private refreshTokens: Map<string, string> = new Map(); // Stores hashed refresh tokens

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async validateUser(email: string, password: string): Promise<User> {
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
      throw new BadRequestException('Error sending welcome email');
    }

    return user;
  }

  async generateTokens(user: User) {
    const payload = { sub: user.id, role: user.role };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });
    const refreshToken = this.jwtService.sign(
      { sub: user.id },
      { secret: process.env.REFRESH_TOKEN_SECRET, expiresIn: '7d' }
    );

    // Store refresh token securely (hashed)
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    this.refreshTokens.set(user.id, hashedRefreshToken);

    return { accessToken, refreshToken };
  }

  async login(user: User): Promise<AuthResponseDto> {
    const tokens = await this.generateTokens(user);
    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: 3600, // 1 hour in seconds
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }
  
  async refreshToken(userId: string, refreshToken: string) {
    const storedToken = this.refreshTokens.get(userId);
    if (!storedToken || !(await bcrypt.compare(refreshToken, storedToken))) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  
    // Find the user to regenerate token with role
    const user = await this.usersService.findOne(userId); // Correct method name
    if (!user) throw new UnauthorizedException('User not found');
  
    const tokens = await this.generateTokens(user); // Now pass user
    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: 3600, // 1 hour
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }
  
}
