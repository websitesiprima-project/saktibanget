-- Migration: Add status column to vendor_users table
-- Safe to run multiple times
-- Default status is 'Pending' to require admin approval

DO $$ 
BEGIN
    -- Add status column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendor_users' AND column_name = 'status'
    ) THEN
        ALTER TABLE vendor_users ADD COLUMN status VARCHAR(50) DEFAULT 'Pending';
        RAISE NOTICE 'Column "status" added successfully';
    ELSE
        RAISE NOTICE 'Column "status" already exists';
    END IF;
END $$;

-- Set default status for existing records yang belum punya status
-- Hanya untuk existing records, new records akan otomatis 'Pending'
UPDATE vendor_users 
SET status = 'Pending' 
WHERE status IS NULL 
  AND is_activated = false 
  AND password = 'PENDING_APPROVAL';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_vendor_users_status ON vendor_users(status);

-- Verify
SELECT 'Migration completed' as status;
SELECT id, email, company_name, status FROM vendor_users LIMIT 5;
