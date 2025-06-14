export interface PaymentGatewayResponse {
    success: boolean;
    transactionId?: string;
    gatewayResponse?: any;
    error?: string;
  }
  
  export interface IPaymentGateway {
    processPayment(request: PaymentRequest): Promise<PaymentGatewayResponse>;
    createSubscription(request: SubscriptionRequest): Promise<PaymentGatewayResponse>;
    processRefund(request: RefundRequest): Promise<PaymentGatewayResponse>;
    cancelSubscription(subscriptionId: string): Promise<PaymentGatewayResponse>;
    getPaymentStatus(transactionId: string): Promise<PaymentGatewayResponse>;
  }