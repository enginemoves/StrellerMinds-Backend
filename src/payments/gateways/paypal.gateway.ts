@Injectable()
export class PayPalGateway implements IPaymentGateway {
  private readonly logger = new Logger(PayPalGateway.name);

  async processPayment(request: PaymentRequest): Promise<PaymentGatewayResponse> {
    try {
      this.logger.log(`Processing PayPal payment for ${request.amount} ${request.currency}`);
      
      const mockResponse = {
        id: `PAY-${Date.now()}-PAYPAL`,
        state: 'approved',
        amount: request.amount,
        currency: request.currency
      };

      await new Promise(resolve => setTimeout(resolve, 1200));

      return {
        success: true,
        transactionId: mockResponse.id,
        gatewayResponse: mockResponse
      };
    } catch (error) {
      this.logger.error(`PayPal payment failed: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async createSubscription(request: SubscriptionRequest): Promise<PaymentGatewayResponse> {
    try {
      const mockResponse = {
        id: `SUB-${Date.now()}-PAYPAL`,
        status: 'ACTIVE',
        subscriber: request.customerId
      };

      await new Promise(resolve => setTimeout(resolve, 1200));

      return {
        success: true,
        transactionId: mockResponse.id,
        gatewayResponse: mockResponse
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async processRefund(request: RefundRequest): Promise<PaymentGatewayResponse> {
    try {
      const mockResponse = {
        id: `REF-${Date.now()}-PAYPAL`,
        state: 'completed',
        amount: request.amount
      };

      await new Promise(resolve => setTimeout(resolve, 1200));

      return {
        success: true,
        transactionId: mockResponse.id,
        gatewayResponse: mockResponse
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<PaymentGatewayResponse> {
    try {
      const mockResponse = {
        id: subscriptionId,
        status: 'CANCELLED'
      };

      return {
        success: true,
        transactionId: subscriptionId,
        gatewayResponse: mockResponse
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentGatewayResponse> {
    try {
      const mockResponse = {
        id: transactionId,
        state: 'approved'
      };

      return {
        success: true,
        transactionId,
        gatewayResponse: mockResponse
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
