-- =====================================================
-- DEBUG ROLE & VISIBILITY
-- =====================================================

-- 1. Cek User Saya itu siapa dan Role-nya apa
SELECT id, email, role, status 
FROM profiles 
WHERE id = auth.uid();

-- 2. Cek apakah fungsi is_super_admin() mengembalikan TRUE/FALSE
-- Ini penting untuk memastikan RLS Policy 'Super Admin' bisa jalan
SELECT public.is_super_admin() as am_i_super_admin;

-- 3. Cek ada berapa user di database
SELECT count(*) as total_users FROM profiles;

-- 4. Cek semua user (jika bisa dilihat)
-- Jika ini kosong, berarti RLS Policy masih memblokir
SELECT id, email, role FROM profiles;
