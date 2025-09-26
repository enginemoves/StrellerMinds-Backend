import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import * as request from 'supertest';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

import { AuthModule } from '../../src/auth/auth.module';
import { UsersModule } from '../../src/users/users.module';
import { WalletModule } from '../../src/wallet-integration/wallet.module';
import { BlockchainModule } from '../../src/blockchain/blockchain.module';
import { CertificationModule } from '../../src/certification/certification.module';
import { User } from '../../src/users/entities/user.entity';
import { Wallet, WalletType } from '../../src/wallet-integration/entities/wallet.entity';
import { Credential } from '../../src/wallet-integration/entities/credential.entity';
import { Certificate } from '../../src/certification/entities/certificate.entity';
import { DatabaseTestModule } from '../utils/database-test.module';

describe('Blockchain Interaction Integration Tests', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;
  let userRepository: Repository<User>;
  let walletRepository: Repository<Wallet>;
  let credentialRepository: Repository<Credential>;
  let certificateRepository: Repository<Certificate>;

  let testUser: User;
  let userToken: string;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        DatabaseTestModule,
        TypeOrmModule.forFeature([User, Wallet, Credential, Certificate]),
        AuthModule,
        UsersModule,
        WalletModule,
        BlockchainModule,
        CertificationModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    userRepository = moduleRef.get<Repository<User>>(getRepositoryToken(User));
    walletRepository = moduleRef.get<Repository<Wallet>>(getRepositoryToken(Wallet));
    credentialRepository = moduleRef.get<Repository<Credential>>(getRepositoryToken(Credential));
    certificateRepository = moduleRef.get<Repository<Certificate>>(getRepositoryToken(Certificate));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean database before each test
    await credentialRepository.clear();
    await walletRepository.clear();
    await certificateRepository.clear();
    await userRepository.clear();

    await setupTestUser();
  });

  async function setupTestUser() {
    const userResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'blockchain@example.com',
        password: 'SecurePass123!',
        firstName: 'Blockchain',
        lastName: 'User',
        name: 'Blockchain User',
        role: 'student',
      })
      .expect(201);

    testUser = await userRepository.findOne({
      where: { email: 'blockchain@example.com' },
    });
    userToken = userResponse.body.access_token;
  }

  describe('Wallet Connection and Authentication', () => {
    it('should connect Ethereum wallet successfully', async () => {
      const walletAddress = '0x742d35Cc6634C0532925a3b8D6Ac0fFFFd0030b0';
      const signature = '0x1234567890abcdef...'; // Mock signature
      const message = 'Sign this message to authenticate with StrellerMinds';

      const connectResponse = await request(app.getHttpServer())
        .post('/wallet/connect')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          walletType: WalletType.ETHEREUM,
          address: walletAddress,
          signature: signature,
          message: message,
          chainId: 1, // Ethereum mainnet
        })
        .expect(201);

      expect(connectResponse.body).toMatchObject({
        wallet: {
          id: expect.any(String),
          address: walletAddress,
          type: WalletType.ETHEREUM,
          isVerified: true,
          chainId: 1,
        },
        isNewWallet: true,
        authToken: expect.any(String),
      });

      // Verify wallet was saved in database
      const savedWallet = await walletRepository.findOne({
        where: { address: walletAddress },
      });

      expect(savedWallet).toBeDefined();
      expect(savedWallet.userId).toBe(testUser.id);
      expect(savedWallet.isVerified).toBe(true);
    });

    it('should connect multiple wallet types for same user', async () => {
      const walletTypes = [
        {
          type: WalletType.ETHEREUM,
          address: '0x742d35Cc6634C0532925a3b8D6Ac0fFFFd0030b0',
          chainId: 1,
        },
        {
          type: WalletType.STELLAR,
          address: 'GCLWGQPMKXQSPF776IU33AH4PZNOOWNAWGGKVTBQMIC5IMKUNP3E6NVU',
          chainId: null,
        },
        {
          type: WalletType.POLYGON,
          address: '0x742d35Cc6634C0532925a3b8D6Ac0fFFFd0030b1',
          chainId: 137,
        },
      ];

      const connectedWallets = [];

      for (const walletData of walletTypes) {
        const connectResponse = await request(app.getHttpServer())
          .post('/wallet/connect')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            walletType: walletData.type,
            address: walletData.address,
            signature: '0x1234567890abcdef...',
            message: 'Sign this message to authenticate',
            chainId: walletData.chainId,
          })
          .expect(201);

        connectedWallets.push(connectResponse.body.wallet);
      }

      // Verify all wallets were connected to the same user
      const userWallets = await walletRepository.find({
        where: { userId: testUser.id },
      });

      expect(userWallets.length).toBe(3);
      expect(userWallets.map(w => w.type)).toEqual(
        expect.arrayContaining([
          WalletType.ETHEREUM,
          WalletType.STELLAR,
          WalletType.POLYGON,
        ])
      );
    });

    it('should handle wallet signature verification failure', async () => {
      const invalidSignatureResponse = await request(app.getHttpServer())
        .post('/wallet/connect')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          walletType: WalletType.ETHEREUM,
          address: '0x742d35Cc6634C0532925a3b8D6Ac0fFFFd0030b0',
          signature: 'invalid_signature',
          message: 'Sign this message to authenticate',
          chainId: 1,
        })
        .expect(401);

      expect(invalidSignatureResponse.body.message).toContain('signature verification failed');
    });

    it('should prevent duplicate wallet connections', async () => {
      const walletAddress = '0x742d35Cc6634C0532925a3b8D6Ac0fFFFd0030b0';

      // First connection
      await request(app.getHttpServer())
        .post('/wallet/connect')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          walletType: WalletType.ETHEREUM,
          address: walletAddress,
          signature: '0x1234567890abcdef...',
          message: 'Sign this message to authenticate',
          chainId: 1,
        })
        .expect(201);

      // Attempt duplicate connection
      const duplicateResponse = await request(app.getHttpServer())
        .post('/wallet/connect')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          walletType: WalletType.ETHEREUM,
          address: walletAddress,
          signature: '0x1234567890abcdef...',
          message: 'Sign this message to authenticate',
          chainId: 1,
        })
        .expect(400);

      expect(duplicateResponse.body.message).toContain('already connected');
    });
  });

  describe('Stellar Blockchain Operations', () => {
    let connectedWallet: Wallet;

    beforeEach(async () => {
      // Connect Stellar wallet
      const walletResponse = await request(app.getHttpServer())
        .post('/wallet/connect')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          walletType: WalletType.STELLAR,
          address: 'GCLWGQPMKXQSPF776IU33AH4PZNOOWNAWGGKVTBQMIC5IMKUNP3E6NVU',
          signature: 'mock_stellar_signature',
          message: 'Sign this message to authenticate with Stellar',
        })
        .expect(201);

      connectedWallet = await walletRepository.findOne({
        where: { id: walletResponse.body.wallet.id },
      });
    });

    it('should create trustline to custom asset', async () => {
      const trustlineResponse = await request(app.getHttpServer())
        .post('/blockchain/stellar/trustline')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          walletId: connectedWallet.id,
          assetCode: 'STRLM', // StrellerMinds Token
          issuer: 'GCLWGQPMKXQSPF776IU33AH4PZNOOWNAWGGKVTBQMIC5IMKUNP3E6NVU',
        })
        .expect(201);

      expect(trustlineResponse.body).toMatchObject({
        transactionHash: expect.any(String),
        success: true,
        assetCode: 'STRLM',
        network: 'testnet',
      });

      // Verify trustline creation was recorded
      expect(trustlineResponse.body.transactionHash).toMatch(/^[a-f0-9]{64}$/i);
    });

    it('should invoke Soroban smart contract', async () => {
      const contractResponse = await request(app.getHttpServer())
        .post('/blockchain/stellar/contract/invoke')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          walletId: connectedWallet.id,
          contractAddress: 'CCJZ5DGASBWQXR5MPFCJIXJPTSYN6KJKS',
          method: 'store_certificate',
          args: [
            'CERT-2025-ABC123',
            'John Student',
            'JavaScript Fundamentals',
            new Date().toISOString(),
          ],
        })
        .expect(200);

      expect(contractResponse.body).toMatchObject({
        success: true,
        transactionHash: expect.any(String),
        result: expect.any(Object),
        network: 'testnet',
      });
    });

    it('should monitor transaction status', async () => {
      // First create a transaction
      const trustlineResponse = await request(app.getHttpServer())
        .post('/blockchain/stellar/trustline')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          walletId: connectedWallet.id,
          assetCode: 'STRLM',
          issuer: 'GCLWGQPMKXQSPF776IU33AH4PZNOOWNAWGGKVTBQMIC5IMKUNP3E6NVU',
        })
        .expect(201);

      const txHash = trustlineResponse.body.transactionHash;

      // Monitor transaction
      const monitorResponse = await request(app.getHttpServer())
        .get(`/blockchain/stellar/transaction/${txHash}/status`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(monitorResponse.body).toMatchObject({
        hash: txHash,
        status: expect.stringMatching(/^(pending|confirmed|failed)$/),
        confirmations: expect.any(Number),
        blockNumber: expect.any(Number),
      });
    });

    it('should handle Stellar network errors gracefully', async () => {
      const invalidContractResponse = await request(app.getHttpServer())
        .post('/blockchain/stellar/contract/invoke')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          walletId: connectedWallet.id,
          contractAddress: 'INVALID_CONTRACT_ADDRESS',
          method: 'invalid_method',
          args: [],
        })
        .expect(400);

      expect(invalidContractResponse.body.message).toContain('Blockchain error');
    });
  });

  describe('Credential Management on Blockchain', () => {
    let connectedWallet: Wallet;

    beforeEach(async () => {
      const walletResponse = await request(app.getHttpServer())
        .post('/wallet/connect')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          walletType: WalletType.ETHEREUM,
          address: '0x742d35Cc6634C0532925a3b8D6Ac0fFFFd0030b0',
          signature: '0x1234567890abcdef...',
          message: 'Sign this message to authenticate',
          chainId: 1,
        })
        .expect(201);

      connectedWallet = await walletRepository.findOne({
        where: { id: walletResponse.body.wallet.id },
      });
    });

    it('should store certificate as blockchain credential', async () => {
      // Create a certificate first
      const certificate = await certificateRepository.save(
        certificateRepository.create({
          userId: testUser.id,
          certificationTypeId: 'course-completion',
          certificateNumber: 'CERT-2025-ABC123',
          recipientName: testUser.name,
          recipientEmail: testUser.email,
          status: 'issued',
          metadata: {
            courseId: 'test-course-id',
            courseName: 'JavaScript Fundamentals',
            instructorName: 'Jane Instructor',
            completionDate: new Date(),
            score: 85,
          },
        })
      );

      // Store certificate on blockchain
      const storeResponse = await request(app.getHttpServer())
        .post(`/wallet/${connectedWallet.id}/credentials/store`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          certificateId: certificate.id,
          credentialType: 'course_certificate',
          metadata: {
            issuer: 'StrellerMinds',
            issuanceDate: new Date().toISOString(),
          },
        })
        .expect(201);

      expect(storeResponse.body).toMatchObject({
        credentialId: expect.any(String),
        transactionHash: expect.any(String),
        credentialType: 'course_certificate',
        onChain: true,
      });

      // Verify credential was stored in database
      const credential = await credentialRepository.findOne({
        where: { id: storeResponse.body.credentialId },
      });

      expect(credential).toBeDefined();
      expect(credential.walletId).toBe(connectedWallet.id);
      expect(credential.isOnChain).toBe(true);
      expect(credential.transactionHash).toBeDefined();
    });

    it('should share credentials between wallets', async () => {
      // Create a credential first
      const credential = await credentialRepository.save(
        credentialRepository.create({
          walletId: connectedWallet.id,
          credentialType: 'course_certificate',
          credentialData: {
            certificateNumber: 'CERT-2025-ABC123',
            courseName: 'JavaScript Fundamentals',
            grade: 'A',
          },
          isOnChain: true,
          transactionHash: '0x1234567890abcdef1234567890abcdef12345678',
        })
      );

      // Share credential
      const shareResponse = await request(app.getHttpServer())
        .post(`/wallet/${connectedWallet.id}/credentials/share`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          credentialIds: [credential.id],
          recipientAddress: '0x742d35Cc6634C0532925a3b8D6Ac0fFFFd0030b1',
          message: 'Sharing my course completion certificate',
          expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        })
        .expect(200);

      expect(shareResponse.body).toMatchObject({
        success: true,
        sharedCredentials: [credential.id],
        transactionHash: expect.any(String),
      });

      // Verify credential sharing was recorded
      const updatedCredential = await credentialRepository.findOne({
        where: { id: credential.id },
      });

      expect(updatedCredential.isShared).toBe(true);
      expect(updatedCredential.sharedWith).toBe('0x742d35Cc6634C0532925a3b8D6Ac0fFFFd0030b1');
    });

    it('should verify credential authenticity on blockchain', async () => {
      // Create a credential
      const credential = await credentialRepository.save(
        credentialRepository.create({
          walletId: connectedWallet.id,
          credentialType: 'course_certificate',
          credentialData: {
            certificateNumber: 'CERT-2025-ABC123',
            courseName: 'JavaScript Fundamentals',
          },
          isOnChain: true,
          transactionHash: '0x1234567890abcdef1234567890abcdef12345678',
          verificationHash: 'hash_of_credential_data',
        })
      );

      // Verify credential
      const verifyResponse = await request(app.getHttpServer())
        .get(`/wallet/credentials/${credential.id}/verify`)
        .expect(200);

      expect(verifyResponse.body).toMatchObject({
        isValid: true,
        credentialId: credential.id,
        onChainVerification: {
          transactionHash: credential.transactionHash,
          blockConfirmed: true,
          hashMatch: true,
        },
        verificationTimestamp: expect.any(String),
      });
    });

    it('should handle credential revocation', async () => {
      // Create a credential
      const credential = await credentialRepository.save(
        credentialRepository.create({
          walletId: connectedWallet.id,
          credentialType: 'course_certificate',
          credentialData: {
            certificateNumber: 'CERT-2025-ABC123',
          },
          isOnChain: true,
          transactionHash: '0x1234567890abcdef1234567890abcdef12345678',
        })
      );

      // Revoke credential
      const revokeResponse = await request(app.getHttpServer())
        .post(`/wallet/${connectedWallet.id}/credentials/${credential.id}/revoke`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          reason: 'Certificate found to be fraudulent',
        })
        .expect(200);

      expect(revokeResponse.body).toMatchObject({
        success: true,
        credentialId: credential.id,
        revocationTxHash: expect.any(String),
        status: 'revoked',
      });

      // Verify credential status
      const revokedCredential = await credentialRepository.findOne({
        where: { id: credential.id },
      });

      expect(revokedCredential.status).toBe('revoked');
      expect(revokedCredential.revokedAt).toBeDefined();
    });

    it('should list wallet credentials with filtering', async () => {
      // Create multiple credentials
      const credentialTypes = ['course_certificate', 'skill_badge', 'achievement'];
      
      for (const type of credentialTypes) {
        await credentialRepository.save(
          credentialRepository.create({
            walletId: connectedWallet.id,
            credentialType: type,
            credentialData: { title: `Test ${type}` },
            isOnChain: true,
            transactionHash: `0x${type.replace('_', '')}1234567890abcdef`,
          })
        );
      }

      // Get all credentials
      const allCredentialsResponse = await request(app.getHttpServer())
        .get(`/wallet/${connectedWallet.id}/credentials`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(allCredentialsResponse.body.length).toBe(3);

      // Filter by type
      const certificatesResponse = await request(app.getHttpServer())
        .get(`/wallet/${connectedWallet.id}/credentials`)
        .set('Authorization', `Bearer ${userToken}`)
        .query({ type: 'course_certificate' })
        .expect(200);

      expect(certificatesResponse.body.length).toBe(1);
      expect(certificatesResponse.body[0].credentialType).toBe('course_certificate');

      // Filter by on-chain status
      const onChainResponse = await request(app.getHttpServer())
        .get(`/wallet/${connectedWallet.id}/credentials`)
        .set('Authorization', `Bearer ${userToken}`)
        .query({ onChain: true })
        .expect(200);

      expect(onChainResponse.body.length).toBe(3);
    });
  });

  describe('Blockchain Analytics and Monitoring', () => {
    beforeEach(async () => {
      // Set up multiple wallets and credentials for analytics
      const walletTypes = [WalletType.ETHEREUM, WalletType.STELLAR];
      
      for (const type of walletTypes) {
        const walletResponse = await request(app.getHttpServer())
          .post('/wallet/connect')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            walletType: type,
            address: type === WalletType.ETHEREUM 
              ? '0x742d35Cc6634C0532925a3b8D6Ac0fFFFd0030b0' 
              : 'GCLWGQPMKXQSPF776IU33AH4PZNOOWNAWGGKVTBQMIC5IMKUNP3E6NVU',
            signature: 'mock_signature',
            message: 'Mock authentication message',
            chainId: type === WalletType.ETHEREUM ? 1 : null,
          })
          .expect(201);

        // Create some credentials for each wallet
        await credentialRepository.save(
          credentialRepository.create({
            walletId: walletResponse.body.wallet.id,
            credentialType: 'course_certificate',
            credentialData: { title: `${type} Certificate` },
            isOnChain: true,
            transactionHash: `0x${type}1234567890abcdef`,
          })
        );
      }
    });

    it('should provide wallet analytics dashboard', async () => {
      const analyticsResponse = await request(app.getHttpServer())
        .get('/wallet/analytics/dashboard')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(analyticsResponse.body).toMatchObject({
        totalWallets: 2,
        totalCredentials: 2,
        walletsByType: {
          ethereum: 1,
          stellar: 1,
        },
        credentialsByType: {
          course_certificate: 2,
        },
        blockchainTransactions: {
          total: expect.any(Number),
          successful: expect.any(Number),
          failed: expect.any(Number),
        },
      });
    });

    it('should track blockchain transaction costs', async () => {
      const costAnalyticsResponse = await request(app.getHttpServer())
        .get('/blockchain/analytics/transaction-costs')
        .set('Authorization', `Bearer ${userToken}`)
        .query({
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        })
        .expect(200);

      expect(costAnalyticsResponse.body).toMatchObject({
        totalCosts: {
          USD: expect.any(Number),
          ETH: expect.any(Number),
          XLM: expect.any(Number),
        },
        averageCostPerTransaction: expect.any(Number),
        transactionsByNetwork: {
          ethereum: expect.any(Number),
          stellar: expect.any(Number),
        },
        costTrends: expect.any(Array),
      });
    });

    it('should monitor blockchain network health', async () => {
      const healthResponse = await request(app.getHttpServer())
        .get('/blockchain/health')
        .expect(200);

      expect(healthResponse.body).toMatchObject({
        networks: {
          ethereum: {
            status: expect.stringMatching(/^(healthy|degraded|down)$/),
            latency: expect.any(Number),
            blockHeight: expect.any(Number),
            gasPrice: expect.any(Number),
          },
          stellar: {
            status: expect.stringMatching(/^(healthy|degraded|down)$/),
            latency: expect.any(Number),
            ledgerSequence: expect.any(Number),
            baseFee: expect.any(Number),
          },
        },
        overallStatus: expect.stringMatching(/^(healthy|degraded|down)$/),
      });
    });
  });

  describe('Cross-Chain Operations', () => {
    it('should bridge credentials between Ethereum and Stellar', async () => {
      // Connect both Ethereum and Stellar wallets
      const ethereumWallet = await request(app.getHttpServer())
        .post('/wallet/connect')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          walletType: WalletType.ETHEREUM,
          address: '0x742d35Cc6634C0532925a3b8D6Ac0fFFFd0030b0',
          signature: '0x1234567890abcdef...',
          message: 'Sign this message to authenticate',
          chainId: 1,
        })
        .expect(201);

      const stellarWallet = await request(app.getHttpServer())
        .post('/wallet/connect')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          walletType: WalletType.STELLAR,
          address: 'GCLWGQPMKXQSPF776IU33AH4PZNOOWNAWGGKVTBQMIC5IMKUNP3E6NVU',
          signature: 'mock_stellar_signature',
          message: 'Sign this message to authenticate with Stellar',
        })
        .expect(201);

      // Create credential on Ethereum
      const ethCredential = await credentialRepository.save(
        credentialRepository.create({
          walletId: ethereumWallet.body.wallet.id,
          credentialType: 'course_certificate',
          credentialData: { title: 'Ethereum Certificate' },
          isOnChain: true,
          transactionHash: '0xethereum1234567890abcdef',
        })
      );

      // Bridge credential to Stellar
      const bridgeResponse = await request(app.getHttpServer())
        .post('/blockchain/bridge/credential')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          credentialId: ethCredential.id,
          sourceWalletId: ethereumWallet.body.wallet.id,
          targetWalletId: stellarWallet.body.wallet.id,
          targetNetwork: 'stellar',
        })
        .expect(200);

      expect(bridgeResponse.body).toMatchObject({
        success: true,
        bridgedCredentialId: expect.any(String),
        sourceTransactionHash: ethCredential.transactionHash,
        targetTransactionHash: expect.any(String),
        bridgeStatus: 'completed',
      });

      // Verify bridged credential exists on Stellar
      const bridgedCredential = await credentialRepository.findOne({
        where: { id: bridgeResponse.body.bridgedCredentialId },
      });

      expect(bridgedCredential.walletId).toBe(stellarWallet.body.wallet.id);
      expect(bridgedCredential.metadata.bridgedFrom).toBe('ethereum');
    });

    it('should handle multi-chain credential verification', async () => {
      // Connect multiple wallets
      const wallets = [];
      const networks = [
        { type: WalletType.ETHEREUM, address: '0x742d35Cc6634C0532925a3b8D6Ac0fFFFd0030b0' },
        { type: WalletType.STELLAR, address: 'GCLWGQPMKXQSPF776IU33AH4PZNOOWNAWGGKVTBQMIC5IMKUNP3E6NVU' },
        { type: WalletType.POLYGON, address: '0x742d35Cc6634C0532925a3b8D6Ac0fFFFd0030b1' },
      ];

      for (const network of networks) {
        const walletResponse = await request(app.getHttpServer())
          .post('/wallet/connect')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            walletType: network.type,
            address: network.address,
            signature: 'mock_signature',
            message: 'Mock authentication',
            chainId: network.type === WalletType.POLYGON ? 137 : 1,
          })
          .expect(201);

        wallets.push(walletResponse.body.wallet);

        // Create credential on each network
        await credentialRepository.save(
          credentialRepository.create({
            walletId: walletResponse.body.wallet.id,
            credentialType: 'skill_verification',
            credentialData: { skill: `${network.type} Development` },
            isOnChain: true,
            transactionHash: `0x${network.type}1234567890abcdef`,
          })
        );
      }

      // Perform multi-chain verification
      const multiChainVerifyResponse = await request(app.getHttpServer())
        .post('/blockchain/verify/multi-chain')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          walletIds: wallets.map(w => w.id),
          credentialType: 'skill_verification',
          verificationScope: 'all_chains',
        })
        .expect(200);

      expect(multiChainVerifyResponse.body).toMatchObject({
        verificationResult: 'valid',
        chainsVerified: 3,
        credentialCount: 3,
        networkConsensus: true,
        verificationDetails: expect.arrayContaining([
          expect.objectContaining({
            network: expect.any(String),
            verified: true,
            transactionHash: expect.any(String),
          }),
        ]),
      });
    });
  });

  describe('Blockchain Security and Compliance', () => {
    it('should detect and prevent double-spending attacks', async () => {
      const walletResponse = await request(app.getHttpServer())
        .post('/wallet/connect')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          walletType: WalletType.ETHEREUM,
          address: '0x742d35Cc6634C0532925a3b8D6Ac0fFFFd0030b0',
          signature: '0x1234567890abcdef...',
          message: 'Sign this message to authenticate',
          chainId: 1,
        })
        .expect(201);

      const walletId = walletResponse.body.wallet.id;
      const credentialData = {
        credentialType: 'course_certificate',
        certificateNumber: 'CERT-2025-ABC123',
      };

      // Attempt to store same credential twice rapidly
      const promises = [
        request(app.getHttpServer())
          .post(`/wallet/${walletId}/credentials/store`)
          .set('Authorization', `Bearer ${userToken}`)
          .send(credentialData),
        request(app.getHttpServer())
          .post(`/wallet/${walletId}/credentials/store`)
          .set('Authorization', `Bearer ${userToken}`)
          .send(credentialData),
      ];

      const results = await Promise.allSettled(promises);
      
      // Only one should succeed
      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 201
      ).length;

      expect(successful).toBe(1);

      // The other should fail with double-spending detection
      const failed = results.find(r => 
        r.status === 'fulfilled' && r.value.status === 400
      );

      if (failed) {
        expect(failed.value.body.message).toContain('duplicate credential');
      }
    });

    it('should maintain audit trail for blockchain operations', async () => {
      const walletResponse = await request(app.getHttpServer())
        .post('/wallet/connect')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          walletType: WalletType.STELLAR,
          address: 'GCLWGQPMKXQSPF776IU33AH4PZNOOWNAWGGKVTBQMIC5IMKUNP3E6NVU',
          signature: 'mock_stellar_signature',
          message: 'Sign this message to authenticate',
        })
        .expect(201);

      const walletId = walletResponse.body.wallet.id;

      // Perform various blockchain operations
      await request(app.getHttpServer())
        .post('/blockchain/stellar/trustline')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          walletId: walletId,
          assetCode: 'STRLM',
          issuer: 'ISSUER_ADDRESS',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/wallet/${walletId}/credentials/store`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          credentialType: 'course_certificate',
          certificateNumber: 'CERT-2025-ABC123',
        })
        .expect(201);

      // Get audit trail
      const auditResponse = await request(app.getHttpServer())
        .get(`/blockchain/audit/wallet/${walletId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(auditResponse.body).toMatchObject({
        walletId: walletId,
        totalOperations: expect.any(Number),
        operations: expect.arrayContaining([
          expect.objectContaining({
            type: 'trustline_creation',
            timestamp: expect.any(String),
            transactionHash: expect.any(String),
            status: 'success',
          }),
          expect.objectContaining({
            type: 'credential_storage',
            timestamp: expect.any(String),
            transactionHash: expect.any(String),
            status: 'success',
          }),
        ]),
      });
    });

    it('should validate smart contract interactions', async () => {
      const walletResponse = await request(app.getHttpServer())
        .post('/wallet/connect')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          walletType: WalletType.STELLAR,
          address: 'GCLWGQPMKXQSPF776IU33AH4PZNOOWNAWGGKVTBQMIC5IMKUNP3E6NVU',
          signature: 'mock_stellar_signature',
          message: 'Sign this message to authenticate',
        })
        .expect(201);

      // Attempt to call non-existent contract method
      const invalidContractResponse = await request(app.getHttpServer())
        .post('/blockchain/stellar/contract/invoke')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          walletId: walletResponse.body.wallet.id,
          contractAddress: 'VALID_CONTRACT_ADDRESS',
          method: 'non_existent_method',
          args: ['invalid', 'args'],
        })
        .expect(400);

      expect(invalidContractResponse.body.message).toContain('method not found');

      // Attempt to call contract with insufficient permissions
      const unauthorizedResponse = await request(app.getHttpServer())
        .post('/blockchain/stellar/contract/invoke')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          walletId: walletResponse.body.wallet.id,
          contractAddress: 'RESTRICTED_CONTRACT_ADDRESS',
          method: 'admin_only_method',
          args: [],
        })
        .expect(403);

      expect(unauthorizedResponse.body.message).toContain('insufficient permissions');
    });
  });
});
