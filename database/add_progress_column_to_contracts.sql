-- =====================================================
-- Add progress column to contracts table
-- untuk tracking progress kontrak (amendments/progress tracker)
-- =====================================================

-- Add progress column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='contracts' 
        AND column_name='progress'
    ) THEN
        ALTER TABLE contracts ADD COLUMN progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);
        COMMENT ON COLUMN contracts.progress IS 'Persentase progress kontrak (0-100)';
    END IF;
END $$;

-- Add contract_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS contract_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    user_name VARCHAR(255),
    details TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_contract_history_contract_id ON contract_history(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_history_created_at ON contract_history(created_at DESC);

-- Enable RLS on contract_history
ALTER TABLE contract_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for contract_history
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

-- Add comment
COMMENT ON TABLE contract_history IS 'Riwayat perubahan dan progress tracking untuk kontrak';
