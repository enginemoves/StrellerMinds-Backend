/* eslint-disable prettier/prettier */
import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  Injectable,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { AuthService } from './auth.service';


@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const user = await this.authService.validateUser(body.email, body.password);
    return this.authService.login(user);
  }

  @Post('refresh')
  async refresh(@Body() body: { userId: string; refreshToken: string }) {
    if (!body.userId || !body.refreshToken) {
      throw new UnauthorizedException('Missing credentials');
    }
    return this.authService.refreshToken(body.userId, body.refreshToken);
  }
}

// ========================== JWT STRATEGY ==========================
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
