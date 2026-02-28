-- Migration: Make password column nullable in vendor_users table
-- Reason: For invitation system, vendors don't have password until account activation
-- Safe to run multiple times

-- Make password column nullable
ALTER TABLE vendor_users ALTER COLUMN password DROP NOT NULL;

-- Add comment explaining the change
COMMENT ON COLUMN vendor_users.password IS 'Hashed password (NULL until account activation via invitation)';

-- Update existing NULL passwords to ensure data integrity
-- (Optional: Only if there are existing records with issues)
-- This is a safety check, not strictly necessary for new records

COMMENT ON TABLE vendor_users IS 'Vendor user accounts - password is NULL until activation via invitation link or claim code';

