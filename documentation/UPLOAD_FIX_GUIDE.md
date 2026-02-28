# ⚡ Quick Fix - Upload Foto Error

## Error: "new row violates row-level security policy"

### ✅ Solusi Step-by-Step

#### STEP 1: Pastikan Bucket Sudah Dibuat
1. Buka Supabase Dashboard → **Storage**
2. Cari bucket bernama **`vendor-profiles`**
3. Jika BELUM ADA:
   - Click **"New bucket"**
   - Name: `vendor-profiles`
   - **Public bucket: ✅ CENTANG INI!**
   - Click **"Create bucket"**
4. Jika SUDAH ADA tapi tidak public:
   - Click ⚙️ (settings) di sebelah bucket
   - Toggle **"Public bucket"** ON
   - Click **"Save"**

#### STEP 2: Setup Storage Policies (PILIH SALAH SATU)

**OPSI A - Cara Termudah (Recommended untuk Development):**

Jalankan SQL ini di **SQL Editor**:
```sql
-- Copy SEMUA kode dari file: setup_storage_policies.sql
-- Atau copy dari sini:

DROP POLICY IF EXISTS "Allow public read access to vendor-profiles" ON storage.objects;
DROP POLICY IF EXISTS "Allow anyone to upload to vendor-profiles" ON storage.objects;
DROP POLICY IF EXISTS "Allow anyone to update vendor-profiles" ON storage.objects;
DROP POLICY IF EXISTS "Allow anyone to delete vendor-profiles" ON storage.objects;

CREATE POLICY "Allow public read access to vendor-profiles"
ON storage.objects FOR SELECT
USING ( bucket_id = 'vendor-profiles' );

CREATE POLICY "Allow anyone to upload to vendor-profiles"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'vendor-profiles' );

CREATE POLICY "Allow anyone to update vendor-profiles"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'vendor-profiles' );

CREATE POLICY "Allow anyone to delete vendor-profiles"
ON storage.objects FOR DELETE
USING ( bucket_id = 'vendor-profiles' );
```

**OPSI B - Disable RLS Completely (Kurang Aman):**
```sql
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets DISABLE ROW LEVEL SECURITY;
```

#### STEP 3: Verify Setup

Jalankan query ini untuk check:
```sql
-- Check bucket exists and is public
SELECT id, name, public 
FROM storage.buckets 
WHERE name = 'vendor-profiles';
-- Result harus: public = true

-- Check policies
SELECT policyname 
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%vendor-profiles%';
-- Result harus: ada 4 policies
```

#### STEP 4: Test Upload Lagi
1. Refresh halaman profil
2. Upload gambar
3. Seharusnya berhasil sekarang! ✅

---

## 🔍 Jika Masih Error

### Check 1: Bucket Public?
```sql
SELECT name, public FROM storage.buckets WHERE name = 'vendor-profiles';
```
**Harus return:** `public = true`

### Check 2: Policies Exist?
```sql
SELECT COUNT(*) FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%vendor-profiles%';
```
**Harus return:** `count = 4` (atau minimal 1)

### Check 3: RLS Enabled?
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'storage' 
  AND tablename = 'objects';
```
**Jika return:** `rowsecurity = true` → Policies harus ada
**Jika return:** `rowsecurity = false` → Tidak perlu policies

### Check 4: Browser Console
- Buka browser console (F12)
- Upload gambar
- Lihat error detail di console
- Screenshot error dan kirim untuk analisa

---

## 📋 Checklist Troubleshooting

- [ ] Bucket `vendor-profiles` exists
- [ ] Bucket is **PUBLIC** (toggle ON)
- [ ] RLS policies created (4 policies)
- [ ] Clear browser cache & refresh
- [ ] Logout & login ulang
- [ ] Check browser console untuk error detail
- [ ] Verify Supabase URL & Anon Key correct

---

## 🆘 Emergency Fix

Jika semua cara di atas gagal, jalankan SQL ini (nuclear option):

```sql
-- 1. Make sure bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('vendor-profiles', 'vendor-profiles', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Disable ALL RLS
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets DISABLE ROW LEVEL SECURITY;

-- 3. Drop all conflicting policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON storage.objects';
    END LOOP;
END $$;

-- 4. Verify
SELECT 'Bucket exists:', EXISTS(SELECT 1 FROM storage.buckets WHERE name = 'vendor-profiles');
SELECT 'RLS disabled:', NOT rowsecurity FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects';
SELECT 'Policies count:', COUNT(*) FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects';
```

Setelah itu, test upload ulang.
