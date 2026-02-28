-- =====================================================
-- Add progress_date & file columns to contract_history
-- For tracking progress date input by user & file uploads
-- =====================================================

-- Add progress_date column - tanggal yang diinput user
ALTER TABLE contract_history 
ADD COLUMN IF NOT EXISTS progress_date TIMESTAMP;

-- Add file_url column - untuk menyimpan URL file yang diupload
ALTER TABLE contract_history 
ADD COLUMN IF NOT EXISTS file_url TEXT;

-- Add file_name column - untuk menyimpan nama file yang diupload
ALTER TABLE contract_history 
ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);

-- Add google_drive_id column - untuk file yang diupload ke Google Drive
ALTER TABLE contract_history 
ADD COLUMN IF NOT EXISTS google_drive_id VARCHAR(255);

-- =====================================================
-- Verify columns added
-- =====================================================
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'contract_history'
ORDER BY ordinal_position;

-- =====================================================
-- Update existing data - Set progress_date from details text
-- Parse "Tanggal: 2025-11-05 08:56" from details
-- =====================================================
-- This is optional - only if you want to backfill existing data

UPDATE contract_history
SET progress_date = 
    CASE 
        WHEN details LIKE '%Tanggal: %' THEN
            -- Extract date from "Tanggal: 2025-11-05 08:56" format
            TO_TIMESTAMP(
                SUBSTRING(details FROM 'Tanggal: ([0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2})'),
                'YYYY-MM-DD HH24:MI'
            )
        ELSE NULL
    END
WHERE progress_date IS NULL
  AND action LIKE '%Progress Tracker%';

-- =====================================================
-- SUCCESS! ✅
-- =====================================================
-- Columns added:
-- - progress_date: TIMESTAMP for user-input date
-- - file_url: TEXT for uploaded file URL
-- - file_name: VARCHAR for original filename
-- - google_drive_id: VARCHAR for Google Drive file ID
