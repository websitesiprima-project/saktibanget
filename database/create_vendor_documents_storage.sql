-- =====================================================
-- Create Storage Bucket for Vendor Documents
-- =====================================================
-- This script creates a storage bucket for vendor certificates (VRS/TDR/DPT)
-- Run this in Supabase SQL Editor

-- Create storage bucket for vendor documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'vendor-documents',
  'vendor-documents',
  true,  -- Public access untuk download
  5242880,  -- 5MB limit
  ARRAY['application/pdf']  -- Only PDF files
)
ON CONFLICT (id) DO NOTHING;

-- Set storage policy to allow authenticated users to upload
CREATE POLICY "Vendor can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vendor-documents');

-- Allow public read access
CREATE POLICY "Public can read vendor documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'vendor-documents');

-- Allow vendor to update their own documents
CREATE POLICY "Vendor can update own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'vendor-documents');

-- Allow vendor to delete their own documents
CREATE POLICY "Vendor can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vendor-documents');
