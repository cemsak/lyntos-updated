-- LYNTOS Sprint 1: ALTER TABLES
-- Add missing columns to clients and periods tables
-- SQLite doesn't support IF NOT EXISTS for ALTER, so errors are expected if columns exist

-- Add columns to clients table
ALTER TABLE clients ADD COLUMN tax_office TEXT;
ALTER TABLE clients ADD COLUMN company_type TEXT;
ALTER TABLE clients ADD COLUMN address TEXT;
ALTER TABLE clients ADD COLUMN start_date TEXT;

-- Add columns to periods table
ALTER TABLE periods ADD COLUMN period_code TEXT;

-- Note: created_at and updated_at already exist in both tables
