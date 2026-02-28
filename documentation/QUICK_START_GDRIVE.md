# 🚀 Quick Start - Google Drive Upload

Panduan cepat untuk mengaktifkan upload PDF ke Google Drive (5 menit).

## Cara Cepat (Menggunakan Credentials yang Sudah Ada)

### Step 1: Setup Credentials

Jalankan script setup (Windows PowerShell):

```powershell
.\scripts\setup-credentials.ps1
```

Atau (Linux/Mac):

```bash
chmod +x scripts/setup-credentials.sh
./scripts/setup-credentials.sh
```

Script akan otomatis mencari dan mengcopy file `client_secret_*.json` menjadi `credentials.json`

### Step 2: Generate Token

```bash
npm run setup-gdrive
```

Ikuti instruksi:

1. Browser akan terbuka dengan URL authorization
2. Login dengan Google Account Anda
3. Klik "Allow" untuk memberikan akses
4. Copy code yang muncul
5. Paste di terminal dan tekan Enter

✅ Done! File `token.json` akan terbuat.

### Step 3: Test Upload

1. Jalankan dev server:

   ```bash
   npm run dev
   ```

2. Buka browser: <http://localhost:3001>
3. Login ke admin panel
4. Masuk ke Manajemen Kontrak
5. Klik tombol "Upload" pada salah satu kontrak
6. Pilih file PDF
7. Klik "Upload"

✅ File akan otomatis terupload ke Google Drive Anda!

## Verifikasi

Cek apakah file-file ini sudah ada:

- ✅ `credentials.json` - OAuth client credentials
- ✅ `token.json` - Access token (auto-generated)

## Troubleshooting

### "Client secret file not found"

➡️ File `client_secret_*.json` di folder `src/services/server/` harus dipindah ke root folder dulu, atau download credentials baru dari Google Cloud Console.

### "Invalid grant" error saat generate token

➡️ Delete `token.json` dan jalankan ulang `npm run setup-gdrive`

### Upload gagal

➡️ Pastikan:

1. `credentials.json` dan `token.json` ada di root folder
2. Google Drive API sudah enabled
3. Jalankan ulang dev server (`npm run dev`)

## File Structure

```
SAKTI/
├── credentials.json          ← OAuth client credentials (jangan di-commit!)
├── token.json               ← Access token (jangan di-commit!)
├── GOOGLE_DRIVE_SETUP.md    ← Dokumentasi lengkap
├── scripts/
│   ├── generate-drive-token.js
│   ├── setup-credentials.ps1
│   └── setup-credentials.sh
└── src/
    └── app/
        └── api/
            └── upload/
                └── route.ts  ← API handler untuk upload
```

## Production Deployment

Untuk production (Vercel/Netlify):

1. Jangan commit `credentials.json` dan `token.json`
2. Set environment variables di hosting:

   ```
   GOOGLE_CREDENTIALS={"installed":{...}}
   GOOGLE_TOKEN={"access_token":"...","refresh_token":"..."}
   ```

## Next Steps

✅ Upload PDF sudah aktif!
✅ File otomatis masuk ke Google Drive
✅ Link tersimpan di database
✅ Bisa diakses dari detail kontrak

Baca dokumentasi lengkap di: [GOOGLE_DRIVE_SETUP.md](GOOGLE_DRIVE_SETUP.md)
