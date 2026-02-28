# Panduan Implementasi Fitur Vendor

## 1. Password Reset (Lupa Password)

### Setup Database (sudah dibuat):
- File: `supabase/migrations/vendor_auth_improvements.sql`
- Menambahkan kolom `reset_token` dan `reset_token_expires` ke `vendor_users`
- RLS policies sudah diupdate

### Service Layer (sudah dibuat):
- File: `src/services/vendorAuthService.ts`
- Fungsi:
  - `requestPasswordReset(email)` - Generate token dan simpan ke DB
  - `resetPassword(email, token, newPassword)` - Validate dan update password

### Frontend (perlu update di Login.tsx):
Tambahkan:
1. State untuk forgot password modal
2. Link "Lupa Password?" di form login
3. Modal dengan 2 langkah:
   - Step 1: Input email → generate token
   - Step 2: Input token + password baru → reset

## 2. Update Form Registrasi Vendor

### Data Yang Harus Diisi (Sesuai Profil):

**Informasi Perusahaan:**
- Nama Perusahaan* (company_name)
- Jenis Badan Usaha (company_type: PT/CV/UD/dll)
- NPWP
- No. SIUP  
- TDP
- Tahun Berdiri (established)

**Alamat Perusahaan:**
- Alamat Lengkap*
- Kota/Kabupaten
- Provinsi
- Kode Pos

**Kontak Perusahaan:**
- Telepon* (phone)
- Fax
- Email Perusahaan* (email)

**Penanggung Jawab:**
- Nama Lengkap (pic_name)
- Jabatan (pic_position)
- No. Telepon (pic_phone)
- Email (pic_email)

**Keamanan:**
- Password* (min 6 karakter)
- Konfirmasi Password*

\* = Wajib diisi

### Update Yang Dilakukan:

1. **State** - Sudah diupdate di Login.tsx:
```typescript
const [registerData, setRegisterData] = useState({
  companyName: '',
  companyType: 'PT',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
  address: '',
  city: '',
  province: '',
  postalCode: '',
  fax: '',
  picName: '',
  picPosition: '',
  picPhone: '',
  picEmail: '',
  npwp: '',
  siup: '',
  tdp: '',
  established: ''
})
```

2. **Handler** - Sudah dibuat di vendorAuthService.ts:
   - `registerVendor(vendorData)` - Insert ke vendor_users dengan semua field

3. **Form UI** - Perlu update di Login.tsx modal registrasi:
   - Ganti field `nama` → `companyName`
   - Ganti `telepon` → `phone`
   - Ganti `alamat` → `address`
   - Tambah field baru sesuai daftar di atas

## 3. Riwayat Surat Pengajuan Per Vendor

### Database Changes (sudah dibuat):
- File: `supabase/migrations/vendor_auth_improvements.sql`
- Menambahkan kolom `vendor_id` dan `vendor_email` ke tabel `surat_pengajuan`
- RLS policy: Vendor hanya lihat submission mereka sendiri

### Backend (perlu update):
- Saat vendor submit surat, sertakan `vendor_id` dan `vendor_email`
- Query untuk fetch riwayat: filter by vendor_id

### Frontend (perlu update):
- Halaman riwayat pengajuan vendor
- Filter data berdasarkan vendor_id dari localStorage
- Display hanya surat milik vendor yang login

## Langkah-Langkah Selanjutnya:

1. ✅ Run SQL migration: `vendor_auth_improvements.sql`
2. ⚠️ Update Login.tsx:
   - Tambah forgot password UI
   - Update form registrasi dengan field baru
3. ⚠️ Update submit surat endpoint:
   - Include vendor_id saat submit
4. ⚠️ Buat halaman riwayat vendor:
   - Fetch dengan filter vendor_id
   - Display dalam tabel

## Testing Checklist:

- [ ] Vendor bisa request reset password
- [ ] Reset token expire setelah 30 menit
- [ ] Form registrasi punya semua field profil
- [ ] Data registrasi muncul di profil setelah login
- [ ] Vendor hanya lihat riwayat surat mereka sendiri
- [ ] Vendor tidak bisa lihat riwayat vendor lain
