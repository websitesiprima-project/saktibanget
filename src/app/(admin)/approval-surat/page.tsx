'use client'
import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Clock, Eye, FileText, Download, ExternalLink, Trash2 } from 'lucide-react'
import { downloadFileFromSupabase } from '@/services/fileUploadService'
import { getAllSurat, updateSuratStatus, deleteSurat, SuratPengajuan, cleanupExpiredSuratFiles } from '@/services/suratService'
import NotificationModal from '@/components/NotificationModal'
import ConfirmModal from '@/components/ConfirmModal'
import './ApprovalSurat.css'

export default function ApprovalSurat() {
    const [suratList, setSuratList] = useState<SuratPengajuan[]>([])
    const [filteredList, setFilteredList] = useState<SuratPengajuan[]>([])
    const [filter, setFilter] = useState<string>('ALL')
    const [selectedSurat, setSelectedSurat] = useState<SuratPengajuan | null>(null)
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [showRejectModal, setShowRejectModal] = useState(false)
    const [rejectReason, setRejectReason] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const [isLoading, setIsLoading] = useState(false)
    const [lastUpdate, setLastUpdate] = useState(Date.now()) // For triggering re-fetch
    const [timeRemaining, setTimeRemaining] = useState<string>('')
    const [notification, setNotification] = useState({ show: false, type: 'success' as 'success' | 'error' | 'warning' | 'info', message: '' })
    const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: () => { } })
    const itemsPerPage = 10

    // Load data from Supabase
    useEffect(() => {
        loadData()
    }, [lastUpdate]) // Reload when lastUpdate changes

    // Filter data when filter changes or list updates
    useEffect(() => {
        filterData()
    }, [filter, suratList])

    // Auto-cleanup hook (checks for expired files > 7 days)
    useEffect(() => {
        const runCleanup = async () => {
            const result = await cleanupExpiredSuratFiles();
            if (result.success && (result.data as any).cleanedCount > 0) {
                console.log(`Auto-cleanup: Removed ${(result.data as any).cleanedCount} expired files.`);
                loadData(); // Reload data to reflect 'EXPIRED' status
            }
        };
        runCleanup();
    }, []);

    // Timer effect for detail modal
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (showDetailModal && selectedSurat) {
            const calculateTime = () => {
                const created = new Date(selectedSurat.created_at);
                const deadline = new Date(created.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
                const now = new Date();
                const diff = deadline.getTime() - now.getTime();

                if (diff <= 0) {
                    setTimeRemaining('Expired');
                } else {
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                    setTimeRemaining(`${days}h ${hours}j ${minutes}m ${seconds}s`);
                }
            };
            calculateTime(); // Initial call
            interval = setInterval(calculateTime, 1000);
        }
        return () => clearInterval(interval);
    }, [showDetailModal, selectedSurat]);

    const loadData = async () => {
        setIsLoading(true)
        const result = await getAllSurat()
        if (result.success && (result as any).data) {
            setSuratList((result as any).data)
        } else {
            console.error('Failed to load data', (result as any).error)
        }
        setIsLoading(false)
    }

    const filterData = () => {
        if (filter === 'ALL') {
            setFilteredList(suratList)
        } else {
            setFilteredList(suratList.filter(surat => surat.status === filter))
        }
        setCurrentPage(1)
    }

    const handleApprove = async (id: string) => {
        const surat = suratList.find(s => s.id === id)

        setConfirmModal({
            show: true,
            title: 'Setujui Surat',
            message: `Apakah Anda yakin ingin menyetujui surat "${surat?.nomor_surat}"? Tindakan ini tidak dapat dibatalkan.`,
            onConfirm: async () => {
                setConfirmModal({ ...confirmModal, show: false })
                const result = await updateSuratStatus(id, 'APPROVED')
                if (result.success) {
                    setNotification({ show: true, type: 'success', message: 'Surat berhasil disetujui' })
                    setLastUpdate(Date.now()) // Trigger reload
                } else {
                    setNotification({ show: true, type: 'error', message: 'Gagal menyetujui surat: ' + (result as any).error })
                }
            }
        })
    }

    const handleDelete = (surat: SuratPengajuan) => {
        setConfirmModal({
            show: true,
            title: 'Hapus Surat',
            message: `Apakah Anda yakin ingin menghapus surat "${surat.nomor_surat}"? Data yang dihapus tidak dapat dikembalikan.`,
            onConfirm: async () => {
                setConfirmModal({ ...confirmModal, show: false })

                // Import dynamically to avoid top-level server action issues in client component if needed, 
                // but usually direct import is fine if 'use server' is in action file.
                const { deleteSuratAction } = await import('@/actions/suratActions');
                const result = await deleteSuratAction(surat.id, surat.file_url)

                if (result.success) {
                    setNotification({ show: true, type: 'success', message: 'Surat berhasil dihapus' })
                    setLastUpdate(Date.now()) // Trigger reload
                } else {
                    setNotification({ show: true, type: 'error', message: 'Gagal menghapus surat: ' + (result as any).error })
                }
            }
        })
    }

    const handleReject = (surat: SuratPengajuan) => {
        setSelectedSurat(surat)
        setShowRejectModal(true)
        setRejectReason('')
    }

    const confirmReject = async () => {
        if (!rejectReason.trim()) {
            setNotification({ show: true, type: 'warning', message: 'Alasan penolakan wajib diisi' })
            return
        }

        if (selectedSurat) {
            const result = await updateSuratStatus(selectedSurat.id, 'REJECTED', rejectReason)
            if (result.success) {
                setNotification({ show: true, type: 'success', message: 'Surat berhasil ditolak' })
                setShowRejectModal(false)
                setSelectedSurat(null)
                setRejectReason('')
                setLastUpdate(Date.now()) // Trigger reload
            } else {
                setNotification({ show: true, type: 'error', message: 'Gagal menolak surat: ' + (result as any).error })
            }
        }
    }

    const handleDetail = (surat: SuratPengajuan) => {
        setSelectedSurat(surat)
        setShowDetailModal(true)
    }

    // Statistics
    const stats = {
        pending: suratList.filter(s => s.status === 'PENDING').length,
        approved: suratList.filter(s => s.status === 'APPROVED').length,
        rejected: suratList.filter(s => s.status === 'REJECTED').length
    }

    // Pagination
    const totalPages = Math.ceil(filteredList.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const currentData = filteredList.slice(startIndex, startIndex + itemsPerPage)

    const getStatusBadge = (status: string) => {
        const config: any = {
            'PENDING': { className: 'status-pending', icon: Clock, text: 'Menunggu' },
            'APPROVED': { className: 'status-approved', icon: CheckCircle, text: 'Disetujui' },
            'REJECTED': { className: 'status-rejected', icon: XCircle, text: 'Ditolak' }
        }
        const { className, icon: Icon, text } = config[status] || config['PENDING']
        return (
            <span className={`status-badge ${className}`}>
                <Icon size={14} />
                {text}
            </span>
        )
    }

    return (
        <div className="approval-surat-container">
            {/* Statistics */}
            {/* Statistics */}
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

            {/* Table */}
            <div className="approval-table-container">
                <div className="approval-table-header">
                    <h2>Daftar Pengajuan Surat</h2>
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

                {isLoading ? (
                    <div className="loading-state">
                        <p>Memuat data...</p>
                    </div>
                ) : currentData.length === 0 ? (
                    <div className="empty-state">
                        <FileText className="empty-state-icon" size={64} />
                        <h3>Tidak ada data</h3>
                        <p>Belum ada pengajuan surat yang tersedia</p>
                    </div>
                ) : (
                    <>
                        <table className="approval-table">
                            <thead>
                                <tr>
                                    <th>Nomor Surat</th>
                                    <th>Perihal</th>
                                    <th>Tanggal Pengajuan</th>
                                    <th>Tanggal Surat</th>
                                    <th>Status</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentData.map((surat) => (
                                    <tr key={surat.id}>
                                        <td>{surat.nomor_surat}</td>
                                        <td>{surat.perihal}</td>
                                        <td>{new Date(surat.created_at).toLocaleDateString()}</td>
                                        <td>{new Date(surat.tanggal_surat).toLocaleDateString()}</td>
                                        <td>{getStatusBadge(surat.status)}</td>
                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    className="btn-detail"
                                                    onClick={() => handleDetail(surat)}
                                                    title="Lihat Detail"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                {surat.status === 'PENDING' && (
                                                    <>
                                                        <button
                                                            className="btn-approve"
                                                            onClick={() => handleApprove(surat.id)}
                                                            title="Setujui"
                                                        >
                                                            <CheckCircle size={16} />
                                                        </button>
                                                        <button
                                                            className="btn-reject"
                                                            onClick={() => handleReject(surat)}
                                                            title="Tolak"
                                                        >
                                                            <XCircle size={16} />
                                                        </button>
                                                    </>
                                                )}
                                                <button
                                                    className="btn-delete"
                                                    onClick={() => handleDelete(surat)}
                                                    title="Hapus Surat"
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
            {showDetailModal && selectedSurat && (
                <div className="approval-modal-overlay" onClick={() => setShowDetailModal(false)}>
                    <div className="approval-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="approval-modal-header">
                            <h3>Detail Surat Pengajuan</h3>
                        </div>
                        <div className="approval-modal-body">
                            <div className="detail-row">
                                <div className="detail-label">Nomor Surat</div>
                                <div className="detail-value">{selectedSurat.nomor_surat}</div>
                            </div>
                            <div className="detail-row">
                                <div className="detail-label">Perihal</div>
                                <div className="detail-value">{selectedSurat.perihal}</div>
                            </div>
                            <div className="detail-row">
                                <div className="detail-label">Tanggal Pengajuan</div>
                                <div className="detail-value">{new Date(selectedSurat.created_at).toLocaleDateString()}</div>
                            </div>
                            <div className="detail-row">
                                <div className="detail-label">Tanggal Surat</div>
                                <div className="detail-value">{new Date(selectedSurat.tanggal_surat).toLocaleDateString()}</div>
                            </div>
                            <div className="detail-row">
                                <div className="detail-label">Jatuh Tempo File</div>
                                <div className="detail-value">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>{new Date(new Date(selectedSurat.created_at).getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</span>
                                        {selectedSurat.file_url !== 'EXPIRED' && timeRemaining !== 'Expired' && (
                                            <span style={{
                                                fontSize: '0.75rem',
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                background: '#fee2e2',
                                                color: '#dc2626',
                                                fontWeight: 600,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}>
                                                <Clock size={12} />
                                                Sisa: {timeRemaining}
                                            </span>
                                        )}
                                        {selectedSurat.file_url === 'EXPIRED' && (
                                            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '12px', background: '#f1f5f9', color: '#64748b', fontWeight: 600 }}>
                                                Sudah Kadaluarsa
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {selectedSurat.nama_pekerjaan && (
                                <div className="detail-row">
                                    <div className="detail-label">Nama Pekerjaan</div>
                                    <div className="detail-value">{selectedSurat.nama_pekerjaan}</div>
                                </div>
                            )}
                            {selectedSurat.nomor_kontrak && (
                                <div className="detail-row">
                                    <div className="detail-label">Nomor Kontrak</div>
                                    <div className="detail-value">{selectedSurat.nomor_kontrak}</div>
                                </div>
                            )}
                            {selectedSurat.keterangan && (
                                <div className="detail-row">
                                    <div className="detail-label">Keterangan</div>
                                    <div className="detail-value">{selectedSurat.keterangan}</div>
                                </div>
                            )}
                            {selectedSurat.file_name && (
                                <div className="detail-row">
                                    <div className="detail-label">File Lampiran</div>
                                    <div className="detail-value">
                                        <div className="file-attachment">
                                            <div className="file-info">
                                                <FileText size={18} style={{ color: '#ef4444' }} />
                                                <span>{selectedSurat.file_name}</span>
                                            </div>
                                            {selectedSurat.file_url && (
                                                <div className="file-actions">
                                                    <button
                                                        className="btn-file-action view"
                                                        onClick={() => window.open(selectedSurat.file_url, '_blank')}
                                                        title="Lihat File"
                                                    >
                                                        <ExternalLink size={14} />
                                                        Lihat
                                                    </button>
                                                    <button
                                                        className="btn-file-action download"
                                                        onClick={async () => {
                                                            try {
                                                                await downloadFileFromSupabase(
                                                                    selectedSurat.file_url!,
                                                                    selectedSurat.file_name!
                                                                )
                                                            } catch (error) {
                                                                setNotification({ show: true, type: 'error', message: 'Gagal mendownload file' })
                                                            }
                                                        }}
                                                        title="Download File"
                                                    >
                                                        <Download size={14} />
                                                        Download
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="detail-row">
                                <div className="detail-label">Status</div>
                                <div className="detail-value">{getStatusBadge(selectedSurat.status)}</div>
                            </div>
                            {selectedSurat.alasan_penolakan && (
                                <div className="detail-row">
                                    <div className="detail-label">Alasan Penolakan</div>
                                    <div className="detail-value">{selectedSurat.alasan_penolakan}</div>
                                </div>
                            )}
                        </div>
                        <div className="approval-modal-actions">
                            <button className="btn-cancel" onClick={() => setShowDetailModal(false)}>
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && selectedSurat && (
                <div className="approval-modal-overlay" onClick={() => setShowRejectModal(false)}>
                    <div className="approval-modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="approval-modal-header">
                            <h3>Tolak Pengajuan Surat</h3>
                            <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                                Surat: {selectedSurat.nomor_surat}
                            </p>
                        </div>
                        <div className="approval-modal-body">
                            <div className="form-group">
                                <label>Alasan Penolakan <span style={{ color: '#ef4444' }}>*</span></label>
                                <textarea
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="Masukkan alasan penolakan..."
                                />
                            </div>
                        </div>
                        <div className="approval-modal-actions">
                            <button className="btn-cancel" onClick={() => setShowRejectModal(false)}>
                                Batal
                            </button>
                            <button className="btn-confirm danger" onClick={confirmReject}>
                                Tolak Surat
                            </button>
                        </div>
                    </div>
                </div>
            )}

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
                type="question"
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText="Ya, Setujui"
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal({ ...confirmModal, show: false })}
            />
        </div>
    )
}

