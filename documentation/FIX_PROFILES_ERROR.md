# 🔧 Fix Error: Table 'profiles' Not Found

## ❌ Error Yang Terjadi

```
Gagal memperbarui profil: Could not find the table 'public.profiles' in the schema cache
```

## ✅ Solusi

### Langkah 1: Buka Supabase Dashboard

1. Buka <https://supabase.com>
2. Login dan pilih project **pln-sakti** Anda
3. Klik menu **SQL Editor** di sidebar kiri

### Langkah 2: Jalankan Database Schema

1. Di SQL Editor, klik tombol **+ New query**
2. Copy **seluruh isi** file `database_schema.sql` (file baru yang baru dibuat)
3. Paste ke SQL Editor
4. Klik tombol **Run** atau tekan `Ctrl+Enter`
5. Tunggu sampai muncul notifikasi **Success. No rows returned**

### Langkah 3: Verifikasi Tabel Sudah Dibuat

1. Klik menu **Table Editor** di sidebar
2. Pastikan tabel-tabel berikut sudah muncul:
   - ✅ profiles
   - ✅ vendors
   - ✅ assets
   - ✅ contracts
   - ✅ audit_logs
   - ✅ system_config

### Langkah 4: Test Update Profile

1. Refresh halaman web aplikasi Anda (F5)
2. Login kembali
3. Pergi ke halaman **Pengaturan**
4. Coba update profile Anda
5. Seharusnya sudah bisa! ✅

## 📋 Yang Dibuat oleh Schema

### Tabel Utama

1. **profiles** - Data profil user (admin, verifikator, dll)
2. **vendors** - Data vendor/mitra
3. **assets** - Manajemen aset
4. **contracts** - Kontrak dan dokumen
5. **audit_logs** - Log aktivitas untuk audit trail
6. **system_config** - Konfigurasi sistem (retensi, notifikasi, dll)

### Fitur Keamanan

- ✅ Row Level Security (RLS) enabled untuk semua tabel
- ✅ Policy Super Admin bisa manage semua users
- ✅ Policy user biasa hanya bisa edit profile sendiri
- ✅ Trigger auto-create profile saat user register

### Fitur Otomatis

- ✅ Auto update `updated_at` timestamp
- ✅ Auto create profile saat ada user baru
- ✅ Default system config otomatis dibuat
- ✅ Indexes untuk performance queries

## ⚠️ Catatan Penting

1. **Jangan hapus tabel auth.users** - Ini tabel bawaan Supabase untuk authentication
2. **Backup dulu** - Jika Anda sudah punya data, backup dulu sebelum run schema ini
3. **Run sekali saja** - Schema ini aman untuk di-run berulang kali (menggunakan `IF NOT EXISTS` dan `DROP IF EXISTS`)

## 🔍 Troubleshooting

### Error: "permission denied for schema auth"

**Solusi**: Ini normal, abaikan saja. Fungsi handle_new_user tetap akan bekerja karena menggunakan `SECURITY DEFINER`.

### Error: "relation already exists"

**Solusi**: Ini artinya tabel sudah ada. Tidak masalah, lanjutkan saja.

### Profile tidak otomatis dibuat saat register user baru

**Solusi**:

1. Periksa trigger `on_auth_user_created` sudah ada di Database → Triggers
2. Atau buat profile manual via SQL Editor:

```sql
INSERT INTO profiles (id, email, full_name, role)
VALUES (
  'user_id_dari_auth_users',
  'email@example.com',
  'Nama Lengkap',
  'Admin'
);
```

## 📞 Butuh Bantuan?

Jika masih error, cek:

1. Console browser (F12) untuk error detail
2. Supabase Dashboard → Logs untuk error server
3. Pastikan RLS policies sudah ter-enable

---

**Setelah setup ini selesai, semua fitur di halaman Pengaturan akan berfungsi penuh!** ✨
