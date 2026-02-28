-- Migration: Add claim code system to vendors table
-- Untuk sistem aktivasi vendor dengan kode unik
-- Safe to run multiple times (uses IF NOT EXISTS)

-- =====================================================
-- Tambah kolom baru ke tabel vendors untuk claim code
-- =====================================================
DO $$ 
BEGIN
    -- Claim Code (kode unik 6 digit untuk aktivasi)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendors' AND column_name = 'claim_code'
    ) THEN
        ALTER TABLE vendors ADD COLUMN claim_code VARCHAR(10) UNIQUE;
    END IF;
    
    -- Is Claimed (status apakah sudah diaktivasi/diklaim vendor)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendors' AND column_name = 'is_claimed'
    ) THEN
        ALTER TABLE vendors ADD COLUMN is_claimed BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Claimed By User ID (ID user yang mengklaim vendor ini)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendors' AND column_name = 'claimed_by_user_id'
    ) THEN
        ALTER TABLE vendors ADD COLUMN claimed_by_user_id INTEGER;
    END IF;
    
    -- Claimed At (waktu klaim)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendors' AND column_name = 'claimed_at'
    ) THEN
        ALTER TABLE vendors ADD COLUMN claimed_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- NPWP
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendors' AND column_name = 'npwp'
    ) THEN
        ALTER TABLE vendors ADD COLUMN npwp VARCHAR(50);
    END IF;
    
    -- Created By (admin yang membuat data vendor)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendors' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE vendors ADD COLUMN created_by VARCHAR(255);
    END IF;
    
    -- Jabatan (jabatan kontak person, sync dengan pic_position di vendor_users)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendors' AND column_name = 'jabatan'
    ) THEN
        ALTER TABLE vendors ADD COLUMN jabatan VARCHAR(100);
    END IF;
END $$;

-- Create index for faster claim code lookup
CREATE INDEX IF NOT EXISTS idx_vendors_claim_code ON vendors(claim_code);

-- Update existing vendors without claim code
UPDATE vendors 
SET is_claimed = TRUE 
WHERE is_claimed IS NULL AND email IS NOT NULL AND email != '';

COMMENT ON COLUMN vendors.claim_code IS 'Kode unik 6 digit untuk aktivasi vendor';
COMMENT ON COLUMN vendors.is_claimed IS 'Status apakah vendor sudah mengklaim/aktivasi akun';
COMMENT ON COLUMN vendors.claimed_by_user_id IS 'ID user di vendor_users yang mengklaim';
COMMENT ON COLUMN vendors.claimed_at IS 'Timestamp saat vendor diklaim';
COMMENT ON COLUMN vendors.npwp IS 'Nomor NPWP perusahaan';
COMMENT ON COLUMN vendors.created_by IS 'Admin yang membuat data vendor';
COMMENT ON COLUMN vendors.jabatan IS 'Jabatan kontak person vendor (sync dengan pic_position di vendor_users)';
