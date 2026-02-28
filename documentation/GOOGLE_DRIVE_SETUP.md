# Setup Google Drive Upload

Panduan untuk mengaktifkan fitur upload PDF ke Google Drive.

## Langkah-langkah Setup

### 1. Setup Google Cloud Project

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat project baru atau pilih project yang sudah ada
3. Enable **Google Drive API**:
   - Pergi ke "APIs & Services" > "Library"
   - Cari "Google Drive API"
   - Klik "Enable"

### 2. Create OAuth 2.0 Credentials

1. Pergi ke "APIs & Services" > "Credentials"
2. Klik "Create Credentials" > "OAuth client ID"
3. Pilih application type: **Desktop app**
4. Beri nama (contoh: "SAKTI Desktop Client")
5. Download credentials JSON
6. Rename file menjadi `credentials.json`
7. Pindahkan ke root folder project

**Atau gunakan file yang sudah ada:**

```bash
# Rename file existing
mv "src/services/server/client_secret_965768501033-6t2h278abjpq8jcbuiqj4qu376r3ngaf.apps.googleusercontent.com.json" credentials.json
```

### 3. Generate Token

Jalankan script untuk generate token OAuth:

```bash
npm run setup-gdrive
```

Script akan:

1. Menampilkan URL authorization
2. Minta Anda login dengan Google Account
3. Minta authorization code
4. Generate `token.json`

**Contoh output:**

```
🚀 Google Drive Token Generator

🔐 Authorize this app by visiting this URL:

👉 https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&scope=...

📋 Enter the authorization code from that page here: 
```

**Steps:**

1. Copy URL dan buka di browser
2. Login dengan Google Account yang punya Drive
3. Allow akses aplikasi
4. Copy authorization code dari halaman
5. Paste code di terminal
6. Tekan Enter

### 4. Verifikasi Setup

Setelah berhasil, akan ada 2 file di root project:

- `credentials.json` - OAuth client credentials
- `token.json` - Access & refresh token

### 5. Update .gitignore

Pastikan file credentials tidak ter-commit:

```bash
# Add to .gitignore
credentials.json
token.json
```

### 6. Test Upload

1. Jalankan aplikasi: `npm run dev`
2. Buka halaman Manajemen Kontrak
3. Klik tombol Upload PDF pada kontrak
4. Pilih file PDF
5. Klik Upload

File akan otomatis terupload ke Google Drive Anda!

## Troubleshooting

### Error: "Google Drive credentials/token not found"

**Solusi:**

- Pastikan `credentials.json` dan `token.json` ada di root project
- Jalankan ulang `npm run setup-gdrive`

### Error: "Invalid grant"

**Solusi:**

- Token expired atau invalid
- Delete `token.json`
- Jalankan ulang `npm run setup-gdrive`

### Error: "Access denied"

**Solusi:**

- Pastikan Google Drive API sudah enabled
- Pastikan OAuth consent screen sudah dikonfigurasi
- Cek scope yang diminta sudah sesuai

### Upload berhasil tapi file tidak terlihat

**Solusi:**

- Cek di Google Drive folder "My Drive"
- File akan tersimpan di root folder
- Bisa setup folder khusus dengan menambah `parents` di API request

## Production Setup

Untuk production, gunakan environment variables:

```env
# .env.local
GOOGLE_CREDENTIALS={"installed":{"client_id":"...","project_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_secret":"...","redirect_uris":["..."]}}
GOOGLE_TOKEN={"access_token":"...","refresh_token":"...","scope":"...","token_type":"Bearer","expiry_date":...}
```

API route akan otomatis menggunakan env vars jika tersedia.

## Struktur Database

Table `contract_files` di Supabase:

```sql
CREATE TABLE contract_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID REFERENCES contracts(id),
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_id TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Fitur

✅ Upload PDF ke Google Drive
✅ Auto-save link ke database
✅ File jadi shareable (anyone with link can view)
✅ Support multiple files per kontrak
✅ Validation file type (hanya PDF)
✅ Error handling & user feedback

## Update Terbaru

- **Upload endpoint**: `/api/upload`
- **Response format**: `{ success: true, file: { id, name, webViewLink } }`
- **Auto-refresh**: List kontrak refresh setelah upload
- **Better UX**: Loading state & success/error alerts
