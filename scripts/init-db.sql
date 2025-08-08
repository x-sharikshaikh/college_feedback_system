-- Create role 'feedback' if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'feedback') THEN
    CREATE ROLE feedback WITH LOGIN PASSWORD 'feedback';
  END IF;
END $$;

-- Create database 'feedback' owned by 'feedback' if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'feedback') THEN
    CREATE DATABASE feedback OWNER feedback;
  END IF;
END $$;
