import { Injectable } from '@nestjs/common';
import { StellarClient } from './stellar.client';
import { SendPaymentDto } from './dto/payment.dto';
import * as StellarSdk from 'stellar-sdk';

@Injectable()
export class StellarService {
  constructor(private readonly client: StellarClient) {}

  async sendPayment(dto: SendPaymentDto): Promise<string> {
    const { sourceSecret, destination, amount } = dto;

    const keypair = this.client.getKeypair(sourceSecret);
    const account = await this.client.loadAccount(keypair.publicKey());

    const transaction = this.client
      .getTransactionBuilder(account)
      .addOperation(
        StellarSdk.Operation.payment({
          destination,
          asset: StellarSdk.Asset.native(),
          amount: amount.toString(),
        }),
      )
      .setTimeout(30)
      .build();

    transaction.sign(keypair);

    const result = await this.client.submitTransaction(transaction);
    return result.hash;
  }
}
