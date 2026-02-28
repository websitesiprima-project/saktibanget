# 🚨 Troubleshooting: Badge Progress Tidak Muncul

## Checklist Cepat

### ✅ Step 1: Buka Browser Console
1. Tekan **F12** di browser
2. Klik tab **Console**
3. Refresh halaman Manajemen Kontrak
4. Lihat output log

### ✅ Step 2: Analisa Console Output

#### **Scenario A: Total History Fetched = 0**
```
📊 Total History Fetched: 0
```
**Problem:** Tabel `contract_history` kosong atau error fetch

**Solution:**
1. Cek di Supabase → Table Editor → `contract_history`
2. Pastikan ada data progress tracker
3. Cek RLS policies (harus allow read untuk authenticated users)

#### **Scenario B: Contract tidak punya Progress**
```
🔍 Contract dengan Progress: (tidak ada output untuk contract ini)
```
**Problem:** Contract belum punya progress tracker entry

**Solution:**
1. Klik kontrak → Tab "Progress Tracker"
2. Klik "Buat Progress Tracker"
3. Isi form dan submit

#### **Scenario C: Progress History Count = 0**
```
🔎 Progress History Count: 0
❌ No progress tracker found
```
**Problem:** History ter-fetch tapi tidak ada yang match "Progress Tracker"

**Solution:**
Cek action text di database:
```sql
SELECT action FROM contract_history LIMIT 10;
```
Pastikan ada yang seperti: `"Progress Tracker: JUDUL (60%)"`

#### **Scenario D: Created_at NULL**
```
📅 Latest Progress: { action: "...", created_at: null }
❌ Latest progress has no created_at
```
**Problem:** Data lama tanpa timestamp

**Solution:**
```sql
-- Update NULL created_at dengan NOW()
UPDATE contract_history
SET created_at = NOW()
WHERE created_at IS NULL;
```

#### **Scenario E: Status Bukan "Dalam Pekerjaan"**
```
⏭️ Skip check (status bukan Dalam Pekerjaan): Terbayar
```
**Problem:** Badge hanya muncul untuk kontrak aktif

**Solution:**
Ubah status kontrak menjadi "Dalam Pekerjaan"

#### **Scenario F: Days < 7**
```
🕐 Calculation: { diffDays: 5, isStale: false }
✅ NORMAL. Days: 5
```
**Problem:** Progress masih fresh (< 7 hari)

**Solution:**
Ini NORMAL behavior! Badge hanya muncul jika >= 7 hari

#### **Scenario G: Days >= 7 tapi Badge Tidak Muncul**
```
🕐 Calculation: { diffDays: 92, isStale: true }
⚠️ STALE! Days: 92
```
**Problem:** Logic benar, tapi UI tidak render badge

**Solution:**
1. Hard refresh browser: **Ctrl + Shift + R**
2. Clear cache dan reload
3. Cek apakah `progressInfo.status !== 'normal'` condition di render code

---

## 🔍 Quick Database Checks

### Check 1: Verify Data Exists
```sql
SELECT 
    c.id,
    c.name,
    c.status,
    COUNT(ch.id) as progress_count,
    MAX(ch.created_at) as last_update
FROM contracts c
LEFT JOIN contract_history ch ON c.id = ch.contract_id 
    AND ch.action ILIKE '%Progress Tracker%'
WHERE c.status = 'Dalam Pekerjaan'
GROUP BY c.id, c.name
ORDER BY progress_count DESC;
```

### Check 2: Verify UUID Types Match
```sql
-- Check contracts.id type
SELECT data_type FROM information_schema.columns 
WHERE table_name = 'contracts' AND column_name = 'id';

-- Check contract_history.contract_id type  
SELECT data_type FROM information_schema.columns 
WHERE table_name = 'contract_history' AND column_name = 'contract_id';
```
Both should return: **uuid**

### Check 3: Test One Contract
```sql
-- Replace with actual contract UUID
SELECT 
    ch.*,
    EXTRACT(DAY FROM (NOW() - ch.created_at)) as days_old
FROM contract_history ch
WHERE ch.contract_id = 'YOUR-CONTRACT-UUID-HERE'
  AND ch.action ILIKE '%Progress Tracker%'
ORDER BY ch.created_at DESC;
```

---

## 🎯 Expected Behavior

### ✅ Badge AKAN Muncul Jika:
- Status = "Dalam Pekerjaan" ✅
- Ada entry Progress Tracker ✅
- `created_at` terisi ✅
- Hari sejak update >= 7 hari ✅

### ❌ Badge TIDAK Muncul Jika:
- Status bukan "Dalam Pekerjaan" (misal: "Terbayar", "Selesai")
- Belum ada Progress Tracker sama sekali
- Progress update masih fresh (< 7 hari)
- Browser cache belum di-clear

---

## 🛠️ Quick Fixes

### Fix 1: Force Create Test Progress (Old Date)
```sql
-- Insert progress dengan tanggal lama untuk testing
INSERT INTO contract_history (contract_id, action, user_name, details, created_at)
VALUES (
    'YOUR-CONTRACT-UUID',
    'Progress Tracker: TEST LAMA (50%)',
    'Admin',
    'Progress: 50%. Test data dengan tanggal 3 bulan lalu.',
    NOW() - INTERVAL '90 days'  -- 90 hari yang lalu
);
```

### Fix 2: Clear All Debug Logs (After Fix)
Setelah badge sudah muncul, hapus console.log dengan search & replace:
```
Find: console.log\('🔍.*?\n
Replace: // Removed debug log
```

### Fix 3: Type Mismatch Error
```sql
-- If getting "operator does not exist: uuid = text"
ALTER TABLE contract_history 
ALTER COLUMN contract_id TYPE uuid USING contract_id::uuid;
```

---

## 📞 Masih Bermasalah?

1. Screenshot console output
2. Screenshot UI (bagian yang badge seharusnya muncul)
3. Export query result dari database check
4. Kirim ke developer untuk analisa lebih lanjut

**File terkait:**
- `/src/app/(admin)/aset/page.tsx` - Main logic
- `/documentation/CARA_CEK_PROGRESS_TIDAK_AKTIF.md` - Full docs
- `/database/fix_contract_history_uuid.sql` - Type fix
