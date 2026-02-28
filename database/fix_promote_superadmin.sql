-- =====================================================
-- FIX: PROMOTE USER TO SUPER ADMIN
-- =====================================================

-- 1. Update role user saya menjadi Super Admin
UPDATE public.profiles
SET role = 'Super Admin'
WHERE id = auth.uid();

-- 2. Verifikasi hasil update
SELECT * FROM profiles WHERE id = auth.uid();
