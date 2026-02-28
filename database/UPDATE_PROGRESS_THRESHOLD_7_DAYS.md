# 📅 Update: Threshold Notifikasi "Tidak Update" - 30 Hari → 7 Hari

## 📋 Ringkasan Perubahan

Mengubah threshold notifikasi **"Tidak Update"** dari **30 hari** menjadi **7 hari** agar notifikasi muncul lebih cepat dan progress kontrak dapat dipantau lebih ketat.

---

## 🎯 Problem Statement

**Sebelumnya:**
- Notifikasi "Tidak Update (X hari)" baru muncul setelah **30 hari** tidak ada update progress
- Terlalu lama untuk monitoring progress pekerjaan yang aktif

**Solusi:**
- Ubah threshold menjadi **7 hari**
- Notifikasi akan lebih responsif dan membantu admin untuk follow-up lebih cepat

---

## 🔧 Perubahan yang Dilakukan

### 1. **File Utama: `src/app/(admin)/aset/page.tsx`**

**Baris 404 & 407:**
```typescript
// SEBELUM:
isStale: diffDays >= 30
if (diffDays >= 30) {
    return { status: 'stale', daysSinceUpdate: diffDays }
}

// SESUDAH:
isStale: diffDays >= 7
if (diffDays >= 7) {
    return { status: 'stale', daysSinceUpdate: diffDays }
}
```

**Komentar Kode:**
```typescript
// SEBELUM: If no update in last 30 days (1 month)
// SESUDAH: If no update in last 7 days
```

---

### 2. **Dokumentasi: `documentation/CARA_CEK_PROGRESS_TIDAK_AKTIF.md`**

**Perubahan:**
- Ringkasan: 1 bulan (30 hari) → 7 hari
- Logika deteksi: >= 30 hari → >= 7 hari
- SQL query threshold: 30 → 7
- Test case contoh: disesuaikan dengan threshold baru
- Stats card label: "1 Bulan" → "7 Hari"

---

### 3. **Dokumentasi: `documentation/TROUBLESHOOT_BADGE_PROGRESS.md`**

**Perubahan:**
- Scenario F: Days < 30 → Days < 7
- Expected behavior: >= 30 hari → >= 7 hari
- Troubleshooting notes disesuaikan

---

## 🎨 Tampilan Badge

### **Sebelumnya:**
```
⚠️ Tidak Update (100 hari)  // Muncul setelah 30 hari
```

### **Sekarang:**
```
⚠️ Tidak Update (10 hari)   // Muncul setelah 7 hari
```

**Badge akan muncul jika:**
- Status kontrak = "Dalam Pekerjaan"
- Ada minimal 1 progress tracker entry
- Hari sejak update terakhir **>= 7 hari**

---

## 📊 Dampak Perubahan

### ✅ Keuntungan:

1. **Monitoring Lebih Ketat**
   - Admin dapat lebih cepat mendeteksi kontrak yang tidak diupdate

2. **Follow-up Lebih Cepat**
   - Vendor dapat diingatkan lebih awal untuk update progress

3. **Meningkatkan Akuntabilitas**
   - Mendorong vendor untuk update progress secara rutin (minimal seminggu sekali)

### ⚠️ Perhatian:

- Lebih banyak kontrak akan menampilkan badge "Tidak Update"
- Pastikan komunikasi dengan vendor tentang ekspektasi update progress (minimal 7 hari sekali)

---

## 🧪 Testing

### Test Case 1: Progress Update 5 Hari Lalu
```
Progress Date: 2026-02-01
Today: 2026-02-06
Days: 5

Expected: ✅ NORMAL (badge TIDAK muncul)
```

### Test Case 2: Progress Update 7 Hari Lalu
```
Progress Date: 2026-01-30
Today: 2026-02-06
Days: 7

Expected: ⚠️ STALE (badge MUNCUL: "Tidak Update (7 hari)")
```

### Test Case 3: Progress Update 10 Hari Lalu
```
Progress Date: 2026-01-27
Today: 2026-02-06
Days: 10

Expected: ⚠️ STALE (badge MUNCUL: "Tidak Update (10 hari)")
```

---

## 🚀 Deployment

### Cara Testing:

1. **Buka halaman Manajemen Kontrak**
2. **Cari kontrak dengan status "Dalam Pekerjaan"**
3. **Lihat progress tracker terakhir di tab Riwayat**
4. **Verifikasi badge:**
   - Jika update < 7 hari → Tidak ada badge
   - Jika update >= 7 hari → Badge "⚠️ Tidak Update (X hari)" muncul

### Hard Refresh (Jika Badge Tidak Muncul):
1. Tekan **Ctrl + Shift + R** (Windows)
2. Atau **Cmd + Shift + R** (Mac)
3. Clear browser cache jika perlu

---

## 📝 SQL Query untuk Monitoring

Cek kontrak yang tidak update >= 7 hari:

```sql
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

---

## 📞 Support

Jika menemukan issue:
- Cek console browser (F12 → Console)
- Lihat log: `📅 Progress Date Calculation`
- Verifikasi `diffDays` dan `isStale` flags

---

**Status:** ✅ COMPLETED  
**Tested:** ⏳ PENDING USER TESTING  
**Version:** 1.1  
**Date:** 2026-02-06  
**Previous Threshold:** 30 hari  
**New Threshold:** 7 hari
