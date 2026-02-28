# System Use Cases

Berikut adalah kode PlantUML untuk Use Case Diagram program VLAAS yang telah diperbarui dengan detail fitur Admin dan penambahan peran Super Admin.

```plantuml
@startuml
left to right direction
skinparam packageStyle rectangle

actor "Vendor" as vendor
actor "Admin (Verifikator)" as admin
actor "Super Admin" as superadmin

rectangle "VLAAS Application" {
  
  package "Akses & Otentikasi" {
    usecase "Login" as UC_Login
    usecase "Register" as UC_Register
    usecase "Logout" as UC_Logout
    usecase "Lupa Password" as UC_Forgot_Password
  }

  package "Portal Vendor" {
    usecase "Lihat Dashboard Vendor" as UC_Vendor_Dashboard
    
    package "Manajemen Profil" {
      usecase "Kelola Profil Perusahaan" as UC_Manage_Profile
      usecase "Edit Data Perusahaan" as UC_Edit_Profile
      usecase "Upload/Hapus Foto Profil" as UC_Profile_Photo
      usecase "Ubah Password" as UC_Change_Password_Vendor
    }

    package "Manajemen Pengajuan" {
      usecase "Kelola Pengajuan" as UC_Manage_Submission
      usecase "Buat Pengajuan Baru" as UC_Create_Submission
      usecase "Upload Dokumen (PDF)" as UC_Upload_Doc
      usecase "Lihat Status & Riwayat" as UC_View_History_Vendor
    }
  }

  package "Portal Admin" {
    usecase "Lihat Dashboard Admin" as UC_Admin_Dashboard

    package "Approval Surat" {
      usecase "Kelola Approval" as UC_Approval
      usecase "Review Dokumen Pengajuan" as UC_Review_Doc
      usecase "Setujui Pengajuan" as UC_Approve
      usecase "Tolak Pengajuan" as UC_Reject
    }

    package "Manajemen Aset & Kontrak" {
      usecase "Kelola Aset (Kontrak)" as UC_Manage_Asset
      usecase "Lihat Detail Kontrak" as UC_View_Contract_Detail
      usecase "Upload Dokumen Kontrak (Final)" as UC_Upload_Contract_Final
      usecase "Update Data Kontrak" as UC_Edit_Contract
      usecase "Buat Amandemen Kontrak" as UC_Create_Amendment
      usecase "Update Progress Tracker" as UC_Update_Progress
      usecase "Kelola Tahapan Pembayaran" as UC_Manage_Payment
    }

    package "Manajemen Vendor" {
      usecase "Kelola Data Vendor" as UC_Manage_Vendor_Data
      usecase "Tambah Vendor Baru" as UC_Add_Vendor
      usecase "Edit Data Vendor" as UC_Edit_Vendor
      usecase "Hapus Vendor" as UC_Delete_Vendor
      usecase "Lihat Detail Profil Vendor" as UC_View_Vendor_Detail
    }

    package "Laporan & Reporting" {
      usecase "Lihat Laporan KPI" as UC_View_KPI
      usecase "Filter Laporan (Waktu/Status)" as UC_Filter_Report
      usecase "Export Laporan (PDF/CSV)" as UC_Export_Report
    }

    package "Pengaturan Sistem" {
      usecase "Pengaturan Profil Admin" as UC_Admin_Profile
      usecase "Manajemen User Admin" as UC_Manage_Admin_Users
      usecase "Tambah User Admin Baru" as UC_Add_Admin
      usecase "Nonaktifkan User" as UC_Deactivate_User
    }
  }
}

' --- Relationships ---

' Vendor
vendor -- UC_Login
vendor -- UC_Register
vendor -- UC_Vendor_Dashboard
vendor -- UC_Manage_Profile
vendor -- UC_Manage_Submission

UC_Manage_Profile <.. UC_Edit_Profile : <<extend>>
UC_Manage_Profile <.. UC_Profile_Photo : <<extend>>
UC_Manage_Profile <.. UC_Change_Password_Vendor : <<extend>>

UC_Manage_Submission <.. UC_Create_Submission : <<include>>
UC_Create_Submission <.. UC_Upload_Doc : <<include>>
UC_Manage_Submission <.. UC_View_History_Vendor : <<include>>

' Admin (Verifikator)
admin -- UC_Login
admin -- UC_Admin_Dashboard
admin -- UC_Approval
admin -- UC_Manage_Asset
admin -- UC_Manage_Vendor_Data
admin -- UC_View_KPI
admin -- UC_Admin_Profile

' Approval Details
UC_Approval <.. UC_Review_Doc : <<include>>
UC_Approval <.. UC_Approve : <<extend>>
UC_Approval <.. UC_Reject : <<extend>>

' Asset Management Details
UC_Manage_Asset <.. UC_View_Contract_Detail : <<include>>
UC_Manage_Asset <.. UC_Upload_Contract_Final : <<extend>>
UC_Manage_Asset <.. UC_Edit_Contract : <<extend>>
UC_Manage_Asset <.. UC_Create_Amendment : <<extend>>
UC_Manage_Asset <.. UC_Update_Progress : <<extend>>
UC_Manage_Asset <.. UC_Manage_Payment : <<extend>>

' Vendor Management Details
UC_Manage_Vendor_Data <.. UC_Add_Vendor : <<extend>>
UC_Manage_Vendor_Data <.. UC_Edit_Vendor : <<extend>>
UC_Manage_Vendor_Data <.. UC_Delete_Vendor : <<extend>>
UC_Manage_Vendor_Data <.. UC_View_Vendor_Detail : <<include>>

' Reporting Details
UC_View_KPI <.. UC_Filter_Report : <<include>>
UC_View_KPI <.. UC_Export_Report : <<extend>>

' Super Admin Inheritance & Extras
superadmin -|> admin : <<inherits>>
superadmin -- UC_Manage_Admin_Users

UC_Manage_Admin_Users <.. UC_Add_Admin : <<include>>
UC_Manage_Admin_Users <.. UC_Deactivate_User : <<extend>>

' Shared
UC_Login <.. UC_Forgot_Password : <<extend>>
UC_Login -- UC_Logout : <<include>>

@enduml
```

## Penjelasan Detail Aktor

### 1. Vendor
Pihak eksternal (rekanan) yang menggunakan aplikasi untuk mengajukan surat atau kontrak kerja.

### 2. Admin (Verifikator)
Pengguna internal PLN yang bertugas melakukan operasional harian:
*   **Approval Surat**: Memeriksa, menyetujui, atau menolak pengajuan vendor.
*   **Aset & Kontrak**:
    *   Mengupload dokumen kontrak final (PDF).
    *   Membuat amandemen jika ada perubahan kontrak.
    *   Mengupdate progress pekerjaan (0-100%).
    *   Mengatur termin pembayaran (Payment Stages).
*   **Manajemen Vendor**: Menambah, mengedit, atau menghapus data vendor secara manual.
*   **Laporan**: Melihat statistik, grafik kinerja, dan melakukan **Export ke PDF/CSV**.

### 3. Super Admin
Pengguna dengan hak akses tertinggi. Memiliki **semua kemampuan Admin**, ditambah hak khusus di menu **Pengaturan**:
*   **Manajemen User**: Dapat menambahkan akun Admin baru dengan role "Verifikator" atau "Super Admin".
*   **Keamanan**: Dapat menonaktifkan atau mengaktifkan kembali akun admin lain.
