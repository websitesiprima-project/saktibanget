# 🔄 Panduan Fitur Manajemen Status Vendor

## 📋 Ringkasan Fitur

Sistem SAKTI sekarang mendukung 3 status vendor:
- **Aktif** - Vendor terdaftar dan dapat mengajukan surat
- **Dalam Kontrak** - Vendor sedang mengerjakan kontrak aktif
- **Tidak Aktif** - Vendor yang sudah dinonaktifkan/dihapus

---

## 🆕 Fitur yang Ditambahkan

### 1. **Hapus Akun Vendor (Soft Delete)**

Vendor dapat menonaktifkan akun mereka sendiri dari halaman profil.

#### Cara Menggunakan:
1. Login sebagai vendor
2. Buka **Profil Perusahaan**
3. Klik tombol **Hapus Akun** (merah) di pojok kanan atas
4. Konfirmasi penghapusan
5. Status vendor berubah menjadi "Tidak Aktif"
6. Otomatis logout dan tidak bisa login kembali

#### Catatan Penting:
- ✅ Data profil tetap tersimpan di database
- ✅ Vendor tidak dapat login lagi
- ✅ Status berubah menjadi "Tidak Aktif"
- ❌ Bukan hard delete (data tidak benar-benar terhapus)

---

### 2. **Auto-Update Status "Dalam Kontrak"**

Sistem otomatis mengupdate status vendor menjadi "Dalam Kontrak" jika mereka memiliki kontrak aktif.

#### Status Kontrak Aktif:
- Terkontrak
- Dalam Proses Pekerjaan
- Dalam Pemeriksaan
- Telah Diperiksa

#### Kapan Status Diupdate?
Status vendor akan diupdate secara otomatis setiap kali:
- Admin membuka halaman **Data Vendor**
- Data vendor di-refresh
- Vendor login/logout

#### Logika:
```javascript
// Vendor punya kontrak aktif → Status: "Dalam Kontrak"
// Vendor tidak punya kontrak aktif → Status: "Aktif"
// Vendor dihapus → Status: "Tidak Aktif" (tetap)
```

---

### 3. **Filter Dropdown Vendor di Form Kontrak**

Saat admin menambahkan kontrak baru, dropdown **Nama Vendor** hanya menampilkan vendor dengan status:
- ✅ Aktif
- ✅ Dalam Kontrak
- ❌ Tidak Aktif (hidden)

#### Cara Kerja:
1. Buka **Manajemen Kontrak**
2. Klik **Tambah Kontrak Baru**
3. Field **Nama Vendor** sekarang menggunakan dropdown
4. Hanya vendor aktif/dalam kontrak yang muncul
5. Select vendor dan lanjutkan

---

## 📊 Tampilan Status di Admin

### Halaman Data Vendor

**Kolom Status** menampilkan badge warna:
- 🟢 **Aktif** - Hijau
- 🟡 **Dalam Kontrak** - Kuning/Orange
- 🔴 **Tidak Aktif** - Merah

**Stats Card** di atas tabel:
```
Total Vendor: XX
Vendor Aktif: XX
Vendor Dalam Kontrak: XX
Vendor Tidak Aktif: XX
```

---

## 🗂️ Database Schema

### Tabel: `vendor_users`

Kolom baru yang ditambahkan:
```sql
status VARCHAR(50) DEFAULT 'Aktif'
```

Nilai yang valid:
- `'Aktif'`
- `'Dalam Kontrak'`
- `'Tidak Aktif'`

---

## 🔧 File yang Dimodifikasi

### 1. **Migration SQL**
```
supabase/migrations/add_status_to_vendor_users.sql
```
- Menambahkan kolom `status` ke tabel `vendor_users`
- Set default value 'Aktif'
- Update existing records

### 2. **Service Layer**
```
src/services/vendorAccountService.ts (NEW)
```
- `deactivateVendorAccount()` - Soft delete akun vendor
- `updateVendorContractStatus()` - Auto-update status berdasarkan kontrak

### 3. **Vendor Profile Page**
```
src/app/vendor-portal/profile/page.tsx
```
- Tambah tombol "Hapus Akun"
- Modal konfirmasi delete
- Integrasi dengan `deactivateVendorAccount()`
- Auto logout setelah delete

### 4. **Admin Data Vendor**
```
src/app/(admin)/vendor/page.tsx
```
- Import `updateVendorContractStatus()`
- Call update status di `fetchVendors()`
- Update `getStatusClass()` support "Dalam Kontrak"
- Tambah stats card "Vendor Dalam Kontrak"
- Update dropdown status form

