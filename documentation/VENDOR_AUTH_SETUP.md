# Vendor Authentication System - Setup Guide

## 📋 Overview
Sistem autentikasi vendor menggunakan **2 tabel terpisah**:
1. **`vendor_users`** - Menyimpan kredensial login (email, password, profile_image)
2. **`vendors`** - Menyimpan data profil perusahaan (nama, alamat, telepon, dll)

## 🗄️ Database Schema

### Tabel 1: vendor_users (Autentikasi)
```sql
CREATE TABLE vendor_users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password TEXT NOT NULL,
  profile_image TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Kolom:**
- `id`: Primary key (auto-increment)
- `email`: Email untuk login (unique)
- `password`: Password (dalam production harus di-hash!)
- `profile_image`: URL foto profil dari Supabase Storage
- `created_at`, `updated_at`: Timestamp

### Tabel 2: vendors (Data Perusahaan)
```sql
ALTER TABLE vendors 
ADD COLUMN user_id INTEGER REFERENCES vendor_users(id) ON DELETE CASCADE;
```

**Kolom yang ada:**
- `id`: ID Vendor (VND001, VND002, dst)
- `user_id`: Foreign key ke `vendor_users.id`
- `nama`: Nama perusahaan
- `email`: Email perusahaan (duplikat dari vendor_users untuk kompatibilitas)
- `alamat`: Alamat perusahaan
- `telepon`: Nomor telepon
- `kontak_person`: Nama PIC
- `status`: Status vendor (Aktif/Nonaktif)
- `kategori`: Kategori vendor
- Dan kolom lainnya...

## 🔄 Alur Kerja

### 1. Registrasi Vendor
```typescript
// Login.tsx - handleRegister()

// Step 1: Create account di vendor_users
const { data: newUser } = await supabase
  .from('vendor_users')
  .insert([{
    email: 'vendor@example.com',
    password: 'password123', // Hash this in production!
    profile_image: null
  }])
  .select()
  .single()

// Step 2: Create profile di vendors dengan user_id
await supabase
  .from('vendors')
  .insert([{
    id: 'VND001',
    user_id: newUser.id,  // Link ke vendor_users
    nama: 'PT Example',
    email: 'vendor@example.com',
    telepon: '081234567890',
    // ... data lainnya
  }])
```

**Hasil:**
- 1 row di `vendor_users` (kredensial)
- 1 row di `vendors` (profil perusahaan)
- Linked via `vendors.user_id → vendor_users.id`

### 2. Login Vendor
```typescript
// Login.tsx - handleLogin()

// Step 1: Authenticate dari vendor_users
const { data: user } = await supabase
  .from('vendor_users')
  .select('id, email, profile_image')
  .eq('email', email)
  .eq('password', password)  // Use bcrypt comparison in production!
  .single()

// Step 2: Get vendor profile data
const { data: vendorProfile } = await supabase
  .from('vendors')
  .select('*')
  .eq('user_id', user.id)
  .single()

// Step 3: Store session di localStorage
localStorage.setItem('vendorUserId', user.id)
localStorage.setItem('vendorProfile', JSON.stringify({
  userId: user.id,
  vendorId: vendorProfile.id,
  email: user.email,
  profileImage: user.profile_image,
  companyName: vendorProfile.nama,
  // ... data lainnya
}))
```

### 3. Load Profile Page
```typescript
// profile/page.tsx - loadVendorProfile()

const vendorUserId = localStorage.getItem('vendorUserId')

// Load user data (email, profile_image)
const { data: userData } = await supabase
  .from('vendor_users')
  .select('id, email, profile_image')
  .eq('id', vendorUserId)
  .single()

// Load vendor data (nama, alamat, dll)
const { data: vendorData } = await supabase
  .from('vendors')
  .select('*')
  .eq('user_id', vendorUserId)
  .single()
```

### 4. Upload Profile Image
```typescript
// profile/page.tsx - handleImageUpload()

// Step 1: Upload file to Supabase Storage
const fileName = `${vendorUserId}-${Date.now()}.jpg`
await supabase.storage
  .from('vendor-profiles')
  .upload(`vendor-profiles/${fileName}`, file)

// Step 2: Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('vendor-profiles')
  .getPublicUrl(`vendor-profiles/${fileName}`)

// Step 3: Update vendor_users table (NOT vendors!)
await supabase
  .from('vendor_users')
  .update({ profile_image: publicUrl })
  .eq('id', vendorUserId)
