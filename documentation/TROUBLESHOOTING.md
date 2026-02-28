# 🔧 Troubleshooting Guide - Upload PDF Kontrak

Panduan lengkap untuk mengatasi masalah yang mungkin muncul saat menggunakan fitur upload.

---

## 🚫 Error Messages & Solutions

### 1. "Failed to initialize Google Drive client"

**Kemungkinan Penyebab:**
- File service account JSON tidak ditemukan
- Path ke file JSON salah
- File JSON corrupt atau invalid

**Solusi:**

```bash
# 1. Cek apakah file ada
ls src/services/server/disco-catcher-484807-p2-7cc0a252d059.json

# 2. Cek isi file valid JSON
cat src/services/server/disco-catcher-484807-p2-7cc0a252d059.json | jq .

# 3. Cek permission file
# Windows PowerShell:
Get-Acl src/services/server/disco-catcher-484807-p2-7cc0a252d059.json

# 4. Jika file hilang/corrupt, restore dari backup atau re-download
```

**Verifikasi:**
- File harus berisi `client_email`, `private_key`, `project_id`
- Format harus valid JSON
- File readable oleh Node.js

---

### 2. "Permission denied" / "Insufficient Permission"

**Error di Console:**
```
Error: Insufficient Permission: Request had insufficient authentication scopes
```

**Penyebab:**
Service account belum diberi akses ke folder "Berkas Kontrak"

**Solusi Lengkap:**

1. **Buka Google Drive** (dengan akun yang punya folder)
2. **Cari folder** "Berkas Kontrak"
3. **Klik kanan** > **Share** / **Bagikan**
4. **Copy email service account:**
   ```bash
   # Extract email dari JSON
   cat src/services/server/disco-catcher-484807-p2-7cc0a252d059.json | jq -r '.client_email'
   ```
   Atau manual buka file dan copy field `client_email`
5. **Paste email** ke field "Add people and groups"
6. **Pilih role:**
   - ✅ **Editor** (recommended)
   - ✅ **Content Manager**
   - ❌ JANGAN pilih "Viewer" (tidak cukup)
7. **Uncheck "Notify people"** (opsional, karena service account tidak bisa baca email)
8. **Click "Share"** / **"Send"**
9. **Verify:**
   - Email service account muncul di daftar "People with access"
   - Role = "Editor" atau "Content Manager"

**Testing:**
```bash
# Test dengan script
node scripts/test-upload-api.js
```

---

### 3. "File tidak ditemukan"

**Error:**
```json
{
  "success": false,
  "error": "File tidak ditemukan"
}
```

**Penyebab:**
FormData tidak berisi file

**Solusi:**

**Frontend Check:**
```javascript
// Di handleUpload(), tambahkan log:
console.log('Selected file:', selectedFile);
console.log('File exists:', !!selectedFile);

if (!selectedFile) {
  console.error('No file selected!');
  return;
}
```

**HTML Check:**
```html
<!-- Pastikan input type file correct -->
<input
  type="file"
  accept="application/pdf"
  onChange={(e) => setSelectedFile(e.target.files[0])}
/>
```

---

### 4. "Hanya file PDF yang diperbolehkan"

**Error:**
```json
{
  "success": false,
  "error": "Hanya file PDF yang diperbolehkan"
}
```

**Penyebab:**
File yang diupload bukan PDF

**Solusi:**

**Client-side validation:**
```javascript
function handleFileChange(e) {
  const file = e.target.files[0];
  
  if (!file) return;
  
  // Check MIME type
  if (file.type !== 'application/pdf') {
    alert('Hanya file PDF yang diperbolehkan!');
    e.target.value = ''; // Reset input
    return;
  }
  
  // Check extension
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    alert('File harus berekstensi .pdf');
    e.target.value = '';
    return;
  }
  
  setSelectedFile(file);
}
```

**Verify file:**
```bash
# Check file type (Linux/Mac)
file document.pdf
# Output: document.pdf: PDF document, version 1.4

# Windows PowerShell
Get-Item document.pdf | Select-Object Extension
```

---

### 5. "Ukuran file maksimal 50MB"

**Error:**
```json
{
  "success": false,
  "error": "Ukuran file maksimal 50MB"
}
```

**Penyebab:**
File terlalu besar (> 50MB)

**Solusi:**

**Option 1: Compress PDF**
```bash
# Menggunakan Ghostscript
gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/screen \
   -dNOPAUSE -dQUIET -dBATCH \
   -sOutputFile=compressed.pdf input.pdf

# Atau gunakan online tools:
# - smallpdf.com
# - ilovepdf.com
```

**Option 2: Increase Limit** (jika memang perlu)
```typescript
// Di route.ts, ubah maxSize:
const maxSize = 100 * 1024 * 1024; // 100MB
```

