# System Activity Diagrams

Berikut adalah diagram aktivitas (Activity Diagram) yang menggambarkan alur kerja utama dalam sistem VLAAS.

## 1. Alur Pengajuan Surat (Vendor)

Diagram ini menjelaskan proses vendor saat membuat dan mengirimkan pengajuan surat baru.

```plantuml
@startuml
title Activity Diagram: Pengajuan Surat Baru (Vendor)
start

:Vendor Login ke Portal;
:Akses Menu "Pengajuan Baru";
:Isi Form Pengajuan
(Nomor Surat, Perihal, Tanggal, dll);

repeat
  :Upload Dokumen PDF;
  if (Format Valid?) then (Ya)
    :File Diterima;
    break
  else (Tidak)
    :Tampilkan Pesan Error;
  endif
repeat while (File belum valid)

:Klik Tombol "Kirim Pengajuan";

partition "System Backend" {
  :Validasi Input Server-side;
  :Simpan Data ke Database (Status: PENDING);
  :Upload File ke Storage;
  :Kirim Notifikasi ke Admin (Telegram);
}

:Tampilkan Pesan Sukses;
:Redirect ke Riwayat Pengajuan;

stop
@enduml
```

## 2. Alur Approval Surat (Admin)

Diagram ini menjelaskan proses verifikasi yang dilakukan oleh Admin (Verifikator) terhadap pengajuan yang masuk.

```plantuml
@startuml
title Activity Diagram: Approval Surat (Admin)
start

:Admin Login;
:Akses Halaman "Approval Surat";
:Lihat Daftar Pengajuan (Status: PENDING);
:Pilih Salah Satu Pengajuan;
:Lihat Detail & Preview PDF;

if (Dokumen Valid & Sesuai?) then (Ya)
  :Klik "Setujui" (Approve);
  partition "System Process" {
    :Update Status -> APPROVED;
    :Log Aktivitas Approval;
    :Kirim Notifikasi Approval ke Vendor;
  }
else (Tidak)
  :Klik "Tolak" (Reject);
  :Input Alasan Penolakan;
  partition "System Process" {
    :Update Status -> REJECTED;
    :Simpan Alasan Penolakan;
    :Log Aktivitas Penolakan;
    :Kirim Notifikasi Penolakan ke Vendor;
  }
endif

:Refresh Daftar Approval;

stop
@enduml
```

## 3. Alur Manajemen Kontrak & Pembayaran (Admin)

Diagram ini menjelaskan proses admin mengelola kontrak aktif dan tahapan pembayarannya.

```plantuml
@startuml
title Activity Diagram: Manajemen Kontrak & Pembayaran
start

:Admin Akses Menu "Manajemen Aset";
:Pilih Kontrak (Status: Dalam Pekerjaan/Approved);

fork
  :Edit Detail Kontrak;
  :Update Nilai/Tanggal;
  :Upload Dokumen Kontrak Final;
fork again
  :Kelola Tahapan Pembayaran (Termin);
  :Tambah Tahapan Baru;
  if (Total > Nilai Kontrak?) then (Ya)
    :Tolak Input (Error);
    end
  else (Tidak)
    :Simpan Tahapan;
  endif
end fork

:Simpan Perubahan;
:Update Status Pembayaran (Jika lunas);

stop
@enduml
```

## 4. Alur Login (User)

Diagram alur otentikasi umum untuk Vendor dan Admin.

```plantuml
@startuml
title Activity Diagram: Login User
start

:User Akses Halaman Login;
:Input Email & Password;

partition "Otentikasi System" {
  :Cek Kredensial di Database;
  if (Valid?) then (Ya)
    :Generate Session/Token;
    :Cek Role User;
    if (Role == Admin/Super Admin?) then (Ya)
      :Redirect ke Dashboard Admin;
    else (Vendor)
      :Redirect ke Dashboard Vendor;
    endif
  else (Tidak)
    :Tampilkan Pesan "Email/Password Salah";
    detach
  endif
}

stop
@enduml
```
