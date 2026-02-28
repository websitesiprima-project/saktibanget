# 🚨 QUICK FIX: Vendor edwardbene07@gmail.com Tidak Bisa Login

## Masalah Saat Ini

Vendor dengan email **edwardbene07@gmail.com** tidak bisa login meskipun menggunakan password **AA9usskAmwlv** dari email.

**Penyebab:** Password di database menggunakan hash dari crypto Node.js yang berbeda dengan hash dari crypto-js yang baru.

---

## ✅ SOLUSI TERCEPAT (3 Langkah)

### **Opsi 1: Re-Approve Vendor (PALING MUDAH)** ⭐ RECOMMENDED

1. **Login sebagai Admin**
2. **Buka:** Dashboard Admin → "Approval Akun Vendor"
3. **Cari vendor:** PT SINAR KETERANGAN (edwardbene07@gmail.com)
4. **Hapus atau Reject** vendor tersebut
5. **Minta vendor daftar ulang** ATAU **Approve ulang** (jika datanya masih ada)
6. **Password baru** akan otomatis:
   - Di-hash dengan crypto-js yang baru ✅
   - Dikirim ke email vendor
7. **Vendor login** dengan password baru dari email ✅

---

### **Opsi 2: Hash Ulang Password AA9usskAmwlv**

Jika ingin menggunakan password yang sama (**AA9usskAmwlv**):

#### 2.1. Jalankan Script Hash Password

```bash
cd d:\Project\2026\MAGANG\MAGANG-PLN\vlaas-pln
node scripts/hash-vendor-password.js
```

#### 2.2. Input Password

```
Masukkan password yang ingin di hash: AA9usskAmwlv
```

#### 2.3. Copy Hash yang Dihasilkan

Script akan menampilkan hash seperti:
```
5f8a... [64 karakter]
```

#### 2.4. Update Database

1. Buka **Supabase Dashboard**
2. Masuk ke **SQL Editor**
3. Jalankan query (ganti dengan hash dari step 2.3):

```sql
UPDATE vendor_users
SET password = 'PASTE_HASH_DISINI'
WHERE email = 'edwardbene07@gmail.com';
```

#### 2.5. Test Login

Vendor sekarang bisa login dengan password: **AA9usskAmwlv** ✅

---

### **Opsi 3: Vendor Reset Password Sendiri**

1. **Vendor** membuka halaman login: `/vendor-login`
2. Klik **"Lupa Password"**
3. Masukkan email: **edwardbene07@gmail.com**
4. Cek email untuk kode reset
5. Buat password baru
6. Login dengan password baru ✅

---

## 🔍 Verifikasi Password di Database

Untuk mengecek apakah password sudah benar:

```sql
SELECT 
    email,
    LENGTH(password) as pwd_length,
    SUBSTRING(password, 1, 20) || '...' as pwd_preview,
    status,
    is_activated
FROM vendor_users
WHERE email = 'edwardbene07@gmail.com';
```

**Hasil yang benar:**
- `pwd_length`: **64** (SHA-256 hash)
- `status`: **Aktif**
- `is_activated`: **true**

Jika `pwd_length` bukan 64, password belum di-hash dengan benar.

---

## 📝 Untuk Vendor Lain yang Bermasalah

Jika ada vendor lain yang tidak bisa login setelah di-approve:

### Cek Kapan Vendor Di-Approve:

```sql
SELECT 
    email,
    company_name,
    status,
    activated_at,
    created_at
FROM vendor_users
WHERE status = 'Aktif'
ORDER BY activated_at DESC;
```

### Vendor yang Di-Approve **SEBELUM** Fix Ini:
- **Tanggal fix:** 17 Februari 2026, ~12:40 WIB
- **Jika di-approve sebelum tanggal ini:** Perlu di-fix
- **Jika di-approve setelah tanggal ini:** Harusnya sudah OK ✅

### Cara Fix:
1. **Re-approve** vendor (Opsi 1) - Paling mudah
2. **Hash ulang** password dari email (Opsi 2)  
3. **Vendor reset** password sendiri (Opsi 3)

---

## 🎯 Checklist

- [ ] Fix code sudah di-commit (crypto-js implementation)
- [ ] Vendor edwardbene07@gmail.com sudah bisa login
- [ ] Test vendor baru di-approve → login berhasil
- [ ] Dokumentasi sudah dibuat
- [ ] Script helper sudah tersedia

---

## 📞 Contact

Jika masih ada masalah:
1. Cek console browser (F12) untuk error
2. Cek Supabase logs
3. Verifikasi password tidak ada spasi atau karakter tambahan

---

**Status Fix:** ✅ DONE  
**Vendor Affected:** edwardbene07@gmail.com  
**Action Required:** Re-approve atau hash ulang password  
**Prevention:** Semua approval berikutnya otomatis menggunakan crypto-js ✅
