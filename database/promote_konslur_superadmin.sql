-- =====================================================
-- PROMOTE USER TO SUPER ADMIN
-- Email: konslur.uptmanado@gmail.com
-- UID  : cda222ce-cd72-4872-85e7-7cfa8034f334
-- =====================================================

-- 1. Upsert profil dengan role Super Admin
-- (akan membuat baris baru jika belum ada, atau update jika sudah ada)
INSERT INTO public.profiles (id, email, full_name, role, status, created_at, updated_at)
VALUES (
  'cda222ce-cd72-4872-85e7-7cfa8034f334',
  'konslur.uptmanado@gmail.com',
  'Konslur UPT Manado',
  'Super Admin',
  'Aktif',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET
  role       = 'Super Admin',
  status     = 'Aktif',
  updated_at = NOW();

-- 2. Verifikasi hasil
SELECT id, email, full_name, role, status
FROM public.profiles
WHERE id = 'cda222ce-cd72-4872-85e7-7cfa8034f334';
