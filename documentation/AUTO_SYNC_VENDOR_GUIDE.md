# 🔄 Auto-Sync Vendor Feature

## ✨ Fitur Otomatis Sinkronisasi Vendor

Ketika Anda menambah atau mengedit kontrak di **Manajemen Kontrak**, vendor akan **otomatis disinkronkan** dengan Data Vendor.

---

## 🎯 Cara Kerja

### 1. **Tambah Kontrak Baru**

- Anda mengisi form kontrak
- Masukkan nama vendor (contoh: "PT PERDANA JAYA")
- Klik **Simpan**
- ✅ **Sistem otomatis:**
  - Cek apakah vendor sudah ada
  - Jika **belum ada** → Otomatis **create vendor baru**
  - Jika **sudah ada** → Skip (tidak duplikat)
  - Tampilkan notifikasi success

### 2. **Edit Kontrak**

- Edit kontrak yang sudah ada
- Ganti nama vendor ke vendor baru
- Klik **Simpan**
- ✅ **Sistem otomatis:**
  - Cek vendor baru
  - Create jika belum ada
  - Update kontrak dengan vendor baru

---

## 📊 Sinkronisasi Chart/Grafik

### Dashboard & Laporan Auto-Update

1. **Real-time Subscription** aktif
2. Setiap ada perubahan di table `vendors`:
   - Dashboard chart auto-refresh
   - Laporan chart auto-refresh
3. Vendor baru langsung muncul di:
   - 📈 **Chart Tren Vendor**
   - 👥 **Total Vendor** widget
   - 📋 **Data Vendor** list

---

## 💡 Data Vendor yang Dibuat Otomatis

Ketika vendor dibuat otomatis, field yang diisi:

| Field | Value |
|-------|-------|
| **ID** | VND-{timestamp}-{random} (unik) |
| **Nama** | Dari form kontrak |
| **Alamat** | "-" (placeholder) |
| **Telepon** | "-" (placeholder) |
| **Email** | "-" (placeholder) |
| **Kontak Person** | "-" (placeholder) |
| **Status** | "Aktif" |
| **Tgl Registrasi** | Tanggal hari ini |

**Catatan:** Anda bisa edit vendor di **Data Vendor** untuk melengkapi informasi.

---

## ✅ Contoh Skenario

### Scenario 1: Vendor Baru

```
1. Admin buat kontrak baru
2. Nama Vendor: "PT TEKNOLOGI NUSANTARA"
3. Klik Simpan
4. ✅ Success: "Kontrak berhasil ditambahkan! 
   Vendor 'PT TEKNOLOGI NUSANTARA' juga telah ditambahkan ke Data Vendor."
5. Buka Data Vendor → Vendor baru muncul
6. Buka Dashboard → Chart update dengan vendor baru
```

### Scenario 2: Vendor Sudah Ada

```
1. Admin buat kontrak baru
2. Nama Vendor: "PT ABC ELEKTRIK" (sudah ada)
3. Klik Simpan
4. ✅ Success: "Kontrak berhasil ditambahkan!"
5. Vendor tidak duplikat (tetap 1 entry di Data Vendor)
```

---

## 🔧 Technical Details

### Function: `autoSyncVendor(vendorName)`

**Location:** `src/services/vendorService.ts`

**Flow:**

1. Check if vendor name is empty → Skip
2. Query vendor dengan `ilike` (case-insensitive)
3. If exists → Return success (no action)
4. If not exists → Create new vendor with auto-generated ID
5. Return result with flag `exists: false`

**ID Generation:**

```javascript
VND-{timestamp}-{random4digit}
// Example: VND-1737532800000-4523
```

---

## 📱 User Feedback

### Success Messages

**Kontrak Baru + Vendor Baru:**
> ✅ Kontrak berhasil ditambahkan! Vendor "PT PERDANA JAYA" juga telah ditambahkan ke Data Vendor.

**Kontrak Baru + Vendor Existing:**
> ✅ Kontrak berhasil ditambahkan!

**Edit Kontrak + Vendor Baru:**
> ✅ Kontrak berhasil diperbarui! Vendor "PT MITRA SOLUSI" juga telah ditambahkan ke Data Vendor.

---

## 🎉 Benefits

1. ✅ **Hemat Waktu** - Tidak perlu manually create vendor
2. ✅ **Konsisten** - Data vendor selalu sinkron dengan kontrak
3. ✅ **No Duplikat** - Sistem otomatis cek vendor existing
4. ✅ **Real-time** - Chart langsung update
5. ✅ **User-Friendly** - Admin tidak perlu pindah halaman

---

## 🚀 Next Steps

Untuk melengkapi data vendor yang dibuat otomatis:

1. Buka **Data Vendor**
2. Cari vendor yang baru dibuat (status: Aktif)
3. Klik **Edit**
4. Lengkapi: Alamat, Telepon, Email, Kontak Person
5. Simpan
