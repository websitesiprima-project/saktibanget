-- =====================================================
-- HAPUS 3 AKUN, SISAKAN HANYA konslur.uptmanado@gmail.com
-- =====================================================
-- Akun yang dihapus:
--   1. miftahmanic@gmail.com  (Miftahuddin S Arsyad  - Super Admin)
--   2. mipta@gmail.com        (Miftahuddin S. Arsyad - Super Admin)
--   3. edwardbene07@gmail.com (Edward Benedict       - Admin)
-- =====================================================

-- Langkah 1: Hapus dari tabel profiles (public)
DELETE FROM public.profiles
WHERE email IN (
  'miftahmanic@gmail.com',
  'mipta@gmail.com',
  'edwardbene07@gmail.com'
);

-- Langkah 2: Hapus dari auth.users (membutuhkan service_role / hak admin)
-- Jalankan query berikut di Supabase SQL Editor (sudah punya hak postgres):
DELETE FROM auth.users
WHERE email IN (
  'miftahmanic@gmail.com',
  'mipta@gmail.com',
  'edwardbene07@gmail.com'
);

-- Langkah 3: Verifikasi — harus hanya tersisa konslur
SELECT id, email, full_name, role, status
FROM public.profiles;