### 5. **Admin Manajemen Kontrak**
```
src/app/(admin)/aset/page.tsx
```
- State `activeVendors` untuk menyimpan list vendor aktif
- Function `fetchActiveVendors()` - Query vendor aktif/dalam kontrak
- Update field vendor dari input text → dropdown select
- Filter hanya vendor dengan status Aktif atau Dalam Kontrak

### 6. **CSS Styling**
```
src/app/(admin)/vendor/DataVendor.css
```
- Class `.status-dalam-kontrak` - Warna kuning/orange

---

## 🧪 Testing Checklist

### Test Hapus Akun Vendor:
- [ ] Login sebagai vendor
- [ ] Klik tombol "Hapus Akun"
- [ ] Konfirmasi modal muncul dengan warning
- [ ] Klik "Ya, Hapus Akun"
- [ ] Status berubah jadi "Tidak Aktif" di database
- [ ] Auto logout dan redirect ke login
- [ ] Coba login lagi → harus gagal

### Test Auto-Update Status:
- [ ] Buat kontrak baru dengan vendor tertentu
- [ ] Status kontrak: "Dalam Proses Pekerjaan"
- [ ] Refresh halaman Data Vendor
- [ ] Status vendor berubah jadi "Dalam Kontrak"
- [ ] Update status kontrak jadi "Selesai"
- [ ] Refresh Data Vendor lagi
- [ ] Status vendor kembali jadi "Aktif"

### Test Dropdown Vendor:
- [ ] Buat vendor baru dengan status "Aktif"
- [ ] Buat vendor lain dengan status "Tidak Aktif"
- [ ] Buka form Tambah Kontrak
- [ ] Dropdown vendor hanya tampilkan vendor aktif
- [ ] Vendor tidak aktif tidak muncul di dropdown
- [ ] Select vendor dan simpan kontrak
- [ ] Vendor otomatis jadi "Dalam Kontrak"

---

## 📱 User Flow

### Vendor: Hapus Akun
```
1. Vendor login
2. Dashboard Vendor → Profil Perusahaan
3. Klik "Hapus Akun" (tombol merah)
4. Modal konfirmasi: "Apakah Anda yakin?"
   - Info: Akun dinonaktifkan, tidak bisa login
5. Klik "Ya, Hapus Akun"
6. Loading... → Success
7. Alert: "Akun berhasil dinonaktifkan"
8. Auto logout → Redirect ke halaman login
9. Coba login → Error: "Akun tidak aktif"
```

### Admin: Tambah Kontrak dengan Vendor
```
1. Admin login
2. Manajemen Kontrak → Tambah Kontrak Baru
3. Form modal terbuka
4. Field "Nama Vendor" = DROPDOWN (bukan text input)
5. Dropdown hanya tampilkan vendor:
   - Status "Aktif"
   - Status "Dalam Kontrak"
6. Select vendor → Isi form lain → Simpan
7. Kontrak tersimpan
8. Status vendor auto-update jadi "Dalam Kontrak"
9. Buka Data Vendor → Cek status vendor
10. Badge kuning "Dalam Kontrak" ✅
```

---

## ⚠️ Catatan Penting

### Untuk Admin:
1. **Status "Dalam Kontrak" otomatis** - Jangan edit manual kecuali diperlukan
2. **Vendor "Tidak Aktif" tidak bisa login** - Data tetap ada di database
3. **Dropdown vendor hanya aktif** - Vendor tidak aktif tidak muncul saat tambah kontrak
4. **Refresh Data Vendor** - Status akan auto-update setiap kali halaman dibuka

### Untuk Vendor:
1. **Hapus Akun = Permanent** - Tidak bisa login lagi setelah dihapus
2. **Data tetap tersimpan** - Admin masih bisa lihat histori
3. **Status "Dalam Kontrak"** - Otomatis jika punya kontrak aktif
4. **Tidak bisa reactivate** - Harus hubungi admin untuk aktivasi ulang

---

## 🔄 Maintenance

### Update Status Vendor Secara Manual (jika diperlukan)

SQL untuk reset semua status:
```sql
-- Set semua vendor jadi Aktif
UPDATE vendor_users SET status = 'Aktif';

-- Set vendor tertentu jadi Tidak Aktif
UPDATE vendor_users 
SET status = 'Tidak Aktif' 
WHERE email = 'vendor@example.com';

-- Cek vendor dengan kontrak aktif
SELECT DISTINCT vendor_name 
FROM contracts 
WHERE status IN ('Terkontrak', 'Dalam Proses Pekerjaan', 'Dalam Pemeriksaan', 'Telah Diperiksa');
```

---

## 📞 Support

Jika ada masalah:
1. Cek console browser (F12) untuk error
2. Cek database: `vendor_users.status`
3. Cek Supabase logs
4. Pastikan migration sudah dijalankan

---

**Last Updated:** 26 Januari 2026
**Version:** 1.0.0
