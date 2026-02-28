# 📋 Cara Mengecek Sistem Progress Tidak Aktif

## 🎯 Ringkasan

Sistem ini mendeteksi kontrak yang tidak memiliki update progress tracker dalam 7 hari menggunakan **timestamp `created_at`** dari tabel `contract_history` di database.

---

## 🔍 Cara Kerja Sistem

### 1. **Sumber Data**

Data diambil dari tabel **`contract_history`** di Supabase:

```sql
SELECT * FROM contract_history 
WHERE contract_id = 'xxx' 
AND action LIKE '%Progress Tracker%'
ORDER BY created_at DESC;
```

**Field yang digunakan:**
- ✅ `created_at` (TIMESTAMP) - Tanggal & waktu asli dari database
- ✅ `action` - Untuk filter entry "Progress Tracker"
- ✅ `contract_id` - Untuk filter per kontrak

### 2. **Logika Deteksi**

```javascript
// Fungsi: getProgressUpdateStatus(history, status)
// Return: { status: 'normal'|'no-progress'|'stale', daysSinceUpdate: number }

1. Filter kontrak dengan status "Dalam Pekerjaan" saja
2. Filter history untuk cari entry dengan action "Progress Tracker"
3. Ambil entry terbaru (index 0, karena sudah sorted DESC)
4. Hitung selisih hari dari created_at ke hari ini
5. Jika >= 7 hari → status: 'stale' (tidak update)
6. Jika < 7 hari → status: 'normal'
7. Jika tidak ada progress → status: 'no-progress'
```

---

## 🧪 Cara Testing/Mengecek

### **Method 1: Melalui Browser Console**

1. **Buka halaman Manajemen Kontrak** (`/aset`)
2. **Tekan F12** untuk buka Developer Tools
3. **Jalankan script ini di Console:**

```javascript
// Ambil semua kontrak dari state React
const contracts = window.__REACT_DEVTOOLS_GLOBAL_HOOK__ // (atau lihat state di React DevTools)

// Atau manual: inspeksi data langsung dari Supabase
async function checkProgressStatus(contractId) {
    const { data } = await supabase
        .from('contract_history')
        .select('*')
        .eq('contract_id', contractId)
        .ilike('action', '%Progress Tracker%')
        .order('created_at', { ascending: false })
        .limit(1)
    
    if (!data || data.length === 0) {
        console.log('❌ Tidak ada progress tracker')
        return
    }
    
    const lastUpdate = new Date(data[0].created_at)
    const today = new Date()
    const diffDays = Math.floor((today - lastUpdate) / (1000 * 60 * 60 * 24))
    
    console.log({
        contractId,
        lastUpdate: data[0].created_at,
        daysSinceUpdate: diffDays,
        status: diffDays >= 7 ? '⚠️ STALE (>7 hari)' : '✅ NORMAL'
    })
}

// Contoh penggunaan:
checkProgressStatus('0008.SPK/DAN.01.03/F4704Q000/2025')
```

### **Method 2: Langsung via Supabase SQL Editor**

Jalankan query ini di Supabase Dashboard → SQL Editor:

```sql
-- Cek semua kontrak dan kapan terakhir ada progress update
-- NOTE: contracts.id adalah UUID, contract_history.contract_id juga UUID
WITH latest_progress AS (
    SELECT 
        contract_id,
        MAX(created_at) as last_progress_update,
        COUNT(*) as total_progress_entries
    FROM contract_history
    WHERE action ILIKE '%Progress Tracker%'
    GROUP BY contract_id
)
SELECT 
    c.id,
    c.name,
    c.status,
    lp.last_progress_update,
    lp.total_progress_entries,
    CURRENT_DATE - DATE(lp.last_progress_update) as days_since_update,
    CASE 
        WHEN lp.last_progress_update IS NULL THEN '❌ NO PROGRESS'
        WHEN CURRENT_DATE - DATE(lp.last_progress_update) >= 7 THEN '⚠️ STALE (>7 hari)'
        ELSE '✅ NORMAL'
    END as progress_status
FROM contracts c
LEFT JOIN latest_progress lp ON c.id = lp.contract_id
WHERE c.status = 'Dalam Pekerjaan'
ORDER BY days_since_update DESC NULLS FIRST;
```

**Jika masih error "operator does not exist: uuid = text"**, gunakan type casting:

```sql
-- Alternative query dengan explicit type casting
WITH latest_progress AS (
    SELECT 
        contract_id::uuid as contract_id,
        MAX(created_at) as last_progress_update,
        COUNT(*) as total_progress_entries
    FROM contract_history
    WHERE action ILIKE '%Progress Tracker%'
    GROUP BY contract_id
)
SELECT 
    c.id,
    c.name,
    c.status,
    lp.last_progress_update,
    lp.total_progress_entries,
    EXTRACT(DAY FROM (NOW() - lp.last_progress_update)) as days_since_update,
    CASE 
        WHEN lp.last_progress_update IS NULL THEN '❌ NO PROGRESS'
        WHEN EXTRACT(DAY FROM (NOW() - lp.last_progress_update)) >= 7 THEN '⚠️ STALE (>7 hari)'
        ELSE '✅ NORMAL'
    END as progress_status
FROM contracts c
LEFT JOIN latest_progress lp ON c.id = lp.contract_id
WHERE c.status = 'Dalam Pekerjaan'
ORDER BY days_since_update DESC NULLS FIRST;
```

