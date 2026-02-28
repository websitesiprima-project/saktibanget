-- ========================================
-- QUICK FIX: Update Password untuk edwardbene07@gmail.com
-- ========================================
-- Copy-paste query ini ke Supabase SQL Editor
-- Vendor bisa langsung login dengan password: AA9usskAmwlv
-- ========================================

UPDATE vendor_users
SET password = '5ba35c5ff1315e6bfb9bafba56d0e711ef7f1daf2fd5b5d7410b1501f8f28a51'
WHERE email = 'edwardbene07@gmail.com';

-- ========================================
-- VERIFIKASI (Jalankan setelah UPDATE)
-- ========================================

SELECT 
    email,
    company_name,
    LENGTH(password) as password_length,
    SUBSTRING(password, 1, 30) || '...' as password_hash_preview,
    status,
    is_activated
FROM vendor_users
WHERE email = 'edwardbene07@gmail.com';

-- Expected result:
-- password_length: 64
-- status: Aktif
-- is_activated: true

-- ========================================
-- TEST LOGIN
-- ========================================
-- 1. Buka: http://localhost:3000/vendor-login
-- 2. Email: edwardbene07@gmail.com
-- 3. Password: AA9usskAmwlv
-- 4. Login berhasil! ✅
