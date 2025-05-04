// src/blockchain/stellar/dto/payment.dto.ts
export class SendPaymentDto {
  destination: string;
  amount: number;
  sourceSecret: string;
}
