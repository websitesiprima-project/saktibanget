-- Sinkronisasi status is_claimed di tabel vendors berdasarkan vendor_users yang sudah aktivasi
-- Jalankan script ini untuk memperbaiki vendor yang sudah mengklaim aktivasi tapi statusnya masih "Belum diklaim"

-- Update is_claimed = true di tabel vendors jika vendor dengan email yang sama sudah is_activated = true di vendor_users
UPDATE vendors v
SET 
    is_claimed = true,
    claimed_at = vu.activated_at,
    claimed_by_user_id = vu.id,
    status = 'Aktif',
    updated_at = NOW()
FROM vendor_users vu
WHERE 
    v.email = vu.email 
    AND vu.is_activated = true
    AND v.is_claimed = false;

-- Tampilkan hasil update
SELECT 
    v.id,
    v.nama,
    v.email,
    v.is_claimed,
    v.claimed_at,
    v.status,
    vu.is_activated as user_activated,
    vu.activated_at as user_activated_at
FROM vendors v
LEFT JOIN vendor_users vu ON v.email = vu.email
WHERE vu.is_activated = true
ORDER BY v.created_at DESC;
