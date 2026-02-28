# 🎨 Arsitektur Sistem Upload PDF Kontrak

## 📊 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER / CLIENT                             │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │              Manajemen Aset Page (React)                      │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐        │  │
│  │  │   Tabel     │  │ Upload Modal │  │ File Input   │        │  │
│  │  │  Kontrak    │→ │   Dialog     │→ │   (PDF)      │        │  │
│  │  └─────────────┘  └──────────────┘  └──────────────┘        │  │
│  │                           ↓                                   │  │
│  │                    handleUpload()                             │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────────────┘
                          │ FormData (file, tipeAnggaran, namaKontrak)
                          ↓
┌─────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS SERVER                                │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │         API Route: /api/upload-contract/route.ts              │  │
│  │  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  │  1. Validate Input (file type, size, required fields)    │ │  │
│  │  │  2. Convert File to Buffer                               │ │  │
│  │  │  3. Extract contract data                                │ │  │
│  │  └──────────────────────────────────────────────────────────┘ │  │
│  └─────────────────────────┬─────────────────────────────────────┘  │
│                            ↓                                         │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │        Service: googleDriveService.ts                         │  │
│  │  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  │  uploadContractPDF()                                     │ │  │
│  │  │    ↓                                                      │ │  │
│  │  │  setupContractFolderStructure()                          │ │  │
│  │  │    ├─ getOrCreateFolder("Berkas Kontrak")               │ │  │
│  │  │    ├─ getOrCreateFolder("AI" or "AO")                   │ │  │
│  │  │    └─ getOrCreateFolder("[Nama Kontrak]")               │ │  │
│  │  │    ↓                                                      │ │  │
│  │  │  uploadFileToDrive(buffer, fileName, folderId)          │ │  │
│  │  └──────────────────────────────────────────────────────────┘ │  │
│  └─────────────────────────┬─────────────────────────────────────┘  │
└────────────────────────────┼──────────────────────────────────────-─┘
                             │ Google Drive API Call
                             ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      GOOGLE DRIVE API                                │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Authentication: Service Account                             │  │
│  │  Email: disco-catcher-484807-p2@....iam.gserviceaccount.com  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                            ↓                                         │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Folder Structure Created:                                    │  │
│  │  📁 Berkas Kontrak                                            │  │
│  │    ├─ 📁 AI                                                   │  │
│  │    │   └─ 📁 Nama Kontrak 1                                   │  │
│  │    │       └─ 📄 kontrak_001_1234567890.pdf                  │  │
│  │    └─ 📁 AO                                                   │  │
│  │        └─ 📁 Nama Kontrak 2                                   │  │
│  │            └─ 📄 kontrak_002_1234567891.pdf                  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                            ↓                                         │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Return: { fileId, webViewLink }                              │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────────────┘
                          │ Response
                          ↓
┌─────────────────────────────────────────────────────────────────────┐
│                        SUPABASE DATABASE                             │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Table: contract_files                                        │  │
│  │  ┌────────────────────────────────────────────────────────┐   │  │
│  │  │ id          │ UUID                                     │   │  │
│  │  │ contract_id │ UUID (FK to contracts)                   │   │  │
│  │  │ file_url    │ https://drive.google.com/file/d/...     │   │  │
│  │  │ file_name   │ kontrak_001_1234567890.pdf              │   │  │
│  │  │ folder_path │ Berkas Kontrak/AI/Nama Kontrak          │   │  │
│  │  │ file_id     │ 1abc...xyz (Drive file ID)              │   │  │
│  │  │ created_at  │ 2025-01-20 10:30:00                     │   │  │
│  │  └────────────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────────────┘
                          │ Success Response
                          ↓
