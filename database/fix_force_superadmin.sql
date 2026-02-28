-- =====================================================
-- FIX: FORCE PROMOTE SUPER ADMIN (HARDCODED ID)
-- =====================================================

-- Script ini secara KHUSUS mengangkat User ID anda menjadi Super Admin.
-- ID: 09c52028-6ec1-4471-b050-5c9ca4797715

UPDATE public.profiles
SET role = 'Super Admin'
WHERE id = '09c52028-6ec1-4471-b050-5c9ca4797715';

-- Verifikasi hasil (pastikan role sudah 'Super Admin')
SELECT id, email, role 
FROM profiles 
WHERE id = '09c52028-6ec1-4471-b050-5c9ca4797715';
