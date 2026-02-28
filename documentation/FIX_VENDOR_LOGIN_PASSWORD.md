# Panduan Mengatasi Masalah Login Vendor (Password Mismatch)

## 🔍 Masalah yang Terjadi

Vendor yang sudah **self-service registration** atau **approved oleh admin** tidak bisa login meskipun menggunakan password yang benar dari email.

**Penyebab:**
- Password di database tersimpan sebagai **plain text** (contoh: `zdzPThdMLWHM`)
- Sistem login meng-**hash password** sebelum membandingkan dengan database
- `hash(zdzPThdMLWHM)` ≠ `zdzPThdMLWHM` ❌

---

## ✅ Solusi yang Sudah Diimplementasikan

### 1. **Approval Akun Baru** (untuk vendor yang akan di-approve setelah ini)
File yang diupdate: `src/app/(admin)/approval-akun/page.tsx`

**Alur sekarang:**
```
1. Generate password random → `tempPassword` (plain text)
2. Hash password → `hashedPassword = hash(tempPassword)` 
3. Simpan ke database → `password: hashedPassword` ✅
4. Kirim email → `password: tempPassword` (plain text) ✅
5. Vendor login → input password → hash → compare dengan database ✅
```

**Fungsi baru:**
```typescript
const hashPassword = (password: string): string => {
    return crypto
        .createHash('sha256')
        .update(password + 'sakti_pln_salt')
        .digest('hex')
}
```

---

## 🔧 Cara Memperbaiki Vendor yang Sudah Di-Approve Sebelumnya

### **Opsi 1: Re-Approve Vendor (PALING MUDAH)** ✅ Recommended

1. **Buka halaman Admin** → **Approval Akun**
2. **Reject** vendor yang bermasalah terlebih dahulu:
   - Status berubah jadi "Ditolak"
3. **Approve lagi** vendor tersebut:
   - Sistem akan generate password baru (sudah hashed)
   - Email otomatis terkirim dengan password plain text
4. **Vendor bisa login** dengan password baru dari email

**Keuntungan:**
- ✅ Otomatis
- ✅ Password baru di-generate dan di-hash dengan benar
- ✅ Email terkirim otomatis

---

### **Opsi 2: Reset Password Manual**

1. **Request Password Reset** dari halaman vendor login
2. Vendor akan menerima **reset token** via email
3. Set password baru (akan otomatis di-hash)

**Keuntungan:**
- ✅ Vendor bisa atur password sendiri

---

### **Opsi 3: Update Database Manual** ⚠️ (Untuk Developer)

**Jika password di email masih tersimpan**, hash manual:

```sql
-- Contoh: Password di email adalah "zdzPThdMLWHM"
-- Hash menggunakan PostgreSQL:
UPDATE vendor_users
SET password = encode(digest('zdzPThdMLWHM' || 'sakti_pln_salt', 'sha256'), 'hex')
WHERE email = 'edwardbene07@gmail.com';
```

**ATAU** jalankan script yang sudah disediakan:
- File: `database/fix_vendor_password_hashing.sql`
- Cek vendor dengan password plain text
- Update sesuai kebutuhan

---

## 📋 Checklist Verifikasi

### Untuk Vendor yang Baru Di-Approve:
- [ ] Password di database **64 karakter** (hash SHA-256)
- [ ] Password di email **plain text** (contoh: `Ab3xY9zK2pQw`)
- [ ] Vendor bisa **login** dengan password dari email

### Untuk Vendor Lama (Sudah Di-Approve Sebelumnya):
- [ ] **Re-approve** vendor atau
- [ ] Vendor **reset password** sendiri
- [ ] Verifikasi login berhasil

---

## 🧪 Testing

### Test Login Vendor:
1. **Buat vendor baru** atau **approve pending vendor**
2. **Cek email** yang dikirim ke vendor
3. **Login** menggunakan:
   - Email: dari database
   - Password: dari email (plain text)
4. **Verifikasi** login berhasil ✅

### Jika Login Gagal:
1. Cek panjang password di database:
   ```sql
   SELECT email, LENGTH(password) as pwd_length FROM vendor_users WHERE email = 'vendor@example.com';
   ```
   - Jika `64` → sudah hash ✅
   - Jika `< 64` → masih plain text ❌

2. Re-approve vendor atau reset password

---

## 📝 Catatan Penting

1. **Vendor yang sudah pernah di-approve sebelum fix ini** perlu di-re-approve atau reset password
2. **Password di email selalu plain text** (untuk vendor bisa login pertama kali)
3. **Password di database selalu hashed** (untuk keamanan)
4. **Setelah login**, sarankan vendor untuk **ubah password** dari halaman profile

---

## 🔒 Keamanan

- ✅ Password di-hash dengan **SHA-256**
- ✅ Salt: `sakti_pln_salt` (bisa diganti di env: `PASSWORD_SALT`)
- ✅ Password tidak disimpan plain text di database
- ✅ Email dikirim via secure SMTP (Gmail)

---

**File terkait:**
- `src/app/(admin)/approval-akun/page.tsx` - Approval logic
- `src/components/Login.tsx` - Login with hash
- `database/fix_vendor_password_hashing.sql` - Manual fix script
