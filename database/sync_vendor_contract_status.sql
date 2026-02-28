-- Update status vendor berdasarkan kontrak yang ada
-- Jalankan query ini di Supabase SQL Editor untuk sync status vendor

-- Step 1: Update vendor yang memiliki kontrak aktif menjadi "Berkontrak"
UPDATE vendors v
SET status = 'Berkontrak'
WHERE v.status != 'Tidak Aktif'  -- Skip vendor yang non-aktif
AND EXISTS (
    SELECT 1 
    FROM contracts c 
    WHERE LOWER(TRIM(c.vendor_name)) = LOWER(TRIM(v.nama))
    AND c.status IN ('Dalam Pekerjaan', 'Telah Diperiksa', 'Terkontrak', 'Dalam Proses Pekerjaan', 'Dalam Pemeriksaan')
);

-- Step 2: Update vendor_users yang memiliki kontrak aktif menjadi "Berkontrak"
UPDATE vendor_users vu
SET status = 'Berkontrak'
WHERE vu.status != 'Tidak Aktif'  -- Skip vendor yang non-aktif
AND EXISTS (
    SELECT 1 
    FROM contracts c 
    WHERE LOWER(TRIM(c.vendor_name)) = LOWER(TRIM(vu.company_name))
    AND c.status IN ('Dalam Pekerjaan', 'Telah Diperiksa', 'Terkontrak', 'Dalam Proses Pekerjaan', 'Dalam Pemeriksaan')
);

-- Step 3: Update vendor yang TIDAK memiliki kontrak aktif menjadi "Aktif"
UPDATE vendors v
SET status = 'Aktif'
WHERE v.status = 'Berkontrak'  -- Hanya ubah yang berkontrak
AND NOT EXISTS (
    SELECT 1 
    FROM contracts c 
    WHERE LOWER(TRIM(c.vendor_name)) = LOWER(TRIM(v.nama))
    AND c.status IN ('Dalam Pekerjaan', 'Telah Diperiksa', 'Terkontrak', 'Dalam Proses Pekerjaan', 'Dalam Pemeriksaan')
);

-- Step 4: Update vendor_users yang TIDAK memiliki kontrak aktif menjadi "Aktif"
UPDATE vendor_users vu
SET status = 'Aktif'
WHERE vu.status = 'Berkontrak'  -- Hanya ubah yang berkontrak
AND NOT EXISTS (
    SELECT 1 
    FROM contracts c 
    WHERE LOWER(TRIM(c.vendor_name)) = LOWER(TRIM(vu.company_name))
    AND c.status IN ('Dalam Pekerjaan', 'Telah Diperiksa', 'Terkontrak', 'Dalam Proses Pekerjaan', 'Dalam Pemeriksaan')
);

-- Verify hasil update
SELECT 
    'vendors' as table_name, 
    status, 
    COUNT(*) as count 
FROM vendors 
GROUP BY status
UNION ALL
SELECT 
    'vendor_users' as table_name, 
    status, 
    COUNT(*) as count 
FROM vendor_users 
GROUP BY status
ORDER BY table_name, status;

-- Detail vendor yang berkontrak
SELECT 
    v.id,
    v.nama as vendor_name,
    v.status,
    COUNT(c.id) as jumlah_kontrak,
    STRING_AGG(c.name || ' (' || c.status || ')', ', ') as daftar_kontrak
FROM vendors v
LEFT JOIN contracts c ON LOWER(TRIM(c.vendor_name)) = LOWER(TRIM(v.nama))
    AND c.status IN ('Dalam Pekerjaan', 'Telah Diperiksa', 'Terkontrak', 'Dalam Proses Pekerjaan', 'Dalam Pemeriksaan')
WHERE v.status = 'Berkontrak'
GROUP BY v.id, v.nama, v.status
ORDER BY v.nama;
