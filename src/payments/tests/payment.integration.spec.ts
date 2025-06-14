describe('PaymentService Integration Tests', () => {
    let app: INestApplication;
    let paymentService: PaymentService;
    let connection: Connection;
  
    beforeAll(async () => {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [
          TypeOrmModule.forRoot({
            type: 'sqlite',
            database: ':memory:',
            entities: [Payment, Subscription, Invoice, Refund],
            synchronize: true
          }),
          PaymentModule
        ]
      }).compile();
  
      app = moduleFixture.createNestApplication();
      await app.init();
  
      paymentService = moduleFixture.get<PaymentService>(PaymentService);
      connection = moduleFixture.get<Connection>(Connection);
    });
  
    afterEach(async () => {
      // Clean up database after each test
      await connection.synchronize(true);
    });
  
    afterAll(async () => {
      await app.close();
    });
  
    it('should process end-to-end payment flow', async () => {
      const paymentRequest: PaymentRequest = {
        amount: 99.99,
        currency: 'USD',
        paymentMethod: PaymentMethod.STRIPE,
        customerId: 'customer-integration-test',
        courseId: 'course-123',
        description: 'Premium Course Access'
      };
  
      const payment = await paymentService.processPayment(paymentRequest);
  
      expect(payment.id).toBeDefined();
      expect(payment.status).toBe(PaymentStatus.COMPLETED);
      expect(payment.amount).toBe(99.99);
      expect(payment.gatewayTransactionId).toBeDefined();
  
      // Verify payment history
      const history = await paymentService.getPaymentHistory(paymentRequest.customerId);
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe(payment.id);
    });
  
    it('should handle subscription lifecycle', async () => {
      const subscriptionRequest: SubscriptionRequest = {
        customerId: 'customer-subscription-test',
        plan: SubscriptionPlan.PREMIUM,
        paymentMethod: PaymentMethod.STRIPE
      };
  
      // Create subscription
      const subscription = await paymentService.createSubscription(subscriptionRequest);
      expect(subscription.status).toBe(SubscriptionStatus.ACTIVE);
  
      // Get customer subscriptions
      const subscriptions = await paymentService.getCustomerSubscriptions(subscriptionRequest.customerId);
      expect(subscriptions).toHaveLength(1);
  
      // Cancel subscription
      const cancelledSubscription = await paymentService.cancelSubscription(subscription.id);
      expect(cancelledSubscription.status).toBe(SubscriptionStatus.CANCELLED);
      expect(cancelledSubscription.cancelledAt).toBeDefined();
    });
  
    it('should process refund flow', async () => {
      // First create a payment
      const paymentRequest: PaymentRequest = {
        amount: 50.00,
        currency: 'USD',
        paymentMethod: PaymentMethod.STRIPE,
        customerId: 'customer-refund-test'
      };
  
      const payment = await paymentService.processPayment(paymentRequest);
      expect(payment.status).toBe(PaymentStatus.COMPLETED);
  
      // Then process refund
      const refundRequest: RefundRequest = {
        paymentId: payment.id,
        amount: 25.00,
        reason: 'Partial refund requested'
      };
  
      const refund = await paymentService.processRefund(refundRequest);
      expect(refund.status).toBe(PaymentStatus.COMPLETED);
      expect(refund.amount).toBe(25.00);
    });
  });