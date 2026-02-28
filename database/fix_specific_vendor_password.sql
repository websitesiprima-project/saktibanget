-- Script untuk memperbaiki password vendor yang masih plain text
-- di tabel vendor_users secara manual

-- 1. UPDATE password untuk vendor edwardbene07@gmail.com
-- Password asli: 07Mei2005!
-- Password yang akan di-hash: 07Mei2005!

UPDATE vendor_users
SET 
    password = encode(digest('07Mei2005!' || 'sakti_pln_salt', 'sha256'), 'hex'),
    updated_at = NOW()
WHERE email = 'edwardbene07@gmail.com';

-- 2. Verify hasil update
SELECT 
    email,
    LENGTH(password) as password_length,
    CASE 
        WHEN LENGTH(password) = 64 THEN '✓ Hashed'
        ELSE '✗ Plain Text'
    END as password_status,
    updated_at
FROM vendor_users
WHERE email = 'edwardbene07@gmail.com';

-- 3. (OPSIONAL) Update semua password plain text lainnya
-- HATI-HATI: Ini akan membuat semua vendor dengan password plain text tidak bisa login
-- sampai mereka reset password lagi

/*
UPDATE vendor_users
SET 
    password = encode(digest(password || 'sakti_pln_salt', 'sha256'), 'hex'),
    updated_at = NOW()
WHERE LENGTH(password) < 64
  AND status = 'Aktif';
*/

-- 4. Cek semua vendor dengan password status
SELECT 
    email,
    company_name,
    status,
    LENGTH(password) as password_length,
    CASE 
        WHEN LENGTH(password) = 64 THEN '✓ Hashed'
        ELSE '✗ Plain Text'
    END as password_status
FROM vendor_users
ORDER BY updated_at DESC;