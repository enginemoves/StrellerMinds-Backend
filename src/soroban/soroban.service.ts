import { Injectable, Logger } from '@nestjs/common';
import {
  SorobanRpc,
  TransactionBuilder,
  Networks,
  Keypair,
  Contract,
  Address,
  StrKey,
  scValToNative,
  nativeToScVal,
  ScVal,
} from '@stellar/stellar-sdk';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CredentialRecord } from './entities/credential-record.entity';

@Injectable()
export class SorobanService {
  private readonly logger = new Logger(SorobanService.name);
  private readonly server: SorobanRpc.Server;
  private readonly networkPassphrase: string;
  private readonly contractId: string;
  private readonly signerKeypair: Keypair;
  private readonly maxRetries = 3;
  private readonly retryDelayMs = 2000;

  constructor(
    private configService: ConfigService,
    @InjectRepository(CredentialRecord)
    private credentialRecordRepository: Repository<CredentialRecord>,
  ) {
    // Initialize Soroban RPC server
    this.server = new SorobanRpc.Server(
      this.configService.get<string>('SOROBAN_RPC_URL'),
    );

    // Get network configuration
    const networkType = this.configService.get<string>('STELLAR_NETWORK');
    this.networkPassphrase =
      networkType === 'TESTNET' ? Networks.TESTNET : Networks.PUBLIC;

    // Get contract ID
    this.contractId = this.configService.get<string>('CREDENTIAL_CONTRACT_ID');

    // Initialize signer keypair from secret
    // In production, use a more secure key management system
    const signerSecret = this.configService.get<string>('SIGNER_SECRET_KEY');
    this.signerKeypair = Keypair.fromSecret(signerSecret);
  }

