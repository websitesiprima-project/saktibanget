-- =====================================================
-- DEBUG: DISABLE RLS TEMPORARY
-- =====================================================
-- Script ini untuk memastikan apakah masalahnya benar-benar ada di RLS.

-- 1. Matikan RLS di tabel profiles
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Keterangan:
-- Setelah script ini dijalankan, SEMUA user bisa update SEMUA profil (Sangat tidak aman).
-- Ini HANYA untuk mengetes apakah Update Profile bisa jalan.
-- Jika setelah ini BERHASIL, berarti memang settingan Policy kita yang salah.
-- Mohon kabari hasilnya segera agar bisa kita amankan kembali.
