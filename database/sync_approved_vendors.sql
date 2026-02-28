-- Script untuk sinkronisasi akun vendor yang sudah di-approve tapi belum ada di tabel vendors
-- Run script ini untuk memindahkan data dari vendor_users (approved) ke vendors table

-- 1. Cek vendor_users yang sudah approved tapi belum ada di vendors table
SELECT 
    vu.id,
    vu.email,
    vu.company_name,
    vu.status,
    vu.is_activated,
    v.id as vendor_id
FROM vendor_users vu
LEFT JOIN vendors v ON vu.email = v.email
WHERE vu.status = 'Aktif' 
  AND v.id IS NULL
ORDER BY vu.created_at DESC;

-- 2. Insert approved vendor_users ke vendors table (FIXED VERSION with ID generation)
INSERT INTO vendors (
    id,
    nama, 
    alamat, 
    telepon, 
    email, 
    kontak_person, 
    jabatan, 
    npwp,
    status,
    is_claimed,
    claimed_by_user_id,
    claimed_at,
    bank_pembayaran,
    no_rekening,
    nama_rekening,
    created_at,
    updated_at
)
SELECT 
    'VND-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8)) as id,
    COALESCE(vu.company_name, 'Unknown Company') as nama,
    COALESCE(vu.address, '') as alamat,
    COALESCE(vu.pic_phone, '') as telepon,
    vu.email,
    COALESCE(vu.pic_name, '') as nama_pimpinan,
    COALESCE(vu.pic_position, '') as jabatan,
    '' as npwp, -- NPWP kosong untuk self-registration
    'Aktif' as status,
    true as is_claimed,
    vu.id as claimed_by_user_id,
    COALESCE(vu.activated_at, vu.updated_at, vu.created_at) as claimed_at,
    COALESCE(vu.bank_name, '') as bank_pembayaran,
    COALESCE(vu.account_number, '') as no_rekening,
    COALESCE(vu.account_name, '') as nama_rekening,
    vu.created_at,
    NOW() as updated_at
FROM vendor_users vu
LEFT JOIN vendors v ON vu.email = v.email
WHERE vu.status = 'Aktif' 
  AND vu.is_activated = true
  AND v.id IS NULL;

-- 3. Update is_activated = true untuk vendor_users yang statusnya Aktif tapi is_activated masih false
UPDATE vendor_users
SET 
    is_activated = true,
    activated_at = COALESCE(activated_at, updated_at, created_at)
WHERE status = 'Aktif' 
  AND is_activated = false;

-- 4. Verify hasil sync
SELECT 
    'vendor_users' as table_name,
    COUNT(*) as total_approved
FROM vendor_users 
WHERE status = 'Aktif' AND is_activated = true

UNION ALL

SELECT 
    'vendors' as table_name,
    COUNT(*) as total_claimed
FROM vendors 
WHERE is_claimed = true;

-- 5. Cek mapping email antara kedua tabel
SELECT 
    vu.email,
    vu.company_name,
    vu.status as user_status,
    vu.is_activated,
    v.nama as vendor_nama,
    v.status as vendor_status,
    v.is_claimed
FROM vendor_users vu
FULL OUTER JOIN vendors v ON vu.email = v.email
WHERE vu.status = 'Aktif' OR v.status = 'Aktif'
ORDER BY vu.created_at DESC;