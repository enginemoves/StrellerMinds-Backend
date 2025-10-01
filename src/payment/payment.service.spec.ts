import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PaymentEntity, PaymentStatus, PaymentType } from './entities/payment.entity';
import { StripeService } from './stripe.service';
import { InvoiceService } from './invoice.service';
import { PaymentAnalyticsService } from './payment-analytics.service';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

type MockType<T> = {
  [P in keyof T]?: jest.Mock<{}>;
};

const mockPaymentEntity: PaymentEntity = {
  id: 'pay_123',
  userId: 'user_1',
  amount: 1000,
  currency: 'usd',
  status: PaymentStatus.PENDING,
  type: PaymentType.COURSE_PURCHASE,
  createdAt: new Date(),
  updatedAt: new Date(),
} as PaymentEntity;

describe('PaymentService', () => {
  let service: PaymentService;
  let repository: MockType<Repository<PaymentEntity>>;
  let stripeService: MockType<StripeService>;
  let invoiceService: MockType<InvoiceService>;
  let paymentAnalyticsService: MockType<PaymentAnalyticsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: getRepositoryToken(PaymentEntity),
          useValue: {
            create: jest.fn().mockReturnValue(mockPaymentEntity),
            save: jest.fn().mockResolvedValue(mockPaymentEntity),
            findOne: jest.fn().mockResolvedValue(mockPaymentEntity),
            find: jest.fn().mockResolvedValue([mockPaymentEntity]),
            createQueryBuilder: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnThis(),
              select: jest.fn().mockReturnThis(),
              groupBy: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              getRawMany: jest.fn().mockResolvedValue([]),
            }),
          },
        },
        {
          provide: StripeService,
          useValue: {
            createPaymentIntent: jest.fn().mockResolvedValue({ id: 'pi_123', status: 'requires_confirmation' }),
            confirmPaymentIntent: jest.fn().mockResolvedValue({ id: 'pi_123', status: 'succeeded' }),
            createRefund: jest.fn().mockResolvedValue({ id: 're_123' }),
            createCustomer: jest.fn().mockResolvedValue({ id: 'cus_123' }),
          },
        },
        {
          provide: InvoiceService,
          useValue: {
            generateInvoiceForPayment: jest.fn(),
          },
        },
        {
          provide: PaymentAnalyticsService,
          useValue: {
            trackPayment: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    repository = module.get(getRepositoryToken(PaymentEntity));
    stripeService = module.get(StripeService);
    invoiceService = module.get(InvoiceService);
    paymentAnalyticsService = module.get(PaymentAnalyticsService);
  });

  // --- Create Payment ---
  it('should create a payment', async () => {
    const result = await service.createPayment({
      userId: 'user_1',
      amount: 1000,
      currency: 'usd',
      type: PaymentType.COURSE_PURCHASE,
    });
    expect(result).toEqual(mockPaymentEntity);
    expect(stripeService.createPaymentIntent).toHaveBeenCalled();
    expect(repository.save).toHaveBeenCalled();
  });

  it('should throw BadRequestException if amount is 0 or negative', async () => {
    await expect(
      service.createPayment({ userId: 'user_1', amount: 0, currency: 'usd', type: PaymentType.COURSE_PURCHASE }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.createPayment({ userId: 'user_1', amount: -100, currency: 'usd', type: PaymentType.COURSE_PURCHASE }),
    ).rejects.toThrow(BadRequestException);
  });

  // --- Process Payment ---
  it('should process a payment successfully', async () => {
    const result = await service.processPayment({ paymentId: 'pay_123' });
    expect(result.status).toBe(PaymentStatus.COMPLETED);
    expect(paymentAnalyticsService.trackPayment).toHaveBeenCalled();
    expect(invoiceService.generateInvoiceForPayment).toHaveBeenCalled();
  });

  it('should throw NotFoundException if payment not found', async () => {
    (repository.findOne as jest.Mock).mockResolvedValueOnce(null);
    await expect(service.getPaymentById('not_exist')).rejects.toThrow(NotFoundException);
  });

  it('should throw NotFoundException if processPayment called with invalid id', async () => {
    (repository.findOne as jest.Mock).mockResolvedValueOnce(null);
    await expect(service.processPayment({ paymentId: 'invalid' })).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException if payment already completed', async () => {
    (repository.findOne as jest.Mock).mockResolvedValueOnce({ ...mockPaymentEntity, status: PaymentStatus.COMPLETED });
    await expect(service.processPayment({ paymentId: 'pay_123' })).rejects.toThrow(BadRequestException);
  });

  // --- Refund ---
  it('should refund a payment', async () => {
    (repository.findOne as jest.Mock).mockResolvedValueOnce({ ...mockPaymentEntity, status: PaymentStatus.COMPLETED });
    const result = await service.refundPayment('pay_123', 'test reason');
    expect(result.status).toBe(PaymentStatus.REFUNDED);
    expect(stripeService.createRefund).toHaveBeenCalled();
  });

  it('should throw BadRequestException if payment is not completed', async () => {
    (repository.findOne as jest.Mock).mockResolvedValueOnce({ ...mockPaymentEntity, status: PaymentStatus.PENDING });
    await expect(service.refundPayment('pay_123', 'reason')).rejects.toThrow(BadRequestException);
  });

  // --- Get Payments ---
  it('should get payments by user id', async () => {
    const results = await service.getPaymentsByUserId('user_1');
    expect(results).toHaveLength(1);
  });

  // --- Update Payment from Webhook ---
  it('should update payment from webhook', async () => {
    const result = await service.updatePaymentFromWebhook('pi_123', PaymentStatus.COMPLETED);
    expect(result.status).toBe(PaymentStatus.COMPLETED);
    expect(paymentAnalyticsService.trackPayment).toHaveBeenCalled();
  });

  it('should throw NotFoundException if webhook payment id not found', async () => {
    (repository.findOne as jest.Mock).mockResolvedValueOnce(null);
    await expect(service.updatePaymentFromWebhook('invalid_id', PaymentStatus.COMPLETED)).rejects.toThrow(NotFoundException);
  });

  // --- Payment Stats & Analytics ---
  it('should get payment stats', async () => {
    const stats = await service.getPaymentStats('user_1');
    expect(Array.isArray(stats)).toBe(true);
  });

  it('should return empty array if no payments exist for user', async () => {
    (repository.createQueryBuilder().getRawMany as jest.Mock).mockResolvedValueOnce([]);
    const stats = await service.getPaymentStats('user_no_payments');
    expect(stats).toEqual([]);
  });

  it('should get payment analytics', async () => {
    const analytics = await service.getPaymentAnalytics();
    expect(Array.isArray(analytics)).toBe(true);
  });

  // --- Edge Cases ---
  it('should throw BadRequestException if login called with empty user', async () => {
    await expect(service.processPayment({ paymentId: null as any })).rejects.toThrow(BadRequestException);
  });

});
