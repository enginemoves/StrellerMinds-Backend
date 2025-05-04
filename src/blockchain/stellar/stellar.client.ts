import {
  Networks,
  BASE_FEE,
  Keypair,
  TransactionBuilder,
  Transaction,
  Account,
  Horizon,
} from '@stellar/stellar-sdk';

export class StellarClient {
  private readonly server: Horizon.Server;

  constructor() {
    this.server = new Horizon.Server(
      process.env.STELLAR_HORIZON_URL ?? 'https://horizon-testnet.stellar.org',
    );
  }

  async loadAccount(publicKey: string) {
    return this.server.loadAccount(publicKey);
  }

  async submitTransaction(transaction: Transaction) {
    return this.server.submitTransaction(transaction);
  }

  getTransactionBuilder(sourceAccount: Account) {
    return new TransactionBuilder(sourceAccount, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    });
  }

  getKeypair(secret: string) {
    return Keypair.fromSecret(secret);
  }
}
