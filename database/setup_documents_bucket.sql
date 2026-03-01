-- =====================================================
-- Setup bucket 'documents' untuk upload surat pengajuan vendor
-- Jalankan di Supabase SQL Editor
-- =====================================================

-- 1. Buat bucket documents (skip jika sudah ada)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents',
    'documents',
    true,
    5242880, -- 5MB
    ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Policy: izinkan semua upload (anon + authenticated)
DROP POLICY IF EXISTS "Allow all uploads to documents" ON storage.objects;
CREATE POLICY "Allow all uploads to documents"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'documents');

-- 3. Policy: izinkan semua baca/akses public
DROP POLICY IF EXISTS "Public read documents" ON storage.objects;
CREATE POLICY "Public read documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'documents');

-- 4. Policy: izinkan update/overwrite
DROP POLICY IF EXISTS "Allow update documents" ON storage.objects;
CREATE POLICY "Allow update documents"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'documents');

-- 5. Policy: izinkan delete
DROP POLICY IF EXISTS "Allow delete documents" ON storage.objects;
CREATE POLICY "Allow delete documents"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'documents');
