<div align="center">

<p align="center">
  <img src="./public/images/Logo_PLN.png" alt="PLN Logo" height="80"/>
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="./public/images/Logo_Danantara (2).png" alt="Danantara Logo" height="60"/>
  &nbsp;&nbsp;&nbsp;&nbsp;
  <img src="./public/images/Logo SAKTI 2.png" alt="SAKTI Logo" height="80"/>
</p>

# SAKTI
**Sistem Administrasi Kontrak Terintegrasi**

<br>

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Next JS](https://img.shields.io/badge/Next-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Google Cloud](https://img.shields.io/badge/Google%20Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)

<br>

**Platform Digital Enterprise untuk Manajemen Siklus Hidup Kontrak dan Arsip Vendor pada PT. PLN (Persero) UPT Manado**

</div>

---

## Ringkasan Eksekutif

**SAKTI (Sistem Administrasi Kontrak Terintegrasi)** merupakan inisiatif transformasi digital yang dikembangkan untuk memperkuat tata kelola administrasi kontrak di lingkungan PT. PLN (Persero). Sistem ini dirancang untuk menggantikan proses manual berbasis kertas menjadi ekosistem digital yang terpusat, aman, dan transparan.

Dengan menerapkan arsitektur *cloud-native* dan standar keamanan *enterprise*, SAKTI memfasilitasi kolaborasi tanpa hambatan antara Vendor (Penyedia Barang/Jasa) dan Manajemen PLN, memastikan kepatuhan terhadap regulasi (compliance), serta meningkatkan efisiensi operasional melalui otomatisasi alur kerja persetujuan dokumen.

---

## Arsitektur Sistem

Sistem SAKTI dibangun dengan arsitektur modern yang memisahkan *Frontend* (Client-Side) dan *Backend* (Serverless) untuk menjamin skalabilitas dan performa tinggi.

```mermaid
graph TD
    subgraph ClientLayer [Client Layer]
        A[Vendor Portal] -->|HTTPS/TLS| D[Next.js App Router]
        B[Admin Dashboard] -->|HTTPS/TLS| D
        C[Super Admin Panel] -->|HTTPS/TLS| D
    end

    subgraph SecurityLayer [Security Layer]
        D <-->|Auth & Session| E[Supabase Auth / JWT]
        E -->|Verify| F[Role Based Access Control]
    end

    subgraph DataStorageLayer [Data & Storage Layer]
        F <-->|Query| G[(PostgreSQL Database)]
        F <-->|Upload/Download| H[Storage Bucket]
        H <-->|Sync| I[Google Drive Integration]
    end

    style ClientLayer fill:#f9f9f9,stroke:#333,stroke-width:1px
    style SecurityLayer fill:#e1f5fe,stroke:#0277bd,stroke-width:1px
    style DataStorageLayer fill:#e8f5e9,stroke:#2e7d32,stroke-width:1px
```

---

## Alur Proses Bisnis

Mekanisme operasional SAKTI mencakup siklus lengkap mulai dari registrasi vendor hingga pengarsipan dokumen kontrak secara permanen.

### Workflow Pengajuan & Persetujuan

```mermaid
sequenceDiagram
    participant V as Vendor
    participant S as Sistem SAKTI
    participant A as Admin PLN
    participant D as Digital Archive

    V->>S: 1. Upload Dokumen PDF (Draft)
    S-->>S: Validasi Format & Metadata
    S->>A: 2. Notifikasi Pengajuan Baru
    
    rect rgb(240, 248, 255)
        Note right of A: Proses Verifikasi
        A->>S: Preview Dokumen
        alt Dokumen Valid
            A->>S: Approve Dokumen
            S->>D: 3. Arsip ke Google Drive
            S->>V: Notifikasi "APPROVED"
        else Dokumen Tidak Sesuai
            A->>S: Reject (Sertakan Alasan)
            S-->>S: Jadwalkan Auto-Cleanup (7 hari)
            S->>V: Notifikasi "REJECTED"
        end
    end
```

---

## Spesifikasi Modul

### 1. Portal Manajemen Vendor
Modul antarmuka yang diperuntukkan bagi mitra kerja eksternal.
*   **Identitas Digital Perusahaan**: Pengelolaan data profil perusahaan (NPWP, Domisili, PIC) yang terverifikasi.
*   **Secure Document Submission**: Kanal pengunggahan dokumen kontrak terenkripsi dengan pembatasan tipe dan ukuran file.
*   **Real-time Tracking**: Pemantauan status dokumen secara waktu nyata (real-time) tanpa perlu menghubungi admin secara manual.

### 2. Dashboard Administrasi PLN
Pusat kontrol bagi internal PLN untuk pengelolaan operasional.
*   **Executive Overview**: Tampilan statistik makro mengenai volume kontrak, kinerja vendor, dan status pengajuan.
*   **Digital Verification Room**: Fasilitas peninjauan dokumen visual (PDF Preview) yang terintegrasi di dalam aplikasi.
*   **Audit Trail & Logs**: Perekaman jejak digital yang tidak dapat dimanipulasi dengan fitur **Interactive History** (dismiss/hide) untuk manajemen fokus yang lebih baik.
*   **High-Performance Data Grids**: Tabel data vendor dan kontrak yang telah dioptimalkan untuk menangani beban data besar tanpa latensi.

### 3. Sistem Pengarsipan & Keamanan
*   **Integrated Cloud Storage**: Sinkronisasi otomatis dengan Google Drive korporat untuk penyimpanan jangka panjang.
*   **Robust Data Integrity**: Validasi relasional data (Foreign Key) yang ketat untuk menjamin konsistensi antara data kontrak, history, dan vendor.
*   **Secure Server Actions**: Mekanisme penghapusan dan modifikasi data sensitif yang dilindungi lewat *Server-Side Actions* untuk keamanan setara bank.
*   **Auto-Cleanup Protocol**: Mekanisme pembersihan otomatis untuk file sampah (temporary/rejected) guna efisiensi ruang penyimpanan.

---

## Stack Teknologi

SAKTI dikembangkan menggunakan *best-in-class technologies* untuk menjamin keberlanjutan dan kemudahan pemeliharaan:

| Kategori | Teknologi | Deskripsi |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 16** | App Router architecture untuk performa rendering optimal (Server-Side Rendering). |
| **User Interface** | **React 19 & CSS3** | Antarmuka responsif dengan desain modern dan aksesibilitas tinggi. |
| **Database** | **Supabase (PostgreSQL)** | Basis data relasional dengan skalabilitas tinggi dan keamanan Row Level Security. |
| **Authentication** | **JWT & OAuth 2.0** | Standar keamanan otentikasi industri. |
| **Cloud Storage** | **Google Cloud Platform** | Integrasi API Service Account untuk manajemen file enterprise. |
| **Infrastructure** | **Vercel** | Edge Network deployment untuk latensi rendah. |

---

## Dokumentasi Teknis

Seluruh dokumentasi teknis, panduan instalasi, dan troubleshooting tersimpan rapi dalam direktori `documentation/`.

👉 **[Lihat Indeks Dokumentasi Lengkap (44 Dokumen)](documentation/INDEX.md)**

### Panduan Utama
*   [**Quick Start Guide**](documentation/QUICK_START.md) - Panduan instalasi dan menjalankan aplikasi.
*   [**Supabase Setup**](documentation/SUPABASE_SETUP.md) - Konfigurasi database dan autentikasi.
*   [**Google Drive Integration**](documentation/GOOGLE_DRIVE_SETUP.md) - Setup penyimpanan awan.
*   [**Troubleshooting**](documentation/TROUBLESHOOTING.md) - Solusi masalah umum.
*   [**Arsitektur Sistem**](documentation/ARCHITECTURE_DIAGRAM.md) - Detail teknis arsitektur.

---

## Kontak & Dukungan Teknis

**PT. PLN (Persero) - Unit Pelaksana Transmisi (UPT) Manado**
*Divisi Konstruksi Dan Penyaluran*

---

<div align="center">
  <small>Hak Cipta © 2026 PT. PLN (Persero). Dilindungi Undang-Undang.</small>
  <br>
  <small>SAKTI v2.1 - Sistem Administrasi Kontrak Terintegrasi</small>
</div>
