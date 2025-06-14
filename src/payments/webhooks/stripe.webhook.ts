import { Controller, Post, Body, Headers, HttpStatus, HttpCode } from '@nestjs/common';

@Controller('webhooks')
export class WebhookController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Body() body: any,
    @Headers('stripe-signature') signature: string
  ) {
    try {
      // Verify webhook signature (implement actual verification)
      const event = body;

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object);
          break;
        case 'invoice.payment_succeeded':
          await this.handleSubscriptionPayment(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionCancellation(event.data.object);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      console.error('Webhook error:', error);
      throw error;
    }
  }

  private async handlePaymentSuccess(paymentIntent: any) {
    // Update payment status in database
    console.log('Payment succeeded:', paymentIntent.id);
  }

  private async handlePaymentFailure(paymentIntent: any) {
    // Update payment status and notify customer
    console.log('Payment failed:', paymentIntent.id);
  }

  private async handleSubscriptionPayment(invoice: any) {
    // Update subscription status
    console.log('Subscription payment succeeded:', invoice.id);
  }

  private async handleSubscriptionCancellation(subscription: any) {
    // Handle subscription cancellation
    console.log('Subscription cancelled:', subscription.id);
  }
}
