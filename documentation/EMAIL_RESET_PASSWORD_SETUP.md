# 📧 Panduan Setup Email Reset Password dengan Gmail

Dokumen ini menjelaskan cara mengkonfigurasi pengiriman email kode reset password menggunakan Gmail.

## 📋 Daftar Isi
- [Persyaratan](#persyaratan)
- [Langkah Setup Gmail App Password](#langkah-setup-gmail-app-password)
- [Konfigurasi Environment Variables](#konfigurasi-environment-variables)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## ✅ Persyaratan

1. **Akun Gmail aktif**
2. **2-Step Verification aktif** di akun Gmail
3. **Node.js** dan **nodemailer** sudah terinstall

---

## 🔐 Langkah Setup Gmail App Password

### 1. Aktifkan 2-Step Verification

Sebelum bisa membuat App Password, Anda harus mengaktifkan 2-Step Verification terlebih dahulu.

1. Buka [Google Account Security](https://myaccount.google.com/security)
2. Cari bagian **"How you sign in to Google"**
3. Klik **"2-Step Verification"**
4. Ikuti langkah-langkah untuk mengaktifkannya
   - Pilih metode verifikasi (SMS, Google Authenticator, dll)
   - Masukkan kode verifikasi
   - Klik **"Turn On"**

### 2. Buat App Password

Setelah 2-Step Verification aktif:

1. Buka [Google App Passwords](https://myaccount.google.com/apppasswords)
   
   **ATAU**
   
   - Buka [Google Account Security](https://myaccount.google.com/security)
   - Scroll ke **"How you sign in to Google"**
   - Klik **"2-Step Verification"**
   - Scroll ke bawah, cari **"App passwords"**
   - Klik **"App passwords"**

2. Login jika diminta

3. Di halaman **App passwords**:
   - **App name**: Ketik nama aplikasi (misal: `SAKTI PLN Reset Password`)
   - Klik **"Create"**

4. Google akan generate password 16 karakter, contoh: `abcd efgh ijkl mnop`

5. **PENTING**: Salin password ini dan simpan di tempat aman
   - Password hanya ditampilkan sekali
   - Anda tidak bisa melihatnya lagi setelah menutup dialog
   - Hapus spasi saat menyimpan (jadi: `abcdefghijklmnop`)

---

## ⚙️ Konfigurasi Environment Variables

### 1. Buat file `.env.local` di root project

Jika belum ada, buat file `.env.local` di folder root project Anda:

```bash
# Di PowerShell atau Command Prompt
cd d:\Project\2026\MAGANG\MAGANG-PLN\vlaas-pln
New-Item -ItemType File -Name .env.local
```

### 2. Tambahkan konfigurasi Gmail

Buka file `.env.local` dan tambahkan:

```env
# Gmail Configuration untuk Reset Password
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop
```

**Contoh nyata:**

```env
# Gmail Configuration untuk Reset Password
GMAIL_USER=admin.sakti@gmail.com
GMAIL_APP_PASSWORD=abcdefghijklmnop
```

### 3. Pastikan `.env.local` ada di `.gitignore`

Buka file `.gitignore` dan pastikan ada baris ini:

```gitignore
# Environment variables
.env*.local
.env.local
.env
```

**JANGAN pernah commit file `.env.local` ke Git!**

---

## 🧪 Testing

### 1. Restart Development Server

Setelah menambahkan environment variables, restart server:

```bash
# Stop server (Ctrl + C)
# Start lagi
npm run dev
```

### 2. Test Fitur Reset Password

1. Buka aplikasi di browser: `http://localhost:3000`
2. Klik **"Login sebagai Vendor"**
3. Klik **"Lupa Password"**
4. Masukkan email vendor yang terdaftar
5. Klik **"Kirim Kode Reset"**

### 3. Cek Email

- Buka inbox email vendor
- Cek folder **Spam/Junk** juga
- Email seharusnya datang dalam 1-2 menit dengan subject: **"Kode Reset Password - SAKTI PLN"**

---

## 🔧 Troubleshooting

### ❌ Error: "Invalid login: 535-5.7.8 Username and Password not accepted"

**Penyebab:**
- App Password salah
- Masih menggunakan password Gmail biasa (bukan App Password)
- 2-Step Verification belum aktif

**Solusi:**
1. Pastikan 2-Step Verification sudah aktif
2. Generate App Password baru
3. Pastikan tidak ada spasi di App Password
4. Update `.env.local` dengan App Password yang benar
5. Restart server

### ❌ Email tidak sampai

**Solusi:**
1. Cek folder **Spam/Junk**
2. Cek console browser (F12) untuk error
3. Cek terminal server untuk log error
4. Pastikan email vendor benar
5. Tunggu beberapa menit (kadang ada delay)

### ❌ Error: "Missing credentials for PLAIN"

**Penyebab:**
- Environment variables tidak terbaca
- Typo di nama variable

**Solusi:**
1. Pastikan nama file tepat: `.env.local` (bukan `.env` atau `.env.development`)
2. Pastikan nama variable tepat: `GMAIL_USER` dan `GMAIL_APP_PASSWORD`
3. Restart server setelah edit `.env.local`

### ❌ Email masuk ke Spam

**Solusi:**
Ini normal untuk email yang baru pertama kali dikirim. Untuk menghindari spam:

1. **Tambahkan SPF Record** (jika punya domain sendiri)
2. **Whitelist email** di Gmail Settings
3. Minta user untuk mark email sebagai "Not Spam"

### 📝 Cek Log

Untuk debug, cek:

1. **Browser Console** (F12 → Console)
2. **Terminal Server** (tempat `npm run dev` jalan)

Error akan muncul di sana dengan detail.

---

## 🎯 Fitur Email Reset Password

### Template Email Include:

✅ **Kode Reset 6 digit** yang jelas  
✅ **Masa berlaku** (30 menit)  
✅ **Warning keamanan** (jangan share kode)  
✅ **Design responsif** (bagus di mobile & desktop)  
✅ **Plain text version** (untuk email client yang tidak support HTML)  

### Keamanan:

🔒 Kode reset **tidak ditampilkan di UI** (kecuali email gagal)  
🔒 Kode **expire dalam 30 menit**  
🔒 Kode **hanya bisa dipakai sekali**  
🔒 Menggunakan **App Password**, bukan password Gmail asli  

---

## 📞 Kontak Support

Jika masih ada masalah:

1. Cek dokumentasi Gmail: https://support.google.com/accounts/answer/185833
2. Cek dokumentasi Nodemailer: https://nodemailer.com/
3. Hubungi developer

---

## 📄 File-file Terkait

- **API Endpoint**: `src/app/api/send-reset-email/route.ts`
- **Service**: `src/services/vendorAuthService.ts`
- **Component**: `src/components/Login.tsx`
- **Environment**: `.env.local`

---

**Dibuat:** Januari 2026  
**Update Terakhir:** ${new Date().toLocaleDateString('id-ID')}
