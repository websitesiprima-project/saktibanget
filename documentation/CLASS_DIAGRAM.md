# System Class Diagram

Berikut adalah diagram kelas (Class Diagram) yang menggambarkan struktur database dan relasi antar entitas dalam sistem VLAAS.

```plantuml
@startuml
skinparam classAttributeIconSize 0

class "Profiles (Admin Users)" as Profiles {
    + id: UUID [PK]
    + full_name: String
    + email: String
    + role: Enum (Super Admin, Verifikator, Admin)
    + status: Enum (Aktif, Nonaktif)
    + phone: String
    + address: Text
    + profile_image: String (URL)
    + last_login: DateTime
    + created_at: DateTime
    + updated_at: DateTime
}

class "VendorUsers (Auth)" as VendorUsers {
    + id: UUID [PK]
    + email: String [Unique]
    + company_name: String
    + status: Enum (Aktif, Tidak Aktif)
    + reset_token: String
    + reset_token_expires: DateTime
    + created_at: DateTime
}

class "Vendors (Data)" as Vendors {
    + id: String [PK]
    + nama: String
    + email: String
    + telepon: String
    + alamat: Text
    + kontak_person: String
    + kategori: String
    + status: Enum (Aktif, Berkontrak, Tidak Aktif)
    + tanggal_registrasi: Date
    + created_at: DateTime
}

class "SuratPengajuan" as Surat {
    + id: UUID [PK]
    + nomor_surat: String
    + perihal: String
    + tanggal_surat: Date
    + nama_pekerjaan: String
    + nomor_kontrak: String
    + keterangan: Text
    + file_name: String
    + file_url: String
    + status: Enum (PENDING, APPROVED, REJECTED)
    + alasan_penolakan: Text
    + vendor_id: Integer [FK]
    + vendor_email: String
    + created_at: DateTime
    + updated_at: DateTime
}

class "Contracts" as Contracts {
    + id: UUID [PK]
    + contract_number: String
    + title: String
    + value: Decimal
    + start_date: Date
    + end_date: Date
    + status: Enum (Dalam Pekerjaan, Selesai, dll)
    + vendor_name: String
    + vendor_id: String [FK]
    + created_at: DateTime
    + updated_at: DateTime
}

class "AuditLogs" as AuditLogs {
    + id: UUID [PK]
    + user_id: UUID [FK]
    + action: String
    + details: JSONB
    + ip_address: String
    + created_at: DateTime
}

class "SystemConfig" as SystemConfig {
    + id: Integer [PK]
    + retention_enabled: Boolean
    + retention_months: Integer
    + email_notif_enabled: Boolean
    + approved_template: Text
    + rejected_template: Text
    + updated_at: DateTime
}

' Relationships

VendorUsers "1" -- "0..1" Vendors : "Linked by Email"
Vendors "1" -- "0..*" Surat : "Submits"
Vendors "1" -- "0..*" Contracts : "Executes"
Profiles "1" -- "0..*" AuditLogs : "Performs Action"

note right of Profiles
  Tabel ini digunakan untuk pengguna internal PLN (Admin).
  Role menentukan hak akses menu.
end note

note right of VendorUsers
  Tabel ini khusus untuk otentikasi Vendor.
  Terpisah dari tabel data detail Vendor.
end note

@enduml
```

## Penjelasan Entitas

### 1. Profiles (Admin Users)
Menyimpan data pengguna internal (pegawai PLN) yang memiliki akses ke dashboard admin.
*   **Role**: Menentukan otorisasi (Super Admin bisa kelola user lain, Verifikator hanya operasional).

### 2. VendorUsers & Vendors
Pemisahan antara akun login (`VendorUsers`) dan data perusahaan (`Vendors`).
*   **VendorUsers**: Digunakan untuk login dan reset password.
*   **Vendors**: Data detail perusahaan yang digunakan dalam kontrak dan surat.

### 3. SuratPengajuan
Menyimpan semua data pengajuan surat dari vendor.
*   **Status**: Mengontrol alur approval (PENDING -> APPROVED/REJECTED).
*   **File**: Menyimpan referensi ke file PDF di Supabase Storage.

### 4. Contracts (Manajemen Aset)
Menyimpan data kontrak kerja yang sedang berjalan atau sudah selesai.
*   Relasi ke Vendor memastikan setiap kontrak terhubung ke pelaksana pekerjaan.

### 5. AuditLogs
Mencatat setiap aksi penting yang dilakukan oleh Admin untuk keperluan tracing dan keamanan.

### 6. SystemConfig
Tabel tunggal (Single Row) untuk menyimpan preferensi sistem yang berlaku global, seperti template pesan dan kebijakan retensi data.