```

## 📦 localStorage Structure

Setelah login berhasil, data disimpan di localStorage:

```javascript
{
  // Session
  "vendorLoggedIn": "true",
  "vendorEmail": "vendor@example.com",
  "vendorUserId": "123",  // ID dari vendor_users table
  
  // Complete Profile
  "vendorProfile": {
    "userId": 123,           // vendor_users.id
    "vendorId": "VND001",    // vendors.id
    "email": "vendor@example.com",
    "profileImage": "https://...",  // dari vendor_users.profile_image
    "companyName": "PT Example",     // dari vendors.nama
    "picName": "John Doe",           // dari vendors.kontak_person
    "nama": "PT Example",
    "alamat": "Jl. Example No. 123",
    "telepon": "081234567890",
    "kontak_person": "John Doe"
  }
}
```

## 🔐 Security Notes

### ⚠️ IMPORTANT - Production Deployment
1. **Password Hashing**: Password saat ini disimpan plain text. Untuk production, WAJIB gunakan bcrypt:
   ```typescript
   import bcrypt from 'bcrypt'
   
   // Register
   const hashedPassword = await bcrypt.hash(password, 10)
   await supabase.from('vendor_users').insert([{
     email: email,
     password: hashedPassword
   }])
   
   // Login
   const isValid = await bcrypt.compare(inputPassword, user.password)
   ```

2. **Row Level Security (RLS)**: 
   - `vendor_users` table saat ini RLS disabled untuk development
   - Untuk production, enable RLS dengan policy yang tepat

3. **Email Validation**: Tambahkan validasi format email

4. **Rate Limiting**: Implementasi rate limiting untuk login attempts

## 🚀 Setup Instructions

### Step 1: Run Migration SQL
1. Buka Supabase Dashboard → SQL Editor
2. Copy isi file `supabase/migrations/add_vendor_profile_image.sql`
3. Execute SQL
4. Verify tables created:
   ```sql
   SELECT * FROM vendor_users LIMIT 1;
   SELECT * FROM vendors WHERE user_id IS NOT NULL LIMIT 1;
   ```

### Step 2: Create Storage Bucket
1. Buka Supabase Dashboard → Storage
2. Click "New Bucket"
3. Bucket name: `vendor-profiles`
4. Set to **Public**: ✅ Yes
5. File size limit: 2MB
6. Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`

### Step 3: Test Registration & Login
1. Navigate to `/vendor-login`
2. Click "Daftar sebagai Vendor Baru"
3. Fill form:
   - Nama Perusahaan: PT Test
   - Email: test@vendor.com
   - Password: test123
   - Telepon: 081234567890
4. Click "Daftar"
5. Login dengan email & password yang sama
6. Verify redirect to `/vendor-portal`

### Step 4: Test Profile Image Upload
1. Navigate to `/vendor-portal/profile`
2. Click "Pilih Foto" button
3. Select image (max 2MB)
4. Click upload
5. Verify image appears in profile page
6. Check header - image should appear in user dropdown

## 📝 Migration dari Sistem Lama

Jika ada data vendor lama di tabel `vendors` yang sudah punya `email` dan `password`, jalankan migration script ini:

```sql
-- Migrate existing vendors to new structure
INSERT INTO vendor_users (email, password, profile_image)
SELECT 
  email, 
  COALESCE(password, 'changeme123'),  -- default password jika null
  profile_image
FROM vendors
WHERE email IS NOT NULL
ON CONFLICT (email) DO NOTHING;

-- Update vendors table dengan user_id
UPDATE vendors v
SET user_id = vu.id
FROM vendor_users vu
WHERE v.email = vu.email
  AND v.user_id IS NULL;
```

## 🔍 Troubleshooting

### Error: "Email sudah terdaftar"
- Email sudah ada di `vendor_users` table
- Gunakan email lain atau reset password

### Error: "Profil vendor tidak ditemukan"
- Data ada di `vendor_users` tapi tidak ada di `vendors`
- Kemungkinan registrasi gagal di tengah (rollback tidak sempurna)
- Solusi: Hapus record di `vendor_users` dan register ulang

### Error: "User ID not found" saat upload image
- `vendorUserId` tidak ada di localStorage
- Solusi: Logout dan login ulang

### Image tidak muncul di header
- Check `profile_image` di `vendor_users` table
- Check localStorage `vendorProfile.profileImage`
- Verify bucket `vendor-profiles` is public
- Check console untuk error CORS atau 404

## 📊 Database Relationship Diagram

```
┌─────────────────────┐
│   vendor_users      │
├─────────────────────┤
│ id (PK)            │◄────┐
│ email (UNIQUE)     │     │
│ password           │     │
│ profile_image      │     │
│ created_at         │     │
│ updated_at         │     │
└─────────────────────┘     │
                            │ Foreign Key
                            │
┌─────────────────────┐     │
│     vendors         │     │
├─────────────────────┤     │
│ id (PK)            │     │
│ user_id (FK) ──────┼─────┘
│ nama               │
│ email              │
│ alamat             │
│ telepon            │
│ kontak_person      │
│ status             │
│ kategori           │
│ ...                │
└─────────────────────┘
```

## ✅ Checklist Deployment

- [ ] Run migration SQL di Supabase
- [ ] Create storage bucket `vendor-profiles`
- [ ] Test registrasi vendor baru
- [ ] Test login vendor
- [ ] Test upload foto profil
- [ ] Verify foto muncul di header
- [ ] Enable password hashing (bcrypt)
- [ ] Enable RLS policies
- [ ] Setup email validation
- [ ] Add rate limiting untuk login
- [ ] Test rollback jika registrasi gagal

## 📞 Support

Jika ada pertanyaan atau error, check:
1. Browser Console (F12) untuk error messages
2. Supabase Dashboard → Logs untuk database errors
3. Network tab untuk API request failures
