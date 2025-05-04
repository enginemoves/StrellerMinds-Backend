// src/blockchain/soroban/soroban.service.ts
import { Injectable } from '@nestjs/common';
import { SorobanClient } from './soroban.client';
import { ContractCallDto } from './dto/contract-call.dto';

@Injectable()
export class SorobanService {
  constructor(private readonly client: SorobanClient) {}

  async callContract(dto: ContractCallDto): Promise<any> {
    const { contractId, method, args } = dto;
    return this.client.invokeContract(contractId, method, args);
  }
}
