# Notification Modal - Panduan Penggunaan

## Deskripsi
Komponen NotificationModal adalah replacement yang lebih modern dan user-friendly untuk `alert()` JavaScript standar. Desain mengikuti style dari gambar referensi dengan icon, heading, message, dan tombol OK yang styled.

## Komponen

### File Komponen
- **Component**: `src/components/NotificationModal.tsx`
- **Styles**: `src/components/NotificationModal.css`

### Props Interface
```typescript
interface NotificationModalProps {
    show: boolean              // Kontrol tampil/sembunyi modal
    type: NotificationType     // Tipe: 'success' | 'error' | 'warning' | 'info'
    title?: string            // Custom title (opsional)
    message: string           // Pesan yang ditampilkan
    onClose: () => void       // Callback saat modal ditutup
}
```

## Cara Menggunakan

### 1. Import Komponen
```tsx
import NotificationModal from '@/components/NotificationModal'
```

### 2. Setup State
```tsx
const [notification, setNotification] = useState({ 
    show: false, 
    type: 'success' as 'success' | 'error' | 'warning' | 'info', 
    message: '' 
})
```

### 3. Tampilkan Notifikasi
```tsx
// Success
setNotification({ 
    show: true, 
    type: 'success', 
    message: 'Data berhasil disimpan!' 
})

// Error
setNotification({ 
    show: true, 
    type: 'error', 
    message: 'Gagal menyimpan data' 
})

// Warning
setNotification({ 
    show: true, 
    type: 'warning', 
    message: 'Peringatan: Data tidak lengkap' 
})

// Info
setNotification({ 
    show: true, 
    type: 'info', 
    message: 'Proses sedang berlangsung...' 
})
```

### 4. Render Modal
```tsx
<NotificationModal
    show={notification.show}
    type={notification.type}
    message={notification.message}
    onClose={() => setNotification({ ...notification, show: false })}
/>
```

## Styling

### Warna Theme
- **Success**: Hijau (#059669)
- **Error**: Merah (#dc2626)
- **Warning**: Orange (#f59e0b)
- **Info**: Biru (#3b82f6)

### Fitur
- Icon lingkaran dengan background soft color
- Heading otomatis berdasarkan tipe (atau custom)
- Message yang jelas dan mudah dibaca
- Tombol OK dengan hover effect
- Animation smooth (fade in + scale)
- Backdrop blur effect
- Responsive design

## Files yang Sudah Diupdate

1. ✅ `src/app/vendor-portal/profile/page.tsx`
2. ✅ `src/app/vendor-portal/pengajuan/page.tsx`
3. ✅ `src/app/(admin)/approval-surat/page.tsx`
4. ✅ `src/app/(admin)/pengaturan/page.tsx`
5. ✅ `src/components/Login.tsx`

## Migrasi dari `alert()`

### Sebelum (Old)
```tsx
alert('✅ Data berhasil disimpan!')
```

### Sesudah (New)
```tsx
setNotification({ 
    show: true, 
    type: 'success', 
    message: 'Data berhasil disimpan!' 
})
```

## Custom Title

Jika ingin menggunakan title custom:
```tsx
setNotification({ 
    show: true, 
    type: 'success', 
    title: 'Upload Berhasil',
    message: 'Foto profil berhasil diupload ke Supabase!' 
})
```

## Tips
1. Gunakan `type: 'success'` untuk operasi yang berhasil
2. Gunakan `type: 'error'` untuk error/kegagalan
3. Gunakan `type: 'warning'` untuk peringatan atau validasi
4. Gunakan `type: 'info'` untuk informasi umum
5. Message sebaiknya singkat dan jelas (1-2 kalimat)

## Keunggulan vs alert()
- ✅ Lebih modern dan menarik
- ✅ Konsisten di semua browser
- ✅ Tidak blocking UI
- ✅ Dapat dikustomisasi
- ✅ Responsive
- ✅ Smooth animation
- ✅ Lebih professional
