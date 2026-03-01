-- =====================================================
-- FIX RLS: payment_stages table
-- Jalankan di Supabase SQL Editor
-- =====================================================

-- Aktifkan RLS (jika belum)
ALTER TABLE public.payment_stages ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama jika ada
DROP POLICY IF EXISTS "Allow all on payment_stages" ON public.payment_stages;
DROP POLICY IF EXISTS "payment_stages_select" ON public.payment_stages;
DROP POLICY IF EXISTS "payment_stages_insert" ON public.payment_stages;
DROP POLICY IF EXISTS "payment_stages_update" ON public.payment_stages;
DROP POLICY IF EXISTS "payment_stages_delete" ON public.payment_stages;

-- Buat policy: izinkan semua operasi untuk semua user (anon + authenticated)
CREATE POLICY "Allow all on payment_stages"
  ON public.payment_stages
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
