-- =====================================================
-- FIX RLS FINAL: Infinite Recursion Solution
-- =====================================================

-- 1. Drop existing function and policies to start fresh
DROP FUNCTION IF EXISTS public.is_super_admin() CASCADE;
DROP POLICY IF EXISTS "Profiles visibility" ON public.profiles;
DROP POLICY IF EXISTS "Profiles update" ON public.profiles;
DROP POLICY IF EXISTS "Profiles insert" ON public.profiles;
DROP POLICY IF EXISTS "Super Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super Admin can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super Admin can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- 2. Create Security Definer Function
-- CRITICAL: This function must be owned by a superuser (postgres) to bypass RLS.
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the user has 'Super Admin' role
  -- Using simple EXISTS query
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'Super Admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Force Owner to Postgres (Superuser) to ensure RLS bypass works
ALTER FUNCTION public.is_super_admin() OWNER TO postgres;

-- 4. Create Non-Recursive Policies

-- SELECT: Users see themselves OR Super Admin sees everything
CREATE POLICY "Profiles visibility" 
  ON public.profiles FOR SELECT 
  TO authenticated 
  USING (
    auth.uid() = id OR is_super_admin()
  );

-- UPDATE: Users update themselves OR Super Admin updates everything
CREATE POLICY "Profiles update" 
  ON public.profiles FOR UPDATE 
  TO authenticated 
  USING (
    auth.uid() = id OR is_super_admin()
  );

-- INSERT: Only Super Admin can insert via API (Regular users created via trigger)
CREATE POLICY "Profiles insert" 
  ON public.profiles FOR INSERT 
  TO authenticated 
  WITH CHECK (
    is_super_admin()
  );

-- 5. Verification: Grant permissions just in case
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO service_role;
