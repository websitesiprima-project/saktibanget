# Fix Progress Tracker Error - Migration Guide

## Masalah
Error muncul saat menambahkan amandemen/progress tracker:
```
Gagal menambahkan progress tracker: Could not find the 'progress' column of 'contracts' in the schema cache
```

## Penyebab
Tabel `contracts` di database tidak memiliki kolom `progress` yang diperlukan untuk tracking progress kontrak.

## Solusi

### Option 1: Menggunakan Supabase SQL Editor (RECOMMENDED)

1. **Buka Supabase Dashboard**
   - Go to: https://app.supabase.com
   - Pilih project Anda
   - Klik menu "SQL Editor" di sidebar

2. **Jalankan Migration SQL**
   - Copy seluruh isi file: `database/add_progress_column_to_contracts.sql`
   - Paste ke SQL Editor
   - Klik "Run" untuk execute

3. **Verifikasi**
   ```sql
   -- Check if column exists
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'contracts' 
   AND column_name = 'progress';
   
   -- Check if contract_history table exists
   SELECT * FROM contract_history LIMIT 1;
   ```

### Option 2: Menggunakan Supabase CLI

```bash
# Install Supabase CLI jika belum
npm install -g supabase

# Login ke Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migration
supabase db push
```

### Option 3: Manual SQL Execution

Jalankan SQL berikut langsung di Supabase SQL Editor:

```sql
-- Add progress column
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);

-- Create contract_history table
CREATE TABLE IF NOT EXISTS contract_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    user_name VARCHAR(255),
    details TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_contract_history_contract_id ON contract_history(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_history_created_at ON contract_history(created_at DESC);

-- Enable RLS
ALTER TABLE contract_history ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY IF NOT EXISTS "Allow authenticated users to view contract history" 
  ON contract_history FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY IF NOT EXISTS "Allow authenticated users to insert contract history" 
  ON contract_history FOR INSERT 
  TO authenticated 
  WITH CHECK (true);
```

## Perubahan yang Dilakukan

### 1. Database Migration (`database/add_progress_column_to_contracts.sql`)
- ✅ Menambahkan kolom `progress` (INTEGER, 0-100) ke tabel `contracts`
- ✅ Membuat tabel `contract_history` untuk menyimpan riwayat perubahan
- ✅ Menambahkan indexes untuk performa query
- ✅ Mengatur Row Level Security (RLS) policies

### 2. Code Fix (`src/app/(admin)/aset/page.tsx`)
- ✅ Mengubah urutan operasi: insert history **dulu**, baru update progress
- ✅ Menambahkan error handling yang lebih robust
- ✅ Progress column update menjadi optional (tidak akan fail jika kolom belum ada)
- ✅ Tetap bisa menambahkan progress tracker meskipun kolom progress belum ada

## Testing

Setelah menjalankan migration, test dengan:

1. **Buka halaman Manajemen Kontrak**
2. **Klik pada salah satu kontrak**
3. **Pilih tab "Progress"**
4. **Klik "Buat Progress Tracker"**
5. **Isi form dan submit**

Harusnya tidak ada error lagi dan progress tracker berhasil ditambahkan.

## Rollback (jika diperlukan)

Jika ingin rollback perubahan:

```sql
-- Remove progress column
ALTER TABLE contracts DROP COLUMN IF EXISTS progress;

-- Drop contract_history table
DROP TABLE IF EXISTS contract_history CASCADE;
```

## Struktur Tabel Setelah Migration

### Table: contracts
```sql
- id (UUID, PK)
- name (VARCHAR)
- nomor_surat (VARCHAR)
- ... (existing columns)
- progress (INTEGER, 0-100) -- NEW COLUMN
```

### Table: contract_history (NEW TABLE)
```sql
- id (UUID, PK)
- contract_id (UUID, FK -> contracts.id)
- action (TEXT)
- user_name (VARCHAR)
- details (TEXT)
- created_at (TIMESTAMP)
```

## Troubleshooting

### Error: "relation contract_history does not exist"
**Solusi**: Jalankan migration SQL untuk membuat tabel

### Error: "column progress does not exist"
**Solusi**: Jalankan migration SQL untuk menambahkan kolom

### Error: "permission denied for table"
**Solusi**: Pastikan RLS policies sudah di-setup dengan benar

## Support

Jika masih ada masalah, check:
1. Supabase logs di Dashboard > Logs
2. Browser console untuk error details
3. Network tab untuk API request/response

## Catatan Penting

⚠️ **Backup Database**: Selalu backup database sebelum menjalankan migration
⚠️ **Testing**: Test di development environment dulu sebelum production
⚠️ **RLS**: Pastikan RLS policies sesuai dengan kebutuhan security aplikasi Anda
