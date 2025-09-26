-- Database initialization script for StrellerMinds development
-- This script runs when the PostgreSQL container starts for the first time

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create additional schemas if needed
-- CREATE SCHEMA IF NOT EXISTS analytics;
-- CREATE SCHEMA IF NOT EXISTS audit;

-- Set timezone
SET timezone = 'UTC';

-- Create a development user (optional)
-- DO $$
-- BEGIN
--     IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'strellerminds_dev') THEN
--         CREATE ROLE strellerminds_dev WITH LOGIN PASSWORD 'dev_password';
--         GRANT ALL PRIVILEGES ON DATABASE strellerminds_dev TO strellerminds_dev;
--     END IF;
-- END
-- $$;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'StrellerMinds development database initialized successfully';
END
$$;
