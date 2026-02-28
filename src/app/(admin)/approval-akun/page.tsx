'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { Eye, CheckCircle, XCircle, Clock, FileText, Mail, Phone, MapPin, Building2, CreditCard, Trash2 } from 'lucide-react'
import NotificationModal from '../../../components/NotificationModal'
import ConfirmModal from '../../../components/ConfirmModal'
import { hashPassword, generatePassword } from '../../../lib/passwordUtils'
import './ApprovalAkun.css'

interface VendorAccount {
    id: number
    company_name: string
    company_type: string
    email: string
    pic_name: string
    pic_phone: string
    pic_email: string
    pic_position: string
    address: string
    bank_name: string
    account_number: string
    account_name: string
    certificate_url: string
    certificate_type: string
    status: string
    created_at: string
}

function ApprovalAkun() {
    const router = useRouter()
    const [accounts, setAccounts] = useState<VendorAccount[]>([])
    const [filteredAccounts, setFilteredAccounts] = useState<VendorAccount[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('ALL')
    const [selectedAccount, setSelectedAccount] = useState<VendorAccount | null>(null)
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [notification, setNotification] = useState({ show: false, type: 'success' as 'success' | 'error' | 'warning', message: '' })
    const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: () => { } })
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    // Calculate statistics
    const stats = {
        pending: accounts.filter(a => a.status === 'Pending').length,
        approved: accounts.filter(a => a.status === 'Aktif').length,
        rejected: accounts.filter(a => a.status === 'Ditolak').length
    }

    useEffect(() => {
        fetchAccounts()
    }, [])

    useEffect(() => {
        filterAccounts()
    }, [accounts, filter])

    const fetchAccounts = async () => {
        try {
            setLoading(true)
            // Hanya ambil akun vendor yang mendaftar sendiri (self-registration)
            // Ambil semua akun vendor_users
            const { data, error } = await supabase
                .from('vendor_users')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error

            // Filter: tampilkan semua self-registered vendor (yang daftar mandiri)
            // Self-registration ditandai: password awalnya 'PENDING_APPROVAL' atau status 'Pending'/'Ditolak'
            // Juga tampilkan yang sudah diapprove dari self-registration (invited_by IS NULL)
            const selfRegistered = (data || []).filter(acc =>
                acc.status === 'Pending' ||
                acc.status === 'Ditolak' ||
                !acc.invited_by // Bukan dari undangan admin
            )

            setAccounts(selfRegistered)
        } catch (err) {
            console.error('Error fetching accounts:', err)
            setNotification({ show: true, type: 'error', message: 'Gagal memuat data akun vendor' })
        } finally {
            setLoading(false)
        }
    }

    const filterAccounts = () => {
        if (filter === 'ALL') {
            setFilteredAccounts(accounts)
        } else if (filter === 'PENDING') {
            setFilteredAccounts(accounts.filter(acc => acc.status === 'Pending'))
        } else if (filter === 'APPROVED') {
            setFilteredAccounts(accounts.filter(acc => acc.status === 'Aktif'))
        } else if (filter === 'REJECTED') {
            setFilteredAccounts(accounts.filter(acc => acc.status === 'Ditolak'))
        }
        setCurrentPage(1)
    }

    const getStatusBadge = (status: string) => {
        const config: any = {
            'Pending': { className: 'status-pending', icon: Clock, text: 'Menunggu' },
            'Aktif': { className: 'status-approved', icon: CheckCircle, text: 'Disetujui' },
            'Ditolak': { className: 'status-rejected', icon: XCircle, text: 'Ditolak' }
        }
        const { className, icon: Icon, text } = config[status] || config['Pending']
        return (
            <span className={`status-badge ${className}`}>
                <Icon size={14} />
                {text}
            </span>
        )
    }

    const handleDelete = async (account: VendorAccount) => {
        setConfirmModal({
            show: true,
            title: 'Hapus Akun Vendor',
            message: `Apakah Anda yakin ingin menghapus akun vendor "${account.company_name}"? Data yang dihapus tidak dapat dikembalikan.`,
            onConfirm: async () => {
                setConfirmModal({ ...confirmModal, show: false })
                try {
                    const { error } = await supabase
                        .from('vendor_users')
                        .delete()
                        .eq('id', account.id)

                    if (error) throw error

                    setNotification({
                        show: true,
                        type: 'success',
                        message: `Akun vendor "${account.company_name}" berhasil dihapus`
                    })

                    fetchAccounts()
                    setShowDetailModal(false)
                } catch (err) {
                    console.error('Error deleting account:', err)
                    setNotification({ show: true, type: 'error', message: 'Gagal menghapus akun vendor' })
                }
            }
        })
    }

    const handleApprove = async (account: VendorAccount) => {
        setConfirmModal({
            show: true,
            title: 'Setujui Akun Vendor',
            message: `Apakah Anda yakin ingin menyetujui akun vendor "${account.company_name}"? Password login akan dikirimkan ke email ${account.email}.`,
            onConfirm: async () => {
                setConfirmModal({ ...confirmModal, show: false })
                try {
                    // Generate random password (kombinasi huruf dan angka, 12 karakter)
                    const tempPassword = generatePassword(12)

                    console.log('Generated password (plain text):', tempPassword)

                    // Hash password before saving to database
                    const hashedPassword = hashPassword(tempPassword)
                    console.log('Hashed password for DB:', hashedPassword.substring(0, 20) + '...')

                    // Update status, password, dan aktivasi di vendor_users
                    const { error: updateError } = await supabase
                        .from('vendor_users')
                        .update({
                            status: 'Aktif',
                            password: hashedPassword, // Save hashed password
                            is_activated: true, // Activate account
                            activated_at: new Date().toISOString()
                        })
                        .eq('id', account.id)

                    if (updateError) throw updateError

                    // Generate unique vendor ID (format: VND-XXXXX)
                    const vendorId = `VND-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`

                    // Insert data ke tabel vendors untuk halaman Data Vendor
                    const { error: vendorInsertError } = await supabase
                        .from('vendors')
                        .insert([{
                            id: vendorId, // ID wajib karena VARCHAR(50) NOT NULL
                            nama: account.company_name,
                            alamat: account.address || '',
                            telepon: account.pic_phone || '',
                            email: account.email,
                            nama_pimpinan: account.pic_name || '',
                            jabatan: account.pic_position || '',
                            npwp: '', // NPWP not available in self-registration
                            status: 'Aktif',
                            is_claimed: true,
                            claimed_by_user_id: account.id,
                            claimed_at: new Date().toISOString(),
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            // Additional fields from self-registration
                            bank_pembayaran: account.bank_name || '',
                            no_rekening: account.account_number || '',
                            nama_rekening: account.account_name || ''
                        }])

                    if (vendorInsertError) {
                        console.error('Error creating vendor entry:', vendorInsertError)
                        // Don't fail the whole approval process
                    }

                    // Kirim email dengan password PLAIN TEXT
                    try {
                        const emailResponse = await fetch('/api/send-account-approval-email', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                email: account.email,
                                companyName: account.company_name,
                                password: tempPassword // Send plain text password to email
                            }),
                        })

                        const emailResult = await emailResponse.json()

                        if (!emailResult.success) {
                            console.error('Email sending failed:', emailResult.error)
                            // Tetap lanjut meskipun email gagal
                            setNotification({
                                show: true,
                                type: 'warning',
                                message: `Akun vendor "${account.company_name}" berhasil disetujui, tetapi email gagal terkirim. Password: ${tempPassword}`
                            })
                        } else {
                            setNotification({
                                show: true,
                                type: 'success',
                                message: `Akun vendor "${account.company_name}" berhasil disetujui! Password telah dikirim ke ${account.email}`
                            })
                        }
                    } catch (emailError) {
                        console.error('Email error:', emailError)
                        setNotification({
                            show: true,
                            type: 'warning',
                            message: `Akun vendor "${account.company_name}" berhasil disetujui, tetapi email gagal terkirim. Password: ${tempPassword}`
                        })
                    }

                    fetchAccounts()
                    setShowDetailModal(false)
                } catch (err) {
                    console.error('Error approving account:', err)
                    setNotification({ show: true, type: 'error', message: 'Gagal menyetujui akun vendor' })
                }
            }
        })
    }

    const handleReject = async (account: VendorAccount) => {
        setConfirmModal({
            show: true,
            title: 'Tolak Akun Vendor',
            message: `Apakah Anda yakin ingin menolak akun vendor "${account.company_name}"? Akun ini TIDAK akan masuk ke Data Vendor.`,
            onConfirm: async () => {
                setConfirmModal({ ...confirmModal, show: false })
                try {
                    // Update status menjadi 'Ditolak' - TIDAK insert ke tabel vendors
                    const { error } = await supabase
                        .from('vendor_users')
                        .update({
                            status: 'Ditolak',
                            is_activated: false
                        })
                        .eq('id', account.id)

                    if (error) throw error

                    // Kirim email pemberitahuan penolakan
                    try {
                        await fetch('/api/send-account-rejection-email', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                email: account.email,
                                companyName: account.company_name
                            }),
                        })
                    } catch (emailError) {
                        console.warn('Email rejection notification failed:', emailError)
                    }

                    setNotification({
                        show: true,
                        type: 'success',
                        message: `Akun vendor "${account.company_name}" ditolak. Data tidak masuk ke Data Vendor.`
                    })

                    fetchAccounts()
                    setShowDetailModal(false)
                } catch (err) {
                    console.error('Error rejecting account:', err)
                    setNotification({ show: true, type: 'error', message: 'Gagal menolak akun vendor' })
                }
            }
        })
    }

    // Pagination
    const totalPages = Math.ceil(filteredAccounts.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedAccounts = filteredAccounts.slice(startIndex, endIndex)

    return (
        <div className="approval-akun-container">
            {/* Statistics Cards */}
            <div className="approval-stats">
                {[
                    {
                        title: 'Menunggu Approval',
                        value: stats.pending,
                        icon: Clock,
                        color: '#f39c12',
                        bgColor: '#fff8e1',
                    },
                    {
                        title: 'Disetujui',
                        value: stats.approved,
                        icon: CheckCircle,
                        color: '#2ecc71',
                        bgColor: '#e8f5e9',
                    },
                    {
                        title: 'Ditolak',
                        value: stats.rejected,
                        icon: XCircle,
                        color: '#e74c3c',
                        bgColor: '#ffebee',
                    },
                ].map((stat, index) => {
                    const IconComponent = stat.icon;
                    return (
                        <div key={index} className="approval-stat-card">
                            <div className="approval-stat-icon" style={{ background: stat.bgColor }}>
                                <IconComponent size={28} style={{ color: stat.color }} strokeWidth={2.5} />
                            </div>
                            <div className="approval-stat-info">
                                <div className="stat-value">{stat.value}</div>
                                <div className="stat-label">{stat.title}</div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Table Container */}
            <div className="approval-table-container">
                <div className="approval-table-header">
                    <h2>Daftar Pengajuan Akun</h2>
                    <div className="approval-table-actions">
                        <select
                            className="filter-select"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        >
                            <option value="ALL">Semua Status</option>
                            <option value="PENDING">Menunggu</option>
                            <option value="APPROVED">Disetujui</option>
                            <option value="REJECTED">Ditolak</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="loading-state">
                        <p>Memuat data...</p>
                    </div>
                ) : paginatedAccounts.length === 0 ? (
                    <div className="empty-state">
                        <FileText className="empty-state-icon" size={64} />
                        <h3>Tidak ada data</h3>
                        <p>Belum ada pengajuan akun yang tersedia</p>
                    </div>
                ) : (
                    <>
                        <table className="approval-table">
                            <thead>
                                <tr>
                                    <th>Nama Perusahaan</th>
                                    <th>Email</th>
                                    <th>Penanggung Jawab</th>
                                    <th>Tanggal Daftar</th>
                                    <th>Status</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedAccounts.map((account) => (
                                    <tr key={account.id}>
                                        <td>{account.company_name}</td>
                                        <td>{account.email}</td>
                                        <td>{account.pic_name}</td>
                                        <td>{new Date(account.created_at).toLocaleDateString('id-ID')}</td>
                                        <td>{getStatusBadge(account.status)}</td>
                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    className="btn-detail"
                                                    onClick={() => {
                                                        setSelectedAccount(account)
                                                        setShowDetailModal(true)
                                                    }}
                                                    title="Lihat Detail"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                {account.status === 'Pending' && (
                                                    <>
                                                        <button
                                                            className="btn-approve"
                                                            onClick={() => handleApprove(account)}
                                                            title="Setujui"
                                                        >
                                                            <CheckCircle size={16} />
                                                        </button>
                                                        <button
                                                            className="btn-reject"
                                                            onClick={() => handleReject(account)}
                                                            title="Tolak"
                                                        >
                                                            <XCircle size={16} />
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    className="btn-delete"
                                                    onClick={() => handleDelete(account)}
                                                    title="Hapus Akun"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {totalPages > 1 && (
                            <div className="pagination">
                                <button
                                    className="pagination-btn"
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                >
                                    ← Sebelumnya
                                </button>
                                <span className="page-info">
                                    Halaman {currentPage} dari {totalPages}
                                </span>
                                <button
                                    className="pagination-btn"
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    Selanjutnya →
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Detail Modal */}
            {showDetailModal && selectedAccount && (
                <div className="approval-modal-overlay" onClick={() => setShowDetailModal(false)}>
                    <div className="approval-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="approval-modal-header">
                            <h3>Detail Akun Vendor</h3>
                            <p>Informasi lengkap pendaftaran vendor</p>
                        </div>

                        <div className="approval-modal-body">
                            <div className="detail-section-title">
                                <Building2 size={18} /> Informasi Perusahaan
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Nama Perusahaan</span>
                                <span className="detail-value">{selectedAccount.company_name}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Jenis Badan Usaha</span>
                                <span className="detail-value">{selectedAccount.company_type}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Alamat</span>
                                <span className="detail-value">{selectedAccount.address}</span>
                            </div>

                            <div className="detail-section-title">
                                <CreditCard size={18} /> Informasi Bank
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Bank</span>
                                <span className="detail-value">{selectedAccount.bank_name || '-'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">No. Rekening</span>
                                <span className="detail-value">{selectedAccount.account_number || '-'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Nama Rekening</span>
                                <span className="detail-value">{selectedAccount.account_name || '-'}</span>
                            </div>

                            <div className="detail-section-title">
                                <Mail size={18} /> Penanggung Jawab
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Nama</span>
                                <span className="detail-value">{selectedAccount.pic_name}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Jabatan</span>
                                <span className="detail-value">{selectedAccount.pic_position || '-'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">No. Telepon</span>
                                <span className="detail-value">{selectedAccount.pic_phone}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Email</span>
                                <span className="detail-value">{selectedAccount.pic_email}</span>
                            </div>

                            <div className="detail-section-title">
                                <FileText size={18} /> Dokumen Sertifikat
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Jenis Sertifikat</span>
                                <span className="detail-value">{selectedAccount.certificate_type || '-'}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">File</span>
                                <span className="detail-value">
                                    {selectedAccount.certificate_url ? (
                                        <a href={selectedAccount.certificate_url} target="_blank" rel="noopener noreferrer" className="btn-file-action view">
                                            <FileText size={14} /> Lihat Sertifikat
                                        </a>
                                    ) : (
                                        '-'
                                    )}
                                </span>
                            </div>

                            <div className="detail-row">
                                <span className="detail-label">Status</span>
                                <span className="detail-value">{getStatusBadge(selectedAccount.status)}</span>
                            </div>
                        </div>

                        <div className="approval-modal-actions">
                            {selectedAccount.status === 'Pending' && (
                                <>
                                    <button className="btn-confirm" onClick={() => handleApprove(selectedAccount)}>
                                        <CheckCircle size={16} /> Setujui
                                    </button>
                                    <button className="btn-confirm danger" onClick={() => handleReject(selectedAccount)}>
                                        <XCircle size={16} /> Tolak
                                    </button>
                                </>
                            )}
                            <button className="btn-cancel" onClick={() => setShowDetailModal(false)}>
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <NotificationModal
                show={notification.show}
                type={notification.type}
                message={notification.message}
                onClose={() => setNotification({ ...notification, show: false })}
            />

            <ConfirmModal
                show={confirmModal.show}
                type="warning"
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal({ ...confirmModal, show: false })}
            />
        </div>
    )
}

export default ApprovalAkun
