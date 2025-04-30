import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { SorobanService } from './soroban.service';
import { CredentialRecord } from './entities/credential-record.entity';
import { SorobanRpc, StrKey, scValToNative } from '@stellar/stellar-sdk';

// Mock the SorobanRpc.Server and other Stellar SDK components
jest.mock('@stellar/stellar-sdk', () => {
  const original = jest.requireActual('@stellar/stellar-sdk');
  return {
    ...original,
    SorobanRpc: {
      ...original.SorobanRpc,
      Server: jest.fn().mockImplementation(() => ({
        getAccount: jest.fn().mockResolvedValue({ sequenceNumber: '123456' }),
        prepareTransaction: jest.fn().mockImplementation((tx) => tx),
        sendTransaction: jest
          .fn()
          .mockResolvedValue({ hash: 'mock-transaction-hash' }),
        getTransaction: jest.fn().mockResolvedValue({
          status: 'SUCCESS',
          id: 'mock-transaction-id',
          returnValue: { type: 'string', value: 'mock-credential-id' },
        }),
      })),
      Api: {
        GetTransactionStatus: {
          PENDING: 'PENDING',
          NOT_FOUND: 'NOT_FOUND',
          FAILED: 'FAILED',
          SUCCESS: 'SUCCESS',
        },
      },
    },
    scValToNative: jest.fn().mockReturnValue('mock-credential-id'),
    nativeToScVal: jest
      .fn()
      .mockReturnValue({ type: 'string', value: 'mock-input' }),
    Keypair: {
      fromSecret: jest.fn().mockReturnValue({
        publicKey: jest.fn().mockReturnValue('mock-public-key'),
        sign: jest.fn(),
      }),
    },
    TransactionBuilder: jest.fn().mockImplementation(() => ({
      addOperation: jest.fn().mockReturnThis(),
      setTimeout: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({
        sign: jest.fn(),
      }),
    })),
    Contract: jest.fn().mockImplementation(() => ({
      call: jest.fn().mockReturnValue({}),
    })),
    Address: jest.fn().mockImplementation(() => ({
      toScVal: jest.fn().mockReturnValue({}),
    })),
    StrKey: {
      isValidEd25519PublicKey: jest.fn().mockReturnValue(true),
    },
    Networks: {
      TESTNET: 'Test SDF Network ; September 2015',
      PUBLIC: 'Public Global Stellar Network ; September 2015',
    },
  };
});

describe('SorobanService', () => {
  let service: SorobanService;
  let repositoryMock: jest.Mocked<Repository<CredentialRecord>>;
  let configServiceMock: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    // Create repository mock
    repositoryMock = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    } as any;

    // Create config service mock
    configServiceMock = {
      get: jest.fn().mockImplementation((key: string) => {
        switch (key) {
          case 'SOROBAN_RPC_URL':
            return 'https://mock-soroban-rpc.stellar.org';
          case 'STELLAR_NETWORK':
            return 'TESTNET';
          case 'CREDENTIAL_CONTRACT_ID':
            return 'mock-contract-id';
          case 'SIGNER_SECRET_KEY':
            return 'mock-secret-key';
          default:
            return undefined;
        }
      }),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SorobanService,
        {
          provide: getRepositoryToken(CredentialRecord),
          useValue: repositoryMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    service = module.get<SorobanService>(SorobanService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('mintCredential', () => {
    const mockRecipientAddress =
      'GBUYUAI75XXUXDAOFUQNZESS6MOPSPIUSM7GOAZLACMFGL4OS5HPXD3V';
    const mockCredentialData = {
      name: 'Test Credential',
      attributes: { skill: 'programming', level: 'expert' },
    };

    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks();

      // Setup repository mock for successful save
      repositoryMock.create.mockReturnValue({
        credentialId: 'mock-credential-id',
      } as any);
      repositoryMock.save.mockResolvedValue({
        id: 'db-record-id',
        credentialId: 'mock-credential-id',
      } as any);
    });

    it('should successfully mint a credential', async () => {
      // Act
      const result = await service.mintCredential(
        mockRecipientAddress,
        mockCredentialData,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.transactionId).toBe('mock-transaction-id');
      expect(result.credentialId).toBe('mock-credential-id');

      // Verify repository interactions
      expect(repositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          credentialId: 'mock-credential-id',
          transactionId: 'mock-transaction-id',
          recipientAddress: mockRecipientAddress,
          metadata: mockCredentialData,
        }),
      );
      expect(repositoryMock.save).toHaveBeenCalled();
    });

    it('should throw an error for invalid Stellar address', async () => {
      // Mock StrKey.isValidEd25519PublicKey to return false
      // StrKey is already imported at the top
      jest.spyOn(StrKey, 'isValidEd25519PublicKey').mockReturnValueOnce(false);

      // Act & Assert
      await expect(
        service.mintCredential('invalid-address', mockCredentialData),
      ).rejects.toThrow('Invalid recipient Stellar address');

      // Verify repository was not called
      expect(repositoryMock.create).not.toHaveBeenCalled();
      expect(repositoryMock.save).not.toHaveBeenCalled();
    });

    it('should handle transaction submission errors and retry', async () => {
      // Mock sendTransaction to fail once then succeed
      // SorobanRpc is already imported at the top
      const serverInstance = SorobanRpc.Server.mock.results[0].value;

      // First call throws error, second succeeds
      serverInstance.sendTransaction
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ hash: 'mock-transaction-hash' });

      // Act
      const result = await service.mintCredential(
        mockRecipientAddress,
        mockCredentialData,
      );

      // Assert
      expect(result).toBeDefined();
      expect(serverInstance.sendTransaction).toHaveBeenCalledTimes(2);
      expect(repositoryMock.save).toHaveBeenCalled();
    });

    it('should throw error after maxRetries failed attempts', async () => {
      // Mock sendTransaction to always fail
      const serverInstance = SorobanRpc.Server.mock.results[0].value;

      serverInstance.sendTransaction.mockRejectedValue(
        new Error('Persistent network error'),
      );

      // Override the retryDelayMs to make test run faster
      (service as any).retryDelayMs = 10;

      // Act & Assert
      await expect(
        service.mintCredential(mockRecipientAddress, mockCredentialData),
      ).rejects.toThrow(/Failed to execute transaction after .* attempts/);

      // Verify repository was not called
      expect(repositoryMock.save).not.toHaveBeenCalled();
    });

    it('should handle database storage errors', async () => {
      // Mock repository save to fail
      repositoryMock.save.mockRejectedValueOnce(new Error('Database error'));

      // Act & Assert
      await expect(
        service.mintCredential(mockRecipientAddress, mockCredentialData),
      ).rejects.toThrow('Failed to store credential record: Database error');
    });
  });

  describe('getCredential', () => {
    it('should retrieve a credential by ID', async () => {
      // Act
      const result = await service.getCredential('mock-credential-id');

      // Assert
      expect(result).toBe('mock-credential-id');
    });
  });

  describe('verifyCredential', () => {
    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks();

      // scValToNative is already imported at the top
      // scValToNative is already imported at the top
      (scValToNative as jest.Mock).mockReturnValue(true);
    });

    it('should verify a valid credential', async () => {
      // Act
      const result = await service.verifyCredential('mock-credential-id');

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for an invalid credential', async () => {
      // Mock scValToNative to return false for this test
      // scValToNative is already imported at the top
      (scValToNative as jest.Mock).mockReturnValueOnce(false);

      // Act
      const result = await service.verifyCredential('invalid-credential-id');

      // Assert
      expect(result).toBe(false);
    });
  });
});
