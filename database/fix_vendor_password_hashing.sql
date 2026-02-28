-- Script untuk memperbaiki password vendor yang tersimpan sebagai plain text
-- dan mengubahnya menjadi hashed password (SHA-256)
-- 
-- CATATAN PENTING:
-- - Script ini untuk vendor yang password-nya masih plain text dari approval admin
-- - Password akan di-hash menggunakan SHA-256 dengan salt 'sakti_pln_salt'
-- - Setelah menjalankan script ini, vendor TIDAK BISA LOGIN dengan password lama
-- - Admin perlu RESET PASSWORD atau RE-APPROVE vendor tersebut
--
-- PERINGATAN: 
-- Jika password sudah di-hash sebelumnya (panjang 64 karakter hex), 
-- JANGAN jalankan script ini karena akan hash lagi!

-- 1. Cek vendor_users dengan password yang kemungkinan plain text
-- (password length < 64 karakter, hash SHA-256 selalu 64 char)
SELECT 
    id,
    email,
    company_name,
    status,
    LENGTH(password) as password_length,
    password as current_password,
    created_at
FROM vendor_users
WHERE LENGTH(password) < 64
ORDER BY created_at DESC;

-- 2. Untuk memperbaiki password yang plain text, admin perlu:
--    OPSI A: Reset password vendor (lebih aman)
--    OPSI B: Re-approve vendor dari halaman approval (akan generate password baru yang sudah hashed)

-- 3. (TIDAK DIREKOMENDASIKAN) Manual hash semua password plain text
--    Ini akan membuat vendor TIDAK BISA LOGIN sampai admin reset password mereka
/*
UPDATE vendor_users
SET 
    password = encode(digest(password || 'sakti_pln_salt', 'sha256'), 'hex'),
    updated_at = NOW()
WHERE LENGTH(password) < 64
  AND status = 'Aktif';
*/

-- 4. Verify hasil hash
-- Password yang sudah di-hash akan memiliki panjang 64 karakter
SELECT 
    id,
    email,
    company_name,
    LENGTH(password) as password_length,
    CASE 
        WHEN LENGTH(password) = 64 THEN '✓ Hashed'
        ELSE '✗ Plain Text'
    END as password_status
FROM vendor_users
ORDER BY created_at DESC;
