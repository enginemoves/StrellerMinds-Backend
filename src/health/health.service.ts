import { Injectable, Logger } from '@nestjs/common';
import {
  HealthCheckService,
  TypeOrmHealthIndicator,
  HealthCheckResult,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { BlockchainService } from '../blockchain/blockchain.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private health: HealthCheckService,
    private dbIndicator: TypeOrmHealthIndicator,
    private blockchainService: BlockchainService,
  ) {}

  async check(): Promise<HealthCheckResult> {
    return this.health.check([
      async (): Promise<HealthIndicatorResult> =>
        this.dbIndicator.pingCheck('database'),
      async (): Promise<HealthIndicatorResult> => {
        const up = await this.blockchainService.isConnected();
        if (!up) {
          this.logger.error('Blockchain connectivity failed');
          throw new Error('Blockchain not connected');
        }
        return { blockchain: { status: 'up' } };
      },
    ]);
  }
}
bolc