**Option 3: Client-side check**
```javascript
function handleFileChange(e) {
  const file = e.target.files[0];
  const maxSize = 50 * 1024 * 1024; // 50MB
  
  if (file.size > maxSize) {
    alert(`File terlalu besar! Maksimal 50MB. File Anda: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
    e.target.value = '';
    return;
  }
  
  setSelectedFile(file);
}
```

---

### 6. "Tipe anggaran harus AI atau AO"

**Error:**
```json
{
  "success": false,
  "error": "Tipe anggaran harus AI atau AO"
}
```

**Penyebab:**
- Data kontrak tidak punya `budget_type`
- Atau `budget_type` nilainya bukan "AI"/"AO"

**Solusi:**

**Update data di Supabase:**
```sql
-- Check data yang invalid
SELECT id, name, budget_type 
FROM contracts 
WHERE budget_type NOT IN ('AI', 'AO') 
   OR budget_type IS NULL;

-- Update data
UPDATE contracts 
SET budget_type = 'AI'  -- atau 'AO'
WHERE id = 'contract-id-here';
```

**Frontend validation:**
```javascript
function openUploadModal(contractId) {
  const contract = assets.find(a => a.id === contractId);
  
  if (!contract.budgetType || !['AI', 'AO'].includes(contract.budgetType)) {
    alert('Kontrak ini belum memiliki Tipe Anggaran yang valid. Harap set ke AI atau AO terlebih dahulu.');
    return;
  }
  
  // ... lanjut buka modal
}
```

---

### 7. "Nama kontrak tidak boleh kosong"

**Penyebab:**
Field `name` di data kontrak kosong

**Solusi:**
```sql
-- Check kontrak tanpa nama
SELECT id, name, invoice_number 
FROM contracts 
WHERE name IS NULL OR name = '';

-- Update dengan nama default
UPDATE contracts 
SET name = invoice_number 
WHERE name IS NULL OR name = '';
```

---

### 8. Network / Connection Errors

**Error:**
```
TypeError: fetch failed
```

**Penyebab:**
- Dev server tidak berjalan
- Network error
- CORS issue

**Solusi:**

**Check server:**
```bash
# Cek apakah server running
curl http://localhost:3000/api/upload-contract

# Atau buka di browser
# Should return API info
```

**Restart server:**
```bash
# Stop server (Ctrl+C)
# Clear cache
rm -rf .next

# Restart
npm run dev
```

**Check network:**
```bash
# Test connection
ping localhost

# Check port 3000
# Windows:
netstat -ano | findstr :3000

# Linux/Mac:
lsof -i :3000
```

---

### 9. Upload Stuck / Tidak Selesai

**Gejala:**
- Button stuck di "Uploading..."
- No response dari server
- Tidak ada error message

**Penyebab:**
- Timeout
- File terlalu besar
- Network lambat
- Server crash

**Debug:**

**Check browser console:**
```javascript
// Tambahkan timeout di handleUpload
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

try {
  const res = await fetch('/api/upload-contract', {
    method: 'POST',
    body: formData,
    signal: controller.signal
  });
  clearTimeout(timeoutId);
  // ... handle response
} catch (error) {
  if (error.name === 'AbortError') {
    console.error('Upload timeout!');
    setUploadError('Upload timeout. File mungkin terlalu besar atau koneksi lambat.');
  }
}
```

**Check server logs:**
```bash
# Lihat terminal di mana `npm run dev` berjalan
# Cari error atau log
```

**Increase timeout (Next.js):**
```javascript
// next.config.mjs
export default {
  // ...
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
    responseLimit: false,
  },
  // ...
};
```

---

### 10. File Upload Tapi Tidak Muncul di Drive

**Gejala:**
- Upload success
- Return fileId dan webViewLink
- Tapi file tidak terlihat di Drive folder

**Penyebab:**
- Service account punya file, tapi user tidak bisa lihat
- Folder ID salah
- Permission issue

**Debug:**

**Test webViewLink:**
```bash
# Copy webViewLink dari response
# Buka di browser
# Jika error 404 atau "You need permission"
# → Service account issue
```

**Check dengan Service Account:**
- File memang ter-create
- Tapi ownership = service account
- User biasa tidak bisa lihat

**Solusi:**

**Option 1: Share file setelah upload**
```typescript
// Di googleDriveService.ts, tambahkan permission
export async function shareFileWithUser(fileId: string, userEmail: string) {
  const drive = getDriveClient();
  
  await drive.permissions.create({
    fileId: fileId,
    requestBody: {
      type: 'user',
      role: 'reader',
      emailAddress: userEmail,
    },
  });
}

