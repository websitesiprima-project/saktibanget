-- =====================================================
-- PLN SAKTI Database Schema
-- Sistem Arsip & Kontrak Terintegrasi
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- DROP existing tables (untuk memastikan struktur baru)
-- =====================================================
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS system_config CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;

-- =====================================================
-- Table: profiles
-- User profiles untuk admin dan users
-- =====================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  role VARCHAR(50) DEFAULT 'Admin' CHECK (role IN ('Super Admin', 'Admin', 'Verifikator')),
  status VARCHAR(50) DEFAULT 'Aktif' CHECK (status IN ('Aktif', 'Nonaktif')),
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- Table: vendors
-- Data vendor/mitra bisnis
-- =====================================================
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

-- =====================================================
-- Table: assets
-- Manajemen aset/barang
-- =====================================================
CREATE TABLE assets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  asset_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  location VARCHAR(255),
  status VARCHAR(50) DEFAULT 'Aktif',
  last_maintenance DATE,
  vendor_id VARCHAR(50) REFERENCES vendors(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- Table: contracts
-- Kontrak/dokumen
-- =====================================================
CREATE TABLE contracts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255),
  nomor_surat VARCHAR(100) NOT NULL,
  perihal TEXT NOT NULL,
  tanggal_masuk DATE,
  start_date DATE,
  end_date DATE,
  pengirim VARCHAR(255),
  penerima VARCHAR(255),
  recipient VARCHAR(255),
  invoice_number VARCHAR(100),
  amount DECIMAL(15,2) DEFAULT 0,
  budget_type VARCHAR(100),
  contract_type VARCHAR(100),
  status VARCHAR(50) DEFAULT 'Pending',
  kategori VARCHAR(100),
  location VARCHAR(255),
  file_url TEXT,
  file_name VARCHAR(255),
  google_drive_id VARCHAR(255),
  notes TEXT,
  vendor_id VARCHAR(50) REFERENCES vendors(id),
  vendor_name VARCHAR(255),
  created_by UUID REFERENCES auth.users(id),
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- Table: audit_logs
-- Log aktivitas user untuk audit trail
-- =====================================================
CREATE TABLE audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  details JSONB,
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- Table: system_config
-- Konfigurasi sistem
-- =====================================================
CREATE TABLE system_config (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  retention_enabled BOOLEAN DEFAULT true,
  retention_months INTEGER DEFAULT 12,
  email_notif_enabled BOOLEAN DEFAULT true,
  approved_template TEXT,
  rejected_template TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default system config if not exists
INSERT INTO system_config (retention_enabled, retention_months, email_notif_enabled, approved_template, rejected_template)
SELECT true, 12, true, 
  'Dokumen Anda telah disetujui dan siap diproses lebih lanjut.',
  'Dokumen Anda ditolak. Silakan perbaiki dan ajukan kembali.'
WHERE NOT EXISTS (SELECT 1 FROM system_config LIMIT 1);

-- =====================================================
-- Sample Data (Optional - untuk testing)
-- =====================================================

-- Sample vendors
INSERT INTO vendors (id, nama, alamat, telepon, email, kategori, kontak_person, status) VALUES
('VND001', 'PT Teknologi Indonesia', 'Jakarta Pusat', '021-12345678', 'contact@tekindo.com', 'IT Services', 'Budi Santoso', 'Aktif'),
('VND002', 'CV Mitra Solusi', 'Bandung', '022-87654321', 'info@mitrasolusi.com', 'Consulting', 'Ani Wijaya', 'Aktif'),
('VND003', 'PT Cahaya Network', 'Surabaya', '031-11223344', 'admin@cahaya.net', 'Network Infrastructure', 'Dedi Hartono', 'Aktif');

-- Sample contracts
INSERT INTO contracts (name, nomor_surat, perihal, tanggal_masuk, start_date, end_date, pengirim, penerima, status, kategori, vendor_id, vendor_name, notes) VALUES
('Kontrak Pemeliharaan Server 2025', 'SK/PLN/001/2025', 'Pemeliharaan dan Monitoring Server PLN', '2025-01-15', '2025-02-01', '2025-12-31', 'PT Teknologi Indonesia', 'PLN Unit Manado', 'Aktif', 'IT Maintenance', 'VND001', 'PT Teknologi Indonesia', 'Kontrak pemeliharaan server tahunan'),
('Perjanjian Konsultasi IT', 'SK/PLN/002/2025', 'Konsultasi dan Implementasi Sistem Arsip Digital', '2025-01-10', '2025-01-20', '2025-06-30', 'CV Mitra Solusi', 'PLN Unit Manado', 'Aktif', 'Consulting', 'VND002', 'CV Mitra Solusi', 'Konsultasi untuk digitalisasi arsip'),
('Kontrak Infrastruktur Jaringan', 'SK/PLN/003/2024', 'Pemasangan dan Konfigurasi Network Equipment', '2024-11-01', '2024-12-01', '2025-11-30', 'PT Cahaya Network', 'PLN Unit Manado', 'Aktif', 'Infrastructure', 'VND003', 'PT Cahaya Network', 'Upgrade infrastruktur jaringan PLN'),
('Pengadaan Software Lisensi', 'SK/PLN/004/2024', 'Pembelian Lisensi Software Enterprise', '2024-10-15', '2024-11-01', '2025-10-31', 'PT Teknologi Indonesia', 'PLN Unit Manado', 'Selesai', 'Software', 'VND001', 'PT Teknologi Indonesia', 'Lisensi software sudah diterima'),
('Kontrak Pelatihan Karyawan', 'SK/PLN/005/2025', 'Pelatihan IT Security dan Data Protection', '2025-01-20', '2025-02-15', '2025-02-20', 'CV Mitra Solusi', 'PLN Unit Manado', 'Pending', 'Training', 'VND002', 'CV Mitra Solusi', 'Menunggu konfirmasi jadwal pelatihan');

-- Sample assets
INSERT INTO assets (asset_id, name, category, location, status, last_maintenance, vendor_id) VALUES
('AST001', 'Server Dell PowerEdge R740', 'Server', 'Data Center - Rack A1', 'Aktif', '2025-01-10', 'VND001'),
('AST002', 'Switch Cisco Catalyst 9300', 'Network Equipment', 'Data Center - Rack B2', 'Aktif', '2025-01-05', 'VND003'),
('AST003', 'Firewall FortiGate 200E', 'Security Device', 'Data Center - Rack C1', 'Aktif', '2024-12-28', 'VND003'),
('AST004', 'UPS APC Smart-UPS 3000VA', 'Power Supply', 'Data Center - Floor 1', 'Aktif', '2024-12-15', 'VND001'),
('AST005', 'Storage NAS Synology DS1821+', 'Storage', 'Data Center - Rack A2', 'Maintenance', '2025-01-18', 'VND001');

-- =====================================================
-- Enable Row Level Security (RLS)
-- =====================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS Policies - Profiles
-- =====================================================
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" 
  ON profiles FOR SELECT 
  TO authenticated 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Super Admin can view all profiles" ON profiles;
CREATE POLICY "Super Admin can view all profiles" 
  ON profiles FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'Super Admin'
    )
  );

