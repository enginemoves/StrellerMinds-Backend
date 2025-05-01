// src/blockchain/stellar/stellar.service.spec.ts
import { StellarService } from './stellar.service';
import { StellarClient } from './stellar.client';
import { Test, TestingModule } from '@nestjs/testing';
import { SendPaymentDto } from './dto/payment.dto';
import * as sdkMock from '../../../test/mocks/stellar-sdk.mock';

jest.mock('stellar-sdk', () => sdkMock);

describe('StellarService', () => {
  let service: StellarService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StellarService, StellarClient],
    }).compile();

    service = module.get(StellarService);
  });

  it('successfully sends a payment', async () => {
    const dto: SendPaymentDto = {
      destination: 'GDESTADDR',
      amount: 100,
      sourceSecret: 'SVALID',
    };

    const hash = await service.sendPayment(dto);
    expect(hash).toBe('mocked-hash');
  });

  it('fails with invalid account', async () => {
    await expect(
      service.sendPayment({
        destination: 'GINVALID',
        amount: 50,
        sourceSecret: 'SVALID',
      }),
    ).rejects.toThrow('Account not found');
  });

  it('fails with invalid secret', async () => {
    await expect(
      service.sendPayment({
        destination: 'GDESTADDR',
        amount: 50,
        sourceSecret: 'SINVALID',
      }),
    ).rejects.toThrow('Invalid secret');
  });
});
