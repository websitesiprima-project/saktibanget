# 📧 Email Verification untuk Registrasi Vendor

**Tanggal:** 26 Januari 2026  
**Status:** ✅ Selesai Diimplementasi

---

## 📌 Fitur Baru: Email Verification (OTP)

Sistem registrasi vendor sekarang menggunakan **email verification dengan kode OTP 6 digit** untuk memastikan bahwa email yang didaftarkan benar-benar valid dan dapat diakses oleh user.

### ✨ Cara Kerja

```
┌──────────────────────────────────────────────────────┐
│  FLOW REGISTRASI VENDOR (3 LANGKAH)                  │
└──────────────────────────────────────────────────────┘

1️⃣ INPUT EMAIL
   ├─ User memasukkan email perusahaan
   ├─ Optional: Nama perusahaan (untuk personalisasi)
   └─ Klik "Kirim Kode Verifikasi"
        ↓
   System:
   ├─ Cek apakah email sudah terdaftar
   ├─ Generate kode 6 digit (random)
   ├─ Kirim email dengan kode verifikasi
   └─ Simpan kode di memory (valid 15 menit)

2️⃣ VERIFIKASI KODE
   ├─ User menerima email dengan kode
   ├─ Input kode 6 digit
   └─ Klik "Verifikasi Email"
        ↓
   System:
   ├─ Validasi kode (max 5 percobaan)
   ├─ Cek expired (15 menit)
   └─ Jika benar → lanjut ke step 3
        
3️⃣ LENGKAPI DATA
   ├─ Email sudah terverifikasi (disabled field)
   ├─ User mengisi data lengkap perusahaan
   ├─ Password & konfirmasi
   └─ Klik "DAFTAR"
        ↓
   System:
   ├─ Simpan data ke vendor_users
   ├─ Hapus kode verifikasi
   └─ Redirect ke login
```

---

## 🛠️ Implementasi Teknis

### 1. **Service Layer** (`src/services/vendorAuthService.ts`)

#### Fungsi Baru:

```typescript
// Request kode verifikasi
requestEmailVerification(email: string, companyName?: string)
├─ Validasi format email
├─ Cek email sudah terdaftar?
├─ Generate kode 6 digit
├─ Simpan ke Map<email, {code, expiresAt, attempts}>
├─ Kirim email via API /api/send-verification-email
└─ Return success message

// Verify kode
verifyEmailCode(email: string, code: string)
├─ Cek kode di memory
├─ Validasi expired (15 menit)
├─ Validasi attempts (max 5x)
├─ Compare kode input vs tersimpan
└─ Return success/error

// Clear kode setelah registrasi
clearVerificationCode(email: string)
└─ Hapus dari memory
```

#### Storage:
```typescript
// In-memory storage (reset saat server restart)
const verificationCodes = new Map<string, VerificationEntry>()

interface VerificationEntry {
    code: string        // "123456"
    email: string       // "vendor@example.com"
    expiresAt: Date     // 15 menit dari sekarang
    attempts: number    // 0-5
}
```

**⚠️ PENTING untuk Production:**
- Ganti in-memory Map dengan **database table** atau **Redis**
- In-memory akan hilang saat server restart
- Tidak cocok untuk multi-instance deployment

---

### 2. **API Endpoint** (`src/app/api/send-verification-email/route.ts`)

```typescript
POST /api/send-verification-email

Request Body:
{
    email: string,              // "vendor@example.com"
    verificationCode: string,   // "123456"
    companyName?: string        // "PT Example"
}

Response Success:
{
    success: true,
    message: "Kode verifikasi telah dikirim ke vendor@example.com"
}

Response Error:
{
    success: false,
    error: "Gagal mengirim email...",
    details: "SMTP error details"
}
```

#### Email Template:
- **Subject:** "Kode Verifikasi Registrasi Vendor - SAKTI PLN"
- **Style:** Modern, responsive HTML
- **Content:**
  - Header dengan logo PLN
  - Kode 6 digit di box besar
  - Instruksi penggunaan
  - Warning tentang expired time (15 menit)
  - Footer PLN

