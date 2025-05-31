export class BlockchainReferenceDto {
    txHash: string;
    network: string;
    timestamp: Date;
    blockHeight: number;
  }
  
  export class CredentialDto {
    id: string;
    type: string;
    name: string;
    issuedAt: Date;
    expiresAt?: Date;
    issuer: {
      id: string;
      name: string;
    };
    status: string;
    verificationStatus: boolean;
    metadata: Record<string, any>;
    blockchainReference: BlockchainReferenceDto;
  }
  
  export class CredentialHistoryResponseDto {
    data: CredentialDto[];
    meta: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
    };
  }
  