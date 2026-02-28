-- Script untuk membersihkan data orphaned di vendor_users
-- (vendor_users yang tidak punya pasangan di tabel vendors)
-- Jalankan ini jika ada data vendor_users yang tidak sinkron dengan tabel vendors

-- 1. Cek vendor_users yang tidak punya vendor di tabel vendors
SELECT 
    vu.id,
    vu.email,
    vu.company_name,
    vu.status,
    vu.is_activated,
    vu.created_at
FROM vendor_users vu
LEFT JOIN vendors v ON vu.email = v.email
WHERE v.id IS NULL
ORDER BY vu.created_at DESC;

-- 2. (OPSIONAL) Hapus vendor_users yang tidak punya vendor di tabel vendors
-- HATI-HATI: Hanya jalankan jika yakin data ini memang orphaned/tidak terpakai
/*
DELETE FROM vendor_users
WHERE id IN (
    SELECT vu.id
    FROM vendor_users vu
    LEFT JOIN vendors v ON vu.email = v.email
    WHERE v.id IS NULL
);
*/

-- 3. Cek vendors yang tidak punya vendor_users (belum diklaim/aktivasi)
SELECT 
    v.id,
    v.nama,
    v.email,
    v.is_claimed,
    v.status,
    v.created_at
FROM vendors v
LEFT JOIN vendor_users vu ON v.email = vu.email
WHERE vu.id IS NULL
ORDER BY v.created_at DESC;