---

### 3. **Frontend Component** (`src/components/VendorLoginForm.tsx`)

#### State Management:

```typescript
// Registration flow step
const [registerStep, setRegisterStep] = useState(1) // 1, 2, 3

// Verification data
const [verificationData, setVerificationData] = useState({
    email: '',
    code: '',
    companyName: ''
})

// Register data (existing)
const [registerData, setRegisterData] = useState({...})
```

#### Handler Functions:

```typescript
// Step 1: Request Kode
handleRequestVerificationCode(e: FormEvent)
├─ Call requestEmailVerification()
├─ Show success message
└─ setRegisterStep(2)

// Step 2: Verify Kode
handleVerifyCode(e: FormEvent)
├─ Call verifyEmailCode()
├─ Pre-fill email di registerData
└─ setRegisterStep(3)

// Step 3: Complete Registration
handleRegister(e: FormEvent)
├─ Validasi form
├─ Call registerVendor()
├─ clearVerificationCode()
└─ Close modal & redirect
```

#### UI Components:

**Step Indicator:**
```jsx
<div className="step-indicator">
  <div className={`step ${registerStep >= 1 ? 'active' : ''}`}>
    <div className="step-number">1</div>
    <div className="step-label">Email</div>
  </div>
  <div className={`step ${registerStep >= 2 ? 'active' : ''}`}>
    <div className="step-number">2</div>
    <div className="step-label">Verifikasi</div>
  </div>
  <div className={`step ${registerStep >= 3 ? 'active' : ''}`}>
    <div className="step-number">3</div>
    <div className="step-label">Lengkapi Data</div>
  </div>
</div>
```

---

### 4. **Styling** (`src/components/Login.tsx` - Styled Components)

```css
/* Step Indicator */
.step-indicator { 
  display: flex; 
  justify-content: space-between;
  position: relative;
}
.step-indicator::before { /* Progress line */ }
.step.active .step-number { 
  background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%);
  box-shadow: 0 4px 12px rgba(30, 136, 229, 0.3);
}

/* Verification Elements */
.verification-intro { /* Blue info box */ }
.verification-success { /* Green success box */ }
.verification-code-input { 
  text-align: center;
  font-size: 24px;
  letter-spacing: 8px;
  font-family: 'Courier New', monospace;
}
.verified-email { /* Green disabled input */ }
```

---

## 🔐 Keamanan

### Proteksi yang Diterapkan:

1. **Rate Limiting:**
   - Max 5 percobaan verifikasi salah
   - Setelah 5x gagal → Harus kirim ulang kode

2. **Time Expiration:**
   - Kode valid 15 menit
   - Setelah expired → Harus request kode baru

3. **Email Validation:**
   - Format email dicek dengan regex
   - Email tidak boleh sudah terdaftar

4. **Code Secrecy:**
   - Kode TIDAK dikirim di response API (hanya via email)
   - Kecuali email gagal terkirim (fallback development)

### ⚠️ Untuk Production (Wajib):

1. **Hash Password:**
   ```typescript
   import bcrypt from 'bcrypt'
   const hashedPassword = await bcrypt.hash(password, 10)
   ```

2. **HTTPS Only:**
   - Pastikan SSL/TLS aktif
   - Tidak ada plain text password di network

3. **Database Storage untuk OTP:**
   ```sql
   CREATE TABLE email_verifications (
       id SERIAL PRIMARY KEY,
       email VARCHAR(255) UNIQUE,
       code VARCHAR(6),
       expires_at TIMESTAMP,
       attempts INT DEFAULT 0,
       created_at TIMESTAMP DEFAULT NOW()
   );
   ```

4. **Rate Limiting API:**
   - Gunakan middleware untuk limit request
   - Max 3 kali kirim kode per email per 1 jam

---

## 📧 Setup Email (Gmail SMTP)

### Environment Variables (.env.local):

