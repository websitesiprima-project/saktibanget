# 🚀 Quick Start: Email Verification untuk Registrasi Vendor

**5 Langkah Setup & Testing**

---

## 📋 Prerequisites

1. **Gmail Account** dengan 2-Step Verification aktif
2. **Node.js** terinstall
3. **Project** sudah running

---

## ⚡ Setup (5 Menit)

### 1. Generate Gmail App Password

```bash
# Buka browser:
https://myaccount.google.com/apppasswords

# Pilih:
Select app: Mail
Select device: Other (Custom name)
Name: "SAKTI PLN Dev"

# Copy password 16 digit yang muncul
# Format: xxxx xxxx xxxx xxxx
```

### 2. Configure Environment Variables

```bash
# Buat/edit file .env.local di root project
code .env.local
```

```env
# Gmail SMTP Configuration
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=abcdabcdabcdabcd
```

**⚠️ PENTING:** 
- Jangan commit file `.env.local` ke Git!
- Sudah ada di `.gitignore`

### 3. Install Dependencies (Jika Belum)

```bash
npm install nodemailer
npm install dotenv
```

### 4. Test Email Connection

```bash
node test-email-verification.js
```

**Expected Output:**
```
🧪 Testing Email Verification System...

📋 Checking environment variables:
GMAIL_USER: your-email@gmail.com
GMAIL_APP_PASSWORD: ✅ SET

🔌 Testing SMTP connection...
✅ SMTP connection successful!

🔐 Generated test verification code: 123456

📧 Sending test verification email...
✅ Test email sent successfully!
📬 Message ID: <xxx@gmail.com>
📨 Sent to: your-email@gmail.com

💡 Please check your inbox/spam folder!

✅ Email verification system is working correctly!
```

### 5. Start Development Server

```bash
npm run dev
```

---

## 🧪 Manual Testing

### Test Flow: Registrasi Vendor Baru

```bash
# 1. Buka browser
http://localhost:3000/vendor-login

# 2. Klik "Daftar Vendor Baru"

# 3. STEP 1: Input Email
Email: test-vendor@example.com
Nama Perusahaan: PT Test Vendor
[Kirim Kode Verifikasi]

# 4. Cek email Anda (inbox atau spam)
# Akan ada email dengan subject: "Kode Verifikasi Registrasi Vendor - SAKTI PLN"

# 5. STEP 2: Input Kode
Kode: 123456 (dari email)
[Verifikasi Email]

# 6. STEP 3: Lengkapi Data
- Email sudah terisi dan disabled (verified ✅)
- Isi data lengkap perusahaan
- Password min 6 karakter
- Konfirmasi password harus sama
[DAFTAR]

# 7. Berhasil! Redirect ke login
# Email auto-fill di form login
```

---

## 📊 Test Cases

### ✅ Happy Path
```
Input: test1@example.com
Kode: 123456 (benar)
Result: ✅ Berhasil registrasi
```

### ❌ Email Sudah Terdaftar
```
Input: edwardbene07@gmail.com (sudah ada)
Result: ❌ "Email sudah terdaftar"
```

### ❌ Kode Salah
```
Input: 000000 (salah)
Result: ❌ "Kode verifikasi salah. Sisa percobaan: 4"
```

### ⏰ Kode Expired
```
Tunggu: > 15 menit
Result: ❌ "Kode sudah kadaluarsa. Kirim ulang kode."
```

### 🔄 Kirim Ulang Kode
```
Action: Klik "Kirim Ulang Kode"
Result: ✅ Kode baru dikirim, kode lama invalid
```

---

## 🐛 Troubleshooting

### Email Tidak Terkirim?

**Problem:** "Failed to send verification email"

**Solutions:**
```bash
# 1. Check .env.local
cat .env.local

# 2. Test SMTP
node test-email-verification.js

# 3. Check Gmail Settings
# - 2-Step Verification ON?
# - App Password generated?
# - Less secure apps OFF (harus gunakan App Password)

# 4. Check Firewall
# - Port 587 (TLS) atau 465 (SSL) terbuka?
# - Antivirus blocking SMTP?

# 5. Restart dev server
npm run dev
```

**Fallback (Development):**
- Buka Console Browser (F12)
- Kode akan ditampilkan di console log
- Alert juga menampilkan kode jika email gagal

### Kode Selalu Hilang?

**Problem:** "Kode verifikasi tidak ditemukan"

**Cause:** Server restart (in-memory storage hilang)

**Solutions:**
```bash
# Development: Disable hot-reload
# Atau kirim ulang kode

# Production: Gunakan database/Redis storage
# Lihat: EMAIL_VERIFICATION_GUIDE.md → Database Impact
```

### TypeScript Errors?

```bash
# Rebuild
npm run build

# Check errors
npx tsc --noEmit
```

---

## 📁 File Structure

```
vlaas-pln/
├── .env.local                          ← Gmail credentials (JANGAN COMMIT!)
├── test-email-verification.js          ← Test script
├── EMAIL_VERIFICATION_GUIDE.md         ← Full documentation
├── src/
│   ├── services/
│   │   └── vendorAuthService.ts        ← ✅ 3 new functions
│   ├── components/
│   │   ├── VendorLoginForm.tsx         ← ✅ 3-step registration
│   │   └── Login.tsx                   ← ✅ CSS styling
│   └── app/
│       └── api/
│           └── send-verification-email/
│               └── route.ts            ← ✅ Email sending API
```

---

## 🎯 Next Steps

### Development:
- [x] Email verification working
- [ ] Test dengan berbagai email provider (Gmail, Outlook, Yahoo)
- [ ] Test responsive mobile
- [ ] User feedback collection

### Production:
- [ ] Ganti in-memory storage → Database/Redis
- [ ] Hash passwords dengan bcrypt
- [ ] Enable HTTPS
- [ ] Rate limiting API
- [ ] Professional email (bukan Gmail)
- [ ] Monitoring & logging

---

## 📞 Support

**Error tidak bisa diselesaikan?**

1. Check error message di console
2. Lihat full docs: `EMAIL_VERIFICATION_GUIDE.md`
3. Test SMTP: `node test-email-verification.js`
4. Check Supabase logs untuk database errors

---

## ✅ Checklist

Sebelum deploy production:

- [ ] `.env.local` configured
- [ ] `node test-email-verification.js` berhasil
- [ ] Manual testing semua flow berhasil
- [ ] Email template looks good (desktop & mobile)
- [ ] Error handling tested
- [ ] Security review (hash password, HTTPS, etc)

---

**Ready to go!** 🚀

Jika semua checklist ✅, sistem siap digunakan!
