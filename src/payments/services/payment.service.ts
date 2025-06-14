import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Refund)
    private readonly refundRepository: Repository<Refund>,
    private readonly gatewayFactory: PaymentGatewayFactory,
    private readonly invoiceService: InvoiceService
  ) {}

  async processPayment(request: PaymentRequest): Promise<Payment> {
    this.logger.log(`Processing payment for customer ${request.customerId}`);

    // Validate request
    if (request.amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0');
    }

    // Create payment record
    const payment = this.paymentRepository.create({
      amount: request.amount,
      currency: request.currency,
      paymentMethod: request.paymentMethod,
      customerId: request.customerId,
      courseId: request.courseId,
      subscriptionId: request.subscriptionId,
      description: request.description,
      metadata: request.metadata,
      status: PaymentStatus.PENDING
    });

    await this.paymentRepository.save(payment);

    try {
      // Process payment through gateway
      const gateway = this.gatewayFactory.getGateway(request.paymentMethod);
      const result = await gateway.processPayment(request);

      if (result.success) {
        payment.status = PaymentStatus.COMPLETED;
        payment.gatewayTransactionId = result.transactionId;
        payment.gatewayResponse = result.gatewayResponse;

        // Generate invoice for successful payment
        await this.invoiceService.generateInvoice({
          customerId: request.customerId,
          paymentId: payment.id,
          amount: request.amount,
          currency: request.currency,
          description: request.description
        });

        this.logger.log(`Payment ${payment.id} completed successfully`);
      } else {
        payment.status = PaymentStatus.FAILED;
        payment.gatewayResponse = { error: result.error };
        this.logger.error(`Payment ${payment.id} failed: ${result.error}`);
      }

      await this.paymentRepository.save(payment);
      return payment;

    } catch (error) {
      payment.status = PaymentStatus.FAILED;
      payment.gatewayResponse = { error: error.message };
      await this.paymentRepository.save(payment);
      throw error;
    }
  }

  async createSubscription(request: SubscriptionRequest): Promise<Subscription> {
    this.logger.log(`Creating subscription for customer ${request.customerId}`);

    const planPricing = this.getSubscriptionPricing(request.plan);
    
    const subscription = this.subscriptionRepository.create({
      customerId: request.customerId,
      plan: request.plan,
      paymentMethod: request.paymentMethod,
      amount: planPricing.amount,
      currency: planPricing.currency,
      status: SubscriptionStatus.TRIALING,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });

    if (request.trialDays) {
      subscription.trialEndsAt = new Date(Date.now() + request.trialDays * 24 * 60 * 60 * 1000);
    }

    await this.subscriptionRepository.save(subscription);

    try {
      const gateway = this.gatewayFactory.getGateway(request.paymentMethod);
      const result = await gateway.createSubscription(request);

      if (result.success) {
        subscription.status = SubscriptionStatus.ACTIVE;
        subscription.gatewaySubscriptionId = result.transactionId;
        this.logger.log(`Subscription ${subscription.id} created successfully`);
      } else {
        subscription.status = SubscriptionStatus.INACTIVE;
        this.logger.error(`Subscription creation failed: ${result.error}`);
      }

      await this.subscriptionRepository.save(subscription);
      return subscription;

    } catch (error) {
      subscription.status = SubscriptionStatus.INACTIVE;
      await this.subscriptionRepository.save(subscription);
      throw error;
    }
  }

  async processRefund(request: RefundRequest): Promise<Refund> {
    this.logger.log(`Processing refund for payment ${request.paymentId}`);

    const payment = await this.paymentRepository.findOne({
      where: { id: request.paymentId }
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Can only refund completed payments');
    }

    const refundAmount = request.amount || payment.amount;

    if (refundAmount > payment.amount) {
      throw new BadRequestException('Refund amount cannot exceed payment amount');
    }

    const refund = this.refundRepository.create({
      paymentId: request.paymentId,
      amount: refundAmount,
      currency: payment.currency,
      reason: request.reason,
      status: PaymentStatus.PENDING
    });

    await this.refundRepository.save(refund);

    try {
      const gateway = this.gatewayFactory.getGateway(payment.paymentMethod);
      const result = await gateway.processRefund({
        ...request,
        amount: refundAmount
      });

      if (result.success) {
        refund.status = PaymentStatus.COMPLETED;
        refund.gatewayRefundId = result.transactionId;
        refund.gatewayResponse = result.gatewayResponse;

        // Update original payment status
        payment.status = PaymentStatus.REFUNDED;
        await this.paymentRepository.save(payment);

        this.logger.log(`Refund ${refund.id} completed successfully`);
      } else {
        refund.status = PaymentStatus.FAILED;
        refund.gatewayResponse = { error: result.error };
        this.logger.error(`Refund ${refund.id} failed: ${result.error}`);
      }

      await this.refundRepository.save(refund);
      return refund;

    } catch (error) {
      refund.status = PaymentStatus.FAILED;
      refund.gatewayResponse = { error: error.message };
      await this.refundRepository.save(refund);
      throw error;
    }
  }

  async getPaymentHistory(customerId: string, limit = 10, offset = 0) {
    return this.paymentRepository.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset
    });
  }

  async getCustomerSubscriptions(customerId: string) {
    return this.subscriptionRepository.find({
      where: { customerId },
      order: { createdAt: 'DESC' }
    });
  }

  async cancelSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId }
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      throw new BadRequestException('Subscription is already cancelled');
    }

    try {
      if (subscription.gatewaySubscriptionId) {
        const gateway = this.gatewayFactory.getGateway(subscription.paymentMethod);
        await gateway.cancelSubscription(subscription.gatewaySubscriptionId);
      }

      subscription.status = SubscriptionStatus.CANCELLED;
      subscription.cancelledAt = new Date();
      
      await this.subscriptionRepository.save(subscription);
      this.logger.log(`Subscription ${subscriptionId} cancelled successfully`);
      
      return subscription;
    } catch (error) {
      this.logger.error(`Failed to cancel subscription ${subscriptionId}: ${error.message}`);
      throw error;
    }
  }

  private getSubscriptionPricing(plan: SubscriptionPlan) {
    const pricing = {
      [SubscriptionPlan.BASIC]: { amount: 9.99, currency: 'USD' },
      [SubscriptionPlan.PREMIUM]: { amount: 19.99, currency: 'USD' },
      [SubscriptionPlan.ENTERPRISE]: { amount: 49.99, currency: 'USD' }
    };

    return pricing[plan];
  }
}
