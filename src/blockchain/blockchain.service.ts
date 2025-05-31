import { Injectable } from '@nestjs/common';
import { BlockchainMonitoringService } from './monitoring.service';

@Injectable()
export class BlockchainService {
  constructor(
    private readonly blockchainMonitoringService: BlockchainMonitoringService,
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
}
