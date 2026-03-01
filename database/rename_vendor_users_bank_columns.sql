-- =====================================================
-- Rename kolom bank di vendor_users agar sama dengan vendors
-- vendors    : bank_pembayaran, no_rekening, nama_rekening
-- vendor_users: bank_name → bank_pembayaran
--               account_number → no_rekening
--               account_name → nama_rekening
-- Jalankan di Supabase SQL Editor
-- =====================================================

ALTER TABLE public.vendor_users RENAME COLUMN bank_name TO bank_pembayaran;
ALTER TABLE public.vendor_users RENAME COLUMN account_number TO no_rekening;
ALTER TABLE public.vendor_users RENAME COLUMN account_name TO nama_rekening;
