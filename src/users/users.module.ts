import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { WalletInfo } from './entities/wallet-info.entity';
import { AuditLog } from 'src/audit/entities/audit.log.entity';
import { ConfigModule } from '@nestjs/config';
import { AccountDeletionConfirmationService } from './services/account.deletion.confirmation.service';
import { UsersService } from './services/users.service';
import { EmailModule } from 'src/shared/email.module';
import { AuditLogModule } from 'src/audit/audit.log.module';
import { UsersController } from './users.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, WalletInfo, AuditLog]),
    AuditLogModule,
    ConfigModule,
    EmailModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, AccountDeletionConfirmationService],
  exports: [UsersService, AccountDeletionConfirmationService],
})
export class UsersModule {}


