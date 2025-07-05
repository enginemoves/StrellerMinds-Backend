import { Injectable, CanActivate, ExecutionContext, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VersionGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const version = request.headers['api-version'] || 'v1';
    const supportedVersions = this.configService.get<string[]>('api.supportedVersions', []);

    if (!supportedVersions.includes(version)) {
      throw new BadRequestException(`Unsupported API version: ${version}. Supported versions: ${supportedVersions.join(', ')}`);
    }

    return true;
  }
}
