import { Module } from '@nestjs/common';
import { ErrorDashboardController } from './error-dashboard.controller';
import { ErrorDashboardService } from './error-dashboard.service';
import { LoggingModule } from '../common/logging/logging.module';
import { AlertingModule } from '../common/alerting/alerting.module';

@Module({
  imports: [LoggingModule, AlertingModule],
  controllers: [ErrorDashboardController],
  providers: [ErrorDashboardService],
  exports: [ErrorDashboardService],
})
export class ErrorDashboardModule {}