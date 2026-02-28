# FIX: Error "Could not find the 'jabatan' column"

## Masalah
Error terjadi karena kolom `jabatan` belum ada di tabel `vendors` di database Supabase.

## Solusi Quick Fix (Sudah Diterapkan)
Saya sudah sementara menonaktifkan field `jabatan` dari payload database dengan cara:
- Comment out `jabatan` di vendor/page.tsx (line ~178 dan ~202)
- Comment out `jabatan` di vendor-portal/profile/page.tsx (line ~297)

**Status: Aplikasi sudah bisa digunakan untuk menyimpan vendor TANPA jabatan**

## Solusi Permanen (Jalankan Migration)

### Langkah 1: Buka Supabase Dashboard
1. Login ke https://supabase.com
2. Pilih project PLN
3. Klik **SQL Editor** di menu kiri

### Langkah 2: Jalankan Migration SQL
Copy dan paste SQL berikut ke SQL Editor:

```sql
-- Migration: Add jabatan column to vendors table
-- Safe to run multiple times (uses IF NOT EXISTS)

DO $$ 
BEGIN
    -- Add jabatan column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendors' AND column_name = 'jabatan'
    ) THEN
        ALTER TABLE vendors ADD COLUMN jabatan VARCHAR(100);
    END IF;
END $$;

COMMENT ON COLUMN vendors.jabatan IS 'Jabatan kontak person vendor (akan sync dengan pic_position di vendor_users)';
```

### Langkah 3: Klik "RUN"

### Langkah 4: Aktifkan Kembali Field Jabatan
Setelah migration berhasil, uncomment baris-baris berikut:

**File: src/app/(admin)/vendor/page.tsx**
- Line ~182: Uncomment `// jabatan: formData.jabatan || null,` (payload update vendors)
- Line ~203: Uncomment `// pic_position: formData.jabatan || null,` (sync ke vendor_users)
- Line ~235: Uncomment `// jabatan: formData.jabatan || null,` (payload insert vendor baru)

**File: src/app/vendor-portal/profile/page.tsx**
- Line ~297: Uncomment `// jabatan: profileData.picPosition || null,` (sync ke vendors)

Hapus prefix `//` dan komentar `// TODO: Uncomment setelah migration dijalankan`

## Fitur Sinkronisasi 2 Arah

Setelah migration, sistem akan otomatis sync jabatan:

### 1. Admin Edit Vendor → Sync ke Profil Vendor
- Admin ubah jabatan di Data Vendor
- ✅ Auto-update `vendors.jabatan`
- ✅ Auto-sync ke `vendor_users.pic_position`
- Vendor lihat profilnya → jabatan sudah berubah

### 2. Vendor Edit Profil → Sync ke Data Vendor
- Vendor ubah jabatan di Profil Perusahaan
- ✅ Auto-update `vendor_users.pic_position`
- ✅ Auto-sync ke `vendors.jabatan`
- Admin lihat detail vendor → jabatan sudah berubah

## Alternatif: Jalankan File SQL Langsung
Atau jalankan file yang sudah ada:
- `database/add_jabatan_to_vendors.sql`

## Verifikasi
Setelah migration, coba:
1. Tambah vendor baru dengan isi jabatan
2. Edit vendor dan ubah jabatan
3. Vendor update profil → jabatan auto sync ke data vendor
