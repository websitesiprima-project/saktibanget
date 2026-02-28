-- =====================================================
-- Update vendor_users Table Structure
-- =====================================================
-- This script:
-- 1. Adds bank payment information fields
-- 2. Removes unused fields (city, province, postal_code, phone, fax, npwp, siup, tdp, established)

-- =====================================================
-- Step 1: Add Bank Payment Fields
-- =====================================================

-- Add bank_name column
ALTER TABLE vendor_users 
ADD COLUMN IF NOT EXISTS bank_name character varying(255);

-- Add account_number column
ALTER TABLE vendor_users 
ADD COLUMN IF NOT EXISTS account_number character varying(50);

-- Add account_name column
ALTER TABLE vendor_users 
ADD COLUMN IF NOT EXISTS account_name character varying(255);

-- Add certificate_url column for storing uploaded certificate
ALTER TABLE vendor_users 
ADD COLUMN IF NOT EXISTS certificate_url text;

-- Add certificate_type column (VRS, TDR, or DPT)
ALTER TABLE vendor_users 
ADD COLUMN IF NOT EXISTS certificate_type character varying(10);

-- Add comments for documentation
COMMENT ON COLUMN vendor_users.bank_name IS 'Nama bank untuk pembayaran vendor (e.g., Bank Mandiri, BCA, BRI)';
COMMENT ON COLUMN vendor_users.account_number IS 'Nomor rekening bank vendor';
COMMENT ON COLUMN vendor_users.account_name IS 'Nama pemilik rekening bank (biasanya sama dengan nama perusahaan)';
COMMENT ON COLUMN vendor_users.certificate_url IS 'URL file sertifikat vendor (VRS/TDR/DPT) yang diupload saat registrasi';
COMMENT ON COLUMN vendor_users.certificate_type IS 'Jenis sertifikat: VRS (Vendor Registration), TDR (Tanda Daftar Rekanan), atau DPT';

-- =====================================================
-- Step 2: Remove Unused Fields
-- =====================================================

-- Remove city column (now part of address field)
ALTER TABLE vendor_users 
DROP COLUMN IF EXISTS city;

-- Remove province column (now part of address field)
ALTER TABLE vendor_users 
DROP COLUMN IF EXISTS province;

-- Remove postal_code column (now part of address field)
ALTER TABLE vendor_users 
DROP COLUMN IF EXISTS postal_code;

-- Remove phone column (using pic_phone instead)
ALTER TABLE vendor_users 
DROP COLUMN IF EXISTS phone;

-- Remove fax column (not needed)
ALTER TABLE vendor_users 
DROP COLUMN IF EXISTS fax;

-- Remove npwp column (not needed)
ALTER TABLE vendor_users 
DROP COLUMN IF EXISTS npwp;

-- Remove siup column (not needed)
ALTER TABLE vendor_users 
DROP COLUMN IF EXISTS siup;

-- Remove tdp column (not needed)
ALTER TABLE vendor_users 
DROP COLUMN IF EXISTS tdp;

-- Remove established column (not needed)
ALTER TABLE vendor_users 
DROP COLUMN IF EXISTS established;

-- =====================================================
-- Step 3: Verify Changes
-- =====================================================

-- Verify the new columns were added
SELECT 'New Bank Fields:' as section;
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_name = 'vendor_users' 
AND column_name IN ('bank_name', 'account_number', 'account_name')
ORDER BY ordinal_position;

-- Verify all current columns
SELECT 'All Current Fields:' as section;
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_name = 'vendor_users'
ORDER BY ordinal_position;