DROP POLICY IF EXISTS "Super Admin can insert profiles" ON profiles;
CREATE POLICY "Super Admin can insert profiles" 
  ON profiles FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'Super Admin'
    )
  );

DROP POLICY IF EXISTS "Super Admin can update profiles" ON profiles;
CREATE POLICY "Super Admin can update profiles" 
  ON profiles FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'Super Admin'
    )
  );

-- =====================================================
-- RLS Policies - Vendors
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can read vendors" ON vendors;
CREATE POLICY "Authenticated users can read vendors" 
  ON vendors FOR SELECT 
  TO authenticated 
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert vendors" ON vendors;
CREATE POLICY "Authenticated users can insert vendors" 
  ON vendors FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update vendors" ON vendors;
CREATE POLICY "Authenticated users can update vendors" 
  ON vendors FOR UPDATE 
  TO authenticated 
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete vendors" ON vendors;
CREATE POLICY "Authenticated users can delete vendors" 
  ON vendors FOR DELETE 
  TO authenticated 
  USING (true);

-- =====================================================
-- RLS Policies - Assets
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can read assets" ON assets;
CREATE POLICY "Authenticated users can read assets" 
  ON assets FOR SELECT 
  TO authenticated 
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert assets" ON assets;
CREATE POLICY "Authenticated users can insert assets" 
  ON assets FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update assets" ON assets;
CREATE POLICY "Authenticated users can update assets" 
  ON assets FOR UPDATE 
  TO authenticated 
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete assets" ON assets;
CREATE POLICY "Authenticated users can delete assets" 
  ON assets FOR DELETE 
  TO authenticated 
  USING (true);

-- =====================================================
-- RLS Policies - Contracts
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can read contracts" ON contracts;
CREATE POLICY "Authenticated users can read contracts" 
  ON contracts FOR SELECT 
  TO authenticated 
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert contracts" ON contracts;
CREATE POLICY "Authenticated users can insert contracts" 
  ON contracts FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update contracts" ON contracts;
CREATE POLICY "Authenticated users can update contracts" 
  ON contracts FOR UPDATE 
  TO authenticated 
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can delete contracts" ON contracts;
CREATE POLICY "Authenticated users can delete contracts" 
  ON contracts FOR DELETE 
  TO authenticated 
  USING (true);

-- =====================================================
-- RLS Policies - Audit Logs
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can read audit_logs" ON audit_logs;
CREATE POLICY "Authenticated users can read audit_logs" 
  ON audit_logs FOR SELECT 
  TO authenticated 
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert audit_logs" ON audit_logs;
CREATE POLICY "Authenticated users can insert audit_logs" 
  ON audit_logs FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- =====================================================
-- RLS Policies - System Config
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can read system_config" ON system_config;
CREATE POLICY "Authenticated users can read system_config" 
  ON system_config FOR SELECT 
  TO authenticated 
  USING (true);

DROP POLICY IF EXISTS "Super Admin can update system_config" ON system_config;
CREATE POLICY "Super Admin can update system_config" 
  ON system_config FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'Super Admin'
    )
  );

-- =====================================================
-- Functions & Triggers
-- =====================================================

-- Function untuk auto update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers untuk auto update timestamp
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vendors_updated_at ON vendors;
CREATE TRIGGER update_vendors_updated_at 
  BEFORE UPDATE ON vendors 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assets_updated_at ON assets;
CREATE TRIGGER update_assets_updated_at 
  BEFORE UPDATE ON assets 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contracts_updated_at ON contracts;
CREATE TRIGGER update_contracts_updated_at 
  BEFORE UPDATE ON contracts 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Function untuk auto create profile saat user register
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Admin'),
    'Aktif'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger untuk auto create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- Indexes untuk performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_vendors_email ON vendors(email);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(status);
CREATE INDEX IF NOT EXISTS idx_assets_vendor_id ON assets(vendor_id);
CREATE INDEX IF NOT EXISTS idx_contracts_vendor_id ON contracts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- =====================================================
-- Done!
-- =====================================================
