-- Quick Fix: Remove UNIQUE constraint from vendors.email
-- Run this in Supabase SQL Editor to fix registration error
-- Error: "duplicate key value violates unique constraint 'vendors_email_key'"

-- Drop the unique constraint on vendors.email
ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_email_key;

-- Verify constraint removed
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'vendors'::regclass 
  AND contype = 'u';  -- 'u' = unique constraint

-- Expected result: vendors_email_key should NOT appear in the list
