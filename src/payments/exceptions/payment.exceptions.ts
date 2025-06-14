export class PaymentProcessingException extends Error {
    constructor(message: string, public readonly code: string, public readonly details?: any) {
      super(message);
      this.name = 'PaymentProcessingException';
    }
  }
  
  export class InsufficientFundsException extends PaymentProcessingException {
    constructor(details?: any) {
      super('Insufficient funds for payment', 'INSUFFICIENT_FUNDS', details);
    }
  }
  
  export class PaymentMethodDeclinedException extends PaymentProcessingException {
    constructor(details?: any) {
      super('Payment method was declined', 'PAYMENT_DECLINED', details);
    }
  }
  
  export class SubscriptionNotFoundException extends Error {
    constructor(subscriptionId: string) {
      super(`Subscription ${subscriptionId} not found`);
      this.name = 'SubscriptionNotFoundException';
    }
  }