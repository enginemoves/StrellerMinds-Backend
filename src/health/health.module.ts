import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { BlockchainService } from '../blockchain/blockchain.service';

@Module({
  imports: [TerminusModule, TypeOrmModule],
  controllers: [HealthController],
  providers: [HealthService, BlockchainService],
})
export class HealthModule {}
