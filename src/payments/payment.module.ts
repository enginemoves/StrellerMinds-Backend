import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      Subscription,
      Invoice,
      Refund
    ])
  ],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    InvoiceService,
    StripeGateway,
    PayPalGateway,
    PaymentGatewayFactory
  ],
  exports: [PaymentService, InvoiceService]
})
export class PaymentModule {}