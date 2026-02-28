# Dokumentasi Fitur Upload Foto Profil

## Overview
Fitur upload foto profil memungkinkan admin mengubah foto profil mereka di halaman pengaturan. Foto disimpan di Supabase Storage dan URL-nya disimpan di database.

## Spesifikasi
- **Ukuran maksimal**: 2MB
- **Format yang didukung**: JPG, JPEG, PNG, GIF, WebP
- **Storage**: Supabase Storage (bucket: `avatars`)
- **Database**: URL disimpan di kolom `profile_image` di tabel `profiles`

## Setup Supabase

### 1. Setup Database
Jalankan SQL script di Supabase SQL Editor:
```bash
# File: setup_profile_image.sql
```

### 2. Setup Storage Bucket (Via Dashboard)
1. Buka **Supabase Dashboard** > **Storage**
2. Klik **New Bucket**
3. Konfigurasi:
   - **Name**: `avatars`
   - **Public bucket**: ✅ Yes (enabled)
   - **File size limit**: 2097152 bytes (2MB)
   - **Allowed MIME types**: 
     - image/jpeg
     - image/jpg
     - image/png
     - image/gif
     - image/webp

### 3. Verifikasi Setup
Cek di Supabase Dashboard:
- **Storage** > **avatars** bucket sudah ada
- **Database** > **profiles** table memiliki kolom `profile_image`

## Cara Penggunaan

### Upload Foto Profil
1. Login sebagai admin
2. Buka **Pengaturan** > Tab **Profil & Akun**
3. Klik tombol **"Upload Foto"** atau **"Ganti Foto"**
4. Pilih file gambar (max 2MB)
5. Foto akan otomatis terupload dan tersimpan

### Hapus Foto Profil
1. Klik icon **X** di pojok kanan atas foto profil
2. Konfirmasi penghapusan
3. Foto akan dihapus dari storage dan database

## Struktur Kode

### Services
```typescript
// src/services/userService.ts
- uploadProfileImage(userId, file) // Upload foto ke Supabase Storage
- deleteProfileImage(imageUrl)     // Hapus foto dari storage
- updateProfile()                  // Update termasuk profile_image
```

### Components
```typescript
// src/app/(admin)/pengaturan/page.tsx
- handleImageUpload()    // Handle upload file
- handleRemoveImage()    // Handle hapus foto
- State: profileImage, previewImage, uploadingImage
```

### Styling
```css
// src/app/(admin)/pengaturan/Pengaturan.css
.profile-image-section      // Container upload
.profile-image-preview      // Preview foto circular
.btn-upload-image          // Tombol upload
.btn-remove-image          // Tombol hapus
```

## Storage Structure
```
avatars/
└── profile-images/
    ├── {userId}-{timestamp}.jpg
    ├── {userId}-{timestamp}.png
    └── ...
```

## Database Schema
```sql
-- Table: profiles
ALTER TABLE profiles ADD COLUMN profile_image TEXT;

-- Contoh data:
{
  "id": "e0ed9085-ca03-4bd8-8adc-5bb7...",
  "full_name": "Edward Benedict",
  "email": "edwardbene07@gmail.com",
  "profile_image": "https://xxx.supabase.co/storage/v1/object/public/avatars/profile-images/e0ed9085-1234567890.jpg"
}
```

## Validasi

### Frontend Validation
1. **Ukuran file**: Max 2MB (2,097,152 bytes)
2. **Tipe file**: JPG, JPEG, PNG, GIF, WebP
3. **User session**: Harus login sebagai admin

### Backend Validation (Supabase)
1. **Storage policies**: Hanya authenticated users
2. **Bucket limits**: 2MB max per file
3. **MIME types**: Sesuai yang diizinkan

## Error Handling

### Upload Errors
- **File terlalu besar**: "Ukuran file terlalu besar. Maksimal 2MB"
- **Format tidak didukung**: "Tipe file tidak didukung. Gunakan JPG, PNG, GIF, atau WebP"
- **Upload gagal**: "Gagal upload foto: {error message}"

### Delete Errors
- **Delete gagal**: "Gagal menghapus foto: {error message}"

## Security

### RLS Policies
```sql
-- Users can upload their own avatar
CREATE POLICY ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND foldername = 'profile-images');

-- Public can view avatars
CREATE POLICY ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');

-- Users can update/delete their own avatar
CREATE POLICY ON storage.objects FOR UPDATE/DELETE TO authenticated
USING (bucket_id = 'avatars' AND foldername = 'profile-images');
```

## Testing Checklist
- [ ] Upload foto JPG < 2MB
- [ ] Upload foto PNG < 2MB
- [ ] Upload foto > 2MB (should fail)
- [ ] Upload file non-gambar (should fail)
- [ ] Ganti foto yang sudah ada
- [ ] Hapus foto profil
- [ ] Foto muncul di Header setelah upload
- [ ] Foto tersimpan di Supabase Storage
- [ ] URL tersimpan di database
- [ ] Refresh page, foto masih muncul

## Troubleshooting

### Foto tidak muncul setelah upload
1. Cek console browser untuk error
2. Verifikasi bucket `avatars` sudah public
3. Cek RLS policies di Supabase
4. Pastikan kolom `profile_image` ada di tabel `profiles`

### Upload gagal "forbidden"
1. Cek authentication user sudah login
2. Verifikasi storage policies sudah di-setup
3. Cek bucket permissions

### Gambar broken/404
1. Cek URL di database sudah benar
2. Verifikasi file ada di storage bucket
3. Pastikan bucket public

## Future Improvements
- [ ] Image cropping/resizing before upload
- [ ] Multiple image formats support
- [ ] Drag & drop upload
- [ ] Preview before upload
- [ ] Compress image automatically
- [ ] Avatar placeholder dengan initial nama
