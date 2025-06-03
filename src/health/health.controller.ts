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
