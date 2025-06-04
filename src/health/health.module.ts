import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';
feature/db-connection-pooling

@Module({
    controllers: [HealthController],
    providers: [HealthService],

import { BlockchainService } from '../blockchain/blockchain.service';

@Module({
  imports: [TerminusModule, TypeOrmModule],
  controllers: [HealthController],
  providers: [HealthService, BlockchainService],
  main
})
export class HealthModule {}
