import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindManyOptions } from 'typeorm';
import { Credential } from './entities/credential.entity';
import { CredentialHistoryQueryDto, CredentialStatus } from './dto/credential-history-query.dto';
import { CredentialHistoryResponseDto, CredentialDto } from './dto/credential-history-response.dto';

@Injectable()
export class CredentialService {
  constructor(
    @InjectRepository(Credential)
    private credentialRepository: Repository<Credential>,
  ) {}

  async getUserCredentialHistory(
    userId: string,
    queryParams: CredentialHistoryQueryDto,
  ): Promise<CredentialHistoryResponseDto> {
    const { page = 1, limit = 10, credentialType, startDate, endDate, status } = queryParams;
    
    // Build query conditions
    const findOptions: FindManyOptions<Credential> = {
      where: { userId },
      order: { issuedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    };

    // Add filters if provided
    if (credentialType) {
      findOptions.where = { ...findOptions.where, type: credentialType };
    }

    if (startDate && endDate) {
      findOptions.where = { 
        ...findOptions.where, 
        issuedAt: Between(startDate, endDate) 
      };
    }

    if (status && status !== CredentialStatus.ALL) {
      findOptions.where = { ...findOptions.where, status };
    }

    // Execute query with pagination
    const [credentials, totalItems] = await this.credentialRepository.findAndCount(findOptions);
    
    // Map to DTOs
    const mappedCredentials = credentials.map(credential => this.mapToCredentialDto(credential));

    return {
      data: mappedCredentials,
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  async verifyCredential(userId: string, credentialId: string): Promise<{ verified: boolean; credential: CredentialDto }> {
    // Find the credential
    const credential = await this.credentialRepository.findOne({ 
      where: { id: credentialId, userId } 
    });

    if (!credential) {
      throw new HttpException('Credential not found', HttpStatus.NOT_FOUND);
    }

    // Verify on the blockchain
    // TODO: Replace the following mock result with actual blockchain verification logic
    const verificationResult = { verified: true };

    // Update verification status in database
    credential.verificationStatus = verificationResult.verified;
    await this.credentialRepository.save(credential);

    return {
      verified: verificationResult.verified,
      credential: this.mapToCredentialDto(credential),
    };
  }

  private mapToCredentialDto(credential: Credential): CredentialDto {
    return {
      id: credential.id,
      type: credential.type,
      name: credential.name,
      issuedAt: credential.issuedAt,
      expiresAt: credential.expiresAt,
      issuer: {
        id: credential.issuerId,
        name: credential.issuerName,
      },
      status: credential.status,
      verificationStatus: credential.verificationStatus,
      metadata: credential.metadata,
      blockchainReference: {
        txHash: credential.txHash,
        network: credential.network,
        timestamp: credential.issuedAt,
        blockHeight: credential.blockHeight,
      },
    };
  }
}