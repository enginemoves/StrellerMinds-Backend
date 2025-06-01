import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';

@Controller('blockchain')
export class BlockchainController {
  constructor(private readonly blockchainService: BlockchainService) {}

  @Post('monitor/:txHash')
  async monitorTransaction(@Param('txHash') txHash: string) {
    await this.blockchainService.monitorTransaction(txHash);
    return { message: `Started monitoring transaction ${txHash}` };
  }

  @Get('status/:txHash')
  async getTransactionStatus(@Param('txHash') txHash: string) {
    return this.blockchainService.getTransactionStatus(txHash);
  }

  @Get('history')
  getTransactionHistory() {
    return this.blockchainService.getTransactionHistory();
  }
}
