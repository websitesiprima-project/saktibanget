'use client'
import { useState, useEffect, useRef } from 'react'
import { User, Users, Settings, Mail, Search, Lock, FileText, Save, UserPlus, Ban, CheckCircle, XCircle, Camera, Upload, X, Eye, EyeOff } from 'lucide-react'
import NotificationModal from '../../../components/NotificationModal'
import ConfirmModal from '../../../components/ConfirmModal'
import './Pengaturan.css'
import {
    updateProfile,
    changePassword,
    sendPasswordResetEmail,
    getUserProfile,
    getAllAdminUsers,
    createAdminUser,
    deactivateUser,
    activateUser,
    getAuditLogs,

    createAuditLog,
    uploadProfileImage,
    deleteProfileImage
} from '../../../services/userService'
import { createAdminUserAction } from '../../../actions/adminUserActions'
import { supabase } from '../../../lib/supabaseClient'

function Pengaturan() {
    const [activeTab, setActiveTab] = useState('profil')
    const [userRole, setUserRole] = useState('Super Admin')
    const [currentUserId, setCurrentUserId] = useState('')
    const [loading, setLoading] = useState(false)
    const [notification, setNotification] = useState({ show: false, type: 'success' as 'success' | 'error' | 'warning' | 'info', message: '' })
    const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: () => { } })
    const fileInputRef = useRef<HTMLInputElement>(null)

    // State untuk Profil
    const [profileData, setProfileData] = useState({
        namaLengkap: '',
        email: '',
        telepon: '',
        alamat: '',
        profileImage: ''
    })
    const [previewImage, setPreviewImage] = useState<string>('')
    const [uploadingImage, setUploadingImage] = useState(false)

    // State untuk Password
    const [passwordData, setPasswordData] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    })

    // State untuk User Management
    const [showAddUserModal, setShowAddUserModal] = useState(false)
    const [newUserData, setNewUserData] = useState({
        email: '',
        namaLengkap: '',
        role: 'Verifikator',
        password: '',
        confirmPassword: ''
    })
    const [showNewUserPassword, setShowNewUserPassword] = useState(false)
    const [adminUsers, setAdminUsers] = useState<any[]>([])



    // State untuk Audit Log
    const [auditLogs, setAuditLogs] = useState<any[]>([])
    const [auditFilters, setAuditFilters] = useState({
        startDate: '',
        endDate: '',
        search: ''
    })

    // Load data on mount
    useEffect(() => {
        loadUserData()
        if (userRole === 'Super Admin') {
            loadAdminUsers()
            loadAdminUsers()
            loadAuditLogs()
        }
    }, [userRole])

    const loadUserData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setCurrentUserId(user.id)
                const result = await getUserProfile(user.id)
                if (result.success && (result as any).data) {
                    const profileImageUrl = (result as any).data.profile_image || ''
                    setProfileData({
                        namaLengkap: (result as any).data.full_name || '',
                        email: user.email || '',
                        telepon: (result as any).data.phone || '',
                        alamat: (result as any).data.address || '',
                        profileImage: profileImageUrl
                    })
                    setPreviewImage(profileImageUrl)
                    setUserRole((result as any).data.role || 'Admin')
                }
            }
        } catch (error) {
            console.error('Error loading user data:', error)
        }
    }

    const loadAdminUsers = async () => {
        const result = await getAllAdminUsers()
        if (result.success) {
            setAdminUsers((result as any).data)
        }
    }



    const loadAuditLogs = async () => {
        const result = await getAuditLogs(auditFilters)
        if (result.success) {
            setAuditLogs((result as any).data)
        }
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validasi ukuran file
        const maxSize = 2 * 1024 * 1024 // 2MB
        if (file.size > maxSize) {
            setNotification({ show: true, type: 'error', message: 'Ukuran file terlalu besar. Maksimal 2MB' })
            return
        }

        // Validasi tipe file
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
            setNotification({ show: true, type: 'error', message: 'Tipe file tidak didukung. Gunakan JPG, PNG, GIF, atau WebP' })
            return
        }

        setUploadingImage(true)
        try {
            // Upload image
            const result = await uploadProfileImage(currentUserId, file)

            if (result.success) {
                const imageUrl = (result as any).data.url
                setProfileData(prev => ({ ...prev, profileImage: imageUrl }))
                setPreviewImage(imageUrl)
                setNotification({ show: true, type: 'success', message: (result as any).message })

                // Dispatch event agar Header update otomatis
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('profile-updated'))
                }

                await createAuditLog('Mengubah foto profil')
            } else {
                setNotification({ show: true, type: 'error', message: 'Gagal upload foto: ' + (result as any).error })
            }
        } catch (error) {
            console.error('Upload error:', error)
            setNotification({ show: true, type: 'error', message: 'Terjadi kesalahan saat upload foto' })
        } finally {
            setUploadingImage(false)
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    const handleRemoveImage = async () => {
        if (!profileData.profileImage) return

        setConfirmModal({
            show: true,
            title: 'Hapus Foto Profil',
            message: 'Apakah Anda yakin ingin menghapus foto profil? Data yang dihapus tidak dapat dikembalikan.',
            onConfirm: async () => {
                setConfirmModal({ ...confirmModal, show: false })
                setUploadingImage(true)
                try {
                    // Delete from storage
                    await deleteProfileImage(profileData.profileImage)

                    // Update database
                    const result = await updateProfile(currentUserId, {
                        ...profileData,
                        profile_image: null
                    })

                    if (result.success) {
                        setProfileData(prev => ({ ...prev, profileImage: '' }))
                        setPreviewImage('')
                        setNotification({ show: true, type: 'success', message: 'Foto profil berhasil dihapus' })

                        // Dispatch event
                        if (typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('profile-updated'))
                        }

                        await createAuditLog('Menghapus foto profil')
                    } else {
                        setNotification({ show: true, type: 'error', message: 'Gagal menghapus foto: ' + (result as any).error })
                    }
                } catch (error) {
                    console.error('Remove image error:', error)
                    setNotification({ show: true, type: 'error', message: 'Terjadi kesalahan saat menghapus foto' })
                } finally {
                    setUploadingImage(false)
                }
            }
        })
    }

    const handleProfileUpdate = async (e: any) => {
        e.preventDefault()

        let userIdToUse = currentUserId;

        // Fallback: Jika state currentUserId kosong, coba ambil dari session langsung
        if (!userIdToUse) {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    userIdToUse = user.id;
                    setCurrentUserId(user.id); // Update state untuk next time
                }
            } catch (err) {
                console.error("Failed to fetch user on demand", err);
            }
        }

        if (!userIdToUse) {
            setNotification({ show: true, type: 'error', message: 'Sesi anda telah berakhir atau data tidak valid. Mohon login ulang.' })
            return
        }

        setLoading(true)
        try {
            const result = await updateProfile(userIdToUse, profileData)
            if (result.success) {
                // Update local state jika berhasil
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    // Refresh data agar sinkron
                    const updatedProfile = await getUserProfile(user.id)
                    if (updatedProfile.success && (updatedProfile as any).data) {
                        setProfileData(prev => ({ ...prev, ... (updatedProfile as any).data }))
                    }
                }

                setNotification({ show: true, type: 'success', message: (result as any).message })

                // Dispatch event agar Header update otomatis
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('profile-updated'))
                }

                await createAuditLog('Memperbarui profil pengguna')
            } else {
                setNotification({ show: true, type: 'error', message: 'Gagal memperbarui profil: ' + (result as any).error })
            }
        } catch (error) {
            setNotification({ show: true, type: 'error', message: 'Terjadi kesalahan saat memperbarui profil' })
        } finally {
            setLoading(false)
        }
    }

    const handlePasswordChange = async (e: any) => {
        e.preventDefault()
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setNotification({ show: true, type: 'warning', message: 'Password baru dan konfirmasi tidak cocok!' })
            return
        }
        if (passwordData.newPassword.length < 6) {
            setNotification({ show: true, type: 'warning', message: 'Password minimal 6 karakter!' })
            return
        }
        setLoading(true)
        try {
            const result = await changePassword(passwordData.oldPassword, passwordData.newPassword)
            if (result.success) {
                setNotification({ show: true, type: 'success', message: (result as any).message })
                setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' })
                await createAuditLog('Mengubah password')
            } else {
                setNotification({ show: true, type: 'error', message: 'Gagal mengubah password: ' + (result as any).error })
            }
        } catch (error) {
            setNotification({ show: true, type: 'error', message: 'Terjadi kesalahan saat mengubah password' })
        } finally {
            setLoading(false)
        }
    }

    const handlePasswordReset = async () => {
        if (!profileData.email) {
            setNotification({ show: true, type: 'error', message: 'Email tidak tersedia' })
            return
        }
        setLoading(true)
        try {
            const result = await sendPasswordResetEmail(profileData.email)
            if (result.success) {
                setNotification({ show: true, type: 'success', message: (result as any).message })
            } else {
                setNotification({ show: true, type: 'error', message: 'Gagal mengirim email reset: ' + (result as any).error })
            }
        } catch (error) {
            setNotification({ show: true, type: 'error', message: 'Terjadi kesalahan' })
        } finally {
            setLoading(false)
        }
    }

    const handleAddUser = async (e: any) => {
        e.preventDefault()

        // Validasi Password
        if (newUserData.password !== newUserData.confirmPassword) {
            alert('Password dan Konfirmasi Password tidak cocok!')
            return
        }
        if (newUserData.password.length < 6) {
            alert('Password minimal 6 karakter!')
            return
        }

        setLoading(true)
        try {
            // Gunakan Server Action untuk membuat user + password langsung
            const result = await createAdminUserAction({
                email: newUserData.email,
                password: newUserData.password,
                namaLengkap: newUserData.namaLengkap,
                role: newUserData.role
            })

            if (result.success) {
                setNotification({ show: true, type: 'success', message: (result as any).message })
                setShowAddUserModal(false)
                setNewUserData({
                    email: '',
                    namaLengkap: '',
                    role: 'Verifikator',
                    password: '',
                    confirmPassword: ''
                })
                await loadAdminUsers()
                await loadAuditLogs()
                // Audit log handled in server action
                // But we can refresh audit logs locally if needed
            } else {
                setNotification({ show: true, type: 'error', message: 'Gagal menambah user: ' + (result as any).error })
            }
        } catch (error) {
            setNotification({ show: true, type: 'error', message: 'Terjadi kesalahan saat menambah user' })
        } finally {
            setLoading(false)
        }
    }

    const handleDeactivateUser = async (userId: string, userName: string) => {
        setConfirmModal({
            show: true,
            title: 'Nonaktifkan User',
            message: `Apakah Anda yakin ingin menonaktifkan akses "${userName}"? User tidak akan bisa login ke sistem.`,
            onConfirm: async () => {
                setConfirmModal({ ...confirmModal, show: false })
                setLoading(true)
                try {
                    const result = await deactivateUser(userId)
                    if (result.success) {
                        setNotification({ show: true, type: 'success', message: (result as any).message })
                        await loadAdminUsers()
                        await createAuditLog(`Menonaktifkan user: ${userName}`)
                    } else {
                        setNotification({ show: true, type: 'error', message: 'Gagal menonaktifkan user: ' + (result as any).error })
                    }
                } catch (error) {
                    setNotification({ show: true, type: 'error', message: 'Terjadi kesalahan' })
                } finally {
                    setLoading(false)
                }
            }
        })
    }

    const handleActivateUser = async (userId: string, userName: string) => {
        setLoading(true)
        try {
            const result = await activateUser(userId)
            if (result.success) {
                setNotification({ show: true, type: 'success', message: (result as any).message })
                await loadAdminUsers()
                await createAuditLog(`Mengaktifkan user: ${userName}`)
            } else {
                setNotification({ show: true, type: 'error', message: 'Gagal mengaktifkan user: ' + (result as any).error })
            }
        } catch (error) {
            setNotification({ show: true, type: 'error', message: 'Terjadi kesalahan' })
        } finally {
            setLoading(false)
        }
    }

    /* 
    // Missing systemConfig and saveSystemConfig
    const handleSystemConfigSave = async () => {
        setLoading(true)
        try {
            const result = await saveSystemConfig(systemConfig)
            if (result.success) {
                setNotification({ show: true, type: 'success', message: (result as any).message })
            } else {
                setNotification({ show: true, type: 'error', message: 'Gagal menyimpan konfigurasi: ' + (result as any).error })
            }
        } catch (error) {
            setNotification({ show: true, type: 'error', message: 'Terjadi kesalahan' })
        } finally {
            setLoading(false)
        }
    }
    */

    const handleAuditFilter = async () => {
        await loadAuditLogs()
    }

    return (
        <>
            {/* Tab Navigation */}
            <div className="settings-tabs">
                <button
                    className={`tab-btn ${activeTab === 'profil' ? 'active' : ''}`}
                    onClick={() => setActiveTab('profil')}
                >
                    <User size={18} /> Profil & Akun
                </button>
                <button
                    className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
                    onClick={() => setActiveTab('security')}
                >
                    <Lock size={18} /> Keamanan
                </button>
                {userRole === 'Super Admin' && (
                    <>
                        <button
                            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                            onClick={() => setActiveTab('users')}
                        >
                            <Users size={18} /> Manajemen User
                        </button>


                    </>
                )}
            </div>

            {/* Tab Content */}
            <div className="settings-content">
                {/* Profil & Akun Tab */}
                {activeTab === 'profil' && (
                    <div className="tab-panel">
                        <div className="settings-section">
                            <div className="section-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        padding: '8px',
                                        borderRadius: '8px',
                                        background: 'rgba(59, 130, 246, 0.1)',
                                        color: '#3b82f6',
                                        display: 'flex',
                                        boxShadow: '0 2px 4px rgba(59, 130, 246, 0.1)'
                                    }}>
                                        <User size={20} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <h3 className="section-title" style={{ marginBottom: '4px' }}>Edit Profil Pengguna</h3>
                                        <p className="section-description" style={{ marginBottom: 0 }}>Perbarui informasi pribadi anda</p>
                                    </div>
                                </div>
                            </div>
                            <form onSubmit={handleProfileUpdate} className="settings-form">
                                {/* Profile Image Upload Section */}
                                <div className="profile-image-section">
                                    <label>Foto Profil</label>
                                    <div className="profile-image-container">
                                        <div className="profile-image-preview">
                                            {previewImage ? (
                                                <img src={previewImage} alt="Profile" className="profile-img" />
                                            ) : (
                                                <div className="profile-placeholder">
                                                    <User size={48} strokeWidth={1.5} color="#94a3b8" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="profile-image-actions">
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                                                onChange={handleImageUpload}
                                                style={{ display: 'none' }}
                                            />
                                            <div className="profile-image-buttons">
                                                <button
                                                    type="button"
                                                    className="btn-upload-image"
                                                    onClick={() => fileInputRef.current?.click()}
                                                    disabled={uploadingImage}
                                                >
                                                    {uploadingImage ? (
                                                        <>
                                                            <Upload size={18} className="uploading" />
                                                            Uploading...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Camera size={18} />
                                                            {previewImage ? 'Ganti Foto' : 'Upload Foto'}
                                                        </>
                                                    )}
                                                </button>
                                                {previewImage && (
                                                    <button
                                                        type="button"
                                                        className="btn-remove-image"
                                                        onClick={handleRemoveImage}
                                                        disabled={uploadingImage}
                                                    >
                                                        <X size={18} />
                                                        Hapus Foto
                                                    </button>
                                                )}
                                            </div>
                                            <p className="upload-hint">JPG, PNG, GIF atau WebP. Maks 2MB</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group-settings">
                                        <label>Nama Lengkap</label>
                                        <input
                                            type="text"
                                            value={profileData.namaLengkap}
                                            onChange={(e) => setProfileData({ ...profileData, namaLengkap: e.target.value })}
                                            placeholder="Masukkan nama lengkap"
                                        />
                                    </div>
                                    <div className="form-group-settings">
                                        <label>Email</label>
                                        <input
                                            type="email"
                                            value={profileData.email}
                                            onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                                            placeholder="Masukkan email"
                                        />
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group-settings">
                                        <label>Telepon</label>
                                        <input
                                            type="tel"
                                            value={profileData.telepon}
                                            onChange={(e) => setProfileData({ ...profileData, telepon: e.target.value })}
                                            placeholder="Masukkan nomor telepon"
                                        />
                                    </div>
                                    <div className="form-group-settings">
                                        <label>Alamat</label>
                                        <input
                                            type="text"
                                            value={profileData.alamat}
                                            onChange={(e) => setProfileData({ ...profileData, alamat: e.target.value })}
                                            placeholder="Masukkan alamat"
                                        />
                                    </div>
                                </div>
                                <button type="submit" className="btn-save"><Save size={18} /> Simpan Perubahan</button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Keamanan Tab */}
                {activeTab === 'security' && (
                    <div className="tab-panel">
                        <div className="settings-section">
                            <div className="section-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        padding: '8px',
                                        borderRadius: '8px',
                                        background: 'rgba(245, 158, 11, 0.1)',
                                        color: '#f59e0b',
                                        display: 'flex',
                                        boxShadow: '0 2px 4px rgba(245, 158, 11, 0.1)'
                                    }}>
                                        <Lock size={20} strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <h3 className="section-title" style={{ marginBottom: '4px' }}>Ubah Password</h3>
                                        <p className="section-description" style={{ marginBottom: 0 }}>Amankan akun anda dengan password kuat</p>
                                    </div>
                                </div>
                            </div>
                            <form onSubmit={handlePasswordChange} className="settings-form">
                                <div className="form-group-settings">
                                    <label>Password Lama</label>
                                    <input
                                        type="password"
                                        value={passwordData.oldPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
                                        placeholder="Masukkan password lama"
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="form-group-settings">
                                        <label>Password Baru</label>
                                        <input
                                            type="password"
                                            value={passwordData.newPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                            placeholder="Masukkan password baru"
                                        />
                                    </div>
                                    <div className="form-group-settings">
                                        <label>Konfirmasi Password</label>
                                        <input
                                            type="password"
                                            value={passwordData.confirmPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                            placeholder="Konfirmasi password baru"
                                        />
                                    </div>
                                </div>
                                <button type="submit" className="btn-save" disabled={loading}>
                                    <Lock size={18} /> {loading ? 'Mengubah...' : 'Ubah Password'}
                                </button>
                            </form>

                            <div className="password-reset-section">
                                <p className="password-reset-text">Lupa password? Gunakan fitur pemulihan akun</p>
                                <button className="btn-reset" onClick={handlePasswordReset} disabled={loading}>
                                    <Mail size={18} /> {loading ? 'Mengirim...' : 'Kirim Email Reset Password'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Manajemen User Tab */}
                {activeTab === 'users' && userRole === 'Super Admin' && (
                    <div className="tab-panel">
                        <div className="settings-section">
                            <div className="section-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        padding: '8px',
                                        borderRadius: '8px',
                                        background: 'rgba(16, 185, 129, 0.1)',
                                        color: '#10b981',
                                        display: 'flex',
                                        boxShadow: '0 2px 4px rgba(16, 185, 129, 0.1)'
                                    }}>
                                        <Users size={20} strokeWidth={2.5} />
                                    </div>
                                    <h3 className="section-title" style={{ marginBottom: 0 }}>Daftar Pengguna Admin</h3>
                                </div>
                                <button className="btn-add-user" onClick={() => setShowAddUserModal(true)}>
                                    <UserPlus size={18} /> Tambah Admin Baru
                                </button>
                            </div>

                            <div className="users-table-container">
                                <table className="users-table">
                                    <thead>
                                        <tr>
                                            <th>Nama</th>
                                            <th>Email</th>
                                            <th>Role</th>
                                            <th>Status</th>
                                            <th>Login Terakhir</th>
                                            <th>Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {adminUsers.map((user) => (
                                            <tr key={user.id}>
                                                <td className="user-name">{user.full_name}</td>
                                                <td>{user.email}</td>
                                                <td>
                                                    <span className={`role-badge ${user.role === 'Super Admin' ? 'super' : 'verif'}`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`status-badge-user ${user.status === 'Aktif' ? 'active' : 'inactive'}`}>
                                                        {user.status}
                                                    </span>
                                                </td>
                                                <td className="last-login">{user.last_login ? new Date(user.last_login).toLocaleString('id-ID') : '-'}</td>
                                                <td>
                                                    {user.role !== 'Super Admin' && (
                                                        user.status === 'Aktif' ? (
                                                            <button
                                                                className="btn-deactivate"
                                                                onClick={() => handleDeactivateUser(user.id, user.full_name)}
                                                                disabled={loading}
                                                            >
                                                                <Ban size={16} /> Nonaktifkan
                                                            </button>
                                                        ) : (
                                                            <button
                                                                className="btn-activate"
                                                                onClick={() => handleActivateUser(user.id, user.full_name)}
                                                                disabled={loading}
                                                            >
                                                                <CheckCircle size={16} /> Aktifkan
                                                            </button>
                                                        )
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Konfigurasi Sistem Tab */}



            </div >
            {/* Modal Tambah User */}
            {
                showAddUserModal && (
                    <div className="modal-overlay-settings" onClick={() => setShowAddUserModal(false)}>
                        <div className="modal-content-settings" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header-settings">
                                <h3>Tambah Admin Baru</h3>
                                <button className="modal-close-settings" onClick={() => setShowAddUserModal(false)}>✕</button>
                            </div>
                            <form onSubmit={handleAddUser} className="modal-form-settings">
                                <div className="form-group-settings">
                                    <label>Email <span className="required">*</span></label>
                                    <input
                                        type="email"
                                        value={newUserData.email}
                                        onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                                        placeholder="admin@pln.com"
                                        required
                                    />
                                </div>
                                <div className="form-group-settings">
                                    <label>Nama Lengkap <span className="required">*</span></label>
                                    <input
                                        type="text"
                                        value={newUserData.namaLengkap}
                                        onChange={(e) => setNewUserData({ ...newUserData, namaLengkap: e.target.value })}
                                        placeholder="Nama lengkap admin"
                                        required
                                    />
                                </div>
                                <div className="form-group-settings">
                                    <label>Role <span className="required">*</span></label>
                                    <select
                                        value={newUserData.role}
                                        onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                                        required
                                        title="Pilih role user"
                                    >
                                        <option value="Verifikator">Verifikator</option>
                                        <option value="Super Admin">Super Admin</option>
                                    </select>
                                </div>

                                <div className="form-group-settings">
                                    <label>Password <span className="required">*</span></label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type={showNewUserPassword ? "text" : "password"}
                                            value={newUserData.password}
                                            onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                                            placeholder="Minimal 6 karakter"
                                            required
                                            minLength={6}
                                            style={{ paddingRight: '40px' }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                                            style={{
                                                position: 'absolute',
                                                right: '10px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                color: '#64748b'
                                            }}
                                        >
                                            {showNewUserPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="form-group-settings">
                                    <label>Konfirmasi Password <span className="required">*</span></label>
                                    <input
                                        type="password"
                                        value={newUserData.confirmPassword}
                                        onChange={(e) => setNewUserData({ ...newUserData, confirmPassword: e.target.value })}
                                        placeholder="Ulangi password"
                                        required
                                    />
                                </div>
                                <div className="modal-footer-settings">
                                    <button type="button" className="btn-cancel-settings" onClick={() => setShowAddUserModal(false)}>
                                        Batal
                                    </button>
                                    <button type="submit" className="btn-submit-settings">
                                        <UserPlus size={18} /> Tambah User
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Notification Modal */}
            <NotificationModal
                show={notification.show}
                type={notification.type}
                message={notification.message}
                onClose={() => setNotification({ ...notification, show: false })}
            />

            {/* Confirm Modal */}
            <ConfirmModal
                show={confirmModal.show}
                type="delete"
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal({ ...confirmModal, show: false })}
            />
        </>
    )
}


export default Pengaturan