# Panduan Menambahkan Field Bank Pembayaran ke Tabel vendor_users

## Deskripsi
Script ini menambahkan 3 kolom baru ke tabel `vendor_users` untuk menyimpan informasi bank pembayaran vendor:
- `bank_name` - Nama bank (e.g., Bank Mandiri, BCA, BRI)
- `account_number` - Nomor rekening bank
- `account_name` - Nama pemilik rekening

## Cara Menjalankan di Supabase

### Langkah 1: Buka Supabase Dashboard
1. Login ke [Supabase Dashboard](https://app.supabase.com)
2. Pilih project Anda
3. Klik menu **SQL Editor** di sidebar kiri

### Langkah 2: Jalankan Script SQL
1. Klik tombol **New Query** atau **+ New**
2. Copy seluruh isi file `add_bank_fields_to_vendor_users.sql`
3. Paste ke SQL Editor
4. Klik tombol **Run** atau tekan `Ctrl + Enter`

### Langkah 3: Verifikasi
Setelah script berhasil dijalankan, Anda akan melihat hasil query yang menampilkan 3 kolom baru:
```
column_name      | data_type         | character_maximum_length | is_nullable
----------------|-------------------|-------------------------|-------------
bank_name       | character varying | 255                     | YES
account_number  | character varying | 50                      | YES
account_name    | character varying | 255                     | YES
```

### Langkah 4: Cek di Table Editor (Opsional)
1. Klik menu **Table Editor** di sidebar
2. Pilih tabel `vendor_users`
3. Scroll ke kanan untuk melihat kolom baru yang telah ditambahkan

## Kolom yang Ditambahkan

| Nama Kolom | Tipe Data | Panjang Maksimal | Nullable | Deskripsi |
|-----------|-----------|------------------|----------|-----------|
| bank_name | varchar | 255 | YES | Nama bank untuk pembayaran |
| account_number | varchar | 50 | YES | Nomor rekening bank |
| account_name | varchar | 255 | YES | Nama pemilik rekening |

## Dampak pada Aplikasi

Setelah kolom ditambahkan, fitur berikut akan berfungsi:

### Di Halaman Vendor Profile (`/vendor-portal/profile`)
Vendor dapat mengisi informasi bank pembayaran:
- Bank Pembayaran
- No. Rekening  
- Nama Rekening

### Di Halaman Admin Data Vendor (`/admin/vendor`)
Admin dapat melihat informasi bank di Detail Vendor:
- Bank Pembayaran
- No. Rekening
- Nama Rekening

Data yang diisi oleh vendor akan langsung tersinkronisasi dan terlihat di halaman admin.

## Catatan Penting
- Script menggunakan `IF NOT EXISTS` sehingga aman dijalankan berkali-kali
- Semua kolom bersifat opsional (nullable)
- Data existing tidak akan terpengaruh
- Vendor lama tidak wajib mengisi field bank (akan tampil "-" di admin)

## Rollback (Jika Diperlukan)
Jika ingin menghapus kolom yang telah ditambahkan:

```sql
ALTER TABLE vendor_users DROP COLUMN IF EXISTS bank_name;
ALTER TABLE vendor_users DROP COLUMN IF EXISTS account_number;
ALTER TABLE vendor_users DROP COLUMN IF EXISTS account_name;
```

⚠️ **Peringatan**: Rollback akan menghapus semua data yang telah tersimpan di kolom tersebut!
