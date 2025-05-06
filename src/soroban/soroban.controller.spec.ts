import { Test, TestingModule } from '@nestjs/testing';
import { SorobanController } from './soroban.controller';
import { SorobanService } from './soroban.service';
import { MintCredentialDto} from './dto/credential.dto';
import { HttpException } from '@nestjs/common';

describe('SorobanController', () => {
  let controller: SorobanController;
  let service: SorobanService;

  const mockSorobanService = {
    mintCredential: jest.fn(),
    getCredential: jest.fn(),
    verifyCredential: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SorobanController],
      providers: [{ provide: SorobanService, useValue: mockSorobanService }],
    }).compile();

    controller = module.get<SorobanController>(SorobanController);
    service = module.get<SorobanService>(SorobanService);
  });

  describe('mintCredential', () => {
    it('should return success response when minting is successful', async () => {
      const dto: MintCredentialDto = {
        recipientAddress: 'GABC123456...',
        credentialData: { name: 'Jefferson' },
      };
      const mockResult = {
        credentialId: 'cred-123',
        transactionId: 'tx-123',
      };

      mockSorobanService.mintCredential.mockResolvedValue(mockResult);

      const result = await controller.mintCredential(dto);

      expect(result).toEqual({
        success: true,
        message: 'Credential successfully minted',
        data: mockResult,
      });
    });

    it('should throw an error if service fails', async () => {
      mockSorobanService.mintCredential.mockRejectedValue(new Error('fail'));

      await expect(
        controller.mintCredential({
          recipientAddress: 'G123',
          credentialData: {},
        }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('getCredential', () => {
    it('should return credential data if found', async () => {
      const mockCredential = { credentialId: 'cred-1' };
      mockSorobanService.getCredential.mockResolvedValue(mockCredential);

      const result = await controller.getCredential('cred-1');

      expect(result).toEqual({
        success: true,
        data: mockCredential,
      });
    });

    it('should throw 404 if credential not found', async () => {
      mockSorobanService.getCredential.mockResolvedValue(null);

      await expect(controller.getCredential('unknown')).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('verifyCredential', () => {
    it('should return verification result', async () => {
      mockSorobanService.verifyCredential.mockResolvedValue(true);

      const result = await controller.verifyCredential({
        credentialId: 'cred-1',
      });

      expect(result.success).toBe(true);
      expect(result.data.credentialId).toBe('cred-1');
      expect(result.data.isValid).toBe(true);
    });

    it('should handle service errors', async () => {
      mockSorobanService.verifyCredential.mockRejectedValue(
        new Error('verify failed'),
      );

      await expect(
        controller.verifyCredential({ credentialId: 'fail' }),
      ).rejects.toThrow(HttpException);
    });
  });
});
