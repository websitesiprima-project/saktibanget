-- Update status vendor dari "Dalam Kontrak" menjadi "Berkontrak"
-- Jalankan query ini di Supabase SQL Editor

-- Update vendors table
UPDATE vendors 
SET status = 'Berkontrak' 
WHERE status = 'Dalam Kontrak';

-- Update vendor_users table
UPDATE vendor_users 
SET status = 'Berkontrak' 
WHERE status = 'Dalam Kontrak';

-- Verify the changes
SELECT 'vendors' as table_name, status, COUNT(*) as count 
FROM vendors 
GROUP BY status
UNION ALL
SELECT 'vendor_users' as table_name, status, COUNT(*) as count 
FROM vendor_users 
GROUP BY status
ORDER BY table_name, status;
