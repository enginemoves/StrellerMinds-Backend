feature/db-connection-pooling
import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
    constructor(private readonly healthService: HealthService) {}

    @Get()
    check() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
        };
    }

    @Get('db')
    async checkDatabase() {
        return this.healthService.checkDatabase();

import { Controller, Get, Query } from '@nestjs/common';
import { HealthService } from './health.service';
import { HealthCheckResult } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async health(
    @Query('summary') summary?: string,
  ): Promise<{ status: string } | HealthCheckResult> {
    const result = await this.healthService.check();

    if (summary === 'true') {
      return { status: result.status === 'ok' ? 'healthy' : 'unhealthy' };
 main
    }
    return result;
  }

  @Get('db')
  checkDatabase() {
    // Placeholder: Replace with actual DB health check later
    return {
      database: 'connected',
      timestamp: new Date().toISOString(),
    };
  }
}
