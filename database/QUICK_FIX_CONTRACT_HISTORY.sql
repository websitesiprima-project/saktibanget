-- =====================================================
-- QUICK FIX: Buat tabel contract_history
-- Copy dan paste SEMUA SQL ini ke Supabase SQL Editor
-- =====================================================

-- 1. Buat tabel contract_history (untuk menyimpan riwayat amandemen & progress)
CREATE TABLE IF NOT EXISTS contract_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    user_name VARCHAR(255),
    details TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Tambahkan kolom progress ke tabel contracts
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='contracts' 
        AND column_name='progress'
    ) THEN
        ALTER TABLE contracts ADD COLUMN progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);
    END IF;
END $$;

-- 3. Buat index untuk performa lebih baik
CREATE INDEX IF NOT EXISTS idx_contract_history_contract_id ON contract_history(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_history_created_at ON contract_history(created_at DESC);

-- 4. Enable Row Level Security
ALTER TABLE contract_history ENABLE ROW LEVEL SECURITY;

-- 5. Buat RLS Policies
DROP POLICY IF EXISTS "Allow authenticated users to view contract history" ON contract_history;
CREATE POLICY "Allow authenticated users to view contract history" 
  ON contract_history FOR SELECT 
  TO authenticated 
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to insert contract history" ON contract_history;
CREATE POLICY "Allow authenticated users to insert contract history" 
  ON contract_history FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated users to delete contract history" ON contract_history;
CREATE POLICY "Allow authenticated users to delete contract history" 
  ON contract_history FOR DELETE 
  TO authenticated 
  USING (true);

-- 6. Verifikasi: Check apakah tabel berhasil dibuat
SELECT 
    'contract_history table created!' as status,
    COUNT(*) as total_records 
FROM contract_history;

SELECT 
    'progress column exists!' as status,
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE table_name = 'contracts' 
AND column_name = 'progress';
