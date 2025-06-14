import { Injectable } from '@nestjs/common';

@Injectable()
export class PaymentGatewayFactory {
  constructor(
    private readonly stripeGateway: StripeGateway,
    private readonly paypalGateway: PayPalGateway
  ) {}

  getGateway(paymentMethod: PaymentMethod): IPaymentGateway {
    switch (paymentMethod) {
      case PaymentMethod.STRIPE:
      case PaymentMethod.CREDIT_CARD:
      case PaymentMethod.DEBIT_CARD:
        return this.stripeGateway;
      case PaymentMethod.PAYPAL:
        return this.paypalGateway;
      default:
        throw new Error(`Unsupported payment method: ${paymentMethod}`);
    }
  }
}