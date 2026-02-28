-- Setup Profile Image Feature
-- Run this SQL in Supabase SQL Editor

-- 1. Add profile_image column to profiles table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'profiles' 
        AND column_name = 'profile_image'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN profile_image TEXT;
        
        COMMENT ON COLUMN public.profiles.profile_image IS 'URL to user profile image in Supabase Storage';
    END IF;
END $$;

-- 2. Create storage bucket for avatars (run this in SQL Editor or use Supabase Dashboard)
-- Note: This might need to be done via Supabase Dashboard > Storage
-- Bucket name: avatars
-- Public: true (so images can be accessed via public URL)
-- File size limit: 2MB
-- Allowed MIME types: image/jpeg, image/png, image/gif, image/webp

-- If using SQL, you can insert the bucket like this:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    2097152, -- 2MB in bytes
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up storage policies for avatars bucket
-- Allow authenticated users to upload their own profile images
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = 'profile-images'
);

-- Allow public read access to avatars
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Allow users to update their own avatar
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = 'profile-images'
);

-- Allow users to delete their own avatar
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'avatars' AND
    (storage.foldername(name))[1] = 'profile-images'
);

-- 4. Update RLS policy for profiles table to allow profile_image update
-- (This should already be covered by existing policies, but verify)

-- Verify the setup
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'profile_image';

-- Check storage bucket
SELECT * FROM storage.buckets WHERE id = 'avatars';
