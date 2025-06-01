import { Test, TestingModule } from '@nestjs/testing';
import { BlockchainMonitoringService } from './monitoring.service';

const mockNotificationService = {
  notify: jest.fn(),
};

describe('BlockchainMonitoringService', () => {
  let service: BlockchainMonitoringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BlockchainMonitoringService],
    }).compile();

    service = module.get<BlockchainMonitoringService>(BlockchainMonitoringService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should add and retrieve transaction history', () => {
    const tx = { txHash: 'abc', status: 'pending' };
    service.addToHistory(tx);
    expect(service.getHistory()).toContain(tx);
  });

  it('should log monitoring start', async () => {
    const spy = jest.spyOn(service['logger'], 'log');
    await service.monitorTransaction('tx123');
    expect(spy).toHaveBeenCalledWith('Started monitoring transaction: tx123');
  });

  it('should return pending status for getTransactionStatus', async () => {
    const status = await service.getTransactionStatus('tx123');
    expect(status).toEqual({ txHash: 'tx123', status: 'pending', confirmations: 0 });
  });

  it('should log confirmation handling', async () => {
    const spy = jest.spyOn(service['logger'], 'log');
    await service.handleConfirmation('tx123', 2);
    expect(spy).toHaveBeenCalledWith('Transaction tx123 has 2 confirmations.');
  });

  it('should log notifications', async () => {
    const spy = jest.spyOn(service['logger'], 'log');
    await service.notify('tx123', 'confirmed');
    expect(spy).toHaveBeenCalledWith('Notification: Transaction tx123 is now confirmed');
  });
});
