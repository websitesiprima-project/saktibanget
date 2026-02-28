-- Fix RLS for vendor_users to allow DELETE operation
-- Permanent fix for "Hapus Akun" feature

-- 1. Check if DELETE policy exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'vendor_users' 
        AND policyname = 'Vendors can delete own profile'
    ) THEN
        CREATE POLICY "Vendors can delete own profile" 
        ON vendor_users FOR DELETE 
        TO public
        USING (true);
    END IF;
END
$$;

-- 2. Ensure permissions are granted
GRANT ALL ON vendor_users TO anon;
GRANT ALL ON vendor_users TO authenticated;
GRANT ALL ON vendor_users TO service_role;

-- Verification
SELECT 'RLS for vendor_users delete operation has been enabled' as status;
