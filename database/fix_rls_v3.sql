-- =====================================================
-- FIX RLS V3: Safe & Simple
-- =====================================================

-- 1. Reset Policies
DROP FUNCTION IF EXISTS public.is_super_admin() CASCADE;
DROP POLICY IF EXISTS "Profiles visibility" ON public.profiles;
DROP POLICY IF EXISTS "Profiles update" ON public.profiles;
DROP POLICY IF EXISTS "Profiles insert" ON public.profiles;
DROP POLICY IF EXISTS "Self Update" ON public.profiles;
DROP POLICY IF EXISTS "Self Select" ON public.profiles;
-- Drop legacy policies by name just in case
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super Admin can update profiles" ON public.profiles;

-- 2. Create Security Definer Function (Without forcing Owner)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the user has 'Super Admin' role
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'Super Admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create SIMPLE "Self" Policies FIRST
-- These allow users to interact with their OWN data guaranteed.

CREATE POLICY "Self Select" 
  ON public.profiles FOR SELECT 
  TO authenticated 
  USING ( auth.uid() = id );

CREATE POLICY "Self Update" 
  ON public.profiles FOR UPDATE 
  TO authenticated 
  USING ( auth.uid() = id );

-- 4. Create "Super Admin" Policies (Combined)
-- These extend access for Super Admins

CREATE POLICY "Super Admin Select All" 
  ON public.profiles FOR SELECT 
  TO authenticated 
  USING ( is_super_admin() );

CREATE POLICY "Super Admin Update All" 
  ON public.profiles FOR UPDATE 
  TO authenticated 
  USING ( is_super_admin() );

CREATE POLICY "Super Admin Insert" 
  ON public.profiles FOR INSERT 
  TO authenticated 
  WITH CHECK ( is_super_admin() );

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO service_role;
