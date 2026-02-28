# ✅ Testing Checklist - Upload PDF Kontrak Feature

## 🔧 Pre-Testing Setup

### Dependencies
- [ ] `npm install googleapis` sudah dijalankan
- [ ] Package `googleapis` muncul di `package.json`
- [ ] No error saat install

### Google Drive Setup
- [ ] Folder "Berkas Kontrak" dibuat di Google Drive
- [ ] Service Account email dicopy dari JSON file (field: `client_email`)
- [ ] Folder "Berkas Kontrak" di-share dengan service account
- [ ] Permission set ke "Editor" atau "Content Manager"
- [ ] Dapat mengakses folder dari Drive web interface

### Database Setup  
- [ ] Migration SQL sudah dijalankan di Supabase
- [ ] Table `contract_files` ada di database
- [ ] Kolom baru ada: `file_name`, `folder_path`, `file_id`
- [ ] Indexes dibuat dengan benar

### Application Setup
- [ ] Dev server berjalan: `npm run dev`
- [ ] No compile errors di terminal
- [ ] No TypeScript errors
- [ ] Application terbuka di browser (localhost:3000)

---

## 🧪 Unit Testing

### Service Layer Tests

#### Test: `getDriveClient()`
- [ ] Function dapat dipanggil tanpa error
- [ ] Return object Drive client
- [ ] Credentials loaded dari JSON file
- [ ] Auth scope correct

#### Test: `findFolderByName()`
- [ ] Dapat menemukan folder yang ada
- [ ] Return `null` jika folder tidak ada
- [ ] Pencarian dengan parent folder bekerja
- [ ] Handle folder dengan nama duplikat

#### Test: `createFolder()`
- [ ] Dapat membuat folder baru
- [ ] Return folder ID
- [ ] Folder muncul di Drive
- [ ] Dapat membuat sub-folder dengan parent ID

#### Test: `getOrCreateFolder()`
- [ ] Return folder ID jika sudah ada
- [ ] Create folder baru jika belum ada
- [ ] Tidak membuat duplikat folder

#### Test: `setupContractFolderStructure()`
- [ ] Membuat hierarki lengkap: Root > AI/AO > Nama Kontrak
- [ ] Return folder ID terakhir (Nama Kontrak)
- [ ] Tidak error jika folder sudah ada
- [ ] Log output correct

#### Test: `uploadFileToDrive()`
- [ ] Dapat upload file dari Buffer
- [ ] Return fileId dan webViewLink
- [ ] File muncul di folder yang benar
- [ ] File name correct
- [ ] File content correct (bisa dibuka)

#### Test: `uploadContractPDF()`
- [ ] Full upload flow bekerja
- [ ] Folder structure dibuat otomatis
- [ ] File ter-upload ke folder yang tepat
- [ ] Return semua data yang diperlukan

---

## 🌐 API Endpoint Tests

### GET /api/upload-contract
- [ ] Return API info dengan benar
- [ ] Response format JSON
- [ ] Status 200 OK
- [ ] Dokumentasi endpoint lengkap

### POST /api/upload-contract

#### Test: Valid Upload
```
FormData:
- file: valid PDF
- tipeAnggaran: AI
- namaKontrak: Test Kontrak
- nomorKontrak: TEST-001
```
- [ ] Status 200 OK
- [ ] Response `success: true`
- [ ] Return fileId
- [ ] Return webViewLink
- [ ] Return folderPath
- [ ] Return fileName
- [ ] File muncul di Drive
- [ ] Metadata tersimpan di Supabase

#### Test: Missing File
- [ ] Status 400 Bad Request
- [ ] Error message: "File tidak ditemukan"

#### Test: Invalid File Type
```
FormData:
- file: image.jpg (not PDF)
```
- [ ] Status 400 Bad Request
- [ ] Error message: "Hanya file PDF yang diperbolehkan"

#### Test: File Too Large
```
FormData:
- file: large.pdf (> 50MB)
```
- [ ] Status 400 Bad Request
- [ ] Error message: "Ukuran file maksimal 50MB"

#### Test: Invalid Tipe Anggaran
```
FormData:
- tipeAnggaran: "XX" (not AI/AO)
```
- [ ] Status 400 Bad Request
- [ ] Error message: "Tipe anggaran harus AI atau AO"

#### Test: Missing Nama Kontrak
```
FormData:
- namaKontrak: "" (empty)
```
- [ ] Status 400 Bad Request
- [ ] Error message: "Nama kontrak tidak boleh kosong"

---

## 🖥️ Frontend Integration Tests

### Modal Upload

#### Test: Open Modal
- [ ] Click tombol Upload di tabel
- [ ] Modal muncul dengan benar
- [ ] File input visible
- [ ] Upload button disabled (no file selected)
- [ ] Modal dapat ditutup dengan klik overlay

#### Test: Select File
- [ ] Click file input
- [ ] File dialog muncul
- [ ] Dapat memilih file PDF
- [ ] File name ditampilkan
- [ ] Upload button enabled

#### Test: Upload Success Flow
1. [ ] Open modal
2. [ ] Select valid PDF file
3. [ ] Click Upload button
4. [ ] Button shows "Uploading..." state
5. [ ] Button disabled during upload
6. [ ] Success message muncul
7. [ ] Success notification/alert tampil
8. [ ] Modal tertutup otomatis (atau manual)
9. [ ] File cleared dari state

#### Test: Upload Error Flow
1. [ ] Open modal
2. [ ] Select non-PDF file (atau invalid)
3. [ ] Click Upload
4. [ ] Error message ditampilkan
5. [ ] Modal tetap terbuka
6. [ ] User dapat retry

### Data Integration

