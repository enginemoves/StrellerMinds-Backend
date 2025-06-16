export interface WalletConnectionResult {
    wallet: any;
    accessToken: string;
    isNewWallet: boolean;
  }
  
  export interface CredentialShareResult {
    success: boolean;
    transactionHash?: string;
    sharedCredentials: string[];
    errors?: string[];
  }
  
  export interface WalletProvider {
    verifySignature(address: string, message: string, signature: string): Promise<boolean>;
    generateNonce(): string;
    formatMessage(nonce: string, address: string): string;
  }