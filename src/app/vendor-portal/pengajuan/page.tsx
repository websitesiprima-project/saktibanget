'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Upload, X, CheckCircle, Calendar, AlertCircle } from 'lucide-react'
import { uploadPDFToSupabase } from '@/services/fileUploadService'
import { createSurat } from '@/services/suratService'
import NotificationModal from '@/components/NotificationModal'
import './VendorPengajuan.css'
import { useFormGuard } from '@/hooks/useFormGuard'

function VendorPengajuan() {
    const router = useRouter()
    const fileInputRef = useRef(null)

    const [formData, setFormData] = useState({
        nomorSurat: '',
        perihal: '',
        tanggalSurat: '',
        namaPekerjaan: '',
        nomorKontrak: '',
        keterangan: ''
    })

    const [selectedFile, setSelectedFile] = useState(null)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [isDragging, setIsDragging] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [notification, setNotification] = useState({ show: false, type: 'success' as 'success' | 'error' | 'warning' | 'info', message: '' })
    const submitGuard = useFormGuard(300)

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))

        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }))
        }
    }

    const validateFile = (file) => {
        const errors = []

        // Check file type
        if (file.type !== 'application/pdf') {
            errors.push('File harus berformat PDF')
        }

        // Check file size (max 5MB)
        const maxSize = 5 * 1024 * 1024 // 5MB in bytes
        if (file.size > maxSize) {
            errors.push('Ukuran file maksimal 5MB')
        }

        return errors
    }

    const handleFileSelect = (file) => {
        const fileErrors = validateFile(file)

        if (fileErrors.length > 0) {
            setErrors(prev => ({
                ...prev,
                file: fileErrors.join(', ')
            }))
            return
        }

        setSelectedFile(file)
        setErrors(prev => ({
            ...prev,
            file: ''
        }))

        // Simulate upload progress
        simulateUpload()
    }

    const handleFileInputChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            handleFileSelect(file)
        }
    }

    const handleDragOver = (e) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (e) => {
        e.preventDefault()
        setIsDragging(false)
    }

    const handleDrop = (e) => {
        e.preventDefault()
        setIsDragging(false)

        const file = e.dataTransfer.files[0]
        if (file) {
            handleFileSelect(file)
        }
    }

    const simulateUpload = () => {
        setUploadProgress(0)
        const interval = setInterval(() => {
            setUploadProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval)
                    return 100
                }
                return prev + 10
            })
        }, 100)
    }

    const removeFile = () => {
        setSelectedFile(null)
        setUploadProgress(0)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const validateForm = () => {
        const newErrors: Record<string, string> = {}

        if (!formData.nomorSurat) {
            newErrors.nomorSurat = 'Nomor surat wajib diisi'
        }

        if (!formData.perihal) {
            newErrors.perihal = 'Perihal wajib diisi'
        }

        if (!formData.tanggalSurat) {
            newErrors.tanggalSurat = 'Tanggal surat wajib diisi'
        }

        if (!selectedFile) {
            newErrors.file = 'File PDF wajib diunggah'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = (e) => {
        e.preventDefault()

        if (!validateForm()) {
            return
        }

        submitGuard.run(async () => {
        setIsSubmitting(true)

        try {
            // Upload file ke Supabase Storage
            const uploadResult = await uploadPDFToSupabase(selectedFile)

            if (!uploadResult.success) {
                setNotification({ show: true, type: 'error', message: 'Gagal mengupload file: ' + uploadResult.error })
                setIsSubmitting(false)
                return
            }

            // Save to Supabase
            const submissionData = {
                ...formData,
                fileName: selectedFile.name,
                fileUrl: uploadResult.fileUrl
            }

            const result = await createSurat(submissionData)

            if (result.success) {
                setIsSubmitting(false)
                setNotification({ show: true, type: 'success', message: 'Surat berhasil diajukan! File telah tersimpan di server.' })
                setTimeout(() => {
                    router.push('/vendor-portal')
                }, 2000)
            } else {
                throw new Error((result as any).error || 'Gagal menyimpan data surat')
            }
        } catch (error) {
            console.error('Submission error:', error)
            setNotification({ show: true, type: 'error', message: 'Terjadi kesalahan saat mengirim pengajuan' })
            setIsSubmitting(false)
        }
        }) // end submitGuard.run
    }

    const isFormValid = () => {
        return formData.nomorSurat &&
            formData.perihal &&
            formData.tanggalSurat &&
            selectedFile &&
            uploadProgress === 100
    }

    const formatFileSize = (bytes) => {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
    }

    return (
        <div className="vendor-pengajuan-page">
            {/* Hero/header intentionally left empty as requested */}
            <div className="pengajuan-container">
                <form onSubmit={handleSubmit} className="pengajuan-form">
                    <div className="profile-sections">
                        {/* Basic Information */}
                        <section className="profile-section">
                            <div className="section-header">
                                <FileText size={20} className="section-icon" />
                                <h2>Informasi Surat</h2>
                            </div>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label htmlFor="nomorSurat">
                                        Nomor Surat <span className="required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="nomorSurat"
                                        name="nomorSurat"
                                        value={formData.nomorSurat}
                                        onChange={handleInputChange}
                                        placeholder="Contoh: SRT/VND/2025/001"
                                        className={`form-input${errors.nomorSurat ? ' error' : ''}`}
                                    />
                                    {errors.nomorSurat && (
                                        <span className="error-text">{errors.nomorSurat}</span>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label htmlFor="namaPekerjaan">
                                        Nama Pekerjaan
                                    </label>
                                    <input
                                        type="text"
                                        id="namaPekerjaan"
                                        name="namaPekerjaan"
                                        value={formData.namaPekerjaan}
                                        onChange={handleInputChange}
                                        placeholder="Contoh: Pemeliharaan Transformer"
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="perihal">
                                        Perihal <span className="required">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        id="perihal"
                                        name="perihal"
                                        value={formData.perihal}
                                        onChange={handleInputChange}
                                        placeholder="Contoh: Pengajuan Kontrak Pemeliharaan Transformer"
                                        className={`form-input${errors.perihal ? ' error' : ''}`}
                                    />
                                    {errors.perihal && (
                                        <span className="error-text">{errors.perihal}</span>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label htmlFor="nomorKontrak">
                                        Nomor Kontrak
                                    </label>
                                    <input
                                        type="text"
                                        id="nomorKontrak"
                                        name="nomorKontrak"
                                        value={formData.nomorKontrak}
                                        onChange={handleInputChange}
                                        placeholder="Contoh: KTR/2025/001"
                                        className="form-input"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="tanggalSurat">
                                        <Calendar size={16} /> Tanggal Surat <span className="required">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        id="tanggalSurat"
                                        name="tanggalSurat"
                                        value={formData.tanggalSurat}
                                        onChange={handleInputChange}
                                        className={`form-input${errors.tanggalSurat ? ' error' : ''}`}
                                    />
                                    {errors.tanggalSurat && (
                                        <span className="error-text">{errors.tanggalSurat}</span>
                                    )}
                                </div>
                                <div className="form-group span-2">
                                    <label htmlFor="keterangan">Keterangan Tambahan</label>
                                    <textarea
                                        id="keterangan"
                                        name="keterangan"
                                        value={formData.keterangan}
                                        onChange={handleInputChange}
                                        placeholder="Tambahkan keterangan atau catatan jika diperlukan..."
                                        rows={4}
                                        className="form-textarea"
                                    />
                                </div>
                            </div>
                        </section>

                        {/* File Upload Section */}
                        <section className="profile-section">
                            <div className="section-header">
                                <Upload size={20} className="section-icon" />
                                <h2>Unggah Dokumen</h2>
                            </div>
                            <div className="upload-info-banner">
                                <AlertCircle size={18} />
                                <div>
                                    <strong>Persyaratan File:</strong>
                                    <ul>
                                        <li>Format file harus PDF</li>
                                        <li>Ukuran maksimal 5MB</li>
                                        <li>Pastikan dokumen sudah ditandatangani</li>
                                    </ul>
                                </div>
                            </div>
                            {!selectedFile ? (
                                <div
                                    className={`upload-area${isDragging ? ' dragging' : ''}${errors.file ? ' error' : ''}`}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload size={48} className="upload-icon" />
                                    <h3>Drag & Drop file PDF di sini</h3>
                                    <p>atau klik untuk memilih file</p>
                                    <span className="upload-hint">Maksimal 5MB • Format PDF</span>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".pdf"
                                        onChange={handleFileInputChange}
                                        style={{ display: 'none' }}
                                    />
                                </div>
                            ) : (
                                <div className="file-preview">
                                    <div className="file-info">
                                        <FileText size={40} className="file-icon" />
                                        <div className="file-details">
                                            <h4>{selectedFile.name}</h4>
                                            <p>{formatFileSize(selectedFile.size)}</p>
                                        </div>
                                        {uploadProgress === 100 && (
                                            <CheckCircle size={24} className="success-icon" />
                                        )}
                                        <button
                                            type="button"
                                            className="btn-remove-file"
                                            onClick={removeFile}
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                    {uploadProgress < 100 && (
                                        <div className="upload-progress">
                                            <div className="progress-bar">
                                                <div
                                                    className="progress-fill"
                                                    style={{ width: `${uploadProgress}%` }}
                                                />
                                            </div>
                                            <span className="progress-text">{uploadProgress}%</span>
                                        </div>
                                    )}
                                </div>
                            )}
                            {errors.file && (
                                <span className="error-text">{errors.file}</span>
                            )}
                        </section>
                    </div>
                    {/* Form Actions */}
                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => router.push('/vendor-portal')}
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={!isFormValid() || isSubmitting || submitGuard.isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="loading-spinner"></span>
                                    Mengirim...
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={18} />
                                    Kirim Pengajuan
                                </>
                            )}
                        </button>
                    </div>
                </form>

                {/* Notification Modal */}
                <NotificationModal
                    show={notification.show}
                    type={notification.type}
                    message={notification.message}
                    onClose={() => setNotification({ ...notification, show: false })}
                />
            </div>
        </div>
    )
}

export default VendorPengajuan
