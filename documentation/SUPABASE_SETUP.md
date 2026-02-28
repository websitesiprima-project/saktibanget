# Supabase Setup Guide - PLN SAKTI

## 🚀 Langkah-langkah Setup

### 1. Buat Supabase Project
1. Buka https://supabase.com
2. Login / Sign up
3. Klik "New Project"
4. Isi:
   - Project Name: `pln-vlaas`
   - Database Password: (simpan password ini!)
   - Region: Southeast Asia (Singapore)
5. Tunggu project selesai dibuat (~2 menit)

### 2. Dapatkan API Keys
1. Buka project Anda
2. Klik Settings (⚙️) → API
3. Copy:
   - **Project URL** (contoh: https://xxxxx.supabase.co)
   - **anon public** key (panjang, dimulai dengan eyJ...)

### 3. Update File .env
Buka file `.env` di root project dan isi:
```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...panjang_sekali
```

### 4. Buat Database Schema
Buka SQL Editor di Supabase Dashboard dan jalankan SQL berikut:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: vendors
CREATE TABLE vendors (
  id VARCHAR(50) PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  alamat TEXT,
  telepon VARCHAR(50),
  email VARCHAR(255) UNIQUE,
  kategori VARCHAR(100),
  kontak_person VARCHAR(255),
  status VARCHAR(50) DEFAULT 'Aktif',
  tanggal_registrasi TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table: assets
CREATE TABLE assets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  asset_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  location VARCHAR(255),
  status VARCHAR(50) DEFAULT 'Aktif',
  last_maintenance DATE,
  vendor_id UUID REFERENCES vendors(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table: audit_logs
CREATE TABLE audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  user_email VARCHAR(255),
  action TEXT NOT NULL,
  ip_address VARCHAR(50),
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (bisa diubah sesuai kebutuhan)
-- Allow authenticated users to read all vendors
CREATE POLICY "Allow authenticated read vendors" 
  ON vendors FOR SELECT 
  TO authenticated 
  USING (true);

-- Allow authenticated users to insert vendors
CREATE POLICY "Allow authenticated insert vendors" 
  ON vendors FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Allow authenticated users to update vendors
CREATE POLICY "Allow authenticated update vendors" 
  ON vendors FOR UPDATE 
  TO authenticated 
  USING (true);

-- Similar policies untuk assets
CREATE POLICY "Allow authenticated read assets" 
  ON assets FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated insert assets" 
  ON assets FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update assets" 
  ON assets FOR UPDATE 
  TO authenticated 
  USING (true);

-- Audit logs - hanya read
CREATE POLICY "Allow authenticated read audit_logs" 
  ON audit_logs FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated insert audit_logs" 
  ON audit_logs FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Function untuk auto update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers untuk auto update
CREATE TRIGGER update_vendors_updated_at 
  BEFORE UPDATE ON vendors 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at 
  BEFORE UPDATE ON assets 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Table: contracts
CREATE TABLE contracts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nomor_surat VARCHAR(100) NOT NULL,
  perihal TEXT NOT NULL,
  vendor_id UUID REFERENCES vendors(id),
  tanggal_mulai DATE,
  tanggal_selesai DATE,
  status VARCHAR(50) DEFAULT 'Pending', -- Pending, Approved, Rejected
  keterangan TEXT,
  file_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security for contracts
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Allow public/anon access for contracts (Development Mode)
CREATE POLICY "Allow public read contracts" 
  ON contracts FOR SELECT 
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert contracts" 
  ON contracts FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update contracts" 
  ON contracts FOR UPDATE 
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public delete contracts" 
  ON contracts FOR DELETE 
  TO anon, authenticated
  USING (true);

-- Allow public access for contract_history
CREATE POLICY "Allow public all contract_history"
  ON contract_history FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Allow public access for contract_files
CREATE POLICY "Allow public all contract_files"
  ON contract_files FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Table: contract_history
CREATE TABLE contract_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  user_name TEXT,
  details TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table: contract_files
CREATE TABLE contract_files (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  contract_id TEXT REFERENCES contracts(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS for new tables
ALTER TABLE contract_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_files ENABLE ROW LEVEL SECURITY;
```

### 5. Buat User Admin di Authentication
1. Buka Authentication → Users
2. Klik "Add User"
3. Isi:
   - Email: admin@pln.com (atau email Anda)
   - Password: (buat password yang kuat)
4. Klik "Create User"

### 6. Insert Sample Data (Opsional)
```sql
-- Sample vendors
INSERT INTO vendors (nama, alamat, telepon, email, kategori, kontak_person, status) VALUES
('PT Elektrindo Jaya', 'Jl. Sudirman No. 123, Jakarta', '021-1234567', 'info@elektrindo.com', 'Elektronik', 'Budi Santoso', 'Aktif'),
('CV Mitra Teknik', 'Jl. Gatot Subroto No. 45, Bandung', '022-7654321', 'kontak@mitrateknik.com', 'Teknik', 'Siti Rahma', 'Aktif');

-- Sample assets
INSERT INTO assets (asset_id, name, category, location, status, last_maintenance) VALUES
('AST001', 'Transformer 500KVA', 'Trafo', 'Gardu Induk Jakarta', 'Aktif', '2025-11-15'),
('AST002', 'Generator Set Diesel', 'Generator', 'PLTD Surabaya', 'Aktif', '2025-11-10');

-- Sample contracts (Pastikan UUID vendor_id valid dari table vendors)
-- Anda bisa mengambil UUID vendor setelah insert vendors dengan: SELECT id FROM vendors LIMIT 1;
-- Ganti 'VENDOR_UUID_HERE' dengan UUID asli.
-- Contoh dummy query (tidak akan jalan jika UUID tidak valid):
-- INSERT INTO contracts (nomor_surat, perihal, vendor_id, tanggal_mulai, tanggal_selesai, status, created_at) VALUES
-- ('SRT/001/X/2025', 'Pengadaan Trafo', 'VENDOR_UUID_HERE', '2025-01-01', '2025-12-31', 'Approved', '2025-01-15 10:00:00'),
-- ('SRT/002/X/2025', 'Maintenance Genset', 'VENDOR_UUID_HERE', '2025-02-01', '2025-02-28', 'Pending', '2025-02-10 09:30:00');
```

### 7. Test Koneksi
Restart development server:
```bash
npm run dev
```

Periksa console browser - tidak boleh ada error "Missing Supabase environment variables"

## 📁 File yang Sudah Dibuat

✅ `.env` - Environment variables  
✅ `src/lib/supabaseClient.js` - Supabase client config  
✅ `src/services/authService.js` - Authentication service  
✅ `src/services/vendorService.js` - Vendor CRUD operations  
✅ `src/services/assetService.js` - Asset CRUD operations  

## 🔄 Next Steps

1. Update halaman Login untuk menggunakan `authService.login()`
2. Update DataVendor untuk fetch data dari `vendorService.getAllVendors()`
3. Update ManajemenAset untuk fetch data dari `assetService.getAllAssets()`
4. Implement create/update/delete operations di modal forms

## ⚠️ Important Notes

- Jangan commit file `.env` ke git (sudah ada di .gitignore)
- Simpan password database dengan aman
- API keys harus dirahasiakan
- Untuk production, gunakan environment variables di hosting platform

## 📞 Troubleshooting

**Error: Missing Supabase environment variables**
→ Pastikan file `.env` sudah dibuat dan terisi dengan benar

**Error: Invalid API key**
→ Copy ulang API key dari Supabase Dashboard

**Error: relation "vendors" does not exist**
→ Jalankan SQL schema di SQL Editor

**CORS Error**
→ Pastikan domain Anda sudah ditambahkan di Supabase Dashboard → Settings → API → Site URL
