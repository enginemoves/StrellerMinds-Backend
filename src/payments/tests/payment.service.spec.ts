import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

describe('PaymentService', () => {
  let service: PaymentService;
  let paymentRepository: Repository<Payment>;
  let subscriptionRepository: Repository<Subscription>;
  let invoiceRepository: Repository<Invoice>;
  let refundRepository: Repository<Refund>;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn()
  };

  const mockGatewayFactory = {
    getGateway: jest.fn()
  };

  const mockInvoiceService = {
    generateInvoice: jest.fn()
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: getRepositoryToken(Payment),
          useValue: mockRepository
        },
        {
          provide: getRepositoryToken(Subscription),
          useValue: mockRepository
        },
        {
          provide: getRepositoryToken(Invoice),
          useValue: mockRepository
        },
        {
          provide: getRepositoryToken(Refund),
          useValue: mockRepository
        },
        {
          provide: PaymentGatewayFactory,
          useValue: mockGatewayFactory
        },
        {
          provide: InvoiceService,
          useValue: mockInvoiceService
        }
      ]
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    paymentRepository = module.get<Repository<Payment>>(getRepositoryToken(Payment));
    subscriptionRepository = module.get<Repository<Subscription>>(getRepositoryToken(Subscription));
    invoiceRepository = module.get<Repository<Invoice>>(getRepositoryToken(Invoice));
    refundRepository = module.get<Repository<Refund>>(getRepositoryToken(Refund));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processPayment', () => {
    it('should process payment successfully', async () => {
      const paymentRequest: PaymentRequest = {
        amount: 100,
        currency: 'USD',
        paymentMethod: PaymentMethod.STRIPE,
        customerId: 'customer-123',
        description: 'Course payment'
      };

      const mockPayment = {
        id: 'payment-123',
        ...paymentRequest,
        status: PaymentStatus.PENDING
      };

      const mockGateway = {
        processPayment: jest.fn().mockResolvedValue({
          success: true,
          transactionId: 'txn-123',
          gatewayResponse: { id: 'txn-123' }
        })
      };

      mockRepository.create.mockReturnValue(mockPayment);
      mockRepository.save.mockResolvedValue(mockPayment);
      mockGatewayFactory.getGateway.mockReturnValue(mockGateway);
      mockInvoiceService.generateInvoice.mockResolvedValue({});

      const result = await service.processPayment(paymentRequest);

      expect(result).toBeDefined();
      expect(mockRepository.create).toHaveBeenCalledWith({
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        paymentMethod: paymentRequest.paymentMethod,
        customerId: paymentRequest.customerId,
        courseId: paymentRequest.courseId,
        subscriptionId: paymentRequest.subscriptionId,
        description: paymentRequest.description,
        metadata: paymentRequest.metadata,
        status: PaymentStatus.PENDING
      });
      expect(mockGateway.processPayment).toHaveBeenCalledWith(paymentRequest);
      expect(mockInvoiceService.generateInvoice).toHaveBeenCalled();
    });

    it('should handle payment failure', async () => {
      const paymentRequest: PaymentRequest = {
        amount: 100,
        currency: 'USD',
        paymentMethod: PaymentMethod.STRIPE,
        customerId: 'customer-123'
      };

      const mockPayment = {
        id: 'payment-123',
        ...paymentRequest,
        status: PaymentStatus.PENDING
      };

      const mockGateway = {
        processPayment: jest.fn().mockResolvedValue({
          success: false,
          error: 'Payment declined'
        })
      };

      mockRepository.create.mockReturnValue(mockPayment);
      mockRepository.save.mockResolvedValue(mockPayment);
      mockGatewayFactory.getGateway.mockReturnValue(mockGateway);

      const result = await service.processPayment(paymentRequest);

      expect(result.status).toBe(PaymentStatus.FAILED);
      expect(mockInvoiceService.generateInvoice).not.toHaveBeenCalled();
    });

    it('should throw error for invalid amount', async () => {
      const paymentRequest: PaymentRequest = {
        amount: 0,
        currency: 'USD',
        paymentMethod: PaymentMethod.STRIPE,
        customerId: 'customer-123'
      };

      await expect(service.processPayment(paymentRequest)).rejects.toThrow('Payment amount must be greater than 0');
    });
  });

  describe('createSubscription', () => {
    it('should create subscription successfully', async () => {
      const subscriptionRequest: SubscriptionRequest = {
        customerId: 'customer-123',
        plan: SubscriptionPlan.PREMIUM,
        paymentMethod: PaymentMethod.STRIPE
      };

      const mockSubscription = {
        id: 'sub-123',
        ...subscriptionRequest,
        status: SubscriptionStatus.TRIALING
      };

      const mockGateway = {
        createSubscription: jest.fn().mockResolvedValue({
          success: true,
          transactionId: 'sub-gateway-123'
        })
      };

      mockRepository.create.mockReturnValue(mockSubscription);
      mockRepository.save.mockResolvedValue(mockSubscription);
      mockGatewayFactory.getGateway.mockReturnValue(mockGateway);

      const result = await service.createSubscription(subscriptionRequest);

      expect(result).toBeDefined();
      expect(mockGateway.createSubscription).toHaveBeenCalledWith(subscriptionRequest);
    });
  });

  describe('processRefund', () => {
    it('should process refund successfully', async () => {
      const refundRequest: RefundRequest = {
        paymentId: 'payment-123',
        amount: 50,
        reason: 'Customer request'
      };

      const mockPayment = {
        id: 'payment-123',
        amount: 100,
        currency: 'USD',
        status: PaymentStatus.COMPLETED,
        paymentMethod: PaymentMethod.STRIPE
      };

      const mockRefund = {
        id: 'refund-123',
        ...refundRequest,
        status: PaymentStatus.PENDING
      };

      const mockGateway = {
        processRefund: jest.fn().mockResolvedValue({
          success: true,
          transactionId: 'refund-gateway-123'
        })
      };

      mockRepository.findOne.mockResolvedValue(mockPayment);
      mockRepository.create.mockReturnValue(mockRefund);
      mockRepository.save.mockResolvedValue(mockRefund);
      mockGatewayFactory.getGateway.mockReturnValue(mockGateway);

      const result = await service.processRefund(refundRequest);

      expect(result).toBeDefined();
      expect(mockGateway.processRefund).toHaveBeenCalled();
    });

    it('should throw error for non-existent payment', async () => {
      const refundRequest: RefundRequest = {
        paymentId: 'non-existent',
        reason: 'Test'
      };

      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.processRefund(refundRequest)).rejects.toThrow('Payment not found');
    });

    it('should throw error for non-completed payment', async () => {
      const refundRequest: RefundRequest = {
        paymentId: 'payment-123',
        reason: 'Test'
      };

      const mockPayment = {
        id: 'payment-123',
        status: PaymentStatus.PENDING
      };

      mockRepository.findOne.mockResolvedValue(mockPayment);

      await expect(service.processRefund(refundRequest)).rejects.toThrow('Can only refund completed payments');
    });
  });

  describe('getPaymentHistory', () => {
    it('should return payment history for customer', async () => {
      const customerId = 'customer-123';
      const mockPayments = [
        { id: 'payment-1', customerId, amount: 100 },
        { id: 'payment-2', customerId, amount: 200 }
      ];

      mockRepository.find.mockResolvedValue(mockPayments);

      const result = await service.getPaymentHistory(customerId);

      expect(result).toEqual(mockPayments);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { customerId },
        order: { createdAt: 'DESC' },
        take: 10,
        skip: 0
      });
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription successfully', async () => {
      const subscriptionId = 'sub-123';
      const mockSubscription = {
        id: subscriptionId,
        status: SubscriptionStatus.ACTIVE,
        gatewaySubscriptionId: 'gateway-sub-123',
        paymentMethod: PaymentMethod.STRIPE
      };

      const mockGateway = {
        cancelSubscription: jest.fn().mockResolvedValue({
          success: true
        })
      };

      mockRepository.findOne.mockResolvedValue(mockSubscription);
      mockRepository.save.mockResolvedValue(mockSubscription);
      mockGatewayFactory.getGateway.mockReturnValue(mockGateway);

      const result = await service.cancelSubscription(subscriptionId);

      expect(result.status).toBe(SubscriptionStatus.CANCELLED);
      expect(result.cancelledAt).toBeDefined();
      expect(mockGateway.cancelSubscription).toHaveBeenCalledWith('gateway-sub-123');
    });

    it('should throw error for non-existent subscription', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.cancelSubscription('non-existent')).rejects.toThrow('Subscription not found');
    });

    it('should throw error for already cancelled subscription', async () => {
      const mockSubscription = {
        id: 'sub-123',
        status: SubscriptionStatus.CANCELLED
      };

      mockRepository.findOne.mockResolvedValue(mockSubscription);

      await expect(service.cancelSubscription('sub-123')).rejects.toThrow('Subscription is already cancelled');
    });
  });
});
