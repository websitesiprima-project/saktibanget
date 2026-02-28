-- Migration: Add activation token columns to vendor_users
-- For "Invitation Only" vendor registration system
-- Safe to run multiple times (uses IF NOT EXISTS)

DO $$ 
BEGIN
    -- Activation Token (unique token sent via email)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendor_users' AND column_name = 'activation_token'
    ) THEN
        ALTER TABLE vendor_users ADD COLUMN activation_token VARCHAR(255);
    END IF;
    
    -- Activation Token Expiry
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendor_users' AND column_name = 'activation_token_expires'
    ) THEN
        ALTER TABLE vendor_users ADD COLUMN activation_token_expires TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Is Activated (flag to check if vendor has set password)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendor_users' AND column_name = 'is_activated'
    ) THEN
        ALTER TABLE vendor_users ADD COLUMN is_activated BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Invited By (admin who created the invitation)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendor_users' AND column_name = 'invited_by'
    ) THEN
        ALTER TABLE vendor_users ADD COLUMN invited_by VARCHAR(255);
    END IF;
    
    -- Activated At (when vendor completed activation)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendor_users' AND column_name = 'activated_at'
    ) THEN
        ALTER TABLE vendor_users ADD COLUMN activated_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Create index for faster token lookup
CREATE INDEX IF NOT EXISTS idx_vendor_users_activation_token ON vendor_users(activation_token);

-- Update existing vendors to be marked as activated (for backward compatibility)
UPDATE vendor_users 
SET is_activated = TRUE 
WHERE password IS NOT NULL AND is_activated IS NULL;

COMMENT ON COLUMN vendor_users.activation_token IS 'Unique token sent via email for account activation';
COMMENT ON COLUMN vendor_users.activation_token_expires IS 'Token expiry timestamp (72 hours from creation)';
COMMENT ON COLUMN vendor_users.is_activated IS 'Whether vendor has completed activation (set password)';
COMMENT ON COLUMN vendor_users.invited_by IS 'Admin who created the vendor invitation';
COMMENT ON COLUMN vendor_users.activated_at IS 'Timestamp when vendor completed activation';
