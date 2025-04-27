import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  Injectable,
  Get,
  BadRequestException,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { RegisterDto } from './dto/register.dto';
import { PasswordValidationService } from './password-validation.service';
import { PasswordRequirementsDto } from './dto/password-requirements.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly passwordValidationService: PasswordValidationService,
  ) {}

  @Post('login')
  async login(@Body() body: LoginDto) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    try {
      const { email, password, ...userData } = registerDto;
      return await this.authService.register(email, password, userData);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Registration failed');
    }
  }

  @Get('password-requirements')
  getPasswordRequirements(): PasswordRequirementsDto {
    return { 
      requirements: this.passwordValidationService.getPasswordRequirements() 
    };
  }

  @Post('refresh')
  async refresh(@Body() body: { userId: string; refreshToken: string }) {
    if (!body.userId || !body.refreshToken) {
      throw new UnauthorizedException('Missing credentials');
    }
    return this.authService.refreshToken(body.userId, body.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Request() req,
    @Body() body: { currentPassword: string; newPassword: string }
  ) {
    const userId = req.user.id;
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      throw new BadRequestException('Current password and new password are required');
    }

    return this.authService.changePassword(userId, currentPassword, newPassword);
  }
}


@Injectable()
export class JwtAuthStrategy extends JwtStrategy {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    return { userId: payload.sub };
  }
}