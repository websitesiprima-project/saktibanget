# 🔒 Fix: Validasi Duplikasi Vendor di Data Vendor

## 📋 Problem Statement

**Masalah yang Dilaporkan:**
Ketika admin menambahkan vendor baru di halaman Data Vendor, sistem masih bisa menginput data walaupun email atau nama vendor sudah terdaftar. Hal ini menyebabkan duplikasi data vendor.

---

## ✅ Solusi yang Diterapkan

### 1. **Validasi di Level Aplikasi**

Menambahkan validasi duplikasi di file `src/app/(admin)/vendor/page.tsx` pada fungsi `handleSubmit`:

#### **Validasi Nama Vendor:**
```typescript
// Cek apakah nama vendor sudah terdaftar
const { data: existingVendorByName } = await supabase
    .from('vendors')
    .select('id, nama, email')
    .eq('nama', formData.nama.trim())
    .maybeSingle()

if (existingVendorByName) {
    setNotification({ 
        show: true, 
        type: 'error', 
        message: `Vendor dengan nama "${formData.nama}" sudah terdaftar dalam sistem.` 
    })
    return // Stop proses insert
}
```

#### **Validasi Email Vendor:**
```typescript
// Cek apakah email sudah terdaftar
const { data: existingVendorByEmail } = await supabase
    .from('vendors')
    .select('id, nama, email')
    .eq('email', formData.email.trim())
    .maybeSingle()

if (existingVendorByEmail) {
    setNotification({ 
        show: true, 
        type: 'error', 
        message: `Email ${formData.email} sudah terdaftar untuk vendor "${existingVendorByEmail.nama}".` 
    })
    return // Stop proses insert
}
```

### 2. **Validasi di Level Database (Opsional)**

File migration SQL tersedia di `database/add_vendor_unique_constraints.sql` untuk menambahkan UNIQUE constraint di level database.

**CATATAN:** Email sudah memiliki UNIQUE constraint di schema database, jadi duplikasi email akan otomatis ditolak oleh database.

---

## 🔍 Alur Validasi

```
┌─────────────────────────┐
│   Admin Klik "Undang    │
│   Vendor Baru"          │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Admin Isi Form:       │
│   - Nama Vendor         │
│   - Email               │
│   - Data Lainnya        │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   Klik "Simpan"         │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   VALIDASI 1:           │
│   Cek duplikasi NAMA    │
│   di tabel vendors      │
└───────────┬─────────────┘
            │
            ├──► Nama sudah ada ──┐
            │                     ▼
            │            ┌────────────────┐
            │            │ ❌ Tampilkan   │
            │            │ Error Message  │
            │            │ Stop Insert    │
            │            └────────────────┘
            │
            ├──► Nama belum ada
            │
            ▼
┌─────────────────────────┐
│   VALIDASI 2:           │
│   Cek duplikasi EMAIL   │
│   di tabel vendors      │
└───────────┬─────────────┘
            │
            ├──► Email sudah ada ──┐
            │                      ▼
            │            ┌────────────────┐
            │            │ ❌ Tampilkan   │
            │            │ Error Message  │
            │            │ Stop Insert    │
            │            └────────────────┘
            │
            ├──► Email belum ada / kosong
            │
            ▼
┌─────────────────────────┐
│   ✅ Insert vendor baru │
│   ke database           │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   ✅ Kirim email        │
│   undangan (jika email  │
│   diisi)                │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   ✅ Tampilkan modal    │
│   dengan Claim Code     │
└─────────────────────────┘
```

---

## 📝 Error Messages

### Duplikasi Nama Vendor:
```
❌ Vendor dengan nama "PT INDOTAMA JASA SERTIFIKASI" sudah terdaftar dalam sistem. 
   Gunakan nama lain atau periksa data vendor yang sudah ada.
```

### Duplikasi Email:
```
❌ Email edwardbene07@gmail.com sudah terdaftar untuk vendor "PT INDOTAMA JASA SERTIFIKASI". 
   Gunakan email lain.
```

---

## 🧪 Testing Checklist

### Test Case 1: Duplikasi Nama Vendor
- [ ] Login sebagai Admin
- [ ] Klik "Undang Vendor Baru"
- [ ] Isi nama vendor dengan nama yang sudah ada (misal: "PT INDOTAMA JASA SERTIFIKASI")
- [ ] Isi email dengan email baru
- [ ] Klik "Simpan"
- [ ] **Expected:** Muncul error message tentang duplikasi nama
- [ ] **Expected:** Data tidak ter-insert ke database

