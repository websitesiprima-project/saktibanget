'use client'
import { useState, useEffect } from 'react'
import { FileText, UserPlus, FileEdit, Clock, History, Trash2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import ConfirmModal from '@/components/ConfirmModal'
import './Riwayat.css'

interface Notification {
    id: string
    type: 'contract' | 'vendor' | 'amendment'
    title: string
    description: string
    time: string
    timestamp: Date
    icon: any
}

export default function RiwayatPage() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)
    const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: () => { } })
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' })

    useEffect(() => {
        fetchNotifications()
    }, [])

    const getRelativeTime = (dateString: string): string => {
        if (!dateString) return 'Baru saja'
        const date = new Date(dateString)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)

        if (diffMins < 1) return 'Baru saja'
        if (diffMins < 60) return `${diffMins} menit yang lalu`
        if (diffHours < 24) return `${diffHours} jam yang lalu`
        if (diffDays < 7) return `${diffDays} hari yang lalu`
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    }

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ show: true, message, type })
        setTimeout(() => setToast({ ...toast, show: false }), 3000)
    }

    const handleDeleteClick = (item: Notification) => {
        setConfirmModal({
            show: true,
            title: 'Sembunyikan Riwayat',
            message: 'Apakah Anda yakin ingin menyembunyikan notifikasi ini? Data asli tidak akan terhapus dari sistem.',
            onConfirm: () => hideHistoryItem(item.id)
        })
    }

    const handleClearAll = () => {
        setConfirmModal({
            show: true,
            title: 'Bersihkan Semua Riwayat',
            message: 'Apakah Anda yakin ingin membersihkan semua riwayat dari tampilan ini? Data asli tidak akan terhapus.',
            onConfirm: () => clearAllHistory()
        })
    }

    const hideHistoryItem = (id: string) => {
        try {
            setConfirmModal({ ...confirmModal, show: false })

            // Get existing hidden items
            const hiddenItems = JSON.parse(localStorage.getItem('hidden_activity_logs') || '[]')
            if (!hiddenItems.includes(id)) {
                hiddenItems.push(id)
                localStorage.setItem('hidden_activity_logs', JSON.stringify(hiddenItems))
            }

            setNotifications(prev => prev.filter(n => n.id !== id))
            showToast('Riwayat disembunyikan')
        } catch (error) {
            console.error('Error hiding history:', error)
            showToast('Gagal menyembunyikan riwayat', 'error')
        }
    }

    const clearAllHistory = () => {
        try {
            setConfirmModal({ ...confirmModal, show: false })

            // Get all current IDs
            const allIds = notifications.map(n => n.id)
            const hiddenItems = JSON.parse(localStorage.getItem('hidden_activity_logs') || '[]')

            // Merge unique IDs
            const newHiddenItems = [...new Set([...hiddenItems, ...allIds])]
            localStorage.setItem('hidden_activity_logs', JSON.stringify(newHiddenItems))

            setNotifications([])
            showToast('Semua riwayat dibersihkan')
        } catch (error) {
            console.error('Error clearing history:', error)
            showToast('Gagal membersihkan riwayat', 'error')
        }
    }

    const fetchNotifications = async () => {
        try {
            setLoading(true)

            // Get hidden items first
            const hiddenItems = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('hidden_activity_logs') || '[]') : []

            // Fetch contract history with limit 50 for page
            console.log('Fetching from table: contract_history');
            const { data: contractHistory, error: historyError } = await supabase
                .from('contract_history')
                .select('*') // Removed join that caused error
                .order('created_at', { ascending: false })
                .limit(50)

            if (historyError) {
                console.error('Supabase error fetching contract_history:', historyError);
            }

            // Fetch ALL contracts (lightweight, just id and name) to map manually
            const { data: contractsList } = await supabase
                .from('contracts')
                .select('id, name');

            // Fetch vendors with limit 20
            const { data: vendors } = await supabase
                .from('vendors')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(20)

            const notifs: Notification[] = []

            if (contractHistory) {
                contractHistory.forEach((history: any) => {
                    if (hiddenItems.includes(`contract-${history.id}`)) return; // Skip hidden
                    const isAmendment = history.action.includes('Amandemen')
                    // Manual join
                    const relatedContract = contractsList?.find(c => c.id === history.contract_id);
                    const contractName = relatedContract?.name || 'Kontrak';

                    notifs.push({
                        id: `contract-${history.id}`,
                        type: isAmendment ? 'amendment' : 'contract',
                        title: history.action,
                        description: `${contractName} - ${history.details}`,
                        time: getRelativeTime(history.created_at),
                        timestamp: new Date(history.created_at),
                        icon: isAmendment ? FileEdit : FileText
                    })
                })
            }

            if (vendors) {
                vendors.forEach((vendor: any) => {
                    if (hiddenItems.includes(`vendor-${vendor.id}`)) return; // Skip hidden
                    notifs.push({
                        id: `vendor-${vendor.id}`,
                        type: 'vendor',
                        title: 'Vendor Baru Terdaftar',
                        description: `${vendor.nama} telah ditambahkan sebagai vendor baru.`,
                        time: getRelativeTime(vendor.created_at),
                        timestamp: new Date(vendor.created_at),
                        icon: UserPlus
                    })
                })
            }

            // Sort by timestamp descending
            notifs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            setNotifications(notifs)
        } catch (error) {
            console.error('Error fetching history:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="riwayat-container">
            <div className="riwayat-header">
                <div>
                    <h1 className="riwayat-title">Riwayat Aktivitas</h1>
                    <p className="riwayat-subtitle">Log aktivitas sistem, perubahan kontrak, dan pendaftaran vendor terbaru.</p>
                </div>
                {notifications.length > 0 && (
                    <button
                        onClick={handleClearAll}
                        className="clear-all-btn"
                        style={{
                            padding: '8px 16px',
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Trash2 size={16} />
                        Bersihkan Semua
                    </button>
                )}
            </div>

            {toast.show && (
                <div style={{
                    position: 'fixed',
                    top: '20px',
                    right: '20px',
                    padding: '12px 24px',
                    background: toast.type === 'success' ? '#10B981' : '#EF4444',
                    color: 'white',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    animation: 'slideIn 0.3s ease-out'
                }}>
                    {toast.type === 'error' && <AlertCircle size={20} />}
                    {toast.message}
                </div>
            )}

            <div className="timeline-container">
                {loading ? (
                    <div className="empty-state">Loading...</div>
                ) : notifications.length > 0 ? (
                    notifications.map((item) => {
                        const Icon = item.icon
                        const isVendor = item.type === 'vendor'

                        return (
                            <div key={item.id} className="timeline-item group">
                                <div className={`timeline-icon-wrapper ${item.type}`}>
                                    <Icon size={20} strokeWidth={2} />
                                </div>
                                <div className="timeline-content">
                                    <div className="timeline-header">
                                        <div className="timeline-title">{item.title}</div>
                                        <div className="flex items-center gap-2">
                                            <div className="timeline-time">{item.time}</div>
                                            <button
                                                onClick={() => handleDeleteClick(item)}
                                                className="delete-history-btn"
                                                title="Sembunyikan dari riwayat"
                                                style={{
                                                    border: 'none',
                                                    background: 'transparent',
                                                    cursor: 'pointer',
                                                    color: '#ef4444',
                                                    padding: '4px',
                                                    borderRadius: '4px',
                                                    marginLeft: '8px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    opacity: 0.7,
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseOver={(e) => {
                                                    e.currentTarget.style.opacity = '1';
                                                    e.currentTarget.style.background = '#fee2e2';
                                                }}
                                                onMouseOut={(e) => {
                                                    e.currentTarget.style.opacity = '0.7';
                                                    e.currentTarget.style.background = 'transparent';
                                                }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="timeline-desc">{item.description}</div>
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <div className="empty-state">
                        <History size={48} className="empty-icon" strokeWidth={1} />
                        <p>Belum ada riwayat aktivitas.</p>
                    </div>
                )}
            </div>

            <ConfirmModal
                show={confirmModal.show}
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal({ ...confirmModal, show: false })}
                type="delete"
            />
        </div>
    )
}