```bash
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

### Cara Mendapatkan App Password:

1. Buka https://myaccount.google.com/security
2. Enable **2-Step Verification**
3. Buka **App Passwords**
4. Pilih **Mail** → **Other**
5. Copy password 16 digit
6. Paste ke `.env.local`

### Test SMTP Connection:

```bash
node test-email-verification.js
```

---

## 🧪 Testing Guide

### Manual Testing:

#### Test Case 1: Happy Path ✅
```
1. Klik "Daftar Vendor Baru"
2. Input email: test@example.com
3. Klik "Kirim Kode Verifikasi"
4. Cek email inbox/spam
5. Input kode 6 digit yang diterima
6. Klik "Verifikasi Email"
7. Lengkapi form registrasi
8. Klik "DAFTAR"
9. Berhasil → Redirect ke login

Expected: ✅ Berhasil registrasi
```

#### Test Case 2: Email Sudah Terdaftar ❌
```
1. Input email yang sudah ada
2. Klik "Kirim Kode Verifikasi"

Expected: ❌ Error "Email sudah terdaftar"
```

#### Test Case 3: Kode Salah ❌
```
1. Berhasil dapat kode
2. Input kode yang salah (misal: 000000)
3. Klik "Verifikasi Email"

Expected: ❌ Error "Kode verifikasi salah. Sisa percobaan: 4"
```

#### Test Case 4: Kode Expired ⏰
```
1. Kirim kode verifikasi
2. Tunggu > 15 menit
3. Input kode yang benar
4. Klik "Verifikasi Email"

Expected: ❌ Error "Kode verifikasi sudah kadaluarsa"
```

#### Test Case 5: Kirim Ulang Kode 🔄
```
1. Di step verifikasi
2. Klik "Kirim Ulang Kode"
3. Input email lagi
4. Dapat kode baru

Expected: ✅ Kode lama invalid, kode baru valid
```

---

## 📝 User Flow Diagram

```
┌─────────────────┐
│  Login Page     │
└────────┬────────┘
         │ Klik "Daftar Vendor Baru"
         ▼
┌─────────────────────────────────┐
│ STEP 1: Input Email             │
│ ┌─────────────────────────────┐ │
│ │ Email: [____________]       │ │
│ │ Nama: [____________]        │ │
│ └─────────────────────────────┘ │
│   [Kirim Kode Verifikasi]       │
└────────┬────────────────────────┘
         │
         │ ① System generate kode
         │ ② Email dikirim
         │
         ▼
┌─────────────────────────────────┐
│ STEP 2: Verifikasi Kode         │
│ ┌─────────────────────────────┐ │
│ │ Kode terkirim ke:           │ │
│ │ test@example.com            │ │
│ │                             │ │
│ │ Kode: [_ _ _ _ _ _]        │ │
│ └─────────────────────────────┘ │
│   [Verifikasi Email]            │
│   [Kirim Ulang Kode]            │
└────────┬────────────────────────┘
         │ ✅ Kode benar
         ▼
┌─────────────────────────────────┐
│ STEP 3: Lengkapi Data           │
│ ┌─────────────────────────────┐ │
│ │ ✅ Email: test@example.com  │ │
│ │    (verified, disabled)     │ │
│ │                             │ │
│ │ Nama: [____________]        │ │
│ │ Alamat: [____________]      │ │
│ │ Telepon: [____________]     │ │
│ │ Password: [____________]    │ │
│ └─────────────────────────────┘ │
│   [DAFTAR]                      │
└────────┬────────────────────────┘
         │ ✅ Registrasi berhasil
         ▼