#### Test: Contract Data Extraction
- [ ] Function dapat menemukan contract by ID
- [ ] budgetType extracted correctly
- [ ] namaKontrak extracted correctly
- [ ] nomorKontrak extracted correctly (atau fallback ke ID)

#### Test: Supabase Save
- [ ] Data tersimpan ke table `contract_files`
- [ ] contract_id correct
- [ ] file_url tersimpan
- [ ] file_name tersimpan
- [ ] folder_path tersimpan
- [ ] file_id tersimpan
- [ ] created_at auto-set

---

## 🎯 End-to-End Testing

### Scenario 1: Upload Kontrak AI
1. [ ] Buka http://localhost:3000/aset
2. [ ] Pilih kontrak dengan budgetType = "AI"
3. [ ] Click Upload button
4. [ ] Select file PDF
5. [ ] Click Upload
6. [ ] Success notification muncul
7. [ ] Cek Google Drive:
   - [ ] Folder "Berkas Kontrak/AI/[Nama Kontrak]" ada
   - [ ] File PDF ada di folder tersebut
   - [ ] File bisa dibuka dan di-preview
8. [ ] Cek Supabase:
   - [ ] Row baru di table `contract_files`
   - [ ] Data lengkap dan correct

### Scenario 2: Upload Kontrak AO
1. [ ] Buka http://localhost:3000/aset
2. [ ] Pilih kontrak dengan budgetType = "AO"
3. [ ] Click Upload button
4. [ ] Select file PDF
5. [ ] Click Upload
6. [ ] Success notification muncul
7. [ ] Cek Google Drive:
   - [ ] Folder "Berkas Kontrak/AO/[Nama Kontrak]" ada
   - [ ] File PDF ada di folder tersebut
8. [ ] Cek Supabase:
   - [ ] Data tersimpan dengan benar

### Scenario 3: Upload Multiple Files ke Kontrak yang Sama
1. [ ] Upload file pertama ke kontrak A
2. [ ] Upload file kedua ke kontrak A (same contract)
3. [ ] Cek Google Drive:
   - [ ] Kedua file ada di folder yang sama
   - [ ] File names berbeda (timestamp)
   - [ ] Tidak ada file yang tertimpa
4. [ ] Cek Supabase:
   - [ ] 2 rows untuk contract_id yang sama

### Scenario 4: Upload ke Kontrak Tanpa Tipe Anggaran
1. [ ] Pilih kontrak yang budgetType = null atau bukan AI/AO
2. [ ] Click Upload
3. [ ] Select file
4. [ ] Click Upload
5. [ ] Error message muncul
6. [ ] User diberi tahu untuk set tipe anggaran dulu

---

## 🔍 Manual Verification

### Google Drive Structure
```
Berkas Kontrak/
├── AI/
│   └── [Nama Kontrak 1]/
│       ├── file1_timestamp1.pdf ✓
│       └── file2_timestamp2.pdf ✓
└── AO/
    └── [Nama Kontrak 2]/
        └── file3_timestamp3.pdf ✓
```

### Supabase Data
```sql
SELECT * FROM contract_files ORDER BY created_at DESC;
```
- [ ] All uploaded files ada di table
- [ ] file_url valid dan bisa diklik
- [ ] file_id match dengan Google Drive
- [ ] folder_path correct

---

## 🚨 Error Handling Tests

### Network Errors
- [ ] Matikan internet
- [ ] Try upload
- [ ] Appropriate error message
- [ ] No crash

### Google Drive Errors
- [ ] Revoke service account access
- [ ] Try upload
- [ ] Permission error handled gracefully
- [ ] Error message clear

### Database Errors
- [ ] Disconnect Supabase
- [ ] Upload file (Drive success, DB fail)
- [ ] File tetap ada di Drive
- [ ] Warning logged but not throwing

### Large File
- [ ] Upload 60MB file (over limit)
- [ ] Client-side validation catches it
- [ ] Error before API call

---

## 📊 Performance Tests

### Upload Speed
- [ ] Small file (< 1MB): < 3 seconds
- [ ] Medium file (5-10MB): < 10 seconds
- [ ] Large file (30-40MB): < 30 seconds

### Folder Creation
- [ ] First upload (create all folders): < 5 seconds
- [ ] Subsequent upload (folders exist): < 2 seconds

### Database Insert
- [ ] Supabase insert: < 500ms

---

## 🎨 UI/UX Tests

### Modal Design
- [ ] Modal centered on screen
- [ ] Responsive di mobile
- [ ] Backdrop blur/overlay visible
- [ ] Close button works
- [ ] ESC key closes modal

### Button States
- [ ] Disabled state when no file
- [ ] Loading state during upload
- [ ] Enabled state when file selected
- [ ] Hover effects work

### Messages
- [ ] Success message clear and positive
- [ ] Error messages helpful (not technical)
- [ ] Messages dismissable
- [ ] Auto-hide after timeout (optional)

### Accessibility
- [ ] Tab navigation works
- [ ] Focus states visible
- [ ] Screen reader friendly labels
- [ ] Keyboard shortcuts (optional)

---

## 📝 Documentation Tests

- [ ] README updated
- [ ] API docs complete
- [ ] Code comments present
- [ ] Examples provided
- [ ] Troubleshooting guide helpful

---

## ✅ Final Checklist

- [ ] All unit tests pass
- [ ] All API tests pass
- [ ] All integration tests pass
- [ ] All E2E scenarios work
- [ ] Error handling robust
- [ ] Performance acceptable
- [ ] UI/UX polished
- [ ] Documentation complete
- [ ] Code reviewed
- [ ] Ready for production

---

**Testing Date**: _____________  
**Tested By**: _____________  
**Status**: ⬜ Pass | ⬜ Fail | ⬜ Partial

**Notes**:
```
[Space for notes]
```
