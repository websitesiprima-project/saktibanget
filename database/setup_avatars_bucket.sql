-- =====================================================
-- Setup bucket 'avatars' untuk upload foto profil vendor
-- Jalankan di Supabase SQL Editor
-- =====================================================

-- 1. Buat bucket avatars (skip jika sudah ada)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    2097152, -- 2MB
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Policy: izinkan semua upload (anon + authenticated)
DROP POLICY IF EXISTS "Allow all uploads to avatars" ON storage.objects;
CREATE POLICY "Allow all uploads to avatars"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'avatars');

-- 3. Policy: izinkan semua baca/akses public
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
CREATE POLICY "Public read avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- 4. Policy: izinkan update/overwrite
DROP POLICY IF EXISTS "Allow update avatars" ON storage.objects;
CREATE POLICY "Allow update avatars"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'avatars');
