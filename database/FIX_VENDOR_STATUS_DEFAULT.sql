-- =====================================================
-- FIX: Ubah Default Status Vendor dari 'Aktif' ke 'Pending'
-- =====================================================
-- Problem: Vendor baru yang mendaftar langsung mendapat status 'Aktif'
--          padahal seharusnya 'Pending' menunggu approval admin
-- Solution: Ubah DEFAULT value kolom status ke 'Pending'
-- =====================================================

-- 1. Ubah DEFAULT value kolom status menjadi 'Pending'
ALTER TABLE vendor_users 
  ALTER COLUMN status SET DEFAULT 'Pending';

-- 2. Fix vendor yang sudah terlanjur status 'Aktif' tapi belum di-approve
-- (password masih 'PENDING_APPROVAL' berarti belum diapprove admin)
UPDATE vendor_users 
SET status = 'Pending',
    is_activated = false
WHERE password = 'PENDING_APPROVAL' 
  AND status = 'Aktif';

-- 3. Verifikasi perubahan DEFAULT value
SELECT 
  column_name, 
  column_default, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'vendor_users' 
  AND column_name = 'status';

-- 4. Lihat hasil fix
SELECT id, email, company_name, status, is_activated, password
FROM vendor_users
ORDER BY created_at DESC;

-- =====================================================
-- Catatan:
-- - Vendor dengan password 'PENDING_APPROVAL' = belum diapprove admin
-- - Vendor yang sudah diapprove admin statusnya 'Aktif' dan password sudah di-hash
-- - Perubahan DEFAULT hanya mempengaruhi INSERT data BARU
-- =====================================================

SELECT '✅ Fix berhasil! Vendor baru akan otomatis status Pending' as result;
