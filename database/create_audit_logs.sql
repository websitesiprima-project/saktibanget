-- Create audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  details JSONB,
  ip_address VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Authenticated users can read audit_logs" 
  ON audit_logs FOR SELECT 
  TO authenticated 
  USING (true);

-- Allow insert access to authenticated users (so system/users can log actions)
CREATE POLICY "Authenticated users can insert audit_logs" 
  ON audit_logs FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
