import * as Joi from '@hapi/joi';
import {
  configValidationSchema,
  environmentValidationSchemas,
  getValidationSchema,
  validationOptions,
} from '../validation.schema';

describe('Configuration Validation Schema', () => {
  // Valid configuration for testing
  const validBaseConfig = {
    NODE_ENV: 'development',
    DATABASE_HOST: 'localhost',
    DATABASE_PORT: '5432',
    DATABASE_USER: 'testuser',
    DATABASE_PASSWORD: 'testpass',
    DATABASE_NAME: 'testdb',
    JWT_SECRET: 'this_is_a_very_long_and_secure_jwt_secret_key_for_testing',
    SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
    CREDENTIAL_CONTRACT_ID: 'CC7NMJQHVB4USKJVSYQNQ7ZIXSQQJGYFBGZLYNJ2L3ZXLF3ABCDEFGHIJK',
    SIGNER_SECRET_KEY: 'SCKBYGZQH2LTLLKKYJQW6GQFVHBIDYHSHQVGKXUMJ2XTDCCJJWM4ABCDEFGHIJK',
    BASE_URL: 'http://localhost:3000',
    FRONTEND_URL: 'http://localhost:4200',
  };

  const validProductionConfig = {
    ...validBaseConfig,
    NODE_ENV: 'production',
    DATABASE_SSL: 'true',
    REDIS_HOST: 'redis.production.com',
    JWT_REFRESH_SECRET: 'this_is_a_very_long_and_secure_jwt_refresh_secret_key_for_production',
    SMTP_HOST: 'smtp.production.com',
    SMTP_USER: 'noreply@example.com',
    SMTP_PASS: 'secure_smtp_password',
    EMAIL_FROM: 'noreply@example.com',
    CLOUDINARY_CLOUD_NAME: 'production_cloud',
    CLOUDINARY_API_KEY: '123456789012345',
    CLOUDINARY_API_SECRET: 'secure_cloudinary_secret',
    STRIPE_PUBLIC_KEY: 'pk_test_123456789abcdef',
    STRIPE_SECRET_KEY: 'sk_test_123456789abcdef',
    STRIPE_WEBHOOK_SECRET: 'whsec_123456789abcdef',
    SENTRY_ENABLED: 'true',
    SENTRY_DSN: 'https://example@sentry.io/123456',
    ALERTING_ENABLED: 'true',
    LOG_FILE_ENABLED: 'true',
  };

  describe('Base Schema Validation', () => {
    it('should validate a complete valid configuration', () => {
      const { error, value } = configValidationSchema.validate(
        validBaseConfig,
        validationOptions,
      );

      expect(error).toBeUndefined();
      expect(value).toBeDefined();
      expect(value.NODE_ENV).toBe('development');
      expect(value.DATABASE_HOST).toBe('localhost');
    });

    it('should apply default values for optional fields', () => {
      const minimalConfig = {
        DATABASE_HOST: 'localhost',
        DATABASE_USER: 'testuser',
        DATABASE_PASSWORD: 'testpass',
        DATABASE_NAME: 'testdb',
        JWT_SECRET: 'this_is_a_very_long_and_secure_jwt_secret_key_for_testing',
        SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
        CREDENTIAL_CONTRACT_ID: 'CC7NMJQHVB4USKJVSYQNQ7ZIXSQQJGYFBGZLYNJ2L3ZXLF3ABCDEFGHIJK',
        SIGNER_SECRET_KEY: 'SCKBYGZQH2LTLLKKYJQW6GQFVHBIDYHSHQVGKXUMJ2XTDCCJJWM4ABCDEFGHIJK',
        BASE_URL: 'http://localhost:3000',
        FRONTEND_URL: 'http://localhost:4200',
      };

      const { error, value } = configValidationSchema.validate(
        minimalConfig,
        validationOptions,
      );

      expect(error).toBeUndefined();
      expect(value.NODE_ENV).toBe('development'); // Default value
      expect(value.DATABASE_PORT).toBe(5432); // Default value
      expect(value.PORT).toBe(3000); // Default value
    });

    describe('Required Field Validation', () => {
      const requiredFields = [
        'DATABASE_HOST',
        'DATABASE_USER',
        'DATABASE_PASSWORD',
        'DATABASE_NAME',
        'JWT_SECRET',
        'SOROBAN_RPC_URL',
        'CREDENTIAL_CONTRACT_ID',
        'SIGNER_SECRET_KEY',
        'BASE_URL',
        'FRONTEND_URL',
      ];

      requiredFields.forEach((field) => {
        it(`should fail when required field ${field} is missing`, () => {
          const configWithoutField = { ...validBaseConfig };
          delete configWithoutField[field];

          const { error } = configValidationSchema.validate(
            configWithoutField,
            validationOptions,
          );

          expect(error).toBeDefined();
          expect(error?.details[0].path[0]).toBe(field);
          expect(error?.details[0].type).toBe('any.required');
        });
      });
    });

    describe('Field Type Validation', () => {
      it('should fail when DATABASE_PORT is not a number', () => {
        const config = {
          ...validBaseConfig,
          DATABASE_PORT: 'not-a-number',
        };

        const { error } = configValidationSchema.validate(config, validationOptions);

        expect(error).toBeDefined();
        expect(error?.details[0].path[0]).toBe('DATABASE_PORT');
        expect(error?.details[0].type).toBe('number.base');
      });

      it('should fail when JWT_SECRET is too short', () => {
        const config = {
          ...validBaseConfig,
          JWT_SECRET: 'short',
        };

        const { error } = configValidationSchema.validate(config, validationOptions);

        expect(error).toBeDefined();
        expect(error?.details[0].path[0]).toBe('JWT_SECRET');
        expect(error?.details[0].type).toBe('string.min');
      });

      it('should fail when BASE_URL is not a valid URI', () => {
        const config = {
          ...validBaseConfig,
          BASE_URL: 'not-a-valid-url',
        };

        const { error } = configValidationSchema.validate(config, validationOptions);

        expect(error).toBeDefined();
        expect(error?.details[0].path[0]).toBe('BASE_URL');
        expect(error?.details[0].type).toBe('string.uri');
      });

      it('should fail when NODE_ENV has invalid value', () => {
        const config = {
          ...validBaseConfig,
          NODE_ENV: 'invalid-environment',
        };

        const { error } = configValidationSchema.validate(config, validationOptions);

        expect(error).toBeDefined();
        expect(error?.details[0].path[0]).toBe('NODE_ENV');
        expect(error?.details[0].type).toBe('any.only');
      });
    });

    describe('Conditional Field Validation', () => {
      it('should require AWS_SECRET_ACCESS_KEY when AWS_ACCESS_KEY_ID is provided', () => {
        const config = {
          ...validBaseConfig,
          AWS_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE',
          // AWS_SECRET_ACCESS_KEY is missing
        };

        const { error } = configValidationSchema.validate(config, validationOptions);

        expect(error).toBeDefined();
        expect(error?.details[0].path[0]).toBe('AWS_SECRET_ACCESS_KEY');
        expect(error?.details[0].type).toBe('any.required');
      });

      it('should require SENTRY_DSN when SENTRY_ENABLED is true', () => {
        const config = {
          ...validBaseConfig,
          SENTRY_ENABLED: 'true',
          // SENTRY_DSN is missing
        };

        const { error } = configValidationSchema.validate(config, validationOptions);

        expect(error).toBeDefined();
        expect(error?.details[0].path[0]).toBe('SENTRY_DSN');
        expect(error?.details[0].type).toBe('any.required');
      });
    });
  });

  describe('Environment-Specific Validation', () => {
    describe('Development Environment', () => {
      it('should validate development configuration', () => {
        const devConfig = {
          ...validBaseConfig,
          NODE_ENV: 'development',
        };

        const schema = getValidationSchema('development');
        const { error } = schema.validate(devConfig, validationOptions);

        expect(error).toBeUndefined();
      });

      it('should allow DATABASE_SSL to be false in development', () => {
        const devConfig = {
          ...validBaseConfig,
          NODE_ENV: 'development',
          DATABASE_SSL: 'false',
        };

        const schema = getValidationSchema('development');
        const { error } = schema.validate(devConfig, validationOptions);

        expect(error).toBeUndefined();
      });
    });

    describe('Production Environment', () => {
      it('should validate complete production configuration', () => {
        const schema = getValidationSchema('production');
        const { error, value } = schema.validate(
          validProductionConfig,
          validationOptions,
        );

        expect(error).toBeUndefined();
        expect(value).toBeDefined();
      });

      it('should fail when required production fields are missing', () => {
        const incompleteConfig = {
          ...validBaseConfig,
          NODE_ENV: 'production',
        };

        const schema = getValidationSchema('production');
        const { error } = schema.validate(incompleteConfig, validationOptions);

        expect(error).toBeDefined();
        
        // Check that multiple required fields are missing in production
        const missingFields = error?.details.map(detail => detail.path[0]);
        expect(missingFields).toContain('REDIS_HOST');
        expect(missingFields).toContain('SMTP_HOST');
        expect(missingFields).toContain('CLOUDINARY_CLOUD_NAME');
      });

      it('should validate production configuration correctly', () => {
        const schema = getValidationSchema('production');
        const { error } = schema.validate(validProductionConfig, validationOptions);

        expect(error).toBeUndefined();
      });

      it('should require email configuration in production', () => {
        const prodConfig = {
          ...validBaseConfig,
          NODE_ENV: 'production',
          DATABASE_SSL: 'true',
          REDIS_HOST: 'redis.production.com',
          SENTRY_ENABLED: 'true',
          SENTRY_DSN: 'https://example@sentry.io/123456',
          ALERTING_ENABLED: 'true',
          LOG_FILE_ENABLED: 'true',
          CLOUDINARY_CLOUD_NAME: 'production_cloud',
          CLOUDINARY_API_KEY: '123456789012345',
          CLOUDINARY_API_SECRET: 'secure_cloudinary_secret',
          STRIPE_PUBLIC_KEY: 'pk_test_123456789abcdef',
          STRIPE_SECRET_KEY: 'sk_test_123456789abcdef',
          STRIPE_WEBHOOK_SECRET: 'whsec_123456789abcdef',
          // Missing email config
        };

        const schema = getValidationSchema('production');
        const { error } = schema.validate(prodConfig, validationOptions);

        expect(error).toBeDefined();
        const missingFields = error?.details.map(detail => detail.path[0]);
        expect(missingFields).toContain('SMTP_HOST');
        expect(missingFields).toContain('SMTP_USER');
        expect(missingFields).toContain('SMTP_PASS');
        expect(missingFields).toContain('EMAIL_FROM');
      });
    });

    describe('Staging Environment', () => {
      it('should validate staging configuration', () => {
        const stagingConfig = {
          ...validBaseConfig,
          NODE_ENV: 'staging',
          DATABASE_SSL: 'true',
          SENTRY_ENABLED: 'true',
          SENTRY_DSN: 'https://example@sentry.io/123456',
          ALERTING_ENABLED: 'true',
          CLOUDINARY_CLOUD_NAME: 'staging_cloud',
          CLOUDINARY_API_KEY: '123456789012345',
          CLOUDINARY_API_SECRET: 'staging_cloudinary_secret',
          STRIPE_PUBLIC_KEY: 'pk_test_123456789abcdef',
          STRIPE_SECRET_KEY: 'sk_test_123456789abcdef',
          STRIPE_WEBHOOK_SECRET: 'whsec_123456789abcdef',
        };

        const schema = getValidationSchema('staging');
        const { error } = schema.validate(stagingConfig, validationOptions);

        expect(error).toBeUndefined();
      });

      it('should allow staging configuration with appropriate settings', () => {
        const stagingConfig = {
          ...validBaseConfig,
          NODE_ENV: 'staging',
          DATABASE_SSL: 'true',
          CLOUDINARY_CLOUD_NAME: 'staging_cloud',
          CLOUDINARY_API_KEY: '123456789012345',
          CLOUDINARY_API_SECRET: 'staging_cloudinary_secret',
          STRIPE_PUBLIC_KEY: 'pk_test_123456789abcdef',
          STRIPE_SECRET_KEY: 'sk_test_123456789abcdef',
          STRIPE_WEBHOOK_SECRET: 'whsec_123456789abcdef',
        };

        const schema = getValidationSchema('staging');
        const { error } = schema.validate(stagingConfig, validationOptions);

        expect(error).toBeUndefined();
      });
    });

    describe('Test Environment', () => {
      it('should validate test configuration', () => {
        const testConfig = {
          ...validBaseConfig,
          NODE_ENV: 'test',
          DATABASE_NAME: 'test_db',
        };

        const schema = getValidationSchema('test');
        const { error } = schema.validate(testConfig, validationOptions);

        expect(error).toBeUndefined();
      });
    });

    describe('OpenAPI Environment', () => {
      it('should validate openapi configuration with minimal requirements', () => {
        const openapiConfig = {
          NODE_ENV: 'openapi',
          PORT: '3000',
        };

        const schema = getValidationSchema('openapi');
        const { error } = schema.validate(openapiConfig, validationOptions);

        expect(error).toBeUndefined();
      });
    });
  });

  describe('Validation Options', () => {
    it('should collect all validation errors when abortEarly is false', () => {
      const invalidConfig = {
        NODE_ENV: 'invalid',
        DATABASE_PORT: 'not-a-number',
        JWT_SECRET: 'short',
        BASE_URL: 'invalid-url',
        // Missing required fields
      };

      const { error } = configValidationSchema.validate(
        invalidConfig,
        validationOptions,
      );

      expect(error).toBeDefined();
      expect(error?.details.length).toBeGreaterThan(1);
    });

    it('should fail on unknown environment variables', () => {
      const configWithUnknown = {
        ...validBaseConfig,
        UNKNOWN_VARIABLE: 'should-cause-error',
      };

      const { error } = configValidationSchema.validate(
        configWithUnknown,
        validationOptions,
      );

      expect(error).toBeDefined();
      expect(error?.details[0].type).toBe('object.unknown');
      expect(error?.details[0].path[0]).toBe('UNKNOWN_VARIABLE');
    });
  });

  describe('getValidationSchema function', () => {
    it('should return correct schema for valid environments', () => {
      expect(getValidationSchema('development')).toBe(
        environmentValidationSchemas.development,
      );
      expect(getValidationSchema('production')).toBe(
        environmentValidationSchemas.production,
      );
      expect(getValidationSchema('staging')).toBe(
        environmentValidationSchemas.staging,
      );
      expect(getValidationSchema('test')).toBe(
        environmentValidationSchemas.test,
      );
      expect(getValidationSchema('openapi')).toBe(
        environmentValidationSchemas.openapi,
      );
    });

    it('should return base schema for unknown environments', () => {
      expect(getValidationSchema('unknown')).toBe(configValidationSchema);
    });

    it('should use development as default', () => {
      expect(getValidationSchema()).toBe(environmentValidationSchemas.development);
    });
  });

  describe('Custom Error Messages', () => {
    it('should provide custom error message for JWT_SECRET', () => {
      const config = {
        ...validBaseConfig,
        JWT_SECRET: 'short',
      };

      const { error } = configValidationSchema.validate(config, validationOptions);

      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe(
        'JWT_SECRET must be at least 32 characters long for security',
      );
    });

    it('should provide custom error message for BASE_URL', () => {
      const config = { ...validBaseConfig };
      delete config.BASE_URL;

      const { error } = configValidationSchema.validate(config, validationOptions);

      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe(
        'BASE_URL is required for generating links and redirects',
      );
    });

    it('should provide custom error message for SOROBAN_RPC_URL', () => {
      const config = { ...validBaseConfig };
      delete config.SOROBAN_RPC_URL;

      const { error } = configValidationSchema.validate(config, validationOptions);

      expect(error).toBeDefined();
      expect(error?.details[0].message).toBe(
        'SOROBAN_RPC_URL is required for blockchain operations',
      );
    });
  });

  describe('Boundary Value Testing', () => {
    it('should accept minimum valid values', () => {
      const config = {
        ...validBaseConfig,
        DATABASE_POOL_MAX: 1,
        DATABASE_POOL_MIN: 1,
        DATABASE_IDLE_TIMEOUT: 1000,
        DATABASE_RETRY_ATTEMPTS: 0,
        DATABASE_RETRY_DELAY: 1000,
        GLOBAL_RATE_LIMIT_TTL: 1,
        GLOBAL_RATE_LIMIT_LIMIT: 1,
      };

      const { error } = configValidationSchema.validate(config, validationOptions);

      expect(error).toBeUndefined();
    });

    it('should reject values below minimum thresholds', () => {
      const config = {
        ...validBaseConfig,
        DATABASE_POOL_MAX: 0, // Should be at least 1
      };

      const { error } = configValidationSchema.validate(config, validationOptions);

      expect(error).toBeDefined();
      expect(error?.details[0].path[0]).toBe('DATABASE_POOL_MAX');
      expect(error?.details[0].type).toBe('number.min');
    });
  });
});