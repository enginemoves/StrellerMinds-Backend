import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrometheusService } from '@willsoto/nestjs-prometheus';
import { MetricsService } from './metrics-service';

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly prometheusService: PrometheusService,
    private readonly metricsService: MetricsService,
  ) {}

  @Get()
  @Header('Content-Type', 'text/plain')
  @ApiOperation({ summary: 'Get Prometheus metrics' })
  @ApiResponse({ status: 200, description: 'Prometheus metrics in text format' })
  async getMetrics(): Promise<string> {
    return this.prometheusService.register.metrics();
  }

  @Get('custom')
  @ApiOperation({ summary: 'Get custom application metrics' })
  @ApiResponse({ status: 200, description: 'Custom metrics object' })
  async getCustomMetrics() {
    return {
      timestamp: new Date().toISOString(),
      metrics: await this.metricsService.getCustomMetrics(),
    };
  }

  @Get('performance')
  @ApiOperation({ summary: 'Get performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics' })
  async getPerformanceMetrics() {
    return {
      timestamp: new Date().toISOString(),
      performance: await this.metricsService.getPerformanceMetrics(),
    };
  }

  @Get('business')
  @ApiOperation({ summary: 'Get business metrics' })
  @ApiResponse({ status: 200, description: 'Business-specific metrics' })
  async getBusinessMetrics() {
    return {
      timestamp: new Date().toISOString(),
      business: await this.metricsService.getBusinessMetrics(),
    };
  }
}