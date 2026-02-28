-- Migration: Add jabatan column to vendors table
-- Untuk menyimpan jabatan kontak person vendor
-- Safe to run multiple times (uses IF NOT EXISTS)

DO $$ 
BEGIN
    -- Add jabatan column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendors' AND column_name = 'jabatan'
    ) THEN
        ALTER TABLE vendors ADD COLUMN jabatan VARCHAR(100);
    END IF;
END $$;

COMMENT ON COLUMN vendors.jabatan IS 'Jabatan kontak person vendor (akan sync dengan pic_position di vendor_users)';
