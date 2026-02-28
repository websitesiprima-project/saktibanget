# Environment Variables - Google Drive Upload

## Optional Environment Variables

Fitur upload sudah dikonfigurasi dengan path default ke Service Account JSON. Namun jika Anda ingin menggunakan environment variable, berikut konfigurasinya:

## .env.local (Optional)

```bash
# Google Drive Service Account (Optional)
# Jika tidak diset, akan menggunakan path default:
# src/services/server/disco-catcher-484807-p2-7cc0a252d059.json

GOOGLE_SERVICE_ACCOUNT_EMAIL=disco-catcher-484807-p2@disco-catcher-484807-p2.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_PROJECT_ID=disco-catcher-484807-p2

# Atau path ke JSON file
GOOGLE_APPLICATION_CREDENTIALS=src/services/server/disco-catcher-484807-p2-7cc0a252d059.json

# Google Drive Configuration
GOOGLE_DRIVE_ROOT_FOLDER_NAME=Berkas Kontrak
GOOGLE_DRIVE_ROOT_FOLDER_ID=  # Optional: Set folder ID langsung
```

## Update Service untuk Menggunakan ENV (Optional)

Jika ingin menggunakan environment variables, update `googleDriveService.ts`:

```typescript
// Di bagian atas file
const SERVICE_ACCOUNT_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(
  process.cwd(),
  'src',
  'services',
  'server',
  'disco-catcher-484807-p2-7cc0a252d059.json'
);

const ROOT_FOLDER_NAME = process.env.GOOGLE_DRIVE_ROOT_FOLDER_NAME || 'Berkas Kontrak';

// Atau gunakan credentials langsung dari ENV
export function getDriveClient() {
  try {
    let auth;
    
    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      // Use environment variables
      auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
          private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          project_id: process.env.GOOGLE_PROJECT_ID,
        },
        scopes: SCOPES,
      });
    } else {
      // Use JSON file
      auth = new google.auth.GoogleAuth({
        keyFile: SERVICE_ACCOUNT_PATH,
        scopes: SCOPES,
      });
    }

    const drive = google.drive({ version: 'v3', auth });
    return drive;
  } catch (error) {
    console.error('Error initializing Google Drive client:', error);
    throw new Error('Failed to initialize Google Drive client');
  }
}
```

## Keamanan Best Practices

### ⚠️ JANGAN commit file berikut:
- ❌ `.env.local`
- ❌ `disco-catcher-484807-p2-7cc0a252d059.json`
- ❌ Any service account credentials

### ✅ Add to .gitignore:
```
# Environment variables
.env
.env.local
.env.*.local

# Google Service Account
*-service-account.json
disco-catcher-*.json
```

## Production Deployment

### Vercel / Netlify

1. **Add Environment Variables** di dashboard:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - `GOOGLE_PROJECT_ID`

2. **Format Private Key**:
   ```
   -----BEGIN PRIVATE KEY-----
   MIIEvQIBADANBgkqhki...
   ...multiple lines...
   -----END PRIVATE KEY-----
   ```
   
   Atau one-line dengan `\n`:
   ```
   -----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhki...\n-----END PRIVATE KEY-----\n
   ```

### Docker

```dockerfile
# Dockerfile
FROM node:18-alpine

# ... other instructions ...

# Copy service account (untuk development saja!)
COPY src/services/server/*.json /app/src/services/server/

# Atau gunakan ENV vars
ENV GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx
ENV GOOGLE_PRIVATE_KEY=xxx
ENV GOOGLE_PROJECT_ID=xxx
```

```yaml
# docker-compose.yml
services:
  app:
    build: .
    environment:
      - GOOGLE_SERVICE_ACCOUNT_EMAIL=${GOOGLE_SERVICE_ACCOUNT_EMAIL}
      - GOOGLE_PRIVATE_KEY=${GOOGLE_PRIVATE_KEY}
      - GOOGLE_PROJECT_ID=${GOOGLE_PROJECT_ID}
    env_file:
      - .env.local
```

## Current Setup (Default)

Saat ini konfigurasi menggunakan **hardcoded path** ke JSON file:
- Path: `src/services/server/disco-catcher-484807-p2-7cc0a252d059.json`
- Folder: `Berkas Kontrak`

Ini sudah cukup untuk development. Untuk production, pertimbangkan menggunakan environment variables untuk security yang lebih baik.

---

**Note**: File JSON service account **SUDAH ADA** di project, jadi tidak perlu setup ENV untuk development.
