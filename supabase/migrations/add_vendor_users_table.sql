-- Migration: Update vendor_users table for complete vendor portal
-- This migration is SAFE to run multiple times (uses IF NOT EXISTS)
-- Adds all company profile columns to vendor_users table

-- =====================================================
-- Add company profile columns to vendor_users table
-- All vendor data stored in one table
-- =====================================================

DO $$ 
BEGIN
    -- Company Name
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendor_users' AND column_name = 'company_name'
    ) THEN
        ALTER TABLE vendor_users ADD COLUMN company_name VARCHAR(255);
    END IF;
    
    -- Company Type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendor_users' AND column_name = 'company_type'
    ) THEN
        ALTER TABLE vendor_users ADD COLUMN company_type VARCHAR(50) DEFAULT 'PT';
    END IF;
    
    -- Address
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendor_users' AND column_name = 'address'
    ) THEN
        ALTER TABLE vendor_users ADD COLUMN address TEXT;
    END IF;
    
    -- City
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendor_users' AND column_name = 'city'
    ) THEN
        ALTER TABLE vendor_users ADD COLUMN city VARCHAR(100);
    END IF;
    
    -- Province
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendor_users' AND column_name = 'province'
    ) THEN
        ALTER TABLE vendor_users ADD COLUMN province VARCHAR(100);
    END IF;
    
    -- Postal Code
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendor_users' AND column_name = 'postal_code'
    ) THEN
        ALTER TABLE vendor_users ADD COLUMN postal_code VARCHAR(10);
    END IF;
    
    -- Phone
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendor_users' AND column_name = 'phone'
    ) THEN
        ALTER TABLE vendor_users ADD COLUMN phone VARCHAR(50);
    END IF;
    
    -- Fax
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendor_users' AND column_name = 'fax'
    ) THEN
        ALTER TABLE vendor_users ADD COLUMN fax VARCHAR(50);
    END IF;
    
    -- PIC Name
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendor_users' AND column_name = 'pic_name'
    ) THEN
        ALTER TABLE vendor_users ADD COLUMN pic_name VARCHAR(255);
    END IF;
    
    -- PIC Position
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendor_users' AND column_name = 'pic_position'
    ) THEN
        ALTER TABLE vendor_users ADD COLUMN pic_position VARCHAR(100);
    END IF;
    
    -- PIC Phone
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendor_users' AND column_name = 'pic_phone'
    ) THEN
        ALTER TABLE vendor_users ADD COLUMN pic_phone VARCHAR(50);
    END IF;
    
    -- PIC Email
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendor_users' AND column_name = 'pic_email'
    ) THEN
        ALTER TABLE vendor_users ADD COLUMN pic_email VARCHAR(255);
    END IF;
    
    -- NPWP
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendor_users' AND column_name = 'npwp'
    ) THEN
        ALTER TABLE vendor_users ADD COLUMN npwp VARCHAR(50);
    END IF;
    
    -- SIUP
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendor_users' AND column_name = 'siup'
    ) THEN
        ALTER TABLE vendor_users ADD COLUMN siup VARCHAR(100);
    END IF;
    
    -- TDP
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendor_users' AND column_name = 'tdp'
    ) THEN
        ALTER TABLE vendor_users ADD COLUMN tdp VARCHAR(100);
    END IF;
    
    -- Established (Year)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendor_users' AND column_name = 'established'
    ) THEN
        ALTER TABLE vendor_users ADD COLUMN established INTEGER;
    END IF;
END $$;

-- =====================================================
-- Create indexes for performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_vendor_users_email ON vendor_users(email);
CREATE INDEX IF NOT EXISTS idx_vendor_users_company_name ON vendor_users(company_name);

-- =====================================================
-- Verify migration
-- =====================================================

-- Check vendor_users table exists
SELECT 'vendor_users table exists' as status, COUNT(*) as row_count 
FROM vendor_users;

-- Check all columns in vendor_users table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'vendor_users'
ORDER BY ordinal_position;
