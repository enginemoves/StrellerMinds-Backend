import { Injectable } from '@nestjs/common';
import { BlockchainMonitoringService } from './monitoring.service';
import { BatchOperationType, BatchProcessingConfig, BatchResult, BatchSummary, BlockchainBatchService } from './batchprocess/batchprocess.service';

@Injectable()
export class BlockchainService {
  constructor(
    private readonly blockchainMonitoringService: BlockchainMonitoringService,
    private readonly batchService: BlockchainBatchService,
  ) {}

  async verifyTransaction(txHash: string): Promise<{ verified: boolean }> {
    // Implement blockchain verification logic here
    // For now, return a dummy response
    return { verified: true };
  }

  /**
   * Monitor a blockchain transaction by hash
   */
  async monitorTransaction(txHash: string): Promise<void> {
    return this.blockchainMonitoringService.monitorTransaction(txHash);
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(txHash: string): Promise<any> {
    return this.blockchainMonitoringService.getTransactionStatus(txHash);
  }

  /**
   * Get transaction history
   */
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