  /**
   * Mint a verifiable credential on the Stellar blockchain
   * @param recipientAddress Recipient's Stellar address
   * @param credentialData The credential data to be minted
   * @returns The transaction result and credential ID
   */
  async mintCredential(
    recipientAddress: string,
    credentialData: Record<string, any>,
  ): Promise<{
    transactionId: string;
    credentialId: string;
  }> {
    try {
      this.logger.log(`Minting credential for ${recipientAddress}`);

      // Validate recipient address
      if (!StrKey.isValidEd25519PublicKey(recipientAddress)) {
        throw new Error('Invalid recipient Stellar address');
      }

      // Convert recipient address to Soroban Address
      const recipient = new Address(recipientAddress);

      // Convert credential data to xdr ScVal format
      const credentialScVal = this.convertCredentialToScVal(credentialData);

      // Set up contract instance
      const contract = new Contract(this.contractId);

      // Create the transaction
      const txResult = await this.executeTransaction(
        contract,
        'mint_credential',
        [recipient.toScVal(), credentialScVal],
      );

      // Extract credential ID from the transaction result
      const credentialId = this.extractCredentialId(txResult);

      // Store transaction record
      await this.storeCredentialRecord({
        credentialId,
        transactionId: txResult.transactionId,
        recipientAddress,
        metadata: credentialData,
        createdAt: new Date(),
      });

      return {
        transactionId: txResult.transactionId,
        credentialId,
      };
    } catch (error) {
      this.logger.error(
        `Error minting credential: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Execute a Soroban transaction with retries
   * @param contract The Soroban contract
   * @param method The contract method to call
   * @param params The parameters for the method
   * @returns The transaction result
   */
  private async executeTransaction(
    contract: Contract,
    method: string,
    params: ScVal[],
  ): Promise<{
    transactionId: string;
    result: any;
  }> {
    let attempt = 0;

    while (attempt < this.maxRetries) {
      try {
        attempt++;

        // Get the source account sequence number
        const account = await this.server.getAccount(
          this.signerKeypair.publicKey(),
        );

        // Build the transaction
        const transaction = new TransactionBuilder(account, {
          fee: '100000', // Appropriate fee for Soroban operations
          networkPassphrase: this.networkPassphrase,
        })
          .addOperation(contract.call(method, ...params))
          .setTimeout(30) // 30 seconds timeout
          .build();

        // Sign the transaction
        transaction.sign(this.signerKeypair);

        // Prepare the transaction - this is needed for Soroban
        const preparedTransaction =
          await this.server.prepareTransaction(transaction);

        // Submit the transaction
        const submittedTx =
          await this.server.sendTransaction(preparedTransaction);

        // Wait for transaction to be confirmed
        const txResult = await this.waitForTransactionCompletion(
          submittedTx.hash,
        );

        // Parse result
        const resultValue = scValToNative(txResult.returnValue);

        return {
          transactionId: txResult.id,
          result: resultValue,
        };
      } catch (error) {
        this.logger.warn(
          `Transaction attempt ${attempt} failed: ${error.message}`,
        );

        // If we've exhausted retries, throw the error
        if (attempt >= this.maxRetries) {
          throw new Error(
            `Failed to execute transaction after ${this.maxRetries} attempts: ${error.message}`,
          );
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs));
      }
    }
  }

  /**
   * Wait for a transaction to be confirmed on the blockchain
   * @param transactionId The transaction ID to check
   * @returns The transaction result
   */
  private async waitForTransactionCompletion(
    transactionId: string,
  ): Promise<SorobanRpc.Api.GetTransactionResponse> {
    let status: SorobanRpc.Api.GetTransactionStatus =
      SorobanRpc.Api.GetTransactionStatus.PENDING;
    let transactionResponse: SorobanRpc.Api.GetTransactionResponse;

    // Keep polling until transaction is confirmed or failed
    while (
      status === SorobanRpc.Api.GetTransactionStatus.PENDING ||
      status === SorobanRpc.Api.GetTransactionStatus.NOT_FOUND
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second between checks

      try {
        transactionResponse = await this.server.getTransaction(transactionId);
        status = transactionResponse.status;
      } catch (error) {
        this.logger.warn(`Error checking transaction status: ${error.message}`);
        // Continue polling
      }
    }

    if (status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(`Transaction failed: ${transactionResponse.resultXdr}`);
    }

    return transactionResponse;
  }

  /**
   * Convert a JavaScript object to Soroban ScVal format
   * @param credentialData The credential data to convert
   * @returns The credential data as ScVal
   */
  private convertCredentialToScVal(credentialData: Record<string, any>): ScVal {
    // This is a simplified implementation - adjust based on your contract's expected format
    // For a real implementation, you would need to handle different data types
    return nativeToScVal(credentialData);
  }

  /**
   * Extract the credential ID from a transaction result
   * @param txResult The transaction result
   * @returns The extracted credential ID
   */
  private extractCredentialId(txResult: { result: any }): string {
    // This is a simplified implementation - adjust based on your contract's response format
    // The actual implementation will depend on how your contract returns the credential ID
    if (typeof txResult.result === 'string') {
      return txResult.result;
    } else if (txResult.result && txResult.result.id) {
      return txResult.result.id;
    } else {
      throw new Error(
        'Could not extract credential ID from transaction result',
      );
    }
  }

  /**
   * Store credential record in the database
   * @param data The credential record data
   */
  private async storeCredentialRecord(data: {
    credentialId: string;
    transactionId: string;
    recipientAddress: string;
    metadata: Record<string, any>;
    createdAt: Date;
  }): Promise<void> {
    try {
      const credentialRecord = this.credentialRecordRepository.create(data);
      await this.credentialRecordRepository.save(credentialRecord);
      this.logger.log(`Credential record stored with ID: ${data.credentialId}`);
    } catch (error) {
      this.logger.error(
        `Failed to store credential record: ${error.message}`,
        error.stack,
      );
      throw new Error(`Failed to store credential record: ${error.message}`);
    }
  }

  /**
   * Retrieve a credential by its ID
   * @param credentialId The ID of the credential to retrieve
   * @returns The credential data
   */
  async getCredential(credentialId: string): Promise<any> {
    try {
      // Set up contract instance
      const contract = new Contract(this.contractId);

      // Get credential from the blockchain
      const txResult = await this.executeTransaction(
        contract,
        'get_credential',
        [nativeToScVal(credentialId)],
      );

      return txResult.result;
    } catch (error) {
      this.logger.error(
        `Error retrieving credential: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Verify a credential's validity
   * @param credentialId The ID of the credential to verify
   * @returns Whether the credential is valid
   */
  async verifyCredential(credentialId: string): Promise<boolean> {
    try {
      // Set up contract instance
      const contract = new Contract(this.contractId);

      // Verify credential on the blockchain
      const txResult = await this.executeTransaction(
        contract,
        'verify_credential',
        [nativeToScVal(credentialId)],
      );

      return txResult.result === true;
    } catch (error) {
      this.logger.error(
        `Error verifying credential: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
