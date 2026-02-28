# 🔐 Panduan Fitur Non-Aktifkan & Reaktivasi Akun Vendor

## 📋 Overview

Fitur ini mengubah sistem "Hapus Akun" menjadi "Non-Aktifkan Akun" dengan kemampuan reaktivasi yang aman menggunakan kode OTP via email.

### Perubahan Utama:
- ✅ **Sebelumnya**: Hapus akun = data vendor terhapus permanen
- ✅ **Sekarang**: Non-aktifkan akun = data tetap ada, user tidak bisa login
- ✅ **Baru**: Fitur reaktivasi akun dengan validasi OTP

---

## 🎯 Fitur-Fitur

### 1. **Non-Aktifkan Akun**
Vendor dapat menonaktifkan akun mereka sendiri dari halaman profil.

**Cara Menggunakan:**
1. Login sebagai vendor
2. Buka **Profil Perusahaan**
3. Klik tombol **Non-Aktifkan Akun** (merah) di pojok kanan atas
4. Konfirmasi penonaktifan
5. Status vendor berubah menjadi "Tidak Aktif"
6. Otomatis logout dan tidak bisa login kembali

**Dampak:**
- ✅ Data profil tetap tersimpan di database
- ✅ Vendor tidak dapat login
- ✅ Status berubah menjadi "Tidak Aktif"
- ✅ Dapat diaktifkan kembali kapan saja

---

### 2. **Reaktivasi Akun**
Vendor yang telah menonaktifkan akun dapat mengaktifkannya kembali melalui proses validasi.

**Cara Menggunakan:**
1. Buka halaman login vendor (`/vendor-login`)
2. Klik link **"Aktifkan Kembali"** di bawah form login
3. Modal reaktivasi akan muncul (seperti modal daftar akun)
4. Masukkan email akun yang dinonaktifkan
5. Klik **"Kirim Kode Verifikasi"**
6. Cek email untuk mendapatkan kode OTP (6 digit)
7. Masukkan kode verifikasi
8. Klik **"Aktifkan Akun"**
9. Akun berhasil diaktifkan, bisa login kembali

**Keamanan:**
- 🔐 Kode OTP 6 digit dikirim ke email terdaftar
- ⏱️ Kode berlaku selama 15 menit
- 📧 Validasi email untuk memastikan pemilik akun yang sah
- 🔄 Dapat request ulang kode jika expired

---

## 🛠️ Implementasi Teknis

### File yang Dibuat/Diubah

#### 1. **Service Layer**
**File**: `src/services/vendorAccountService.ts`

**Fungsi Baru:**
```typescript
// Menonaktifkan akun (soft delete)
deactivateVendorAccount(vendorUserId: string)

// Kirim kode reaktivasi via email
sendReactivationCode(email: string)

// Verifikasi kode dan aktifkan akun
verifyReactivationCode(email: string, code: string)
```

#### 2. **API Endpoint**
**File**: `src/app/api/send-reactivation-email/route.ts`

Mengirim email berisi kode OTP untuk reaktivasi akun.

#### 3. **Halaman Reaktivasi**
**File**: 
- `src/app/vendor-reactivate/page.tsx`
- `src/app/vendor-reactivate/ReactivateAccount.css`

Interface 2-step untuk:
1. Input email
2. Verifikasi kode OTP

#### 4. **Update UI Profil**
**File**: `src/app/vendor-portal/profile/page.tsx`

- Tombol "Hapus Akun" → "Non-Aktifkan Akun"
- Update modal konfirmasi
- Update pesan sukses

#### 5. **Update Login Logic**
**File**: `src/components/Login.tsx`

- Cek status akun saat login
- Block login jika status "Tidak Aktif"
- Tambah link ke halaman reaktivasi

---

## 📊 Database Schema

### Tabel: `vendor_users`

Menggunakan kolom yang sudah ada:
```sql
status VARCHAR(50) DEFAULT 'Aktif'  -- 'Aktif' | 'Tidak Aktif'
reset_token VARCHAR(255)            -- Kode OTP
reset_token_expires TIMESTAMP       -- Waktu kadaluarsa kode
```

**Catatan**: Tidak perlu migration baru, kolom sudah tersedia.

---

## 🔄 Flow Diagram

### Alur Non-Aktifkan Akun:
```
User → Profil → Klik "Non-Aktifkan Akun" 
    → Konfirmasi 
    → Update status = 'Tidak Aktif' 
    → Logout 
    → Redirect ke Login
```

### Alur Reaktivasi Akun:
```
User → Halaman Reaktivasi → Input Email
    → Generate OTP (6 digit)
    → Simpan di database (expired 15 menit)
    → Kirim email
    → User input kode OTP
    → Verifikasi kode
    → Update status = 'Aktif'
    → Redirect ke Login
    → User bisa login kembali
```

---

## 📧 Template Email Reaktivasi

