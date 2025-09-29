import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PremiumContentGuard } from './premium-content.guard';
import { PaymentModule } from '../payment/payment.module';
import { UsersModule } from '../users/users.module';
import { CoursesModule } from '../courses/courses.module';
import { AuditLogModule } from 'src/audit/audit.log.module';

@Module({
  imports: [
    ConfigModule,
    PaymentModule,
    UsersModule,
    CoursesModule,
    AuditLogModule,
    TypeOrmModule.forFeature([]),
  ],
  controllers: [BillingController],
  providers: [BillingService, PremiumContentGuard],
  exports: [BillingService, PremiumContentGuard],
})
export class BillingModule {}
