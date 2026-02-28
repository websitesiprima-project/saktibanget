-- =====================================================
-- Migration: Add Unique Constraints untuk Vendor
-- Mencegah duplikasi nama dan email vendor
-- =====================================================
-- 
-- CATATAN: Migration ini OPSIONAL
-- Validasi duplikasi sudah ditangani di level aplikasi
-- Gunakan migration ini hanya jika ingin enforcement ketat di level database
-- 
-- PERINGATAN: 
-- - Pastikan tidak ada data duplikat sebelum menjalankan migration ini
-- - Jika ada duplikat, hapus atau update terlebih dahulu
-- 
-- =====================================================

-- Cek duplikasi nama vendor sebelum menambahkan constraint
SELECT nama, COUNT(*) as jumlah
FROM vendors
GROUP BY nama
HAVING COUNT(*) > 1;

-- Jika query di atas mengembalikan hasil, berarti ada duplikasi
-- Hapus atau update duplikat tersebut sebelum melanjutkan

-- Cek duplikasi email vendor
SELECT email, COUNT(*) as jumlah
FROM vendors
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1;

-- =====================================================
-- UNCOMMENT BARIS DI BAWAH INI HANYA JIKA:
-- 1. Tidak ada duplikasi nama dan email di data existing
-- 2. Ingin enforcement ketat di level database
-- =====================================================

-- Tambahkan UNIQUE constraint untuk nama vendor
-- ALTER TABLE vendors
-- ADD CONSTRAINT vendors_nama_unique UNIQUE (nama);

-- CATATAN: Email sudah memiliki UNIQUE constraint di schema awal
-- Jika belum ada, uncomment baris berikut:
-- ALTER TABLE vendors
-- ADD CONSTRAINT vendors_email_unique UNIQUE (email);

-- =====================================================
-- Untuk menghapus constraint (jika diperlukan):
-- =====================================================
-- ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_nama_unique;
-- ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_email_unique;

-- =====================================================
-- Verifikasi constraint yang sudah ditambahkan:
-- =====================================================
-- SELECT constraint_name, constraint_type
-- FROM information_schema.table_constraints
-- WHERE table_name = 'vendors'
-- AND constraint_type = 'UNIQUE';
