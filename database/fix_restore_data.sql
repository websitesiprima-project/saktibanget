-- =====================================================
-- FIX: RESTORE MISSING PROFILES & ENABLE RLS
-- =====================================================

-- 1. Masukkan data profil otomatis dari tabel auth.users
-- Ini akan membuat profil untuk semua user yang sudah daftar tapi belum punya profil
INSERT INTO public.profiles (id, email, full_name, role, status, created_at, updated_at)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', email) as full_name,
    COALESCE(raw_user_meta_data->>'role', 'Admin') as role,
    'Aktif' as status,
    created_at,
    NOW()
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);

-- 2. Hidupkan kembali RLS (Keamanan)
-- Tadi sempat dimatikan untuk debugging, sekarang wajib dihidupkan lagi
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Cek hasil profile anda sekarang
SELECT * FROM profiles WHERE id = auth.uid();
