# ⚡ Quick Start: Non-Aktifkan & Reaktivasi Akun Vendor

## 🎯 Ringkasan Cepat

**Perubahan**: "Hapus Akun" → "Non-Aktifkan Akun" + Fitur Reaktivasi (dalam modal seperti register)

---

## 🚀 Cara Menonaktifkan Akun

1. Login vendor → Profil Perusahaan
2. Klik **"Non-Aktifkan Akun"** (tombol merah)
3. Konfirmasi
4. ✅ Akun dinonaktifkan, data tetap aman

---

## 🔓 Cara Mengaktifkan Kembali

1. Buka `/vendor-login`
2. Klik **"Aktifkan Kembali"** di bawah form login
3. Modal akan muncul (seperti daftar akun)
4. Masukkan **email** Anda
5. Cek **email** → dapat kode 6 digit
6. Masukkan **kode verifikasi**
7. ✅ Akun aktif kembali!

---

## 📂 File yang Diubah

```
src/
├── services/
│   └── vendorAccountService.ts          # ✅ Update + tambah fungsi
├── app/
│   ├── api/
│   │   └── send-reactivation-email/
│   │       └── route.ts                 # ✅ New endpoint
│   └── vendor-portal/
│       └── profile/
│           └── page.tsx                 # ✅ Update UI
└── components/
    └── Login.tsx                        # ✅ Update: tambah modal reaktivasi
```

**File yang Dihapus:**
- ❌ `src/app/vendor-reactivate/page.tsx` (halaman terpisah)
- ❌ `src/app/vendor-reactivate/ReactivateAccount.css`

**Alasan**: Reaktivasi sekarang menggunakan modal seperti daftar akun, tidak perlu halaman terpisah.

---

## 🔑 Environment Setup

Tambahkan ke `.env`:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD=your-app-password
```

---

## ✅ Testing Checklist

### Non-Aktifkan:
- [ ] Login vendor
- [ ] Klik "Non-Aktifkan Akun"
- [ ] Verify status = "Tidak Aktif"
- [ ] Login blocked

### Reaktivasi:
- [ ] Akses `/vendor-reactivate`
- [ ] Input email
- [ ] Terima kode OTP
- [ ] Verify kode
- [ ] Status = "Aktif"
- [ ] Login berhasil

---

## 🎨 URL Routes

| Route | Fungsi |
|-------|--------|
| `/vendor-login` | Login + modal reaktivasi (built-in) |
| `/vendor-portal/profile` | Profil + tombol non-aktifkan |
| `/api/send-reactivation-email` | API endpoint kirim OTP |

**Catatan**: Reaktivasi sekarang menggunakan modal di halaman login, bukan halaman terpisah.

---

## 🔐 Keamanan

- ✅ OTP 6 digit random
- ✅ Expired 15 menit
- ✅ Email validation
- ✅ Data tidak dihapus

---

## ⚡ Key Features

| Feature | Before | After |
|---------|--------|-------|
| Hapus Akun | Hard delete | Soft delete (status only) |
| Data Vendor | Terhapus | Tetap tersimpan |
| Login | N/A | Blocked jika tidak aktif |
| Reaktivasi | Tidak ada | Ada dengan OTP |

---

## 📧 Template Email

**Subject**: Kode Reaktivasi Akun VLAAS PLN

**Isi**:
- Kode OTP 6 digit
- Berlaku 15 menit
- Jangan share kode

---

## 🐛 Common Issues

**Email tidak masuk?**
- Cek spam folder
- Verify EMAIL_USER & EMAIL_APP_PASSWORD

**Kode tidak valid?**
- Pastikan < 15 menit
- Request kode baru

**Masih tidak bisa login?**
- Clear cache
- Verify status di database

---

**Version**: 1.0.0  
**Date**: 27 Januari 2026
