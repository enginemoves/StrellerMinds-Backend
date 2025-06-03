import { registerAs } from "@nestjs/config";

export default registerAs('database', () => ({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT) || 5432,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    name: process.env.DATABASE_NAME,
    synchronize: process.env.DATABASE_SYNC === 'true' ? 'true' : 'false',
    autoload: process.env.DATABASE_LOAD === 'true' ? 'true' : 'false',
    // Connection Pool Settings
    maxPoolSize: parseInt(process.env.DATABASE_POOL_MAX) || 10,
    minPoolSize: parseInt(process.env.DATABASE_POOL_MIN) || 1,
    poolIdleTimeout: parseInt(process.env.DATABASE_IDLE_TIMEOUT) || 30000,
    // Retry Mechanism
    retryAttempts: parseInt(process.env.DATABASE_RETRY_ATTEMPTS) || 5,
    retryDelay: parseInt(process.env.DATABASE_RETRY_DELAY) || 3000,
}))