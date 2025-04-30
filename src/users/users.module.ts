import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { UsersController } from './users.controller';
import { UsersService } from './services/users.service';
import { AccountDeletionConfirmationService } from './services/account.deletion.confirmation.service';

import { User } from './entities/user.entity';
import { WalletInfo } from './entities/wallet-info.entity';
import { UserSettings } from './entities/user-settings.entity';

import { AuditLog } from 'src/audit/entities/audit.log.entity';
import { AuditLogModule } from 'src/audit/audit.log.module';

import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

import { EmailModule } from 'src/email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, WalletInfo, AuditLog, UserSettings]),
    AuditLogModule,
    ConfigModule,
    EmailModule,
    CloudinaryModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, AccountDeletionConfirmationService],
  exports: [UsersService, AccountDeletionConfirmationService],
})
export class UsersModule {}



