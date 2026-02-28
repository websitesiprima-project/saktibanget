# 🚨 QUICK FIX: Amandemen Tidak Muncul

## Masalah
Amandemen sudah dibuat tapi tidak muncul di tab "Amandemen"

## Penyebab
Tabel `contract_history` belum dibuat di database Supabase Anda.

## Solusi Cepat (5 Menit)

### Langkah 1: Buka Supabase SQL Editor
1. Buka browser, ke: **https://app.supabase.com**
2. Login dengan akun Anda
3. Pilih project: **PLN SAKTI** (atau nama project Anda)
4. Di sidebar kiri, klik: **SQL Editor** (icon ⚡)

### Langkah 2: Jalankan Migration SQL
1. File `database/QUICK_FIX_CONTRACT_HISTORY.sql` sudah terbuka di VS Code
2. **Tekan Ctrl+A** untuk select all
3. **Tekan Ctrl+C** untuk copy
4. Kembali ke Supabase SQL Editor
5. **Klik "+ New query"** atau gunakan editor yang ada
6. **Tekan Ctrl+V** untuk paste SQL
7. **Klik tombol "RUN"** (atau tekan Ctrl+Enter)

### Langkah 3: Verifikasi
Setelah RUN berhasil, Anda akan melihat hasil query di bawah:
```
✓ contract_history table created! | total_records: 0
✓ progress column exists! | progress | integer
```

### Langkah 4: Reload Browser
1. Kembali ke halaman **Manajemen Kontrak**
2. Tekan **F5** atau **Ctrl+R** untuk reload
3. Klik kontrak yang sudah punya amandemen
4. Buka tab **"Amandemen"**
5. ✅ Amandemen sekarang akan muncul!

## Troubleshooting

### ❌ Error: "relation contract_history already exists"
**Artinya**: Tabel sudah ada, tapi mungkin RLS policies belum disetup.

**Solusi**: Jalankan SQL ini saja:
```sql
-- Enable RLS
ALTER TABLE contract_history ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY IF NOT EXISTS "Allow authenticated users to view contract history" 
  ON contract_history FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "Allow authenticated users to insert contract history" 
  ON contract_history FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow authenticated users to delete contract history" 
  ON contract_history FOR DELETE TO authenticated USING (true);
```

### ❌ Error: "column progress does not exist"
**Artinya**: Kolom progress belum ditambahkan.

**Solusi**: Jalankan SQL ini:
```sql
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);
```

### ❌ Amandemen masih tidak muncul setelah migration
**Kemungkinan penyebab**:
1. Browser cache - Hard reload dengan **Ctrl+Shift+R**
2. Console error - Tekan **F12** di browser, check tab "Console" untuk error
3. Data belum tersimpan - Check tabel contract_history di Supabase:
   ```sql
   SELECT * FROM contract_history ORDER BY created_at DESC LIMIT 10;
   ```

## Cara Cek Manual di Supabase

### 1. Check apakah tabel contract_history ada
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'contract_history';
```

### 2. Check isi tabel contract_history
```sql
SELECT 
    id,
    action,
    user_name,
    details,
    created_at
FROM contract_history 
ORDER BY created_at DESC 
LIMIT 20;
```

### 3. Check amandemen untuk kontrak tertentu
```sql
SELECT 
    ch.action,
    ch.user_name,
    ch.details,
    ch.created_at,
    c.name as contract_name
FROM contract_history ch
JOIN contracts c ON c.id = ch.contract_id
WHERE ch.action LIKE '%Amandemen%'
ORDER BY ch.created_at DESC;
```

## Testing Setelah Fix

1. **Buat Amandemen Baru**:
   - Klik kontrak → "Buat Amandemen"
   - Konfirmasi
   - Ubah data (misal: vendor atau nilai)
   - Isi nomor dokumen & keterangan
   - Submit

2. **Verifikasi di Database**:
   ```sql
   SELECT * FROM contract_history 
   WHERE action LIKE '%Amandemen%' 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```

3. **Verifikasi di UI**:
   - Tab "Amandemen" harus menampilkan data
   - Harus ada card dengan info amandemen
   - Tanggal, user, dan detail harus muncul

## Files Terkait

- **Migration SQL**: `database/QUICK_FIX_CONTRACT_HISTORY.sql` ← **Jalankan ini!**
- **Full Migration**: `database/add_progress_column_to_contracts.sql`
- **Code Fix**: `src/app/(admin)/aset/page.tsx` (sudah diperbaiki)
- **Dokumentasi**: `database/FIX_AMANDEMEN_NOT_SHOWING.md`

## Screenshot Yang Benar

Setelah fix, tampilan tab "Amandemen" harus seperti ini:

```
┌─────────────────────────────────────────────────────────────┐
│ 📋 Riwayat Amandemen & Perubahan                            │
│                                                              │
│ Progress Pekerjaan        35% Selesai [████░░░░░░░]         │
│                                                              │
│ [ Riwayat & Progress ] [ Tahapan Pembayaran ]               │
│                                                              │
│ [ Semua ] [ Amandemen ] [ Progress Tracker ]                │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ 01 Feb 2026, 14:10     Amandemen Kontrak (No. AMD...)  │  │
│ │ 👤 Admin               Ket: Perubahan nilai kontrak    │  │
│ │                        Perubahan: Nilai: 100,000 →     │  │
│ │                        150,000, Vendor: "A" → "B"      │  │
│ │                        [Lihat Detail] [🗑️]              │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Support

Jika masih ada masalah setelah mengikuti panduan ini:
1. Check console browser (F12) untuk error
2. Check Supabase logs: Dashboard → Logs
3. Pastikan RLS policies sudah aktif
4. Pastikan user sudah authenticated

---

**Estimasi waktu**: 5 menit untuk setup
**Kesulitan**: ⭐ (Easy - Copy paste SQL)
