'use client'
import { useState, useEffect } from 'react'
import { Building2, User, Mail, Save, Edit2, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { deactivateVendorAccount } from '../../../services/vendorAccountService'
import NotificationModal from '../../../components/NotificationModal'
import ConfirmModal from '../../../components/ConfirmModal'
import { useFormGuard } from '@/hooks/useFormGuard'
import './VendorProfile.css'

function VendorProfile() {
    const router = useRouter()
    const [isEditing, setIsEditing] = useState(false)
    const [loading, setLoading] = useState(false)
    const [vendorId, setVendorId] = useState('')
    const [showIncompleteModal, setShowIncompleteModal] = useState(false)
    const [profileImage, setProfileImage] = useState('')
    const [uploadingImage, setUploadingImage] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteLoading, setDeleteLoading] = useState(false)
    const [notification, setNotification] = useState({ show: false, type: 'success' as 'success' | 'error' | 'warning' | 'info', message: '' })
    const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: () => { } })
    const [profileData, setProfileData] = useState({
        companyName: '',
        companyType: 'PT',
        address: '',
        bankName: '',
        accountNumber: '',
        accountName: '',
        picName: '',
        picPhone: '',
        picPosition: '',
        picEmail: ''
    })

    // Load data from Supabase based on logged-in vendor
    // ========================================
    // LOAD DATA DARI DATABASE (bukan localStorage!)
    // Setiap kali halaman dibuka, data di-fetch dari Supabase
    // Jadi kalau login dari device lain, data tetap sama
    // ========================================
    useEffect(() => {
        const loadVendorProfile = async () => {
            // Check if running in browser
            if (typeof window === 'undefined') return

            const vendorEmail = localStorage.getItem('vendorEmail')
            const vendorUserId = localStorage.getItem('vendorUserId')

            console.log('🔍 Loading vendor profile from DATABASE:', { vendorEmail, vendorUserId })

            if (!vendorEmail || !vendorUserId) {
                console.warn('No vendor credentials in localStorage')
                return
            }

            try {
                // ========================================
                // FETCH DATA DARI DATABASE SUPABASE
                // Termasuk profile_image yang sudah diupload
                // ========================================
                const { data: userData, error: userError } = await supabase
                    .from('vendor_users')
                    .select('*')
                    .eq('id', parseInt(vendorUserId))
                    .single()

                if (userError) {
                    console.error('Error fetching user:', userError)
                    return
                }

                if (userData) {
                    console.log('✅ Data loaded from DATABASE:', {
                        id: userData.id,
                        email: userData.email,
                        company: userData.company_name,
                        profileImage: userData.profile_image ? 'YES (from Supabase)' : 'NO'
                    })

                    setVendorId(userData.id)
                    setProfileImage(userData.profile_image || '') // Foto dari database
                    setProfileData({
                        companyName: userData.company_name || '',
                        companyType: userData.company_type || 'PT',
                        address: userData.address || '',
                        bankName: userData.bank_pembayaran || '',
                        accountNumber: userData.no_rekening || '',
                        accountName: userData.nama_rekening || '',
                        picName: userData.pic_name || '',
                        picPhone: userData.pic_phone || '',
                        picPosition: userData.pic_position || '',
                        picEmail: userData.pic_email || ''
                    })

                    // Update localStorage (hanya untuk cache header, bukan primary storage)
                    localStorage.setItem('vendorProfile', JSON.stringify({
                        userId: userData.id,
                        companyName: userData.company_name,
                        picName: userData.pic_name,
                        profileImage: userData.profile_image || ''
                    }))
                    window.dispatchEvent(new Event('profileUpdated'))

                    // Show incomplete modal if profile is not complete
                    if (!userData.company_name || !userData.address || !userData.pic_name || !userData.pic_phone) {
                        setShowIncompleteModal(true)
                    }
                }
            } catch (err) {
                console.error('Error loading vendor profile:', err)
            }
        }

        loadVendorProfile()

        // Listen untuk update dari admin (saat admin edit vendor)
        const handleVendorDataUpdate = () => {
            console.log('📢 Vendor data updated by admin, reloading...')
            loadVendorProfile()
        }

        window.addEventListener('vendorDataUpdated', handleVendorDataUpdate)

        return () => {
            window.removeEventListener('vendorDataUpdated', handleVendorDataUpdate)
        }
    }, [])

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setProfileData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setNotification({ show: true, type: 'error', message: 'File harus berupa gambar' })
            return
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            setNotification({ show: true, type: 'error', message: 'Ukuran file maksimal 2MB' })
            return
        }

        setUploadingImage(true)

        try {
            // Get vendor user ID from state or localStorage
            let userId = vendorId
            if (!userId) {
                const vendorUserId = localStorage.getItem('vendorUserId')
                const vendorProfile = localStorage.getItem('vendorProfile')

                if (vendorUserId) {
                    userId = vendorUserId
                } else if (vendorProfile) {
                    const profile = JSON.parse(vendorProfile)
                    userId = profile.userId
                }
            }

            if (!userId) {
                setNotification({ show: true, type: 'error', message: 'Sesi login tidak ditemukan. Silakan refresh halaman atau login ulang.' })
                setUploadingImage(false)
                return
            }

            // Create unique filename
            const fileExt = file.name.split('.').pop()
            const fileName = `${userId}-${Date.now()}.${fileExt}`
            const filePath = `${fileName}`  // Simplified path

            console.log('Uploading file:', filePath, 'for user:', userId)

            // ========================================
            // STEP 1: Upload file to Supabase Storage
            // File disimpan PERMANEN di cloud storage
            // ========================================
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('vendor-profiles')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: true  // Allow overwrite
                })

            if (uploadError) {
                console.error('Upload error details:', uploadError)
                if (uploadError.message.includes('not found')) {
                    throw new Error('Bucket "vendor-profiles" belum dibuat di Supabase Storage. Silakan buat bucket terlebih dahulu.')
                }
                throw uploadError
            }

            console.log('Upload success to Supabase Storage:', uploadData)

            // ========================================
            // STEP 2: Get public URL dari Supabase
            // URL ini bisa diakses dari device manapun
            // ========================================
            const { data: { publicUrl } } = supabase.storage
                .from('vendor-profiles')
                .getPublicUrl(filePath)

            console.log('Public URL from Supabase:', publicUrl)

            // ========================================
            // STEP 3: Save URL ke DATABASE (vendor_users table)
            // Ini yang penting! Data tersimpan di database
            // Saat login dari device lain, foto akan load dari sini
            // ========================================
            const { error: updateError } = await supabase
                .from('vendor_users')
                .update({ profile_image: publicUrl })
                .eq('id', userId)

            if (updateError) {
                console.error('Database update error:', updateError)
                throw updateError
            }

            console.log('✅ Photo URL saved to database!')

            // ========================================
            // STEP 4: Update localStorage (HANYA untuk cache)
            // Ini BUKAN storage utama, hanya untuk performa
            // Saat login ulang, data akan di-load dari database (step di useEffect)
            // ========================================
            setProfileImage(publicUrl)
            const currentProfile = JSON.parse(localStorage.getItem('vendorProfile') || '{}')
            localStorage.setItem('vendorProfile', JSON.stringify({
                ...currentProfile,
                userId: userId,
                profileImage: publicUrl
            }))
            window.dispatchEvent(new Event('profileUpdated'))

            setNotification({ show: true, type: 'success', message: 'Foto profil berhasil diupload ke Supabase!' })
        } catch (err) {
            console.error('Error uploading image:', err)
            const errorMessage = err instanceof Error ? err.message : 'Gagal upload foto profil. Silakan coba lagi.'
            setNotification({ show: true, type: 'error', message: errorMessage })
        } finally {
            setUploadingImage(false)
        }
    }

    const profileGuard = useFormGuard(300)

    const handleSubmit = (e) => {
        e.preventDefault()
        profileGuard.run(async () => {
            setLoading(true)

            try {
                const vendorUserId = localStorage.getItem('vendorUserId')

                if (!vendorUserId) {
                    throw new Error('User ID tidak ditemukan. Silakan login kembali.')
                }

                // Update all data in vendor_users table
                const { data, error } = await supabase
                    .from('vendor_users')
                    .update({
                        company_name: profileData.companyName,
                        company_type: profileData.companyType,
                        address: profileData.address,
                        bank_pembayaran: profileData.bankName || null,
                        no_rekening: profileData.accountNumber || null,
                        nama_rekening: profileData.accountName || null,
                        pic_name: profileData.picName,
                        pic_phone: profileData.picPhone,
                        pic_position: profileData.picPosition || null,
                        pic_email: profileData.picEmail || null
                    })
                    .eq('id', parseInt(vendorUserId))
                    .select()

                if (error) {
                    console.error('Supabase error:', error)
                    throw new Error(error.message || 'Gagal menyimpan ke database')
                }

                console.log('Update successful:', data)

                // ========================================
                // SINKRONISASI DATA KE TABEL VENDORS
                // Update jabatan dan kontak person di master data vendor
                // ========================================
                try {
                    // Cari vendor berdasarkan company_name atau email
                    const { data: vendorData, error: vendorFindError } = await supabase
                        .from('vendors')
                        .select('id')
                        .or(`nama.eq.${profileData.companyName},email.eq.${profileData.picEmail}`)
                        .maybeSingle()

                    if (vendorData && !vendorFindError) {
                        // Update data vendor dengan info terbaru dari user
                        const { error: vendorUpdateError } = await supabase
                            .from('vendors')
                            .update({
                                nama_pimpinan: profileData.picName,
                                // jabatan: profileData.picPosition || null, // TODO: Uncomment setelah migration dijalankan
                                telepon: profileData.picPhone || null,
                                email: profileData.picEmail || null,
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', vendorData.id)

                        if (vendorUpdateError) {
                            console.warn('Warning: Gagal sync ke vendors table:', vendorUpdateError)
                        } else {
                            console.log('✅ Vendor data synced successfully')
                        }
                    }
                } catch (syncError) {
                    // Jangan throw error, cukup log warning
                    console.warn('Warning: Sync to vendors table failed:', syncError)
                }

                // Update localStorage for header
                localStorage.setItem('vendorProfile', JSON.stringify({
                    userId: parseInt(vendorUserId),
                    companyName: profileData.companyName,
                    picName: profileData.picName,
                    profileImage: profileImage
                }))

                // Trigger custom event to update header
                window.dispatchEvent(new Event('profileUpdated'))
                setLoading(false)
                setIsEditing(false)
                setNotification({ show: true, type: 'success', message: 'Profil perusahaan berhasil disimpan!' })
            } catch (err) {
                console.error('Error saving profile:', err)
                const errorMessage = err.message || 'Gagal menyimpan profil. Silakan coba lagi.'
                setNotification({ show: true, type: 'error', message: errorMessage })
                setLoading(false)
            }
        }) // end profileGuard.run
    }

    const handleCancel = () => {
        const savedProfile = localStorage.getItem('vendorProfile')
        if (savedProfile) {
            setProfileData(JSON.parse(savedProfile))
            setIsEditing(false)
        }
    }

    const isProfileComplete = () => {
        return profileData.companyName && profileData.address &&
            profileData.picName && profileData.picPhone
    }

    const handleDeleteAccount = async () => {
        if (!vendorId) {
            setNotification({
                show: true,
                type: 'error',
                message: 'Sesi login tidak ditemukan'
            })
            return
        }

        setDeleteLoading(true)
        try {
            const result = await deactivateVendorAccount(vendorId)

            if (result.success) {
                setNotification({
                    show: true,
                    type: 'success',
                    message: 'Akun Anda telah dinonaktifkan. Anda dapat mengaktifkan kembali dengan mengakses halaman reaktivasi.'
                })

                // Clear session and redirect after notification
                setTimeout(() => {
                    localStorage.removeItem('vendorLoggedIn')
                    localStorage.removeItem('vendorEmail')
                    localStorage.removeItem('vendorUserId')
                    localStorage.removeItem('vendorProfile')

                    // Redirect to login
                    router.push('/vendor-login')
                }, 2000)
            } else {
                setNotification({
                    show: true,
                    type: 'error',
                    message: result.error || 'Gagal menonaktifkan akun'
                })
            }
        } catch (error) {
            console.error('Error deleting account:', error)
            setNotification({
                show: true,
                type: 'error',
                message: 'Terjadi kesalahan saat menonaktifkan akun'
            })
        } finally {
            setDeleteLoading(false)
            setShowDeleteModal(false)
        }
    }

    return (
        <div className="vendor-profile-page">
            <div className="profile-container">
                <div className="profile-header">
                    <div>
                        <h1>Profil Perusahaan</h1>
                        <p>Kelola informasi perusahaan dan data kontak Anda</p>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {!isEditing && (
                            <button className="btn-edit" onClick={() => setIsEditing(true)}>
                                <Edit2 size={18} /> Edit Profil
                            </button>
                        )}
                        {!isEditing && (
                            <button
                                className="btn-delete-account"
                                onClick={() => setShowDeleteModal(true)}
                                style={{
                                    background: '#fee2e2',
                                    color: '#dc2626',
                                    border: '1px solid #fecaca',
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.background = '#fecaca'
                                    e.currentTarget.style.borderColor = '#fca5a5'
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.background = '#fee2e2'
                                    e.currentTarget.style.borderColor = '#fecaca'
                                }}
                            >
                                <AlertTriangle size={18} /> Non-Aktifkan Akun
                            </button>
                        )}
                    </div>
                </div>

                {/* Incomplete Profile Modal */}
                {showIncompleteModal && !isEditing && (
                    <div className="modal-overlay" onClick={() => setShowIncompleteModal(false)}>
                        <div className="incomplete-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-icon">
                                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="32" cy="32" r="32" fill="#FEF3C7" />
                                    <path d="M32 20V36M32 44H32.02" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <h3>Profil Belum Lengkap</h3>
                            <p>Lengkapi profil perusahaan Anda untuk dapat mengajukan surat.</p>
                            <div className="modal-buttons">
                                <button
                                    className="btn-complete-now"
                                    onClick={() => {
                                        setShowIncompleteModal(false)
                                        setIsEditing(true)
                                    }}
                                >
                                    Lengkapi Sekarang
                                </button>
                                <button
                                    className="btn-later"
                                    onClick={() => setShowIncompleteModal(false)}
                                >
                                    Nanti Saja
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="profile-form">
                    {/* Profile Image Upload */}
                    <div className="profile-image-section">
                        <div className="profile-image-container">
                            <div className="profile-image-wrapper">
                                {profileImage ? (
                                    <img src={profileImage} alt="Profile" className="profile-image" />
                                ) : (
                                    <div className="profile-image-placeholder">
                                        <User size={48} />
                                    </div>
                                )}
                            </div>
                            <div className="profile-image-info">
                                <h3>Foto Profil Perusahaan</h3>
                                <p>Upload foto atau logo perusahaan Anda</p>
                                <div className="profile-image-actions">
                                    <label htmlFor="profileImageInput" className="btn-upload-image">
                                        {uploadingImage ? 'Mengupload...' : 'Upload Foto'}
                                    </label>
                                    <input
                                        id="profileImageInput"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        disabled={uploadingImage}
                                        style={{ display: 'none' }}
                                    />
                                    {profileImage && (
                                        <button
                                            type="button"
                                            className="btn-remove-image"
                                            onClick={async () => {
                                                setConfirmModal({
                                                    show: true,
                                                    title: 'Hapus Foto Profil',
                                                    message: 'Apakah Anda yakin ingin menghapus foto profil? Data yang dihapus tidak dapat dikembalikan.',
                                                    onConfirm: async () => {
                                                        setConfirmModal({ ...confirmModal, show: false })
                                                        try {
                                                            await supabase
                                                                .from('vendor_users')
                                                                .update({ profile_image: null })
                                                                .eq('id', vendorId)
                                                            setProfileImage('')
                                                            const currentProfile = JSON.parse(localStorage.getItem('vendorProfile') || '{}')
                                                            localStorage.setItem('vendorProfile', JSON.stringify({
                                                                ...currentProfile,
                                                                profileImage: ''
                                                            }))
                                                            window.dispatchEvent(new Event('profileUpdated'))
                                                            setNotification({ show: true, type: 'success', message: 'Foto profil berhasil dihapus' })
                                                        } catch (err) {
                                                            setNotification({ show: true, type: 'error', message: 'Gagal menghapus foto' })
                                                        }
                                                    }
                                                })
                                            }}
                                        >
                                            Hapus
                                        </button>
                                    )}
                                </div>
                                <small>Format: JPG, PNG, WEBP. Maksimal 2MB</small>
                            </div>
                        </div>
                    </div>

                    <div className="profile-sections">
                        {/* Company Information */}
                        <section className="profile-section">
                            <div className="section-header">
                                <Building2 size={20} className="section-icon" />
                                <h2>Informasi Perusahaan</h2>
                            </div>
                            <div className="form-grid">
                                <div className="form-group span-2">
                                    <label htmlFor="companyName">Nama Perusahaan <span className="required">*</span></label>
                                    <input
                                        type="text"
                                        id="companyName"
                                        name="companyName"
                                        value={profileData.companyName}
                                        onChange={handleInputChange}
                                        placeholder="PT. Nama Perusahaan"
                                        disabled={!isEditing}
                                        required
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-group span-2">
                                    <label htmlFor="companyType">Jenis Badan Usaha <span className="required">*</span></label>
                                    <select
                                        id="companyType"
                                        name="companyType"
                                        value={profileData.companyType}
                                        onChange={handleInputChange}
                                        disabled={!isEditing}
                                        required
                                        className="form-input"
                                    >
                                        <option value="PT">PT (Perseroan Terbatas)</option>
                                        <option value="CV">CV (Commanditaire Vennootschap)</option>
                                        <option value="Firma">Firma</option>
                                        <option value="UD">UD (Usaha Dagang)</option>
                                        <option value="Koperasi">Koperasi</option>
                                    </select>
                                </div>
                                <div className="form-group span-2">
                                    <label htmlFor="address">Alamat Lengkap Perusahaan <span className="required">*</span></label>
                                    <textarea
                                        id="address"
                                        name="address"
                                        value={profileData.address}
                                        onChange={handleInputChange}
                                        placeholder="Jalan, Nomor, RT/RW, Kelurahan, Kecamatan, Kota, Provinsi, Kode Pos"
                                        disabled={!isEditing}
                                        rows={3}
                                        required
                                        className="form-textarea"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="bankName">Bank Pembayaran</label>
                                    <input
                                        type="text"
                                        id="bankName"
                                        name="bankName"
                                        value={profileData.bankName}
                                        onChange={handleInputChange}
                                        placeholder="Bank Mandiri"
                                        disabled={!isEditing}
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="accountNumber">No. Rekening</label>
                                    <input
                                        type="text"
                                        id="accountNumber"
                                        name="accountNumber"
                                        value={profileData.accountNumber}
                                        onChange={handleInputChange}
                                        placeholder="1234567890"
                                        disabled={!isEditing}
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-group span-2">
                                    <label htmlFor="accountName">Nama Rekening</label>
                                    <input
                                        type="text"
                                        id="accountName"
                                        name="accountName"
                                        value={profileData.accountName}
                                        onChange={handleInputChange}
                                        placeholder="PT INDOTAMA JASA SERTIFIKASI"
                                        disabled={!isEditing}
                                        className="form-input"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* PIC Information */}
                        <section className="profile-section">
                            <div className="section-header">
                                <User size={20} className="section-icon" />
                                <h2>Penanggung Jawab</h2>
                            </div>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label htmlFor="picName">Nama Lengkap <span className="required">*</span></label>
                                    <input
                                        type="text"
                                        id="picName"
                                        name="picName"
                                        value={profileData.picName}
                                        onChange={handleInputChange}
                                        placeholder="Budi Santoso"
                                        disabled={!isEditing}
                                        required
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="picPhone">No. Telepon <span className="required">*</span></label>
                                    <input
                                        type="tel"
                                        id="picPhone"
                                        name="picPhone"
                                        value={profileData.picPhone}
                                        onChange={handleInputChange}
                                        placeholder="0812-3456-7890"
                                        disabled={!isEditing}
                                        required
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="picPosition">Jabatan</label>
                                    <input
                                        type="text"
                                        id="picPosition"
                                        name="picPosition"
                                        value={profileData.picPosition}
                                        onChange={handleInputChange}
                                        placeholder="Direktur"
                                        disabled={!isEditing}
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="picEmail">Email Perusahaan <span className="required">*</span></label>
                                    <input
                                        type="email"
                                        id="picEmail"
                                        name="picEmail"
                                        value={profileData.picEmail}
                                        onChange={handleInputChange}
                                        placeholder="info@perusahaan.com"
                                        disabled={!isEditing}
                                        required
                                        className="form-input"
                                    />
                                </div>
                            </div>
                        </section>
                    </div>
                    {/* Form Actions */}
                    {isEditing && (
                        <div className="form-actions">
                            <button type="button" className="btn-secondary" onClick={handleCancel}>
                                Batal
                            </button>
                            <button type="submit" className="btn-primary" disabled={loading || profileGuard.isSubmitting}>
                                {loading ? (
                                    <>
                                        <span className="loading-spinner"></span>
                                        Menyimpan...
                                    </>
                                ) : (
                                    <>
                                        <Save size={18} />
                                        Simpan Perubahan
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </form>

                {/* Delete Account Confirmation Modal */}
                {
                    showDeleteModal && (
                        <div className="modal-overlay" onClick={() => !deleteLoading && setShowDeleteModal(false)}>
                            <div
                                className="incomplete-modal"
                                onClick={(e) => e.stopPropagation()}
                                style={{ maxWidth: '500px' }}
                            >
                                <div className="modal-icon" style={{ background: '#fee2e2' }}>
                                    <AlertTriangle size={48} style={{ color: '#dc2626' }} />
                                </div>
                                <h3 style={{ color: '#dc2626' }}>Konfirmasi Non-Aktifkan Akun</h3>
                                <p style={{ marginBottom: '16px', lineHeight: '1.6' }}>
                                    Apakah Anda yakin ingin menonaktifkan akun Anda?
                                </p>
                                <div style={{
                                    background: '#fef3c7',
                                    border: '1px solid #fbbf24',
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    marginBottom: '24px',
                                    textAlign: 'left'
                                }}>
                                    <p style={{
                                        margin: 0,
                                        fontSize: '14px',
                                        color: '#92400e',
                                        lineHeight: '1.5'
                                    }}>
                                        <strong>Perhatian:</strong><br />
                                        • Akun Anda akan dinonaktifkan<br />
                                        • Status akun menjadi "Tidak Aktif"<br />
                                        • Anda tidak dapat login kembali<br />
                                        • Data profil akan tetap tersimpan
                                    </p>
                                </div>
                                <div className="modal-buttons" style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                    <button
                                        className="btn-secondary"
                                        onClick={() => setShowDeleteModal(false)}
                                        disabled={deleteLoading}
                                        style={{ padding: '12px 24px' }}
                                    >
                                        Batal
                                    </button>
                                    <button
                                        className="btn-delete"
                                        onClick={handleDeleteAccount}
                                        disabled={deleteLoading}
                                        style={{
                                            background: '#dc2626',
                                            color: 'white',
                                            border: 'none',
                                            padding: '12px 24px',
                                            borderRadius: '8px',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            cursor: deleteLoading ? 'not-allowed' : 'pointer',
                                            opacity: deleteLoading ? 0.6 : 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        {deleteLoading ? (
                                            <>
                                                <span className="loading-spinner"></span>
                                                Memproses...
                                            </>
                                        ) : (
                                            <>
                                                <AlertTriangle size={18} />
                                                Ya, Non-Aktifkan Akun
                                            </>
                                        )}
                                    </button>
                                </div>
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
            </div >
        </div >
    )
}

export default VendorProfile
