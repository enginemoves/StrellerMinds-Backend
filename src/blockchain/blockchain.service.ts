import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlockchainMonitoringService } from './monitoring.service';
import Web3 from 'web3';

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private web3: Web3;

  constructor(
    private readonly config: ConfigService,
    private readonly blockchainMonitoringService: BlockchainMonitoringService,
  ) {
    const rpcUrl = this.config.get<string>('RPC_URL');
    if (!rpcUrl) {
      this.logger.error('RPC_URL is not defined in configuration');
      throw new Error('RPC_URL must be set');
    }
    this.web3 = new Web3(rpcUrl);
  }

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
}
