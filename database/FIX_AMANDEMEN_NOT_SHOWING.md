# Fix Amandemen Tidak Muncul di Tampilan

## Masalah
Setelah mengisi dan submit form amandemen, data amandemen tidak muncul di tab "Amandemen" pada halaman Riwayat Amandemen & Perubahan.

## Penyebab
Fungsi `fetchContracts()` tidak mengambil data dari tabel `contract_history`, sehingga property `history` di setiap kontrak selalu kosong array `[]`.

```typescript
// SEBELUM (SALAH)
const formattedData = data.map(contract => ({
    // ... properties lain
    progress: 0,
    history: []  // ❌ Selalu kosong!
}))
```

## Solusi

### 1. Update Fungsi fetchContracts
File: `src/app/(admin)/aset/page.tsx`

Menambahkan query untuk mengambil semua data dari `contract_history` dan menggabungkannya dengan data kontrak:

```typescript
const fetchContracts = async () => {
    // 1. Fetch contracts
    const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .order('created_at', { ascending: false })

    // 2. Fetch ALL contract history in one query
    let allHistory = []
    try {
        const { data: historyData } = await supabase
            .from('contract_history')
            .select('*')
            .order('created_at', { ascending: false })
        
        if (historyData) allHistory = historyData
    } catch (err) {
        console.warn('Contract history not available yet')
    }

    // 3. Map and combine
    const formattedData = data.map(contract => {
        const contractHistory = allHistory
            .filter(h => h.contract_id === contract.id)
            .map(h => ({
                id: h.id,
                action: h.action,
                user: h.user_name || 'Admin',
                details: h.details || '',
                date: new Date(h.created_at).toLocaleDateString('id-ID', {...})
            }))

        return {
            // ... properties lain
            history: contractHistory  // ✅ Berisi data history!
        }
    })
}
```

## Cara Kerja Amandemen

### 1. Membuat Amandemen
1. Klik kontrak yang ingin diamandemen
2. Klik tombol "Buat Amandemen"
3. Konfirmasi di modal
4. Form edit akan terbuka dengan flag `isAmendement = true`
5. Ubah data yang perlu diamandemen
6. Isi field:
   - **Nomor Dokumen Amandemen** (auto-generated: AMD-{contractId}-001)
   - **Keterangan Amandemen** (opsional)

### 2. Penyimpanan ke Database
Saat submit dengan `isAmendment = true`:

```typescript
// 1. Update data kontrak
await supabase.from('contracts').update({...}).eq('id', editId)

// 2. Insert ke contract_history dengan action "Amandemen Kontrak"
await supabase.from('contract_history').insert([{
    contract_id: editId,
    action: `Amandemen Kontrak (No. ${amendmentDocNumber})`,
    user_name: 'Admin',
    details: `${amendmentDescription}. Perubahan: ${changesList}`
}])
```

### 3. Menampilkan Amandemen
Di tab "Amandemen", history difilter berdasarkan keyword:

```typescript
if (activeHistoryTab === 'amendments') {
    filteredHistory = asset.history.filter(h => 
        h.action && h.action.includes('Amandemen')
    )
}
```

## Testing

### Before Fix
- ✅ Submit amandemen berhasil (no error)
- ❌ Amandemen tidak muncul di tab Amandemen
- ❌ Property `history` selalu `[]`

### After Fix
- ✅ Submit amandemen berhasil
- ✅ Amandemen langsung muncul di tab Amandemen
- ✅ Property `history` berisi data dari `contract_history`
- ✅ Progress Tracker juga muncul di tab Progress

## Struktur Data

### Contract Object (di Frontend)
```typescript
{
    id: string
    name: string
    // ... properties lain
    progress: number
    history: Array<{
        id: string
        action: string      // "Amandemen Kontrak (No. AMD-xxx-001)"
        user: string        // "Admin"
        details: string     // Deskripsi perubahan
        date: string        // "01 Feb 2026, 14:10"
    }>
}
```

### Contract History Table (di Database)
```sql
CREATE TABLE contract_history (
    id UUID PRIMARY KEY,
    contract_id UUID REFERENCES contracts(id),
    action TEXT,           -- "Amandemen Kontrak ..." / "Progress Tracker ..."
    user_name VARCHAR,     -- "Admin"
    details TEXT,          -- Deskripsi detail
    created_at TIMESTAMP
)
```

## Catatan Penting

⚠️ **Pastikan tabel `contract_history` sudah dibuat** dengan menjalankan migration SQL:
```bash
# Lihat file: database/add_progress_column_to_contracts.sql
```

⚠️ **Performance**: Saat ini menggunakan 2 query terpisah (contracts + history). Untuk performa lebih baik di production dengan banyak data, pertimbangkan:
- Pagination
- Lazy loading history saat expand row
- Caching dengan SWR/React Query

## Related Files
- `src/app/(admin)/aset/page.tsx` - Main component
- `database/add_progress_column_to_contracts.sql` - Migration SQL
- `database/FIX_PROGRESS_TRACKER_ERROR.md` - Related documentation
