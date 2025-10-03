import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getValidationSchema, validationOptions } from '../validation.schema';
import * as Joi from '@hapi/joi';

// Test-specific validation options that allow unknown variables
const testValidationOptions: Joi.ValidationOptions = {
  abortEarly: false,
  allowUnknown: true, // Allow system environment variables
  stripUnknown: false,
};

/**
 * Integration tests that verify configuration validation works properly
 * during application bootstrap and in real scenarios.
 */
describe('Application Configuration Integration', () => {
  describe('ConfigModule Bootstrap with Validation', () => {
    it('should successfully bootstrap with valid environment variables', async () => {
      // Set up valid environment variables
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        NODE_ENV: 'test',
        DATABASE_HOST: 'localhost',
        DATABASE_PORT: '5432',
        DATABASE_USER: 'testuser',
        DATABASE_PASSWORD: 'testpass',
        DATABASE_NAME: 'testdb',
        JWT_SECRET: 'this_is_a_very_long_and_secure_jwt_secret_key_for_testing_purposes',
        SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
        STELLAR_NETWORK: 'TESTNET',
        CREDENTIAL_CONTRACT_ID: 'CC7NMJQHVB4USKJVSYQNQ7ZIXSQQJGYFBGZLYNJ2L3ZXLF3ABCDEFGHIJK',
        SIGNER_SECRET_KEY: 'SCKBYGZQH2LTLLKKYJQW6GQFVHBIDYHSHQVGKXUMJ2XTDCCJJWM4ABCDEFGHIJK',
        BASE_URL: 'http://localhost:3000',
        FRONTEND_URL: 'http://localhost:4200',
      };

      let module: TestingModule;
      
      try {
        module = await Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              validationSchema: getValidationSchema('test'),
              validationOptions: testValidationOptions,
              ignoreEnvFile: true, // Use only process.env for testing
            }),
          ],
          providers: [],
        }).compile();

        const configService = module.get<ConfigService>(ConfigService);
        
        // Verify that configuration values are accessible
        expect(configService.get('NODE_ENV')).toBe('test');
        expect(configService.get('DATABASE_HOST')).toBe('localhost');
        expect(configService.get('JWT_SECRET')).toBeDefined();
        expect(configService.get('JWT_SECRET').length).toBeGreaterThanOrEqual(32);
        
        await module.close();
      } finally {
        process.env = originalEnv;
      }
    });

    it('should fail to bootstrap with missing required environment variables', async () => {
      // Set up environment with missing required variables
      const originalEnv = process.env;
      process.env = {
        NODE_ENV: 'test',
        // Missing DATABASE_HOST, JWT_SECRET, and other required fields
      };

      try {
        await expect(
          Test.createTestingModule({
            imports: [
              ConfigModule.forRoot({
                isGlobal: true,
                validationSchema: getValidationSchema('test'),
                validationOptions: testValidationOptions,
                ignoreEnvFile: true,
              }),
            ],
            providers: [],
          }).compile()
        ).rejects.toThrow();
      } finally {
        process.env = originalEnv;
      }
    });

    it('should fail to bootstrap with invalid environment variable types', async () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        NODE_ENV: 'test',
        DATABASE_HOST: 'localhost',
        DATABASE_PORT: 'not-a-number', // Invalid port
        DATABASE_USER: 'testuser',
        DATABASE_PASSWORD: 'testpass',
        DATABASE_NAME: 'testdb',
        JWT_SECRET: 'short', // Too short JWT secret
        SOROBAN_RPC_URL: 'not-a-valid-url', // Invalid URL
        CREDENTIAL_CONTRACT_ID: 'CC7NMJQHVB4USKJVSYQNQ7ZIXSQQJGYFBGZLYNJ2L3ZXLF3ABCDEFGHIJK',
        SIGNER_SECRET_KEY: 'SCKBYGZQH2LTLLKKYJQW6GQFVHBIDYHSHQVGKXUMJ2XTDCCJJWM4ABCDEFGHIJK',
        BASE_URL: 'http://localhost:3000',
        FRONTEND_URL: 'http://localhost:4200',
      };

      try {
        await expect(
          Test.createTestingModule({
            imports: [
              ConfigModule.forRoot({
                isGlobal: true,
                validationSchema: getValidationSchema('test'),
                validationOptions: testValidationOptions,
                ignoreEnvFile: true,
              }),
            ],
            providers: [],
          }).compile()
        ).rejects.toThrow();
      } finally {
        process.env = originalEnv;
      }
    });
  });

  describe('Environment-Specific Configuration Loading', () => {
    it('should load development configuration correctly', async () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        NODE_ENV: 'development',
        DATABASE_HOST: 'localhost',
        DATABASE_PORT: '5432',
        DATABASE_USER: 'devuser',
        DATABASE_PASSWORD: 'devpass',
        DATABASE_NAME: 'dev_db',
        DATABASE_SSL: 'false', // Development allows false
        JWT_SECRET: 'development_jwt_secret_that_is_long_enough_for_validation',
        SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
        STELLAR_NETWORK: 'TESTNET',
        CREDENTIAL_CONTRACT_ID: 'CC7NMJQHVB4USKJVSYQNQ7ZIXSQQJGYFBGZLYNJ2L3ZXLF3ABCDEFGHIJK',
        SIGNER_SECRET_KEY: 'SCKBYGZQH2LTLLKKYJQW6GQFVHBIDYHSHQVGKXUMJ2XTDCCJJWM4ABCDEFGHIJK',
        BASE_URL: 'http://localhost:3000',
        FRONTEND_URL: 'http://localhost:4200',
      };

      let module: TestingModule;

      try {
        module = await Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              isGlobal: true,
              validationSchema: getValidationSchema('development'),
              validationOptions: testValidationOptions,
              ignoreEnvFile: true,
            }),
          ],
          providers: [],
        }).compile();

        const configService = module.get<ConfigService>(ConfigService);
        
        expect(configService.get('NODE_ENV')).toBe('development');
        expect(configService.get('DATABASE_SSL')).toBe('false');
        
        await module.close();
      } finally {
        process.env = originalEnv;
      }
    });

    it('should reject production configuration with missing required fields', async () => {
      const originalEnv = process.env;
      process.env = {
        NODE_ENV: 'production',
        DATABASE_HOST: 'prod.database.com',
        DATABASE_PORT: '5432',
        DATABASE_USER: 'produser',
        DATABASE_PASSWORD: 'prodpass',
        DATABASE_NAME: 'prod_db',
        JWT_SECRET: 'production_jwt_secret_that_is_long_enough_for_validation',
        SOROBAN_RPC_URL: 'https://soroban-mainnet.stellar.org',
        STELLAR_NETWORK: 'MAINNET',
        CREDENTIAL_CONTRACT_ID: 'CC7NMJQHVB4USKJVSYQNQ7ZIXSQQJGYFBGZLYNJ2L3ZXLF3ABCDEFGHIJK',
        SIGNER_SECRET_KEY: 'SCKBYGZQH2LTLLKKYJQW6GQFVHBIDYHSHQVGKXUMJ2XTDCCJJWM4ABCDEFGHIJK',
        BASE_URL: 'https://api.production.com',
        FRONTEND_URL: 'https://app.production.com',
        // Missing production-required fields like REDIS_HOST, SMTP_HOST, etc.
      };

      try {
        await expect(
          Test.createTestingModule({
            imports: [
              ConfigModule.forRoot({
                isGlobal: true,
                validationSchema: getValidationSchema('production'),
                validationOptions: testValidationOptions,
                ignoreEnvFile: true,
              }),
            ],
            providers: [],
          }).compile()
        ).rejects.toThrow();
      } finally {
        process.env = originalEnv;
      }
    });
  });

  describe('Configuration Service Access Patterns', () => {
    let module: TestingModule;
    let configService: ConfigService;

    beforeAll(async () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        NODE_ENV: 'test',
        DATABASE_HOST: 'localhost',
        DATABASE_PORT: '5432',
        DATABASE_USER: 'testuser',
        DATABASE_PASSWORD: 'testpass',
        DATABASE_NAME: 'testdb',
        JWT_SECRET: 'test_jwt_secret_that_is_long_enough_for_validation_purposes',
        JWT_EXPIRES_IN: '1h',
        SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
        STELLAR_NETWORK: 'TESTNET',
        CREDENTIAL_CONTRACT_ID: 'CC7NMJQHVB4USKJVSYQNQ7ZIXSQQJGYFBGZLYNJ2L3ZXLF3ABCDEFGHIJK',
        SIGNER_SECRET_KEY: 'SCKBYGZQH2LTLLKKYJQW6GQFVHBIDYHSHQVGKXUMJ2XTDCCJJWM4ABCDEFGHIJK',
        BASE_URL: 'http://localhost:3000',
        FRONTEND_URL: 'http://localhost:4200',
        GLOBAL_RATE_LIMIT_TTL: '60',
        GLOBAL_RATE_LIMIT_LIMIT: '100',
        LOG_LEVEL: 'error',
      };

      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            validationSchema: getValidationSchema('test'),
            validationOptions: testValidationOptions,
            ignoreEnvFile: true,
          }),
        ],
        providers: [],
      }).compile();

      configService = module.get<ConfigService>(ConfigService);
    });

    afterAll(async () => {
      await module?.close();
    });

    it('should provide access to database configuration', () => {
      expect(configService.get<string>('DATABASE_HOST')).toBe('localhost');
      expect(configService.get<number>('DATABASE_PORT')).toBe(5432);
      expect(configService.get<string>('DATABASE_USER')).toBe('testuser');
      expect(configService.get<string>('DATABASE_PASSWORD')).toBe('testpass');
      expect(configService.get<string>('DATABASE_NAME')).toBe('testdb');
    });

    it('should provide access to JWT configuration', () => {
      expect(configService.get<string>('JWT_SECRET')).toBeDefined();
      expect(configService.get<string>('JWT_SECRET').length).toBeGreaterThanOrEqual(32);
      expect(configService.get<string>('JWT_EXPIRES_IN')).toBe('1h');
    });

    it('should provide access to Stellar blockchain configuration', () => {
      expect(configService.get<string>('SOROBAN_RPC_URL')).toBe('https://soroban-testnet.stellar.org');
      expect(configService.get<string>('STELLAR_NETWORK')).toBe('TESTNET');
      expect(configService.get<string>('CREDENTIAL_CONTRACT_ID')).toBeDefined();
      expect(configService.get<string>('SIGNER_SECRET_KEY')).toBeDefined();
    });

    it('should provide access to application URLs', () => {
      expect(configService.get<string>('BASE_URL')).toBe('http://localhost:3000');
      expect(configService.get<string>('FRONTEND_URL')).toBe('http://localhost:4200');
    });

    it('should provide access to rate limiting configuration', () => {
      expect(configService.get<number>('GLOBAL_RATE_LIMIT_TTL')).toBe(60);
      expect(configService.get<number>('GLOBAL_RATE_LIMIT_LIMIT')).toBe(100);
    });

    it('should return default values for optional configuration', () => {
      expect(configService.get<number>('PORT')).toBe(3000); // Default value
      expect(configService.get<string>('HOST')).toBe('localhost'); // Default value
      expect(configService.get<number>('DATABASE_POOL_MAX')).toBe(20); // Default value
    });

    it('should handle configuration with nested access patterns', () => {
      // Test accessing configuration in the format used by TypeORM setup
      const dbConfig = {
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT'),
        username: configService.get<string>('DATABASE_USER'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
      };

      expect(dbConfig.host).toBe('localhost');
      expect(dbConfig.port).toBe(5432);
      expect(dbConfig.username).toBe('testuser');
      expect(dbConfig.password).toBe('testpass');
      expect(dbConfig.database).toBe('testdb');
    });
  });

  describe('Error Messages and Debugging', () => {
    it('should provide clear error messages for validation failures', async () => {
      const originalEnv = process.env;
      process.env = {
        NODE_ENV: 'production',
        DATABASE_HOST: 'localhost',
        JWT_SECRET: 'short', // Too short
        BASE_URL: 'invalid-url', // Invalid URL
        // Missing required fields
      };

      try {
        await expect(
          Test.createTestingModule({
            imports: [
              ConfigModule.forRoot({
                isGlobal: true,
                validationSchema: getValidationSchema('production'),
                validationOptions: testValidationOptions,
                ignoreEnvFile: true,
              }),
            ],
            providers: [],
          }).compile()
        ).rejects.toThrow(/JWT_SECRET must be at least 32 characters long for security/);
      } finally {
        process.env = originalEnv;
      }
    });

    it('should fail fast when critical configuration is missing', async () => {
      const originalEnv = process.env;
      process.env = {
        NODE_ENV: 'production',
        // All required fields missing
      };

      try {
        const startTime = Date.now();
        
        await expect(
          Test.createTestingModule({
            imports: [
              ConfigModule.forRoot({
                isGlobal: true,
                validationSchema: getValidationSchema('production'),
                validationOptions: testValidationOptions,
                ignoreEnvFile: true,
              }),
            ],
            providers: [],
          }).compile()
        ).rejects.toThrow();
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Should fail fast (within a reasonable time)
        expect(duration).toBeLessThan(5000); // Less than 5 seconds
      } finally {
        process.env = originalEnv;
      }
    });
  });
});