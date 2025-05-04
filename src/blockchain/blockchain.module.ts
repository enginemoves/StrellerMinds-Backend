import { Module } from '@nestjs/common';
import { BlockchainController } from './blockchain.controller';
import { BlockchainService } from './blockchain.service';
import { StellarService } from './stellar/stellar.service';
import { StellarClient } from './stellar/stellar.client';
import { SorobanService } from './soroban/soroban.service';
import { SorobanClient } from './soroban/soroban.client';

@Module({
  controllers: [
    BlockchainController,
    StellarService,
    StellarClient,
    SorobanService,
    SorobanClient,
  ],
  providers: [BlockchainService],
  exports: [StellarService, SorobanService],
})
export class BlockchainModule {}
