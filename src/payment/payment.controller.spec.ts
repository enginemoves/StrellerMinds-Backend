import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payment.controller';
import { PaymentsService } from './payment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExecutionContext } from '@nestjs/common';
import { Payment } from './entities/payment.entity';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let service: PaymentsService;

  const mockUser = { id: 'user-123' };
  const mockPayment: Partial<Payment> = {
    id: 'payment-123',
    amount: 100,
    status: 'completed',
  };

  const mockPaymentsService = {
    getUserPayments: jest.fn().mockResolvedValue([mockPayment]),
    findOne: jest.fn().mockResolvedValue(mockPayment),
    processRefund: jest.fn().mockResolvedValue({
      ...mockPayment,
      status: 'refunded',
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: mockPaymentsService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          req.user = mockUser;
          return true;
        },
      })
      .compile();

    controller = module.get<PaymentsController>(PaymentsController);
    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should return all user payments', async () => {
    const result = await controller.findAll({ user: mockUser });
    expect(result).toEqual([mockPayment]);
    expect(service.getUserPayments).toHaveBeenCalledWith(mockUser.id);
  });

  it('should return payment by ID', async () => {
    const result = await controller.findOne('payment-123');
    expect(result).toEqual(mockPayment);
    expect(service.findOne).toHaveBeenCalledWith('payment-123');
  });

  it('should throw if no refund reason provided', async () => {
    await expect(
      controller.processRefund('payment-123', undefined),
    ).rejects.toThrow('Refund reason is required');
  });

  it('should process refund with reason', async () => {
    const result = await controller.processRefund('payment-123', 'Duplicate payment');
    expect(result.status).toBe('refunded');
    expect(result.refundReason).toBeUndefined(); // assuming it's not mocked in return
    expect(service.processRefund).toHaveBeenCalledWith('payment-123', 'Duplicate payment');
  });
});
