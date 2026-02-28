-- Quick Fix: Disable RLS on Supabase Storage for development
-- Run this in Supabase SQL Editor to allow file uploads

-- Disable RLS for storage.objects table
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- Disable RLS for storage.buckets table
ALTER TABLE storage.buckets DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'storage' 
  AND tablename IN ('objects', 'buckets');

-- Expected result: rowsecurity should be 'false' for both tables

-- Note: This is for DEVELOPMENT ONLY
-- For production, enable RLS and create proper policies
