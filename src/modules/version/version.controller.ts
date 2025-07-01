import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { VersionAnalyticsService } from '../../common/services/version-analytics.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('API Version Management')
@Controller('version')
export class VersionController {
  constructor(
    private versionAnalytics: VersionAnalyticsService,
    private configService: ConfigService,
  ) {}

  @Get('info')
  @ApiOperation({ summary: 'Get API version information' })
  async getVersionInfo() {
    return {
      current: this.configService.get('api.defaultVersion'),
      supported: this.configService.get('api.supportedVersions'),
      deprecated: this.configService.get('api.deprecatedVersions'),
    };
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get version usage analytics' })
  async getAnalytics() {
    const [usageStats, deprecatedUsage] = await Promise.all([
      this.versionAnalytics.getVersionUsageStats(),
      this.versionAnalytics.getDeprecatedEndpointUsage(),
    ]);

    return {
      versionUsage: usageStats,
      deprecatedEndpoints: deprecatedUsage,
    };
  }
}