// Call setelah upload
const uploadResult = await uploadFileToDrive(...);
await shareFileWithUser(uploadResult.fileId, 'user@example.com');
```

**Option 2: Upload ke shared folder** (current implementation)
- Pastikan folder "Berkas Kontrak" di-share dengan user
- Sub-folders inherit permission
- File akan visible otomatis

---

### 11. Supabase Insert Failed

**Error:**
```
Supabase insert warning: ...
```

**Penyebab:**
- Table tidak ada
- Kolom tidak ada
- Foreign key constraint
- RLS policy

**Debug:**

**Check table:**
```sql
-- Di Supabase SQL Editor
SELECT * FROM contract_files LIMIT 1;
```

**Check schema:**
```sql
-- List columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'contract_files';
```

**Check RLS:**
```sql
-- Disable RLS temporarily untuk testing
ALTER TABLE contract_files DISABLE ROW LEVEL SECURITY;

-- Re-enable setelah testing
ALTER TABLE contract_files ENABLE ROW LEVEL SECURITY;
```

**Solution:**
```bash
# Run migration
# Copy dari supabase/migrations/add_contract_files_columns.sql
# Paste ke Supabase SQL Editor
```

---

## 🛠️ General Debugging Steps

### 1. Check All Logs

**Browser Console:**
```javascript
// F12 > Console tab
// Cari error merah
// Cari warning kuning
```

**Server Terminal:**
```bash
# Cek terminal di mana npm run dev berjalan
# Scroll ke atas untuk lihat error
```

**Network Tab:**
```javascript
// F12 > Network tab
// Filter: XHR/Fetch
// Find POST /api/upload-contract
// Check:
//   - Request payload
//   - Response
//   - Status code
//   - Headers
```

### 2. Enable Verbose Logging

**Update googleDriveService.ts:**
```typescript
// Add more console.log
export async function uploadContractPDF(...) {
  console.log('=== UPLOAD START ===');
  console.log('File:', fileName);
  console.log('Tipe Anggaran:', tipeAnggaran);
  console.log('Nama Kontrak:', namaKontrak);
  
  try {
    console.log('Setting up folder structure...');
    const contractFolderId = await setupContractFolderStructure(...);
    console.log('Folder ID:', contractFolderId);
    
    console.log('Uploading file...');
    const uploadResult = await uploadFileToDrive(...);
    console.log('Upload result:', uploadResult);
    
    console.log('=== UPLOAD SUCCESS ===');
    return uploadResult;
  } catch (error) {
    console.error('=== UPLOAD FAILED ===');
    console.error('Error:', error);
    throw error;
  }
}
```

### 3. Test Each Component Separately

**Test 1: Service Account Auth**
```javascript
// Create test-auth.js
const { getDriveClient } = require('./src/services/googleDriveService');

async function testAuth() {
  try {
    const drive = getDriveClient();
    const res = await drive.files.list({ pageSize: 1 });
    console.log('✅ Auth works!', res.data);
  } catch (error) {
    console.error('❌ Auth failed:', error);
  }
}

testAuth();
```

**Test 2: Folder Creation**
```javascript
async function testFolder() {
  const { createFolder } = require('./src/services/googleDriveService');
  
  try {
    const folderId = await createFolder('Test Folder');
    console.log('✅ Folder created:', folderId);
  } catch (error) {
    console.error('❌ Folder creation failed:', error);
  }
}
```

**Test 3: File Upload**
```javascript
async function testUpload() {
  const { uploadFileToDrive } = require('./src/services/googleDriveService');
  const fs = require('fs');
  
  const buffer = fs.readFileSync('test.pdf');
  
  try {
    const result = await uploadFileToDrive(buffer, 'test.pdf', 'application/pdf', 'FOLDER_ID');
    console.log('✅ Upload success:', result);
  } catch (error) {
    console.error('❌ Upload failed:', error);
  }
}
```

---

## 📞 Getting Help

Jika semua troubleshooting di atas tidak berhasil:

1. **Check Documentation:**
   - `UPLOAD_FEATURE_DOCS.md`
   - `UPLOAD_QUICK_START.md`
   - `ARCHITECTURE_DIAGRAM.md`

2. **Collect Debug Info:**
   ```
   - Browser console logs
   - Server terminal output
   - Network request/response
   - File being uploaded (size, type)
   - Contract data (budgetType, name)
   - Error message lengkap
   ```

3. **Create Issue:**
   - Jelaskan step-by-step yang dilakukan
   - Attach screenshot error
   - Attach logs
   - Jelaskan expected vs actual result

4. **Contact Team:**
   - Share debug info
   - Jelaskan sudah coba apa saja
   - Tanya tim development

---

**Remember**: 
- ✅ Check logs first
- ✅ Verify setup (Google Drive, Supabase)
- ✅ Test step-by-step
- ✅ Enable verbose logging
- ✅ Read error messages carefully

Most issues are related to **Google Drive permissions** or **missing setup steps**!