**Output:**
```
id                  | name              | last_progress_update | days_since_update | progress_status
--------------------|-------------------|---------------------|-------------------|------------------
0008.SPK/...        | Pekerjaan Tower   | 2025-11-05 10:00    | 92                | ⚠️ STALE (>7 hari)
0024.SPK/...        | Tower Kritis      | 2026-01-20 14:30    | 16                | ⚠️ STALE (>7 hari)
0064.SPK/...        | Pengamanan ROW    | NULL                | NULL              | ❌ NO PROGRESS
```

---

## 📊 Contoh Test Case

### Test Case 1: Kontrak Belum Ada Progress
```javascript
Contract: {
    id: '0064.SPK/DAN.01.02/F4704Q000/2025',
    status: 'Dalam Pekerjaan',
    history: [] // Tidak ada entry
}

Expected Result:
{
    status: 'no-progress',
    daysSinceUpdate: null,
    badge: '❌ Belum Ada Progress'
}
```

### Test Case 2: Kontrak Progress Lama (>7 hari)
```javascript
Contract: {
    id: '0008.SPK/DAN.01.03/F4704Q000/2025',
    status: 'Dalam Pekerjaan',
    history: [
        {
            action: 'Progress Tracker: PROGRESS PEKERJAAN (75%)',
            created_at: '2025-11-05T10:00:00.000Z' // 92 hari yang lalu dari 5 Feb 2026
        }
    ]
}

Expected Result:
{
    status: 'stale',
    daysSinceUpdate: 92,
    badge: '⚠️ Tidak Update (92 hari)'
}
```

### Test Case 3: Kontrak Progress Baru (<7 hari)
```javascript
Contract: {
    id: '0024.SPK/DAN.01.03/F4704Q000/2025',
    status: 'Dalam Pekerjaan',
    history: [
        {
            action: 'Progress Tracker: Pemasangan (40%)',
            created_at: '2026-02-01T14:30:00.000Z' // 5 hari yang lalu
        }
    ]
}

Expected Result:
{
    status: 'normal',
    daysSinceUpdate: 5,
    badge: null (tidak tampil)
}
```

---

## 🎨 Visual Indicator

### Badge yang Muncul:

1. **Belum Ada Progress**
   ```
   ⚠️ Belum Ada Progress
   Background: #fef9c3
   Color: #ca8a04
   ```

2. **Tidak Update (X hari)**
   ```
   ⚠️ Tidak Update (92 hari)
   Background: #fef9c3
   Color: #ca8a04
   Border-left: 3px solid #ca8a04
   ```

3. **Stats Card**
   ```
   ⚠️ Tanpa Update (7 Hari)
   Count: 2
   ```

---

## 🔧 Debugging Tips

### 1. **Cek Data History Kontrak**

Buka dropdown kontrak → Tab "Progress" → Lihat daftar progress tracker.

### 2. **Console Logging (SUDAH AKTIF!)**

Sistem sekarang sudah dilengkapi dengan console.log otomatis. Untuk melihatnya:

1. **Buka halaman Manajemen Kontrak**
2. **Tekan F12** → Tab "Console"
3. **Lihat output log:**

```
📊 Total History Fetched: 15
📊 Sample History: [{...}, {...}]
🔍 Contract dengan Progress: { id: "xxx", name: "...", totalProgress: 3, ... }
🔎 Progress History Count: 3
📅 Latest Progress: { action: "Progress Tracker: ...", created_at: "2025-11-05T..." }
🕐 Calculation: { lastUpdate: "...", today: "...", diffDays: 92, isStale: true }
⚠️ STALE! Days: 92
```

**Jika badge tidak muncul, cek:**
- ✅ Apakah status kontrak = "Dalam Pekerjaan"?
- ✅ Apakah `created_at` terisi di database?
- ✅ Apakah ada entry Progress Tracker di history?
- ✅ Apakah `diffDays >= 7`?

### 3. **Cek Manual di Database**

Query sederhana untuk debug satu kontrak:

```sql
-- Ganti 'CONTRACT_ID_HERE' dengan ID kontrak yang ingin dicek
SELECT 
    ch.contract_id,
    ch.action,
    ch.created_at,
    NOW() - ch.created_at as age,
    EXTRACT(DAY FROM (NOW() - ch.created_at)) as days_old
FROM contract_history ch
WHERE ch.contract_id = 'CONTRACT_ID_HERE'  -- Ganti dengan UUID kontrak
  AND ch.action ILIKE '%Progress Tracker%'
ORDER BY ch.created_at DESC
LIMIT 5;
```

### 4. **Verifikasi Tipe Data**

Pastikan `contract_history.contract_id` adalah UUID, bukan TEXT:

```sql
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'contract_history'
  AND column_name = 'contract_id';
```

**Expected Output:**
```
column_name   | data_type | udt_name
--------------|-----------|----------
contract_id   | uuid      | uuid
```

**Jika hasilnya `text`**, jalankan migration ini:

```sql
-- ⚠️ BACKUP data dulu sebelum jalankan!
-- Convert contract_id dari TEXT ke UUID
ALTER TABLE contract_history 
ALTER COLUMN contract_id TYPE uuid USING contract_id::uuid;
```

---

## 📝 Notes

- ✅ Menggunakan `created_at` dari database (lebih akurat)
- ✅ Tidak parsing manual dari string tanggal
- ✅ Hanya berlaku untuk kontrak "Dalam Pekerjaan"
- ✅ Threshold: 7 hari
- ✅ Badge tampil di kolom Nomor Kontrak
- ✅ Stats counter di atas tabel

---

## 🚀 Update Log

**5 Feb 2026**
- ✅ Mengubah dari parsing string date ke menggunakan `created_at` timestamp
- ✅ Menambahkan field `created_at` ke history mapping
- ✅ Return object `{ status, daysSinceUpdate }` dari fungsi
- ✅ Badge menampilkan jumlah hari sejak update terakhir
