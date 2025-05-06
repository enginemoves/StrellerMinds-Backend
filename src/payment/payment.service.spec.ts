// payments.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payment.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { Subscription } from './entities/subscription.entity';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentRepo: Repository<Payment>;

  const mockPayment: Partial<Payment> = {
    id: 'p1',
    status: PaymentStatus.COMPLETED,
    amount: 200,
  };

  const mockPaymentRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockSubRepo = {
    save: jest.fn(),
    create: jest.fn((dto) => dto),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getRepositoryToken(Payment), useValue: mockPaymentRepo },
        { provide: getRepositoryToken(Subscription), useValue: mockSubRepo },
        { provide: 'ConfigService', useValue: {} },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    paymentRepo = module.get<Repository<Payment>>(getRepositoryToken(Payment));
  });

  it('should return user payments', async () => {
    mockPaymentRepo.find.mockResolvedValue([mockPayment]);
    const result = await service.getUserPayments('user-1');
    expect(result).toEqual([mockPayment]);
  });

  it('should throw if payment not found', async () => {
    mockPaymentRepo.findOne.mockResolvedValue(null);
    await expect(service.findOne('not-found')).rejects.toThrow(NotFoundException);
  });

  it('should return a payment by ID', async () => {
    mockPaymentRepo.findOne.mockResolvedValue(mockPayment);
    const result = await service.findOne('p1');
    expect(result.id).toBe('p1');
  });

  it('should throw if payment is not completed', async () => {
    mockPaymentRepo.findOne.mockResolvedValue({ ...mockPayment, status: PaymentStatus.PENDING });
    await expect(service.processRefund('p1', 'test')).rejects.toThrow(BadRequestException);
  });

  it('should refund a completed payment', async () => {
    mockPaymentRepo.findOne.mockResolvedValue({ ...mockPayment, status: PaymentStatus.COMPLETED });
    mockPaymentRepo.save.mockResolvedValue({ ...mockPayment, status: PaymentStatus.REFUNDED });
    const result = await service.processRefund('p1', 'Mistake');
    expect(result.status).toBe(PaymentStatus.REFUNDED);
    expect(mockPaymentRepo.save).toHaveBeenCalled();
  });
});
