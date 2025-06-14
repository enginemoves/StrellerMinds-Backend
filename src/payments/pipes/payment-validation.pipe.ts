import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class PaymentValidationPipe implements PipeTransform {
  transform(value: PaymentRequest) {
    if (!value.amount || value.amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0');
    }

    if (!value.currency || value.currency.length !== 3) {
      throw new BadRequestException('Invalid currency code');
    }

    if (!Object.values(PaymentMethod).includes(value.paymentMethod)) {
      throw new BadRequestException('Invalid payment method');
    }

    if (!value.customerId) {
      throw new BadRequestException('Customer ID is required');
    }

    return value;
  }
}