# 🚀 Quick Start: Aktifkan Email Reset Password

Panduan singkat untuk mengaktifkan fitur pengiriman kode reset password via Gmail.

## ⚡ Langkah Cepat (5 menit)

### 1️⃣ Aktifkan 2-Step Verification Gmail

1. Buka: https://myaccount.google.com/security
2. Klik **"2-Step Verification"** → **"Get Started"**
3. Ikuti instruksi sampai selesai

### 2️⃣ Buat App Password Gmail

1. Buka: https://myaccount.google.com/apppasswords
2. Ketik nama app: `SAKTI PLN`
3. Klik **"Create"**
4. **Salin** password 16 karakter yang muncul (contoh: `abcd efgh ijkl mnop`)

### 3️⃣ Setup Environment Variables

Buat file `.env.local` di root project:

```bash
# Di terminal PowerShell
cd d:\Project\2026\MAGANG\MAGANG-PLN\vlaas-pln
notepad .env.local
```

Isi dengan (ganti dengan data Anda):

```env
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop
```

**Contoh nyata:**
```env
GMAIL_USER=admin.pln@gmail.com
GMAIL_APP_PASSWORD=xyzabcdefghijklm
```

### 4️⃣ Restart Server

```bash
# Stop server (Ctrl + C di terminal)
# Start lagi
npm run dev
```

### 5️⃣ Test!

1. Buka http://localhost:3000
2. Klik **"Login sebagai Vendor"**
3. Klik **"Lupa Password"**
4. Masukkan email vendor
5. Klik **"Kirim Kode Reset"**
6. **Cek email** (termasuk folder Spam)

---

## ✅ Berhasil jika:

- Muncul alert: "Kode reset password telah dikirim ke email..."
- Email masuk dalam 1-2 menit
- Email berisi kode 6 digit
- Design email bagus dan profesional

## ❌ Gagal jika:

- Alert menampilkan kode reset (berarti email gagal terkirim)
- Console error: "Invalid login" → App Password salah
- Console error: "Missing credentials" → `.env.local` tidak terbaca

---

## 📚 Dokumentasi Lengkap

Baca: [EMAIL_RESET_PASSWORD_SETUP.md](./EMAIL_RESET_PASSWORD_SETUP.md)

---

## 🎯 Yang Sudah Dikerjakan

✅ Install `nodemailer`  
✅ Buat API endpoint `/api/send-reset-email`  
✅ Integrasi dengan `vendorAuthService`  
✅ Update UI untuk tidak tampilkan kode (kecuali email gagal)  
✅ Template email profesional dengan HTML  
✅ Keamanan: kode expire 30 menit  

## 🔜 Yang Harus Anda Lakukan

1. Setup Gmail App Password (3 menit)
2. Buat file `.env.local` (1 menit)
3. Restart server (10 detik)
4. Test (1 menit)

**Total: ~5 menit** ⏱️

---

**Need help?** Baca troubleshooting di [EMAIL_RESET_PASSWORD_SETUP.md](./EMAIL_RESET_PASSWORD_SETUP.md#troubleshooting)
