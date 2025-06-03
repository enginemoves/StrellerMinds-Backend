import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { ScheduleModule } from '@nestjs/schedule';
import { MetricsController } from './metrics-controller';
import { HealthController } from './health-controller';
import { HealthService } from './health-service';
import { MetricsService } from './metrics-service';
import { AlertingService } from './alerting-service';
import { MonitoringService } from './monitoring-service';
import { DatabaseHealthIndicator } from './database-health-indicator';
import { CustomHealthIndicator } from './custom_health_indicator';
import { MetricsCollectorService } from './metrics_collector_service';

@Module({
  imports: [
    TerminusModule,
    HttpModule,
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
        config: {
          prefix: 'nestjs_app_',
        },
      },
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [HealthController, MetricsController],
  providers: [
    HealthService,
    MetricsService,
    AlertingService,
    MonitoringService,
    DatabaseHealthIndicator,
    CustomHealthIndicator,
    MetricsCollectorService,
  ],
  exports: [
    HealthService,
    MetricsService,
    AlertingService,
    MonitoringService,
  ],
})
export class MonitoringModule {}