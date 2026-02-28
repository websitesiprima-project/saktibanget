-- ========================================
-- FIX VENDOR PASSWORD MANUAL
-- ========================================
-- Script untuk memperbaiki password vendor yang tidak konsisten
-- Gunakan ini jika vendor sudah di-approve tapi tidak bisa login
-- ========================================

-- CARA PAKAI:
-- 1. Cek password vendor yang bermasalah
-- 2. Jika password di database panjangnya < 64 karakter, maka perlu di-hash ulang  
-- 3. Update dengan hash yang benar

-- ========================================
-- STEP 1: CEK PASSWORD VENDOR
-- ========================================
SELECT 
    id,
    email, 
    company_name,
    LENGTH(password) as password_length,
    SUBSTRING(password, 1, 20) || '...' as password_preview,
    status,
    is_activated
FROM vendor_users
WHERE email = 'edwardbene07@gmail.com';

-- NOTE: 
-- - Jika password_length = 64 → sudah hash SHA-256 ✅
-- - Jika password_length < 64 → masih plain text atau hash tidak benar ❌

-- ========================================
-- STEP 2: OPTION A - RESET PASSWORD VENDOR
-- ========================================
-- **RECOMMENDED**: Biarkan vendor reset password sendiri melalui "Lupa Password"
-- Ini lebih aman dan memastikan vendor yang mengontrol password mereka

-- ========================================
-- STEP 3: OPTION B - HASH ULANG PASSWORD DARI EMAIL
-- ========================================
-- HANYA GUNAKAN INI JIKA PASSWORD DI EMAIL MASIH TERSIMPAN!
--
-- Contoh: Password di email adalah "AA9usskAmwlv"
-- Hash dengan Node.js atau crypto-js:
--
-- CARA HASH (gunakan Node.js atau browser console):
-- ```javascript
-- const CryptoJS = require('crypto-js');
-- const password = 'AA9usskAmwlv';  // Password dari email
-- const salt = 'sakti_pln_salt';    // Default salt
-- const hash = CryptoJS.SHA256(password + salt).toString(CryptoJS.enc.Hex);
-- console.log(hash);
-- // Output: [64 character hex string]
-- ```
--
-- Kemudian update database:
-- UPDATE vendor_users
-- SET password = '[hash dari hasil di atas]'
-- WHERE email = 'edwardbene07@gmail.com';

-- ========================================
-- STEP 4: OPTION C - GENERATE PASSWORD BARU
-- ========================================
-- Generate password baru untuk vendor dan kirim via email manual

-- 1. Generate hash untuk password baru
-- Contoh password baru: 'NewPassword123'
-- Hash dengan crypto-js (gunakan Node.js script atau browser):
-- const newPassword = 'NewPassword123';
-- const hash = CryptoJS.SHA256(newPassword + 'sakti_pln_salt').toString(CryptoJS.enc.Hex);

-- 2. Update database
-- UPDATE vendor_users
-- SET password = '[hash dari step 1]'
-- WHERE email = 'edwardbene07@gmail.com';

-- 3. Kirim email manual ke vendor dengan password: 'NewPassword123'

-- ========================================
-- STEP 5: VERIFIKASI
-- ========================================
-- Cek apakah password sudah ter-update dengan benar
SELECT 
    email,
    company_name,
    LENGTH(password) as password_length,
    SUBSTRING(password, 1, 20) || '...' as password_preview,
    status,
    is_activated,
    updated_at
FROM vendor_users  
WHERE email = 'edwardbene07@gmail.com';

-- Password length harus 64 karakter (SHA-256 hash)

-- ========================================
-- ALTERNATIF: RE-APPROVE VENDOR (PALING MUDAH)
-- ========================================
-- Cara termudah adalah:
-- 1. Login sebagai Admin
-- 2. Buka halaman "Approval Akun Vendor"
-- 3. Hapus vendor atau ubah status ke 'Pending'
-- 4. Approve ulang vendor
-- 5. Password baru akan otomatis di-hash dengan benar dan dikirim via email

-- Untuk mengubah status ke Pending:
-- UPDATE vendor_users
-- SET status = 'Pending',
--     is_activated = false,
--     password = NULL
-- WHERE email = 'edwardbene07@gmail.com';

-- Kemudian approve ulang dari dashboard admin

-- ========================================
-- NOTES
-- ========================================
-- ✅ Setelah fix, vendor harus bisa login dengan password dari email
-- ✅ Pastikan tidak ada typo saat copy-paste password dari email
-- ✅ Password bersifat case-sensitive
-- ✅ Tidak ada spasi di awal/akhir password
