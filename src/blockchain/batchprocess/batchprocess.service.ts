export enum BatchOperationType {
  VERIFY_TRANSACTION = 'verify_transaction',
  MONITOR_TRANSACTION = 'monitor_transaction',
  GET_TRANSACTION_STATUS = 'get_transaction_status'
}

export interface BatchOperation {
  id: string;
  type: BatchOperationType;
  payload: any;
  retryCount?: number;
  maxRetries?: number;
  createdAt: Date;
}

export interface BatchResult {
  id: string;
  success: boolean;
  result?: any;
  error?: string;
  executedAt: Date;
}

export interface BatchProcessingConfig {
  maxBatchSize: number;
  processingInterval: number; // in milliseconds
  maxRetries: number;
  retryDelay: number; // in milliseconds
}

export interface BatchSummary {
  batchId: string;
  totalOperations: number;
  successCount: number;
  failureCount: number;
  startTime: Date;
  endTime: Date;
  results: BatchResult[];
}



import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class BlockchainBatchService implements OnModuleDestroy {
  private readonly logger = new Logger(BlockchainBatchService.name);
  private readonly operationQueue: BatchOperation[] = [];
  private readonly processingResults = new Map<string, BatchResult>();
  private processingTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  private readonly config: BatchProcessingConfig = {
    maxBatchSize: 10,
    processingInterval: 5000, // 5 seconds
    maxRetries: 3,
    retryDelay: 1000 // 1 second
  };

  constructor(private readonly blockchainService: any) {
    this.startBatchProcessor();
  }

  onModuleDestroy() {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
    }
  }

  /**
   * Add operation to batch queue
   */
  async addOperation(
    type: BatchOperationType,
    payload: any,
    maxRetries?: number
  ): Promise<string> {
    const operation: BatchOperation = {
      id: uuidv4(),
      type,
      payload,
      retryCount: 0,
      maxRetries: maxRetries ?? this.config.maxRetries,
      createdAt: new Date()
    };

    this.operationQueue.push(operation);
    this.logger.log(`Added operation ${operation.id} to batch queue`);
    
    return operation.id;
  }

  /**
   * Add multiple operations to batch queue
   */
  async addBatchOperations(operations: Omit<BatchOperation, 'id' | 'createdAt'>[]): Promise<string[]> {
    const operationIds: string[] = [];
    
    for (const op of operations) {
      const operation: BatchOperation = {
        ...op,
        id: uuidv4(),
        retryCount: op.retryCount ?? 0,
        maxRetries: op.maxRetries ?? this.config.maxRetries,
        createdAt: new Date()
      };
      
      this.operationQueue.push(operation);
      operationIds.push(operation.id);
    }

    this.logger.log(`Added ${operations.length} operations to batch queue`);
    return operationIds;
  }

  /**
   * Get operation result
   */
  getOperationResult(operationId: string): BatchResult | null {
    return this.processingResults.get(operationId) || null;
  }

  /**
   * Get batch queue status
   */
  getBatchQueueStatus() {
    return {
      queueLength: this.operationQueue.length,
      isProcessing: this.isProcessing,
      config: this.config,
      resultsCount: this.processingResults.size
    };
  }

  /**
   * Update batch processing configuration
   */
  updateConfig(newConfig: Partial<BatchProcessingConfig>) {
    Object.assign(this.config, newConfig);
    this.logger.log('Batch processing configuration updated', newConfig);
    
    // Restart processor with new interval if changed
    if (newConfig.processingInterval) {
      this.stopBatchProcessor();
      this.startBatchProcessor();
    }
  }

  /**
   * Force process current batch
   */
  async forceProcessBatch(): Promise<BatchSummary> {
    if (this.isProcessing) {
      throw new Error('Batch processing is already in progress');
    }

    return this.processBatch();
  }

  /**
   * Start the batch processor
   */
  private startBatchProcessor() {
    this.processingTimer = setInterval(async () => {
      if (!this.isProcessing && this.operationQueue.length > 0) {
        await this.processBatch();
      }
    }, this.config.processingInterval);

    this.logger.log('Batch processor started');
  }

  /**
   * Stop the batch processor
   */
  private stopBatchProcessor() {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
      this.processingTimer = null;
    }
  }

  /**
   * Process a batch of operations
   */
  private async processBatch(): Promise<BatchSummary> {
    if (this.operationQueue.length === 0) {
      return this.createEmptyBatchSummary();
    }

    this.isProcessing = true;
    const batchId = uuidv4();
    const startTime = new Date();
    
    // Get batch operations
    const batchOperations = this.operationQueue.splice(0, this.config.maxBatchSize);
    const results: BatchResult[] = [];

    this.logger.log(`Processing batch ${batchId} with ${batchOperations.length} operations`);

    // Process operations concurrently
    const promises = batchOperations.map(operation => this.processOperation(operation));
    const operationResults = await Promise.allSettled(promises);

    // Handle results
    for (let i = 0; i < operationResults.length; i++) {
      const operation = batchOperations[i];
      const promiseResult = operationResults[i];

      let result: BatchResult;

      if (promiseResult.status === 'fulfilled') {
        result = promiseResult.value;
      } else {
        result = {
          id: operation.id,
          success: false,
          error: promiseResult.reason?.message || 'Unknown error',
          executedAt: new Date()
        };
      }

      results.push(result);
      this.processingResults.set(operation.id, result);

      // Handle retries for failed operations
      if (!result.success && operation.retryCount < operation.maxRetries) {
        operation.retryCount++;
        this.logger.warn(`Retrying operation ${operation.id} (attempt ${operation.retryCount}/${operation.maxRetries})`);
        
        // Add back to queue with delay
        setTimeout(() => {
          this.operationQueue.unshift(operation);
        }, this.config.retryDelay);
      }
    }

    const endTime = new Date();
    const summary: BatchSummary = {
      batchId,
      totalOperations: batchOperations.length,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length,
      startTime,
      endTime,
      results
    };

    this.isProcessing = false;
    this.logger.log(`Batch ${batchId} completed: ${summary.successCount}/${summary.totalOperations} successful`);

    return summary;
  }

  /**
   * Process individual operation
   */
  private async processOperation(operation: BatchOperation): Promise<BatchResult> {
    try {
      let result: any;

      switch (operation.type) {
        case BatchOperationType.VERIFY_TRANSACTION:
          result = await this.blockchainService.verifyTransaction(operation.payload.txHash);
          break;
        
        case BatchOperationType.MONITOR_TRANSACTION:
          result = await this.blockchainService.monitorTransaction(operation.payload.txHash);
          break;
        
        case BatchOperationType.GET_TRANSACTION_STATUS:
          result = await this.blockchainService.getTransactionStatus(operation.payload.txHash);
          break;
        
        default:
          throw new Error(`Unsupported operation type: ${operation.type}`);
      }

      return {
        id: operation.id,
        success: true,
        result,
        executedAt: new Date()
      };

    } catch (error) {
      this.logger.error(`Operation ${operation.id} failed:`, error.message);
      
      return {
        id: operation.id,
        success: false,
        error: error.message,
        executedAt: new Date()
      };
    }
  }

  /**
   * Create empty batch summary
   */
  private createEmptyBatchSummary(): BatchSummary {
    const now = new Date();
    return {
      batchId: uuidv4(),
      totalOperations: 0,
      successCount: 0,
      failureCount: 0,
      startTime: now,
      endTime: now,
      results: []
    };
  }

  /**
   * Clear old results to prevent memory leaks
   */
  clearOldResults(olderThanHours: number = 24) {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - olderThanHours);

    let clearedCount = 0;
    for (const [id, result] of this.processingResults.entries()) {
      if (result.executedAt < cutoffTime) {
        this.processingResults.delete(id);
        clearedCount++;
      }
    }

    if (clearedCount > 0) {
      this.logger.log(`Cleared ${clearedCount} old batch results`);
    }
  }
}