┌─────────────────┐
│  Login Page     │
│  (Auto-fill     │
│   email)        │
└─────────────────┘
```

---

## 🚀 Migration dari Sistem Lama

### Sebelum (Tanpa Verifikasi):
```typescript
// Langsung register tanpa cek email
handleRegister() {
  await registerVendor(data)
  // Siapa saja bisa daftar dengan email palsu
}
```

### Sekarang (Dengan Verifikasi):
```typescript
// Multi-step registration
Step 1: requestEmailVerification(email)
Step 2: verifyEmailCode(email, code)
Step 3: registerVendor(data) // Email sudah terverifikasi
```

### Keuntungan:
✅ Email pasti valid dan aktif  
✅ Mengurangi spam registrasi  
✅ User ownership terbukti  
✅ Database lebih bersih  

---

## 📊 Database Impact

### Table: `vendor_users`
- Tidak ada perubahan struktur table
- Field `email` sekarang dijamin valid
- Kualitas data lebih baik

### Optional: Table `email_verifications` (Production)
```sql
CREATE TABLE email_verifications (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    attempts INT DEFAULT 0,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(email, created_at)
);

-- Auto-cleanup expired codes
CREATE OR REPLACE FUNCTION cleanup_expired_verifications()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM email_verifications 
    WHERE expires_at < NOW() - INTERVAL '1 day';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_verifications_trigger
    AFTER INSERT ON email_verifications
    EXECUTE FUNCTION cleanup_expired_verifications();
```

---

## 🎨 UI/UX Improvements

### Step Indicator Visual:
- Progress bar yang jelas
- Nomor step dengan warna aktif
- Label deskriptif untuk setiap step

### Verification Input:
- Large font size (24px)
- Letter-spacing lebar (8px)
- Monospace font untuk kode
- Auto-focus pada input

### Success/Info Messages:
- Color-coded boxes (blue info, green success)
- Icons untuk visual clarity (📧, ✅)
- Clear instructions

### Email Display:
- Monospace font untuk email
- Bold dan colored untuk visibility
- Disabled saat sudah verified

---

## 🐛 Troubleshooting

### Email Tidak Terkirim?

**Cek:**
1. `.env.local` sudah benar?
2. Gmail App Password valid?
3. SMTP port tidak diblokir firewall?
4. Check console log untuk error details

**Fallback (Development):**
- Kode akan ditampilkan di console log
- Alert akan menampilkan kode jika email gagal

### Kode Selalu Salah?

**Debugging:**
```typescript
// Tambahkan di handleVerifyCode()
console.log('Input code:', verificationData.code)
console.log('Stored code:', verificationCodes.get(verificationData.email))
```

### In-Memory Codes Hilang?

**Penyebab:**
- Server restart
- Hot-reload saat development

**Solusi:**
- Untuk production: Gunakan database table atau Redis
- Untuk development: Disable hot-reload atau gunakan persistent storage

---

## 📚 Related Files

```
src/
├── services/
│   └── vendorAuthService.ts          ← Logic verifikasi
├── app/
│   └── api/
│       └── send-verification-email/
│           └── route.ts              ← API endpoint email
└── components/
    ├── VendorLoginForm.tsx           ← UI 3-step registration
    └── Login.tsx                     ← Styled components CSS
```

---

## ✅ Checklist Deployment

### Development:
- [x] Implementasi request verification
- [x] Implementasi verify code
- [x] Setup email sending API
- [x] 3-step UI flow
- [x] CSS styling
- [x] Error handling

### Production (To-Do):
- [ ] Hash passwords dengan bcrypt
- [ ] Pindah OTP storage ke database/Redis
- [ ] Setup rate limiting
- [ ] Enable HTTPS
- [ ] Setup professional email (bukan Gmail)
- [ ] Add Captcha untuk prevent spam
- [ ] Email template branding sesuai PLN
- [ ] Logging & monitoring
- [ ] Backup & recovery mechanism

---

## 🎯 Next Steps

1. **Test dengan real email** (Gmail, Outlook, Yahoo)
2. **Deploy ke staging** untuk QA
3. **User testing** dengan real vendor
4. **Collect feedback** dan improve UX
5. **Production deployment** dengan security hardening

---

**Dibuat oleh:** GitHub Copilot  
**Tanggal:** 26 Januari 2026  
**Versi:** 1.0.0
