# Panduan Sistem Undangan Vendor (Invitation Only)

## Gambaran Sistem

Sistem SAKTI PLN menggunakan metode **"Invitation Only"** untuk pendaftaran vendor. Alih-alih memberikan tombol "Register" di halaman publik, admin PLN yang menambahkan data vendor dan sistem mengirimkan undangan aktivasi via email.

## Alur Kerja

```
┌─────────────────────┐
│   1. Admin PLN      │
│   Tambah Data       │
│   Vendor Baru       │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   2. Sistem Kirim   │
│   Email Undangan    │
│   + Link Aktivasi   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   3. Vendor Klik    │
│   Link di Email     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   4. Vendor Buat    │
│   Password Sendiri  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   5. Akun Aktif     │
│   Vendor Bisa Login │
└─────────────────────┘
```

## Komponen Sistem

### 1. Database Migration

Jalankan file SQL berikut di Supabase SQL Editor:

```sql
-- File: database/add_vendor_activation_token.sql
```

Kolom baru yang ditambahkan ke tabel `vendor_users`:
- `activation_token` - Token unik untuk aktivasi (64 karakter)
- `activation_token_expires` - Waktu kadaluarsa token (72 jam)
- `is_activated` - Status apakah vendor sudah aktivasi
- `invited_by` - Nama admin yang mengundang
- `activated_at` - Timestamp aktivasi

### 2. API Endpoints

| Endpoint | Method | Fungsi |
|----------|--------|--------|
| `/api/send-invitation-email` | POST | Kirim email undangan |
| `/api/vendor-activate` | POST | Proses aktivasi akun |

### 3. Halaman

| URL | Fungsi |
|-----|--------|
| `/vendor-activate?token=xxx` | Halaman aktivasi vendor |
| `/vendor-login` | Halaman login vendor |

## Cara Penggunaan (Admin)

### Langkah 1: Tambah Vendor Baru

1. Buka halaman **Data Vendor** (`/vendor`)
2. Klik tombol **"Undang Vendor Baru"**
3. Isi data vendor:
   - Nama Vendor (wajib)
   - Email Vendor (wajib) - Link aktivasi akan dikirim ke sini
   - Alamat (wajib)
   - Telepon (wajib)
   - Kontak Person (wajib)
   - Data bank (opsional)
4. Klik **"Simpan & Kirim Undangan"**

### Langkah 2: Sistem Mengirim Email

Sistem akan otomatis:
1. Menyimpan data vendor dengan status "Menunggu Aktivasi"
2. Generate token aktivasi unik (berlaku 72 jam)
3. Mengirim email undangan ke vendor

### Langkah 3: Kirim Ulang Undangan

Jika vendor belum aktivasi dan perlu kirim ulang:
1. Temukan vendor di tabel
2. Klik tombol **kirim ulang** (ikon amplop) di kolom Aksi
3. Konfirmasi pengiriman

## Cara Penggunaan (Vendor)

### Langkah 1: Terima Email Undangan

Vendor akan menerima email berisi:
- Informasi bahwa mereka diundang oleh admin PLN
- Tombol "Aktifkan Akun Saya"
- Link aktivasi langsung

### Langkah 2: Buat Password

1. Klik link di email atau tombol "Aktifkan Akun Saya"
2. Akan diarahkan ke halaman aktivasi
3. Lihat info perusahaan dan email
4. Buat password baru yang memenuhi kriteria:
   - Minimal 8 karakter
   - Mengandung huruf besar
   - Mengandung huruf kecil
   - Mengandung angka
5. Konfirmasi password
6. Klik "Aktifkan Akun"

### Langkah 3: Login

Setelah aktivasi berhasil:
1. Otomatis diarahkan ke halaman login
2. Masukkan email dan password yang sudah dibuat
3. Akses portal vendor

## Status Vendor

| Status | Deskripsi |
|--------|-----------|
| **Menunggu Aktivasi** | Vendor baru ditambahkan, belum aktivasi |
| **Aktif** | Vendor sudah aktivasi atau aktif |
| **Berkontrak** | Vendor memiliki kontrak aktif |
| **Tidak Aktif** | Vendor dinonaktifkan |

## Troubleshooting

### Email Tidak Terkirim

1. Cek konfigurasi email di `.env`:
   ```
   GMAIL_USER=your-email@gmail.com
   GMAIL_APP_PASSWORD=your-app-password
   ```
2. Pastikan App Password sudah benar (bukan password biasa)
3. Gunakan fitur "Kirim Ulang Undangan" dari tabel vendor

### Link Kadaluarsa

Link aktivasi berlaku 72 jam. Jika kadaluarsa:
1. Admin kirim ulang undangan
2. Vendor gunakan link baru di email

### Vendor Lupa Password

Gunakan fitur "Lupa Password" di halaman login vendor.

## Keamanan

1. **Token Sekali Pakai**: Token dihapus setelah aktivasi
2. **Waktu Terbatas**: Token berlaku 72 jam
3. **Password Terenkripsi**: Password di-hash sebelum disimpan
4. **Validasi Kuat**: Password harus memenuhi kriteria keamanan

## Environment Variables

Pastikan variabel berikut sudah dikonfigurasi:

```env
# Email (untuk kirim undangan)
GMAIL_USER=admin@pln.co.id
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx

# Base URL (untuk link aktivasi)
NEXT_PUBLIC_BASE_URL=https://sakti-pln.vercel.app

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Password Salt (opsional, untuk keamanan tambahan)
PASSWORD_SALT=your-custom-salt
```
