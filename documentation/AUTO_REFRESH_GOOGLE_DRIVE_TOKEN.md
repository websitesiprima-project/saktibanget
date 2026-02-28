# 🔄 Auto-Refresh Google Drive OAuth Token

## Overview
Sistem ini menggunakan Google Drive API untuk upload file. Token OAuth2 memiliki masa berlaku terbatas (biasanya 1 jam untuk access_token). Setelah itu, token perlu di-refresh menggunakan `refresh_token`.

## ✅ Implementasi Auto-Refresh

### Cara Kerja
1. **googleapis library** secara otomatis mendeteksi token yang expired
2. Menggunakan `refresh_token` untuk mendapatkan `access_token` baru
3. Event listener `on('tokens')` menangkap token baru
4. Token baru disimpan otomatis ke `token.json`

### File yang Dimodifikasi

#### 1. `src/services/googleDriveService.ts`
```typescript
// Auto-refresh token mechanism
oAuth2Client.on('tokens', (tokens) => {
    console.log('🔄 Token refreshed automatically');
    
    // Update access_token dan expiry_date
    if (tokens.access_token) {
        token.access_token = tokens.access_token;
    }
    
    if (tokens.expiry_date) {
        token.expiry_date = tokens.expiry_date;
    }
    
    // Simpan token baru ke file
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
});
```

#### 2. `src/app/api/upload/route.ts`
```typescript
// Auto-refresh token mechanism
oAuth2Client.on('tokens', (tokens) => {
    console.log('🔄 Token refreshed automatically');
    
    // Update token dan simpan ke file/env
    // ...
});
```

## 🔐 Struktur Token

File `token.json` berisi:
```json
{
  "access_token": "ya29.xxx...",           // ⏱️ Expires in 1 hour
  "refresh_token": "1//0gxxx...",          // ✅ Never expires (kecuali dicabut)
  "scope": "https://www.googleapis.com/auth/drive",
  "token_type": "Bearer",
  "expiry_date": 1768925008412             // Unix timestamp
}
```

### Komponen Token
- **access_token**: Token aktif untuk API calls (masa berlaku 1 jam)
- **refresh_token**: Token untuk mendapatkan access_token baru (masa berlaku unlimited)
- **expiry_date**: Timestamp kapan access_token akan expired

## 🚀 Alur Auto-Refresh

```
User Upload File → API Call ke Google Drive
                    ↓
            Token Expired? 
                    ↓ YES
    googleapis auto-refresh dengan refresh_token
                    ↓
        Event 'tokens' triggered
                    ↓
    Save new access_token ke token.json
                    ↓
            Retry API Call
                    ↓
                ✅ Success
```

## 📝 Log Messages

Saat token di-refresh, Anda akan melihat log:
```
🔄 Token refreshed automatically
✅ New token saved to token.json
```

## ⚠️ Troubleshooting

### Error: "invalid_grant" atau "Token has been expired or revoked"
**Penyebab**: refresh_token sudah tidak valid

**Solusi**:
1. Generate token baru dengan script:
```bash
node scripts/generate-drive-token.js
```

2. Atau revoke dan re-authorize di Google Cloud Console:
   - Buka: https://myaccount.google.com/permissions
   - Hapus akses aplikasi Anda
   - Generate token baru

### Error: "refresh_token not found"
**Penyebab**: Token tidak memiliki refresh_token

**Solusi**:
Generate token baru dengan parameter `access_type: 'offline'`:
```javascript
const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',  // ✅ Wajib untuk mendapatkan refresh_token
    scope: SCOPES,
    prompt: 'consent'        // ✅ Force consent untuk refresh_token baru
});
```

## 🔒 Best Practices

### 1. **Simpan refresh_token dengan Aman**
- Jangan commit token.json ke Git
- Gunakan `.gitignore` untuk exclude file token
- Di production, simpan di environment variables

### 2. **Monitor Token Expiry**
```javascript
const expiryDate = new Date(token.expiry_date);
const now = new Date();
const hoursUntilExpiry = (expiryDate - now) / (1000 * 60 * 60);

console.log(`Token expires in ${hoursUntilExpiry.toFixed(2)} hours`);
```

### 3. **Backup refresh_token**
- refresh_token sangat penting dan tidak bisa di-regenerate
- Simpan backup di tempat aman
- Jika hilang, harus re-authorize ulang

## 🧪 Testing Auto-Refresh

### Cara 1: Force Expiry (Manual)
Edit `token.json` dan set `expiry_date` ke masa lalu:
```json
{
  "expiry_date": 1000000000000  // Tahun 2001 (sudah expired)
}
```

### Cara 2: Wait Natural Expiry
Access token expires dalam 1 jam. Tunggu dan coba upload file setelah 1+ jam.

### Cara 3: Monitor Logs
Cek console log saat upload file:
```
🔄 Token refreshed automatically
✅ New token saved to token.json
```

## 📚 Related Documentation

- [OAuth2 Setup Guide](./OAUTH2_SETUP_GUIDE.md)
- [Google Drive Setup](./GOOGLE_DRIVE_SETUP.md)
- [Environment Setup](./ENV_SETUP_GDRIVE.md)

## 🔗 References

- [Google OAuth2 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [googleapis Node.js Client](https://github.com/googleapis/google-api-nodejs-client)
- [OAuth2 Token Refresh](https://developers.google.com/identity/protocols/oauth2/web-server#offline)
