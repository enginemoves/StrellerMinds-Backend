// import { Controller, Get, Param, Post, Body } from '@nestjs/common';
// import { BlockchainService } from './blockchain.service';

// @Controller('blockchain')
// export class BlockchainController {
//   constructor(private readonly blockchainService: BlockchainService) {}

//   @Post('monitor/:txHash')
//   async monitorTransaction(@Param('txHash') txHash: string) {
//     await this.blockchainService.monitorTransaction(txHash);
//     return { message: `Started monitoring transaction ${txHash}` };
//   }

//   @Get('status/:txHash')
//   async getTransactionStatus(@Param('txHash') txHash: string) {
//     return this.blockchainService.getTransactionStatus(txHash);
//   }

//   @Get('history')
//   getTransactionHistory() {
//     return this.blockchainService.getTransactionHistory();
//   }
// }


import { Controller, Get, Param, Post, Body, Put } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { BatchProcessingConfig } from './batchprocess/batchprocess.service';

@Controller('blockchain')
export class BlockchainController {
  constructor(private readonly blockchainService: BlockchainService) {}

  // Existing endpoints
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

  /**
   * Add single transaction verification to batch queue
   */
  @Post('batch/verify/:txHash')
  async batchVerifyTransaction(@Param('txHash') txHash: string) {
    const operationId = await this.blockchainService.batchVerifyTransaction(txHash);
    return { 
      message: `Transaction ${txHash} added to verification batch`,
      operationId 
    };
  }

  /**
   * Add single transaction monitoring to batch queue
   */
  @Post('batch/monitor/:txHash')
  async batchMonitorTransaction(@Param('txHash') txHash: string) {
    const operationId = await this.blockchainService.batchMonitorTransaction(txHash);
    return { 
      message: `Transaction ${txHash} added to monitoring batch`,
      operationId 
    };
  }

  /**
   * Add single transaction status check to batch queue
   */
  @Post('batch/status/:txHash')
  async batchGetTransactionStatus(@Param('txHash') txHash: string) {
    const operationId = await this.blockchainService.batchGetTransactionStatus(txHash);
    return { 
      message: `Transaction ${txHash} added to status check batch`,
      operationId 
    };
  }

  /**
   * Batch verify multiple transactions
   */
  @Post('batch/verify')
  async batchVerifyTransactions(@Body() body: { txHashes: string[] }) {
    const operationIds = await this.blockchainService.batchVerifyTransactions(body.txHashes);
    return { 
      message: `${body.txHashes.length} transactions added to verification batch`,
      operationIds 
    };
  }

  /**
   * Batch monitor multiple transactions
   */
  @Post('batch/monitor')
  async batchMonitorTransactions(@Body() body: { txHashes: string[] }) {
    const operationIds = await this.blockchainService.batchMonitorTransactions(body.txHashes);
    return { 
      message: `${body.txHashes.length} transactions added to monitoring batch`,
      operationIds 
    };
  }

  /**
   * Get batch operation result
   */
  @Get('batch/result/:operationId')
  async getBatchOperationResult(@Param('operationId') operationId: string) {
    const result = this.blockchainService.getBatchOperationResult(operationId);
    if (!result) {
      return { message: 'Operation not found or still processing' };
    }
    return result;
  }

  /**
   * Get batch queue status
   */
  @Get('batch/status')
  getBatchQueueStatus() {
    return this.blockchainService.getBatchQueueStatus();
  }

  /**
   * Force process current batch
   */
  @Post('batch/process')
  async forceProcessBatch() {
    const summary = await this.blockchainService.forceProcessBatch();
    return summary;
  }

  /**
   * Update batch configuration
   */
  @Put('batch/config')
  updateBatchConfig(@Body() config: Partial<BatchProcessingConfig>) {
    this.blockchainService.updateBatchConfig(config);
    return { message: 'Batch configuration updated successfully' };
  }
}