### Test Case 2: Duplikasi Email
- [ ] Login sebagai Admin
- [ ] Klik "Undang Vendor Baru"
- [ ] Isi nama vendor dengan nama baru
- [ ] Isi email dengan email yang sudah ada (misal: "edwardbene07@gmail.com")
- [ ] Klik "Simpan"
- [ ] **Expected:** Muncul error message tentang duplikasi email
- [ ] **Expected:** Data tidak ter-insert ke database

### Test Case 3: Duplikasi Nama DAN Email
- [ ] Login sebagai Admin
- [ ] Klik "Undang Vendor Baru"
- [ ] Isi nama vendor yang sudah ada
- [ ] Isi email yang sudah ada
- [ ] Klik "Simpan"
- [ ] **Expected:** Muncul error message (nama dicek duluan)
- [ ] **Expected:** Data tidak ter-insert ke database

### Test Case 4: Data Baru (Valid)
- [ ] Login sebagai Admin
- [ ] Klik "Undang Vendor Baru"
- [ ] Isi nama vendor BARU yang belum pernah ada
- [ ] Isi email BARU yang belum pernah ada
- [ ] Klik "Simpan"
- [ ] **Expected:** Data berhasil disimpan
- [ ] **Expected:** Muncul modal dengan Claim Code
- [ ] **Expected:** Email undangan terkirim (jika email diisi)

### Test Case 5: Email Kosong (Valid)
- [ ] Login sebagai Admin  
- [ ] Klik "Undang Vendor Baru"
- [ ] Isi nama vendor baru
- [ ] Kosongkan email
- [ ] Klik "Simpan"
- [ ] **Expected:** Data berhasil disimpan (email opsional)
- [ ] **Expected:** Tidak kirim email undangan

---

## 🔧 Files Modified

1. ✅ **`src/app/(admin)/vendor/page.tsx`**
   - Menambahkan validasi duplikasi nama vendor
   - Menambahkan validasi duplikasi email
   - Menampilkan error message yang informatif

2. ✅ **`database/add_vendor_unique_constraints.sql`** (Opsional)
   - Migration SQL untuk unique constraint di level database
   - Hanya perlu dijalankan jika ingin enforcement ketat

---

## 📊 Database Schema (Existing)

Table `vendors` sudah memiliki unique constraint untuk email:

```sql
CREATE TABLE vendors (
  id VARCHAR(50) PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  alamat TEXT,
  telepon VARCHAR(50),
  email VARCHAR(255) UNIQUE,  -- ✅ Sudah UNIQUE
  kategori VARCHAR(100),
  kontak_person VARCHAR(255),
  status VARCHAR(50) DEFAULT 'Aktif',
  ...
);
```

---

## 🎯 Keuntungan Solusi Ini

### 1. **Mencegah Duplikasi Data**
   - Tidak ada lagi vendor dengan nama yang sama
   - Tidak ada lagi vendor dengan email yang sama

### 2. **User Experience yang Baik**
   - Error message yang jelas dan informatif
   - Admin langsung tahu vendor mana yang duplikat
   - Tidak perlu cek manual ke database

### 3. **Data Integrity**
   - Validasi di level aplikasi (user-friendly)
   - Validasi di level database untuk email (enforcement ketat)

### 4. **Flexible**
   - Validasi nama di level aplikasi (bisa di-adjust)
   - Bisa ditambahkan unique constraint untuk nama jika diperlukan

---

## 🚀 Deployment

### Yang Sudah Otomatis Aktif:
✅ Validasi duplikasi nama vendor di aplikasi  
✅ Validasi duplikasi email di aplikasi  
✅ Validasi email unique di database (sudah dari schema awal)

### Yang Opsional (Jika Diperlukan):
📋 Jalankan migration `database/add_vendor_unique_constraints.sql` untuk menambahkan unique constraint pada nama vendor di database

---

## 📞 Support

Jika menemukan issue atau butuh modifikasi lebih lanjut:
- Cek console browser untuk error details
- Cek Supabase logs untuk database errors
- Review file `src/app/(admin)/vendor/page.tsx` untuk logic validasi

---

**Status:** ✅ COMPLETED  
**Tested:** ⏳ PENDING USER TESTING  
**Version:** 1.0  
**Date:** 2026-02-06
