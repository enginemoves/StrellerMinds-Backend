/* eslint-disable prettier/prettier */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Module, Controller, Post, Body, UnauthorizedException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';


// ========================== AUTH SERVICE ==========================
@Injectable()
export class AuthService {
  private refreshTokens: Map<string, string> = new Map(); // Stores hashed refresh tokens

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findOne(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    return user;
  }

  async generateTokens(userId: string) {
    const accessToken = this.jwtService.sign({ sub: userId });
    const refreshToken = this.jwtService.sign(
      { sub: userId },
      { secret: process.env.REFRESH_TOKEN_SECRET, expiresIn: '7d' }
    );

    // Store refresh token securely (hashed)
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    this.refreshTokens.set(userId, hashedRefreshToken);

    return { accessToken, refreshToken };
  }

  async login(user: any) {
    return this.generateTokens(user.id);
  }

  async refreshToken(userId: string, refreshToken: string) {
    const storedToken = this.refreshTokens.get(userId);
    if (!storedToken || !(await bcrypt.compare(refreshToken, storedToken))) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.generateTokens(userId); // Issue new tokens and rotate refresh token
  }
}
