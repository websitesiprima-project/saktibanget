-- =====================================================
-- FIX: Infinite Recursion in Profiles RLS Policy
-- =====================================================

-- Masalah:
-- Policy "Super Admin can..." melakukan query ke tabel 'profiles' untuk mengecek role.
-- Query tersebut memicu Policy SELECT 'profiles' kembali.
-- Policy SELECT tersebut juga melakukan query ke 'profiles'.
-- Terjadilah Infinite Recursion (Loop tak terbatas).

-- Solusi:
-- Gunakan function SECURITY DEFINER untuk mengecek role.
-- Function ini akan dijalankan dengan hak akses pembuatnya (database owner),
-- sehingga mem-bypass RLS saat melakukan query 'profiles' di dalamnya.

-- 1. Buat Helper Function (Security Definer)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'Super Admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Hapus Policy yang Bermasalah
DROP POLICY IF EXISTS "Super Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super Admin can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super Admin can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- 3. Buat Ulang Policy dengan Function Baru

-- Policy: SELECT (Read)
-- User biasa bisa baca profil sendiri ATAU Super Admin bisa baca semua
CREATE POLICY "Profiles visibility" 
  ON public.profiles FOR SELECT 
  TO authenticated 
  USING (
    auth.uid() = id OR is_super_admin()
  );

-- Policy: UPDATE
-- User biasa bisa update profil sendiri ATAU Super Admin bisa update semua
CREATE POLICY "Profiles update" 
  ON public.profiles FOR UPDATE 
  TO authenticated 
  USING (
    auth.uid() = id OR is_super_admin()
  );

-- Policy: INSERT
-- Hanya Super Admin yang bisa insert profil baru (selain via trigger registrasi)
CREATE POLICY "Profiles insert" 
  ON public.profiles FOR INSERT 
  TO authenticated 
  WITH CHECK (
    is_super_admin()
  );

-- Policy: DELETE
-- Hanya Super Admin yang bisa delete profil (Opsional, jika dibutuhkan)
-- DROP POLICY IF EXISTS "Profiles delete" ON public.profiles;
-- CREATE POLICY "Profiles delete" 
--   ON public.profiles FOR DELETE 
--   TO authenticated 
--   USING (
--     is_super_admin()
--   );
