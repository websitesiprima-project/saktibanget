-- Create vendor-profiles bucket for storing vendor profile images
-- This SQL creates the bucket programmatically

-- Insert the bucket into storage.buckets table
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vendor-profiles',
  'vendor-profiles', 
  true,  -- Make bucket public
  2097152,  -- 2MB file size limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']  -- Allowed image types
)
ON CONFLICT (id) DO NOTHING;

-- Verify bucket was created
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'vendor-profiles';
