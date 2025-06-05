import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlockchainMonitoringService } from './monitoring.service';
import { BatchOperationType, BatchProcessingConfig, BatchResult, BatchSummary, BlockchainBatchService } from './batchprocess/batchprocess.service';
import Web3 from 'web3';


@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private web3: Web3;

  constructor(
    private readonly config: ConfigService,
    private readonly blockchainMonitoringService: BlockchainMonitoringService,
    private readonly batchService: BlockchainBatchService,
  ) {
    const rpcUrl = this.config.get<string>('RPC_URL');
    if (!rpcUrl) {
      this.logger.error('RPC_URL is not defined in configuration');
      throw new Error('RPC_URL must be set');
    }
    this.web3 = new Web3(rpcUrl);

  async isConnected(): Promise<boolean> {
    try {
      await this.web3.eth.getBlockNumber();
      return true;
    } catch (err) {
      this.logger.error('Blockchain RPC ping failed', err);
      return false;
    }
  }


  async verifyTransaction(txHash: string): Promise<{ verified: boolean }> {
    try {
      const receipt = await this.web3.eth.getTransactionReceipt(txHash);
      return { verified: receipt?.status === 1n || receipt?.status === true };
    } catch (err) {
      this.logger.error(`Failed to verify transaction: ${txHash}`, err);
      return { verified: false };
    }
  }

  async monitorTransaction(txHash: string): Promise<void> {
    return this.blockchainMonitoringService.monitorTransaction(txHash);
  }

  async getTransactionStatus(txHash: string): Promise<any> {
    return this.blockchainMonitoringService.getTransactionStatus(txHash);
  }

  getTransactionHistory(): any[] {
    return this.blockchainMonitoringService.getHistory();
  }


  /**
   * Add transaction verification to batch queue
   */
  async batchVerifyTransaction(txHash: string): Promise<string> {
    return this.batchService.addOperation(
      BatchOperationType.VERIFY_TRANSACTION,
      { txHash }
    );
  }

  /**
   * Add transaction monitoring to batch queue
   */
  async batchMonitorTransaction(txHash: string): Promise<string> {
    return this.batchService.addOperation(
      BatchOperationType.MONITOR_TRANSACTION,
      { txHash }
    );
  }

  /**
   * Add transaction status check to batch queue
   */
  async batchGetTransactionStatus(txHash: string): Promise<string> {
    return this.batchService.addOperation(
      BatchOperationType.GET_TRANSACTION_STATUS,
      { txHash }
    );
  }

  /**
   * Batch verify multiple transactions
   */
  async batchVerifyTransactions(txHashes: string[]): Promise<string[]> {
    const operations = txHashes.map(txHash => ({
      type: BatchOperationType.VERIFY_TRANSACTION,
      payload: { txHash }
    }));
    
    return this.batchService.addBatchOperations(operations);
  }

  /**
   * Batch monitor multiple transactions
   */
  async batchMonitorTransactions(txHashes: string[]): Promise<string[]> {
    const operations = txHashes.map(txHash => ({
      type: BatchOperationType.MONITOR_TRANSACTION,
      payload: { txHash }
    }));
    
    return this.batchService.addBatchOperations(operations);
  }

  /**
   * Get batch operation result
   */
  getBatchOperationResult(operationId: string): BatchResult | null {
    return this.batchService.getOperationResult(operationId);
  }

  /**
   * Get batch queue status
   */
  getBatchQueueStatus() {
    return this.batchService.getBatchQueueStatus();
  }

  /**
   * Force process current batch
   */
  async forceProcessBatch(): Promise<BatchSummary> {
    return this.batchService.forceProcessBatch();
  }

  /**
   * Update batch configuration
   */
  updateBatchConfig(config: Partial<BatchProcessingConfig>) {
    this.batchService.updateConfig(config);
  }
}
