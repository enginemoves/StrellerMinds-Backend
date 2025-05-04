// src/blockchain/soroban/soroban.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { SorobanService } from './soroban.service';
import { SorobanClient } from './soroban.client';
import { ContractCallDto } from './dto/contract-call.dto';
import { mockSorobanClient } from '../../../test/mocks/soroban.mock';

describe('SorobanService', () => {
  let service: SorobanService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SorobanService,
        { provide: SorobanClient, useValue: mockSorobanClient },
      ],
    }).compile();

    service = module.get(SorobanService);
  });

  it('calls contract successfully', async () => {
    const dto: ContractCallDto = {
      contractId: 'C123',
      method: 'greet',
      args: ['Alice'],
    };

    const result = await service.callContract(dto);
    expect(result.result).toBe('mock-success');
    expect(result.method).toBe('greet');
  });

  it('fails on contract error', async () => {
    const dto: ContractCallDto = {
      contractId: 'C123',
      method: 'fail',
      args: [],
    };

    await expect(service.callContract(dto)).rejects.toThrow(
      'Mocked contract failure',
    );
  });
});
