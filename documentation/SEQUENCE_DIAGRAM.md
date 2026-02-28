# System Sequence Diagrams

Berikut adalah diagram urutan (Sequence Diagram) yang menjelaskan interaksi antar objek/komponen dalam sistem VLAAS untuk skenario utama.

## 1. Sequence: Pengajuan Surat Baru (Vendor)

Menjelaskan aliran data saat vendor mengirimkan pengajuan surat, mulai dari UI hingga notifikasi Telegram.

```plantuml
@startuml
autonumber
title Sequence Diagram: Pengajuan Surat Baru

actor "Vendor" as User
boundary "VendorPortal (UI)" as UI
control "SuratService" as Service
control "TelegramActions" as Bot
database "Supabase DB" as DB
boundary "Supabase Storage" as Storage
actor "Admin (Telegram)" as Admin

User -> UI : Isi Form Pengajuan & Upload PDF
activate UI

UI -> Service : createSurat(data, file)
activate Service

Service -> Storage : uploadFile(pdf)
activate Storage
Storage --> Service : return fileUrl
deactivate Storage

Service -> DB : insert(surat_pengajuan, status='PENDING')
activate DB
DB --> Service : return suratData
deactivate DB

par Notify Admin via Telegram
    Service -> Bot : sendTelegramWithButtons(message, buttons)
    activate Bot
    Bot -> Admin : Kirim Notifikasi (Approve/Reject Buttons)
    Bot --> Service : success
    deactivate Bot
end

Service --> UI : return success
deactivate Service

UI --> User : Tampilkan "Pengajuan Berhasil"
deactivate UI

@enduml
```

## 2. Sequence: Approval Surat (Admin)

Menjelaskan proses admin menyetujui pengajuan melalui dashboard.

```plantuml
@startuml
autonumber
title Sequence Diagram: Approval Surat (Admin Dashboard)

actor "Admin" as Admin
boundary "ApprovalSurat (UI)" as UI
control "SuratService" as Service
control "TelegramActions" as Bot
database "Supabase DB" as DB
actor "Vendor" as Vendor

Admin -> UI : Klik "Setujui" pada Pengajuan
activate UI

UI -> Service : updateSuratStatus(id, 'APPROVED')
activate Service

Service -> DB : update(status='APPROVED', updated_at=now)
activate DB
DB --> Service : return updatedData
deactivate DB

par Notify Vendor (via Telegram/Email logs)
    Service -> Bot : sendTelegramNotification("Surat Disetujui")
    activate Bot
    Bot -> Vendor : Kirim Notifikasi Status (Simulasi)
    Bot --> Service : success
    deactivate Bot
end

Service --> UI : return success
deactivate Service

UI -> UI : Update UI List (Remove from Pending)
UI --> Admin : Tampilkan Toast "Berhasil Disetujui"
deactivate UI

@enduml
```

## 3. Sequence: Sinkronisasi Status Vendor (Auto-Sync)

Menjelaskan bagaimana sistem memperbarui status vendor secara otomatis berdasarkan kontrak aktif.

```plantuml
@startuml
autonumber
title Sequence Diagram: Vendor Contract Status Sync

actor "System/Admin" as Trigger
control "VendorAccountService" as Service
database "Contracts Table" as DB_Contract
database "Vendors Table" as DB_Vendor

Trigger -> Service : updateVendorContractStatus()
activate Service

Service -> DB_Contract : select distinct vendor_name where status in (ActiveList)
activate DB_Contract
DB_Contract --> Service : return activeVendorNames[]
deactivate DB_Contract

Service -> DB_Vendor : select * from vendors
activate DB_Vendor
DB_Vendor --> Service : return allVendors[]
deactivate DB_Vendor

loop For each Vendor in allVendors
    Service -> Service : Check if vendor.name in activeVendorNames
    
    alt Has Active Contract
        Service -> Service : NewStatus = 'Berkontrak'
    else No Contract
        Service -> Service : NewStatus = 'Aktif'
    end
    
    opt Status Changed
        Service -> DB_Vendor : update(status=NewStatus)
        activate DB_Vendor
        DB_Vendor --> Service : success
        deactivate DB_Vendor
    end
end

Service --> Trigger : Sync Complete
deactivate Service

@enduml
```
