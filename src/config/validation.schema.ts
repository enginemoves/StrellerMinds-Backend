import * as Joi from '@hapi/joi';

/**
 * Comprehensive configuration validation schema using Joi
 * Validates all critical environment variables including:
 * - Database configuration
 * - Redis connection
 * - JWT settings
 * - Email transport
 * - Base URLs
 * - Throttling limits
 * - AWS/Cloudinary configuration
 * - Stellar blockchain settings
 */
export const configValidationSchema = Joi.object({
  // Node.js Environment
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production', 'test', 'openapi')
    .default('development'),

  // Application Server
  PORT: Joi.number().port().default(3000),
  HOST: Joi.string().default('localhost'),

  // Database Configuration (Required except for openapi)
  DATABASE_HOST: Joi.string().when('NODE_ENV', {
    is: 'openapi',
    then: Joi.optional(),
    otherwise: Joi.required()
  }),
  DATABASE_PORT: Joi.number().port().default(5432),
  DATABASE_USER: Joi.string().when('NODE_ENV', {
    is: 'openapi',
    then: Joi.optional(),
    otherwise: Joi.required()
  }),
  DATABASE_PASSWORD: Joi.string().when('NODE_ENV', {
    is: 'openapi',
    then: Joi.optional(),
    otherwise: Joi.required()
  }),
  DATABASE_NAME: Joi.string().when('NODE_ENV', {
    is: 'openapi',
    then: Joi.optional(),
    otherwise: Joi.required()
  }),
  DATABASE_SSL: Joi.string().valid('true', 'false').default('false'),
  DATABASE_SYNC: Joi.string().valid('true', 'false').default('false'),
  DATABASE_LOAD: Joi.string().valid('true', 'false').default('true'),

  // Database Pool Settings
  DATABASE_POOL_MAX: Joi.number().min(1).default(20),
  DATABASE_POOL_MIN: Joi.number().min(1).default(5),
  DATABASE_IDLE_TIMEOUT: Joi.number().min(1000).default(30000),

  // Database Retry Settings
  DATABASE_RETRY_ATTEMPTS: Joi.number().min(0).default(5),
  DATABASE_RETRY_DELAY: Joi.number().min(1000).default(3000),

  // Pool Monitoring
  DATABASE_POOL_MONITORING: Joi.string().valid('true', 'false').default('false'),
  DATABASE_POOL_METRICS_INTERVAL: Joi.number().min(10000).default(30000),

  // Redis Configuration (Optional but recommended for production)
  REDIS_HOST: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional().default('localhost')
  }),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().optional().allow(''),
  REDIS_DB: Joi.number().min(0).default(0),
  REDIS_MAX_RETRIES: Joi.number().min(0).default(3),

  // JWT Configuration (Required except for openapi)
  JWT_SECRET: Joi.string().min(32).when('NODE_ENV', {
    is: 'openapi',
    then: Joi.optional(),
    otherwise: Joi.required()
  })
    .messages({
      'string.min': 'JWT_SECRET must be at least 32 characters long for security',
      'any.required': 'JWT_SECRET is required for authentication'
    }),
  JWT_EXPIRES_IN: Joi.string().default('3600s'),
  JWT_REFRESH_SECRET: Joi.string().min(32).when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Email Configuration (Required for production)
  SMTP_HOST: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  SMTP_PORT: Joi.number().port().default(587),
  SMTP_SECURE: Joi.string().valid('true', 'false').default('false'),
  SMTP_USER: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  SMTP_PASS: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  EMAIL_FROM: Joi.string().email().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),

  // Base URLs (Required except for openapi)
  BASE_URL: Joi.string().uri().when('NODE_ENV', {
    is: 'openapi',
    then: Joi.optional(),
    otherwise: Joi.required()
  })
    .messages({
      'any.required': 'BASE_URL is required for generating links and redirects'
    }),
  FRONTEND_URL: Joi.string().uri().when('NODE_ENV', {
    is: 'openapi',
    then: Joi.optional(),
    otherwise: Joi.required()
  })
    .messages({
      'any.required': 'FRONTEND_URL is required for CORS and redirects'
    }),
  API_URL: Joi.string().uri().optional(),

  // Throttling/Rate Limiting
  GLOBAL_RATE_LIMIT_TTL: Joi.number().min(1).default(60),
  GLOBAL_RATE_LIMIT_LIMIT: Joi.number().min(1).default(100),
  AUTH_RATE_LIMIT_TTL: Joi.number().min(1).default(900), // 15 minutes
  AUTH_RATE_LIMIT_LIMIT: Joi.number().min(1).default(5),

  // File Storage
  UPLOAD_DIR: Joi.string().default('./uploads'),
  MAX_FILE_SIZE: Joi.number().min(1024).default(10485760), // 10MB

  // Cloudinary Configuration (Required for file uploads)
  CLOUDINARY_CLOUD_NAME: Joi.string().when('NODE_ENV', {
    is: Joi.valid('staging', 'production'),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  CLOUDINARY_API_KEY: Joi.string().when('NODE_ENV', {
    is: Joi.valid('staging', 'production'),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  CLOUDINARY_API_SECRET: Joi.string().when('NODE_ENV', {
    is: Joi.valid('staging', 'production'),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),

  // Stellar Blockchain Configuration (Required except for openapi)
  SOROBAN_RPC_URL: Joi.string().uri().when('NODE_ENV', {
    is: 'openapi',
    then: Joi.optional(),
    otherwise: Joi.required()
  })
    .messages({
      'any.required': 'SOROBAN_RPC_URL is required for blockchain operations'
    }),
  STELLAR_NETWORK: Joi.string().valid('TESTNET', 'MAINNET').default('TESTNET'),
  CREDENTIAL_CONTRACT_ID: Joi.string().when('NODE_ENV', {
    is: 'openapi',
    then: Joi.optional(),
    otherwise: Joi.required()
  })
    .messages({
      'any.required': 'CREDENTIAL_CONTRACT_ID is required for certificate operations'
    }),
  SIGNER_SECRET_KEY: Joi.string().when('NODE_ENV', {
    is: 'openapi',
    then: Joi.optional(),
    otherwise: Joi.required()
  })
    .messages({
      'any.required': 'SIGNER_SECRET_KEY is required for blockchain transactions'
    }),

  // AWS Configuration (Optional)
  AWS_ACCESS_KEY_ID: Joi.string().optional(),
  AWS_SECRET_ACCESS_KEY: Joi.string().when('AWS_ACCESS_KEY_ID', {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  AWS_S3_REGION: Joi.string().default('us-east-1'),
  AWS_S3_BUCKET: Joi.string().optional(),
  AWS_CLOUDFRONT_DISTRIBUTION_ID: Joi.string().optional(),
  AWS_CLOUDFRONT_DOMAIN: Joi.string().optional(),
  AWS_SIGNED_URL_EXPIRY: Joi.number().min(60).default(3600),

  // Logging Configuration
  LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  LOG_FORMAT: Joi.string().valid('json', 'text').default('json'),
  LOG_FILE_ENABLED: Joi.string().valid('true', 'false').default('false'),
  LOG_FILE_PATH: Joi.string().default('logs/app-%DATE%.log'),
  LOG_FILE_MAX_SIZE: Joi.string().default('20m'),
  LOG_FILE_MAX_FILES: Joi.string().default('14'),
  LOG_CONSOLE_ENABLED: Joi.string().valid('true', 'false').default('true'),
  LOG_CONSOLE_COLORIZE: Joi.string().valid('true', 'false').default('true'),
  LOG_ERROR_FILE_ENABLED: Joi.string().valid('true', 'false').default('false'),
  LOG_ERROR_FILE_PATH: Joi.string().default('logs/error-%DATE%.log'),
  LOG_ERROR_FILE_MAX_SIZE: Joi.string().default('20m'),
  LOG_ERROR_FILE_MAX_FILES: Joi.string().default('30'),

  // Monitoring & Alerting
  SENTRY_ENABLED: Joi.string().valid('true', 'false').default('false'),
  SENTRY_DSN: Joi.string().uri().when('SENTRY_ENABLED', {
    is: 'true',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  SENTRY_TRACES_SAMPLE_RATE: Joi.number().min(0).max(1).default(0.1),
  SENTRY_DEBUG: Joi.string().valid('true', 'false').default('false'),

  // Alerting
  ALERTING_ENABLED: Joi.string().valid('true', 'false').default('false'),
  EMAIL_ALERTS_ENABLED: Joi.string().valid('true', 'false').default('false'),
  EMAIL_ALERT_RECIPIENTS: Joi.string().when('EMAIL_ALERTS_ENABLED', {
    is: 'true',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  SLACK_ALERTS_ENABLED: Joi.string().valid('true', 'false').default('false'),
  SLACK_WEBHOOK_URL: Joi.string().uri().when('SLACK_ALERTS_ENABLED', {
    is: 'true',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),

  // Video Processing
  VIDEO_PROCESSING_ENABLED: Joi.string().valid('true', 'false').default('false'),
  VIDEO_PROCESSING_CONCURRENT_JOBS: Joi.number().min(1).default(2),
  VIDEO_MAX_FILE_SIZE: Joi.number().min(1024).default(5368709120), // 5GB
  VIDEO_MAX_DURATION: Joi.number().min(1).default(7200), // 2 hours
  FFMPEG_PATH: Joi.string().default('/usr/bin/ffmpeg'),
  FFPROBE_PATH: Joi.string().default('/usr/bin/ffprobe'),

  // Backup Configuration
  BACKUP_DIR: Joi.string().default('./backups'),
  BACKUP_RETENTION_DAYS: Joi.number().min(1).default(30),
  BACKUP_MONTHLY_RETENTION_MONTHS: Joi.number().min(1).default(12),
  BACKUP_VERIFICATION_ENABLED: Joi.string().valid('true', 'false').default('true'),

  // OpenTelemetry Tracing
  OTEL_SERVICE_NAME: Joi.string().default('streller-minds-backend'),
  OTEL_COLLECTOR_URL: Joi.string().uri().default('http://localhost:4318/v1/traces'),
  OTEL_EXPORTER: Joi.string().valid('otlp', 'jaeger', 'zipkin').default('jaeger'),
  OTEL_SAMPLER_PROBABILITY: Joi.number().min(0).max(1).default(1.0),
  OTEL_RESOURCE_ATTRIBUTES: Joi.string().default('service.version=1.0'),

  // Payment Processing (Stripe)
  STRIPE_PUBLIC_KEY: Joi.string().when('NODE_ENV', {
    is: Joi.valid('staging', 'production'),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  STRIPE_SECRET_KEY: Joi.string().when('NODE_ENV', {
    is: Joi.valid('staging', 'production'),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  STRIPE_WEBHOOK_SECRET: Joi.string().when('NODE_ENV', {
    is: Joi.valid('staging', 'production'),
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
}).messages({
  'object.unknown': 'Unknown environment variable: {#label}',
});

/**
 * Environment-specific validation schemas
 * For simplicity, we just use the base schema for most environments
 * and handle environment-specific validation through conditional logic
 */
export const environmentValidationSchemas = {
  development: configValidationSchema,
  staging: configValidationSchema,
  production: configValidationSchema,
  test: configValidationSchema,
  openapi: configValidationSchema,
};

/**
 * Get the appropriate validation schema based on environment
 */
export function getValidationSchema(environment: string = process.env.NODE_ENV || 'development') {
  return environmentValidationSchemas[environment] || configValidationSchema;
}

/**
 * Configuration validation options
 */
export const validationOptions: Joi.ValidationOptions = {
  abortEarly: false, // Collect all validation errors
  allowUnknown: false, // Fail on unknown environment variables
  stripUnknown: false, // Don't remove unknown variables
  // Note: presence is not set here, individual schema fields define their own requirements
};
