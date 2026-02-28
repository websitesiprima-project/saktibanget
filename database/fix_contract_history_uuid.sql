-- =====================================================
-- Fix: Contract History Data Type Check
-- =====================================================

-- Problem:
-- contracts.id uses TEXT format like "001/DAN/F47050011/2026"
-- contract_history.contract_id should also be TEXT (not UUID)

-- =====================================================
-- STEP 1: Check current data types
-- =====================================================
SELECT 
    table_name,
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE (table_name = 'contracts' AND column_name = 'id')
   OR (table_name = 'contract_history' AND column_name = 'contract_id');

-- Expected: Both should be TEXT or CHARACTER VARYING
-- NOT UUID - since contract IDs are like "001/DAN/F47050011/2026"

-- =====================================================
-- STEP 2: Simple query to check data
-- =====================================================
SELECT 
    ch.contract_id,
    ch.action,
    ch.progress_date,
    ch.created_at
FROM contract_history ch
LIMIT 5;

-- =====================================================
-- STEP 3: Check progress tracking data
-- =====================================================
SELECT 
    ch.contract_id,
    ch.action,
    COALESCE(ch.progress_date, ch.created_at) as effective_date,
    ch.progress_date as user_input_date,
    ch.created_at as record_created,
    EXTRACT(DAY FROM (NOW() - COALESCE(ch.progress_date, ch.created_at))) as days_old
FROM contract_history ch
WHERE ch.action ILIKE '%Progress Tracker%'
ORDER BY ch.created_at DESC
LIMIT 10;

-- =====================================================
-- NOTE: contract_id format is TEXT like "001/DAN/F47050011/2026"
-- NOT UUID! So DO NOT run UUID conversion.
-- =====================================================
