-- Complete Storage Setup for vendor-profiles bucket
-- Run this AFTER creating the bucket in Supabase Dashboard

-- Step 1: Drop existing policies if any
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow user update own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow user delete own files" ON storage.objects;

-- Step 2: Create permissive policies for vendor-profiles bucket

-- Allow ANYONE to read files (public access)
CREATE POLICY "Allow public read access to vendor-profiles"
ON storage.objects FOR SELECT
USING ( bucket_id = 'vendor-profiles' );

-- Allow ANYONE to upload (for development - no auth check)
CREATE POLICY "Allow anyone to upload to vendor-profiles"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'vendor-profiles' );

-- Allow ANYONE to update files
CREATE POLICY "Allow anyone to update vendor-profiles"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'vendor-profiles' );

-- Allow ANYONE to delete files
CREATE POLICY "Allow anyone to delete vendor-profiles"
ON storage.objects FOR DELETE
USING ( bucket_id = 'vendor-profiles' );

-- Step 3: Verify policies created
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%vendor-profiles%';

-- Expected result: Should show 4 policies for SELECT, INSERT, UPDATE, DELETE

-- Note: For production, replace "anyone" policies with proper authentication checks
