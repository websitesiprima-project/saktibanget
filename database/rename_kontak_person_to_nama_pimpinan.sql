-- Migration: Rename kolom kontak_person → nama_pimpinan di tabel vendors
-- Menyesuaikan nama kolom database dengan label di web (Nama Pimpinan)
-- Safe to run multiple times (cek existing dulu)

DO $$ 
BEGIN
    -- Cek apakah kolom kontak_person masih ada
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vendors' AND column_name = 'kontak_person'
    ) THEN
        -- Rename kontak_person → nama_pimpinan
        ALTER TABLE vendors RENAME COLUMN kontak_person TO nama_pimpinan;
        RAISE NOTICE '✅ Kolom kontak_person berhasil di-rename ke nama_pimpinan';
    ELSE
        -- Cek apakah nama_pimpinan sudah ada (migration sudah jalan sebelumnya)
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'vendors' AND column_name = 'nama_pimpinan'
        ) THEN
            RAISE NOTICE '⚠️ Kolom nama_pimpinan sudah ada, skip rename';
        ELSE
            -- Kolom belum ada sama sekali, buat baru
            ALTER TABLE vendors ADD COLUMN nama_pimpinan VARCHAR(255);
            RAISE NOTICE '✅ Kolom nama_pimpinan berhasil ditambahkan (baru)';
        END IF;
    END IF;
END $$;

COMMENT ON COLUMN vendors.nama_pimpinan IS 'Nama pimpinan/direktur perusahaan vendor (sebelumnya kontak_person)';
