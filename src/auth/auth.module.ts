import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthToken } from './entities/auth-token.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AuthToken])],
  controllers: [AuthController],
  providers: [AuthService]
})
export class AuthModule {}
