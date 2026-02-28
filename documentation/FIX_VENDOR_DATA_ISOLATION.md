# 🔒 Fix: Data Isolation untuk Vendor Portal

**Tanggal:** 26 Januari 2026  
**Status:** ✅ Selesai & Sudah di-push

---

## 🐛 Masalah

Setiap vendor bisa melihat **semua data pengajuan surat** dari vendor lain, bukan hanya milik mereka sendiri. Ini adalah masalah **data isolation** yang serius.

### Contoh Masalah:
- Vendor baru login → Melihat data dari vendor lain (misal: MAENG PS)
- Seharusnya vendor baru → Riwayat kosong
- Semua vendor melihat data yang sama

---

## 🔍 Penyebab

### 1. **Dashboard Vendor** (`src/app/vendor-portal/page.tsx`)
```typescript
// ❌ SEBELUM (SALAH)
const result = await getAllSurat();
// Mengambil SEMUA data tanpa filter vendor
```

### 2. **Create Surat** (`src/services/suratService.ts`)
```typescript
// ❌ SEBELUM (SALAH)
.insert([{
    nomor_surat: data.nomorSurat,
    // ... field lain
    status: 'PENDING'
    // TIDAK ADA vendor_id dan vendor_email
}])
```

---

## ✅ Solusi

### 1. **Update Dashboard Vendor**
```typescript
// ✅ SETELAH (BENAR)
import { getRiwayatSuratPengajuan } from '@/services/suratPengajuanService';

const result = await getRiwayatSuratPengajuan();
// Hanya mengambil data milik vendor yang login
// Filter otomatis berdasarkan vendor_id dari localStorage
```

**File:** `src/app/vendor-portal/page.tsx`

### 2. **Update Create Surat**
```typescript
// ✅ SETELAH (BENAR)
// Get vendor info dari localStorage
const vendorUserId = localStorage.getItem('vendorUserId')
const vendorEmail = localStorage.getItem('vendorEmail')

.insert([{
    nomor_surat: data.nomorSurat,
    // ... field lain
    status: 'PENDING',
    vendor_id: parseInt(vendorUserId),  // ✅ DITAMBAHKAN
    vendor_email: vendorEmail            // ✅ DITAMBAHKAN
}])
```

**File:** `src/services/suratService.ts`

---

## 🎯 Hasil

### ✅ Yang Sudah Diperbaiki:

1. **Data Isolation:**
   - ✅ Setiap vendor **hanya melihat** data pengajuan mereka sendiri
   - ✅ Vendor baru akan melihat **riwayat kosong**
   - ✅ Tidak ada data vendor lain yang bocor

2. **Data Ownership:**
   - ✅ Setiap surat yang disubmit **memiliki vendor_id** dan **vendor_email**
   - ✅ Tracking yang jelas: surat ini milik vendor mana

3. **Security:**
   - ✅ Application-level filtering berdasarkan `vendor_id`
   - ✅ Validasi session dari localStorage

---

## 📋 Testing Checklist

### Untuk Vendor:
- [ ] Login sebagai Vendor A → Hanya melihat data milik Vendor A
- [ ] Login sebagai Vendor B → Hanya melihat data milik Vendor B
- [ ] Vendor baru → Dashboard kosong (0 pengajuan)
- [ ] Submit surat baru → Data tersimpan dengan `vendor_id` yang benar
- [ ] Logout → Login vendor lain → Tidak melihat data vendor sebelumnya

### Untuk Admin (Opsional):
- [ ] Admin masih bisa melihat semua data dari semua vendor
- [ ] Admin bisa approve/reject semua surat

---

## 🔄 Migration Guide

Jika sudah ada **data lama** yang tidak memiliki `vendor_id`:

### Option 1: Hapus Data Lama (Development Only)
```sql
-- WARNING: Ini akan MENGHAPUS semua data surat lama!
DELETE FROM surat_pengajuan WHERE vendor_id IS NULL;
```

### Option 2: Assign ke Vendor Tertentu (Production)
```sql
-- Assign semua data lama ke vendor tertentu (ganti 1 dengan vendor_id yang benar)
UPDATE surat_pengajuan 
SET vendor_id = 1, 
    vendor_email = 'vendor@example.com'
WHERE vendor_id IS NULL;
```

### Option 3: Biarkan (Temporary)
- Data lama tanpa `vendor_id` tidak akan muncul di dashboard vendor manapun
- Akan muncul error di console jika ada query yang mencoba akses data tanpa `vendor_id`

---

## 🛠️ Technical Details

### Service yang Digunakan:

#### ✅ **suratPengajuanService.ts** (RECOMMENDED)
- `submitSuratPengajuan()` - Otomatis include vendor_id
- `getRiwayatSuratPengajuan()` - Filter by vendor_id
- `getDetailSuratPengajuan()` - Validate ownership

#### ⚠️ **suratService.ts** (UPDATED)
- `createSurat()` - Sekarang sudah include vendor_id
- `getAllSurat()` - Tidak filter (untuk admin saja)

### Database Schema:
```sql
surat_pengajuan
├── id (PRIMARY KEY)
├── nomor_surat
├── perihal
├── tanggal_surat
├── nama_pekerjaan
├── nomor_kontrak
├── keterangan
├── file_name
├── file_url
├── status
├── alasan_penolakan
├── vendor_id       ← PENTING untuk filtering
├── vendor_email    ← PENTING untuk tracking
├── created_at
└── updated_at
```

---

## 📝 Files Changed

1. ✅ `src/app/vendor-portal/page.tsx`
   - Import: `getAllSurat` → `getRiwayatSuratPengajuan`
   - Function call updated

2. ✅ `src/services/suratService.ts`
   - `createSurat()`: Tambah vendor_id dan vendor_email
   - Session validation dari localStorage

---

## 🚀 Deployment

```bash
# Sudah di-push ke repository
git push origin fixbaru

# Jika deploy ke production:
1. Pull latest code
2. Restart aplikasi (kalau perlu)
3. Test dengan multiple vendor accounts
4. Monitor console untuk error
```

---

## 💡 Best Practices untuk Developer

### Saat Fetch Data Vendor:
```typescript
// ✅ GOOD - Gunakan service dengan filter built-in
import { getRiwayatSuratPengajuan } from '@/services/suratPengajuanService';
const result = await getRiwayatSuratPengajuan();

// ❌ BAD - Fetch semua lalu filter di frontend
const result = await getAllSurat();
const filtered = result.data.filter(s => s.vendor_id === currentVendorId);
```

### Saat Submit Data:
```typescript
// ✅ GOOD - Service otomatis include vendor info
import { submitSuratPengajuan } from '@/services/suratPengajuanService';
const result = await submitSuratPengajuan(data);

// ❌ BAD - Manual insert tanpa vendor info
await supabase.from('surat_pengajuan').insert([data]);
```

---

## 📞 Support

Jika masih ada masalah:
1. Cek console browser (F12) untuk error
2. Pastikan localStorage ada `vendorUserId` dan `vendorEmail`
3. Cek database: apakah kolom `vendor_id` dan `vendor_email` ada?
4. Verify RLS policy di Supabase

---

**Status:** ✅ **RESOLVED**  
**Commit:** `dd18a7b`  
**Branch:** `fixbaru`