┌─────────────────────────────────────────────────────────────────────┐
│                         BROWSER / CLIENT                             │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  ✅ Success Notification                                      │  │
│  │  📄 File: kontrak_001_1234567890.pdf                         │  │
│  │  📁 Path: Berkas Kontrak/AI/Nama Kontrak                     │  │
│  │  🔗 Link: https://drive.google.com/file/d/...                │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow Diagram

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│          │     │          │     │          │     │          │
│  User    │────▶│ Frontend │────▶│  API     │────▶│  Google  │
│  Action  │     │  (React) │     │  Route   │     │  Drive   │
│          │     │          │     │          │     │  Service │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                │                 │                 │
     │ Click Upload   │                 │                 │
     ├───────────────▶│                 │                 │
     │                │ Select PDF      │                 │
     │                │◀────────────────┤                 │
     │                │                 │                 │
     │                │ POST FormData   │                 │
     │                ├────────────────▶│                 │
     │                │                 │ Validate        │
     │                │                 │◀────────────────┤
     │                │                 │                 │
     │                │                 │ Upload File     │
     │                │                 ├────────────────▶│
     │                │                 │                 │
     │                │                 │ File ID & Link  │
     │                │                 │◀────────────────┤
     │                │                 │                 │
     │                │                 │ Save to DB      │
     │                │                 ├─────┐           │
     │                │                 │     │Supabase   │
     │                │                 │◀────┘           │
     │                │                 │                 │
     │                │ Success JSON    │                 │
     │                │◀────────────────┤                 │
     │                │                 │                 │
     │ Show Success   │                 │                 │
     │◀───────────────┤                 │                 │
     │                │                 │                 │
```

## 📦 Component Structure

```
src/
├── services/
│   └── googleDriveService.ts
│       ├── getDriveClient()              ← Auth
│       ├── findFolderByName()            ← Search
│       ├── createFolder()                ← Create
│       ├── getOrCreateFolder()           ← Helper
│       ├── setupContractFolderStructure()← Setup
│       ├── uploadFileToDrive()           ← Upload
│       └── uploadContractPDF()           ← Main Function
│
├── app/
│   ├── api/
│   │   └── upload-contract/
│   │       └── route.ts
│   │           ├── POST()                ← Handler
│   │           ├── Validation            ← Input check
│   │           └── Response              ← JSON return
│   │
│   └── (admin)/
│       └── aset/
│           └── page.tsx
│               ├── openUploadModal()     ← Open modal
│               ├── handleUpload()        ← Upload logic
│               └── Upload Modal UI       ← User interface
│
└── lib/
    └── supabaseClient.ts                 ← DB connection
```

## 🎯 Key Functions Flow

### 1. Upload Trigger
```
User clicks Upload button
  → openUploadModal(contractId)
    → Set state: showUploadModal = true
      → Modal appears with file input
```

### 2. File Selection
```
User selects PDF file
  → onChange event
    → setSelectedFile(file)
      → Button enabled
```

### 3. Upload Process
```
handleUpload() called
  ├─ Get contract data (budgetType, name)
  ├─ Create FormData
  ├─ POST to /api/upload-contract
  │   ├─ Validate input
  │   ├─ Convert to Buffer
  │   └─ Call uploadContractPDF()
  │       ├─ Setup folder structure
  │       │   ├─ Berkas Kontrak
  │       │   ├─ AI/AO
  │       │   └─ Nama Kontrak
  │       └─ Upload to folder
  ├─ Save to Supabase
  └─ Show success message
```

## 🔐 Security Layers

```
┌────────────────────────────────────────┐
│  1. Client-Side Validation             │
│     - File type check (PDF only)       │
│     - File size check (< 50MB)         │
└────────────────┬───────────────────────┘
                 ↓
┌────────────────────────────────────────┐
│  2. API Route Validation               │
│     - MIME type verification           │
│     - Required fields check            │
│     - Data sanitization                │
└────────────────┬───────────────────────┘
                 ↓
┌────────────────────────────────────────┐
│  3. Service Account Authentication     │
│     - Google Cloud IAM                 │
│     - Limited scope access             │
│     - No user credentials exposed      │
└────────────────┬───────────────────────┘
                 ↓
┌────────────────────────────────────────┐
│  4. Database RLS (Supabase)            │
│     - Row Level Security               │
│     - Authorized access only           │
└────────────────────────────────────────┘
```

---

**Diagram ini menjelaskan alur lengkap dari user action sampai file tersimpan di Google Drive dan database.**
