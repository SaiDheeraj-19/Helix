-- Helix — PostgreSQL Initialization Script
-- Runs once when the container is first created.

-- Enable useful extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";     -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- Trigram search
CREATE EXTENSION IF NOT EXISTS "unaccent";     -- Accent-insensitive search
CREATE EXTENSION IF NOT EXISTS "btree_gin";    -- GIN indexes on basic types

-- Create a read-only reporting role (for analytics queries)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'helix_readonly') THEN
        CREATE ROLE helix_readonly;
    END IF;
END
$$;

GRANT CONNECT ON DATABASE helix TO helix_readonly;
GRANT USAGE ON SCHEMA public TO helix_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO helix_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO helix_readonly;
