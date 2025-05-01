/* eslint-disable @typescript-eslint/no-unused-vars */
// src/blockchain/soroban/soroban.client.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class SorobanClient {
  async invokeContract(
    contractId: string,
    method: string,
    args: any[],
  ): Promise<any> {
    // Real implementation would interact with RPC or Horizon + WASM
    throw new Error('Not implemented: invokeContract');
  }
}