Email yang dikirim berisi:
- Kode OTP 6 digit
- Waktu kadaluarsa (15 menit)
- Peringatan keamanan
- Branding VLAAS PLN

**Subject**: "Kode Reaktivasi Akun VLAAS PLN"

---

## 🔐 Keamanan

1. **OTP Code**
   - 6 digit random number
   - Disimpan di database (encrypted)
   - Expired dalam 15 menit

2. **Email Verification**
   - Kode hanya dikirim ke email terdaftar
   - Memastikan pemilik akun yang sah

3. **Rate Limiting**
   - User dapat request ulang kode
   - No limit pada request (dapat ditambahkan jika diperlukan)

4. **Data Protection**
   - Data vendor tidak dihapus saat non-aktif
   - Hanya status yang diubah
   - Semua data tetap aman di database

---

## 🧪 Testing

### Test Non-Aktifkan Akun:
1. Login sebagai vendor
2. Buka Profil Perusahaan
3. Klik "Non-Aktifkan Akun"
4. Konfirmasi
5. Verify: Status = "Tidak Aktif"
6. Try login → should be blocked

### Test Reaktivasi Akun:
1. Akses `/vendor-reactivate`
2. Input email akun yang dinonaktifkan
3. Klik "Kirim Kode Verifikasi"
4. Cek email untuk kode OTP
5. Input kode verifikasi
6. Klik "Aktifkan Akun"
7. Verify: Status = "Aktif"
8. Try login → should succeed

### Test Edge Cases:
- ❌ Email tidak terdaftar
- ❌ Akun sudah aktif
- ❌ Kode verifikasi salah
- ❌ Kode verifikasi expired
- ✅ Request ulang kode

---

## 🚀 Deployment Checklist

- [x] Update service `vendorAccountService.ts`
- [x] Create API endpoint `send-reactivation-email`
- [x] Create halaman reaktivasi UI
- [x] Update profil perusahaan UI
- [x] Update login logic
- [ ] Test email sending (pastikan EMAIL_USER dan EMAIL_APP_PASSWORD sudah di .env)
- [ ] Test flow lengkap non-aktifkan → reaktivasi
- [ ] Verify database status changes

---

## 📝 Environment Variables Required

Pastikan variabel berikut ada di `.env`:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD=your-app-specific-password
```

**Cara Setup Gmail App Password:**
1. Buka Google Account Settings
2. Security → 2-Step Verification
3. App passwords
4. Generate password untuk "Mail"
5. Copy password ke .env

---

## 🎨 UI/UX Changes

### Halaman Profil Perusahaan:
- Button "Hapus Akun" → "Non-Aktifkan Akun"
- Icon tetap menggunakan `AlertTriangle`
- Warna merah untuk emphasis

### Halaman Reaktivasi:
- Modern gradient background
- 2-step progress indicator
- Clear error/success messages
- Responsive design

### Halaman Login Vendor:
- Link "Aktifkan Kembali" di bawah form
- Error message khusus untuk akun non-aktif

---

## 📖 User Guide

### Untuk Vendor:

**Cara Menonaktifkan Akun:**
1. Login → Profil Perusahaan
2. Klik tombol merah "Non-Aktifkan Akun"
3. Baca peringatan dengan teliti
4. Klik "Ya, Non-Aktifkan Akun"
5. Akun Anda akan dinonaktifkan

**Cara Mengaktifkan Kembali:**
1. Buka halaman login vendor
2. Klik link "Aktifkan Kembali"
3. Masukkan email Anda
4. Cek email untuk kode verifikasi
5. Masukkan kode 6 digit
6. Akun berhasil diaktifkan!
7. Login seperti biasa

---

## ⚠️ Important Notes

1. **Data Tidak Hilang**: 
   - Semua data vendor tetap tersimpan
   - Hanya status yang berubah

2. **Email Penting**:
   - Pastikan email vendor masih aktif
   - Cek spam/junk folder untuk kode OTP

3. **Kode Expired**:
   - Kode OTP berlaku 15 menit
   - Bisa request ulang jika expired

4. **Keamanan**:
   - Jangan share kode OTP ke siapapun
   - Pastikan email vendor aman

---

## 🔧 Troubleshooting

### Email tidak terkirim:
- Cek EMAIL_USER dan EMAIL_APP_PASSWORD di .env
- Pastikan 2FA enabled di Gmail
- Verify App Password correct

### Kode tidak valid:
- Pastikan memasukkan kode yang benar
- Cek apakah kode sudah expired (15 menit)
- Request kode baru

### Akun masih tidak bisa login:
- Verify status di database = 'Aktif'
- Clear browser cache & localStorage
- Try different browser

---

## 📞 Support

Jika ada pertanyaan atau masalah, hubungi:
- **Admin**: admin@vlaas-pln.com
- **Support**: support@vlaas-pln.com

---

**Last Updated**: 27 Januari 2026
**Version**: 1.0.0
**Author**: VLAAS PLN Development Team
