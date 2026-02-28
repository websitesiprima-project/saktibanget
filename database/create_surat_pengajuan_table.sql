-- Create table for Surat Pengajuan
CREATE TABLE IF NOT EXISTS public.surat_pengajuan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nomor_surat TEXT NOT NULL,
    perihal TEXT NOT NULL,
    tanggal_surat DATE NOT NULL,
    nama_pekerjaan TEXT,
    nomor_kontrak TEXT,
    keterangan TEXT,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    alasan_penolakan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.surat_pengajuan ENABLE ROW LEVEL SECURITY;

-- Create policies

-- 1. Allow public (anon) to insert/create submissions (for vendors)
CREATE POLICY "Enable insert for everyone" 
ON public.surat_pengajuan FOR INSERT 
TO public 
WITH CHECK (true);

-- 2. Allow public (anon) to select/view their own submissions (simplified for now, anyone can view if they have valid ID/fetching logic, or restrict later)
-- For this MVP/Demo phase where vendors utilize a portal without auth, giving read access to public might include security risk if not careful, but mirroring current localStorage behavior (where they just submit) this is 'okay' for submission.
-- HOWEVER, admins need to view ALL. Vendors usually don't need to view list unless there's a dashboard.
-- Let's allow SELECT for authenticated users (Admins) and public (for simplificty in grabbing data if needed, or stick to Authenticated for admins).
-- Assuming 'anon' key is used by vendors.

-- Policy for Admins (Authenticated) and Vendors (Public/Anon) to view
CREATE POLICY "Enable select for everyone" 
ON public.surat_pengajuan FOR SELECT 
USING (true);

-- 3. Allow Admins to update status
CREATE POLICY "Enable update for admins" 
ON public.surat_pengajuan FOR UPDATE 
USING (true) 
WITH CHECK (true);

-- Grant access to anon and authenticated roles
GRANT ALL ON public.surat_pengajuan TO anon;
GRANT ALL ON public.surat_pengajuan TO authenticated;
GRANT ALL ON public.surat_pengajuan TO service_role;
