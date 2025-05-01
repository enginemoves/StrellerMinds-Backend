// src/blockchain/stellar/stellar.client.ts
import * as StellarSdk from '@stellar/stellar-sdk';

export class StellarClient {
  private readonly server: StellarSdk.server;

  constructor() {
    this.server = new StellarSdk.Server(
      process.env.STELLAR_HORIZON_URL ?? 'https://horizon-testnet.stellar.org',
    );
  }

  async loadAccount(publicKey: string) {
    return this.server.loadAccount(publicKey);
  }

  async submitTransaction(transaction: StellarSdk.Transaction) {
    return this.server.submitTransaction(transaction);
  }

  getTransactionBuilder(sourceAccount: StellarSdk.Account) {
    return new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: StellarSdk.Networks.TESTNET,
    });
  }

  getKeypair(secret: string) {
    return StellarSdk.Keypair.fromSecret(secret);
  }
}
