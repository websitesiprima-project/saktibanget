-- =====================================================
-- DEBUG SCRIPT: CEK STATUS RLS & DATA PROFILE
-- =====================================================

-- 1. Cek apakah RLS aktif di tabel profiles (relrowsecurity: true = aktif, false = mati)
SELECT 
    relname as table_name, 
    relrowsecurity as rls_enabled 
FROM pg_class 
WHERE relname = 'profiles';

-- 2. Cek Policy apa saja yang ada di tabel profiles
SELECT 
    polname as policy_name, 
    polcmd as command_type, 
    polroles as roles
FROM pg_policy 
WHERE polrelid = 'public.profiles'::regclass;

-- 3. Cek apakah User ID yang error itu ADANYA di database
-- ID diambil dari error log user: 09c52028-6ec1-4471-b050-5c9ca4797715
SELECT * 
FROM profiles 
WHERE id = '09c52028-6ec1-4471-b050-5c9ca4797715';

-- 4. Cek apakah ada profil ganda atau error lain
SELECT count(*) as total_profiles FROM profiles;
