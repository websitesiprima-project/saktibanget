# Fix Supabase Row Level Security (RLS) Policy Error

## Problem
Error: `new row violates row-level security policy for table "contracts"`

Ini terjadi karena tabel `contracts` memiliki Row Level Security (RLS) aktif, tetapi tidak ada policy yang mengizinkan user untuk membaca atau menulis data.

## Solution

Buka Supabase Dashboard dan jalankan SQL query berikut:

### 1. Disable RLS (Solusi Cepat - Untuk Development)

```sql
-- Disable RLS untuk tabel contracts
ALTER TABLE contracts DISABLE ROW LEVEL SECURITY;

-- Disable RLS untuk tabel contract_history
ALTER TABLE contract_history DISABLE ROW LEVEL SECURITY;
```

### 2. Enable RLS dengan Policy (Solusi Aman - Untuk Production)

```sql
-- Enable RLS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_history ENABLE ROW LEVEL SECURITY;

-- Buat policy untuk allow all operations (development)
CREATE POLICY "Allow all operations on contracts" ON contracts
FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all operations on contract_history" ON contract_history
FOR ALL
USING (true)
WITH CHECK (true);
```

### 3. Policy dengan Authentication (Lebih Aman)

```sql
-- Policy untuk authenticated users saja
CREATE POLICY "Allow authenticated users to read contracts" ON contracts
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert contracts" ON contracts
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update contracts" ON contracts
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete contracts" ON contracts
FOR DELETE
TO authenticated
USING (true);

-- Ulangi untuk contract_history
CREATE POLICY "Allow authenticated users to read history" ON contract_history
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert history" ON contract_history
FOR INSERT
TO authenticated
WITH CHECK (true);
```

## Langkah-langkah

1. **Buka Supabase Dashboard**: https://app.supabase.com
2. **Pilih Project Anda**
3. **Klik SQL Editor** di sidebar kiri
4. **Copy-paste** salah satu query di atas (pilih opsi 1 untuk cepat, atau opsi 2/3 untuk lebih aman)
5. **Klik Run** atau tekan `Ctrl+Enter`
6. **Refresh halaman website** Anda

## Verifikasi

Setelah menjalankan query, coba:
1. Refresh halaman `/dashboard` atau `/aset`
2. Data seharusnya muncul
3. Coba tambah kontrak baru - seharusnya berhasil tanpa error RLS

## Catatan Keamanan

- **Opsi 1 (Disable RLS)**: Cocok untuk development/testing, tidak aman untuk production
- **Opsi 2 (Allow All)**: Semua orang bisa akses data, tidak aman untuk production dengan data sensitif
- **Opsi 3 (Authenticated)**: Hanya user yang login bisa akses, lebih aman untuk production

Untuk production, sebaiknya gunakan **Opsi 3** dan pastikan sistem authentication Anda sudah berjalan dengan baik.
