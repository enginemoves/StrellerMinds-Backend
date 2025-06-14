import { Controller, Post, Get, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly invoiceService: InvoiceService
  ) {}

  @Post()
  @ApiOperation({ summary: 'Process a payment' })
  @ApiResponse({ status: 201, description: 'Payment processed successfully' })
  async processPayment(@Body() request: PaymentRequest) {
    return this.paymentService.processPayment(request);
  }

  @Post('subscriptions')
  @ApiOperation({ summary: 'Create a subscription' })
  @ApiResponse({ status: 201, description: 'Subscription created successfully' })
  async createSubscription(@Body() request: SubscriptionRequest) {
    return this.paymentService.createSubscription(request);
  }

  @Post('refunds')
  @ApiOperation({ summary: 'Process a refund' })
  @ApiResponse({ status: 201, description: 'Refund processed successfully' })
  async processRefund(@Body() request: RefundRequest) {
    return this.paymentService.processRefund(request);
  }

  @Get('history/:customerId')
  @ApiOperation({ summary: 'Get payment history for a customer' })
  async getPaymentHistory(
    @Param('customerId', ParseUUIDPipe) customerId: string,
    @Query('limit') limit = 10,
    @Query('offset') offset = 0
  ) {
    return this.paymentService.getPaymentHistory(customerId, limit, offset);
  }

  @Get('subscriptions/:customerId')
  @ApiOperation({ summary: 'Get customer subscriptions' })
  async getCustomerSubscriptions(
    @Param('customerId', ParseUUIDPipe) customerId: string
  ) {
    return this.paymentService.getCustomerSubscriptions(customerId);
  }

  @Post('subscriptions/:subscriptionId/cancel')
  @ApiOperation({ summary: 'Cancel a subscription' })
  async cancelSubscription(
    @Param('subscriptionId', ParseUUIDPipe) subscriptionId: string
  ) {
    return this.paymentService.cancelSubscription(subscriptionId);
  }

  @Get('invoices/:customerId')
  @ApiOperation({ summary: 'Get customer invoices' })
  async getCustomerInvoices(
    @Param('customerId', ParseUUIDPipe) customerId: string
  ) {
    return this.invoiceService.getCustomerInvoices(customerId);
  }
}
