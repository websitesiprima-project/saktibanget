'use client'
import { useState, useRef, useEffect, Fragment } from 'react'
import { useSearchParams } from 'next/navigation'
import { Eye, Edit, Trash2, Search, ChevronDown, ChevronUp, Plus, Save, Upload, Calendar, Clock, ArrowRight, FileText, AlertCircle, AlertTriangle, FileCheck, History, Activity, X, CheckCircle, Info, AlertOctagon } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'
import { getContracts, getContractHistory, invalidateCache } from '../../../lib/dataStore'
import { autoSyncVendor } from '../../../services/vendorService'
import { updateVendorContractStatus } from '../../../services/vendorAccountService'
import CsvImportModal from '@/components/CsvImportModal'
import './ManajemenAset.css'

// Helper function untuk format currency dengan titik dan koma
const formatCurrency = (value) => {
    if (!value) return '0'
    return value.toLocaleString('id-ID')
}

function ManajemenAset() {
    // Debug log removed
    const searchParams = useSearchParams()
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;
    const [showModal, setShowModal] = useState(false);
    const [showColumnSelector, setShowColumnSelector] = useState(false);
    const columnSelectorRef = useRef(null);
    const [columnVisibility, setColumnVisibility] = useState({
        id: true,
        name: true,
        vendorName: true,
        amount: true, // Nilai Kontrak
        budgetType: false, // Hidden by default
        contractType: false, // Hidden by default
        location: false, // Hidden by default
        status: true,
        periode: true, // Combined date column
        startDate: false, // Hidden - use periode instead
        endDate: false // Hidden - use periode instead
    });
    // State untuk CSV Import Modal
    const [showCsvImportModal, setShowCsvImportModal] = useState(false)

    // State untuk Detail Modal
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [selectedAsset, setSelectedAsset] = useState(null)

    const handleViewDetail = (asset) => {
        setSelectedAsset(asset)
        setShowDetailModal(true)
    }
    // State untuk upload PDF
    const [showUploadModal, setShowUploadModal] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [uploadError, setUploadError] = useState('')
    const [uploadSuccess, setUploadSuccess] = useState('')
    const [selectedFile, setSelectedFile] = useState(null)
    const [selectedContractId, setSelectedContractId] = useState(null)

    // Refs for table scrolling
    const tableContainerRef = useRef<HTMLDivElement>(null);

    // State untuk data aset (dari Supabase) - MOVED UP TO FIX REFERENCE ERROR
    const [assets, setAssets] = useState([])

    // Filter assets berdasarkan search term (nama kontrak ATAU nomor kontrak) dan status
    const filteredAssets = assets.filter(asset => {
        const term = searchTerm.toLowerCase()
        const matchesSearch = !term ||
            (asset.name || '').toLowerCase().includes(term) ||
            (asset.invoiceNumber || '').toLowerCase().includes(term)
        const matchesStatus = filterStatus === 'all' || asset.status === filterStatus
        return matchesSearch && matchesStatus
    })

    const totalPages = Math.ceil(filteredAssets.length / ITEMS_PER_PAGE)
    const paginatedAssets = filteredAssets.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    )

    // Buka modal upload
    function openUploadModal(contractId) {
        setSelectedContractId(contractId)
        setUploadError('')
        setUploadSuccess('')
        setSelectedFile(null)
        setShowUploadModal(true)
    }

    // Handle upload PDF
    async function handleUpload() {
        if (!selectedFile) {
            setUploadError('Pilih file PDF terlebih dahulu')
            return
        }

        setUploading(true)
        setUploadError('')
        setUploadSuccess('')

        try {
            // Cari data kontrak berdasarkan ID
            const contract = assets.find(a => a.id === selectedContractId)
            if (!contract) {
                throw new Error('Data kontrak tidak ditemukan')
            }

            // Validasi tipe anggaran (wajib diisi, nilai apapun diterima)
            if (!contract.budgetType) {
                throw new Error('Tipe anggaran kontrak belum diisi. Harap edit data kontrak terlebih dahulu.')
            }

            // Validasi nama kontrak
            if (!contract.name) {
                throw new Error('Nama kontrak tidak boleh kosong')
            }

            // Buat FormData
            const formData = new FormData()
            formData.append('file', selectedFile)
            formData.append('tipeAnggaran', contract.budgetType)
            formData.append('namaKontrak', contract.name)
            formData.append('nomorKontrak', contract.invoiceNumber || contract.id)
            formData.append('contractId', selectedContractId)

            // Kirim ke API upload-contract
            const res = await fetch('/api/upload-contract', {
                method: 'POST',
                body: formData
            })

            let data
            try {
                data = await res.json()
            } catch (jsonError) {
                console.error('Failed to parse JSON response:', jsonError)
                const text = await res.text()
                console.error('Response text:', text)
                throw new Error('Server response tidak valid. Cek console untuk detail.')
            }

            if (!res.ok) {
                // Show detailed error
                const detailMsg = data.details ? `\n\nDetail: ${JSON.stringify(data.details, null, 2)}` : ''
                const errorMsg = `${data.error || 'Upload gagal'}\n\nStatus: ${res.status} ${res.statusText}${detailMsg}`

                throw new Error(errorMsg)
            }

            // Simpan link file ke Supabase (hanya jika upload ke Drive sukses)
            if (data.success && data.data) {
                const { error } = await supabase
                    .from('contract_files')
                    .insert([{
                        contract_id: selectedContractId,
                        file_url: data.data.webViewLink,
                        file_name: data.data.fileName,
                        folder_path: data.data.folderPath,
                        file_id: data.data.fileId
                    }])

                if (error) {
                    console.warn('Supabase insert warning:', error.message)
                    // Tidak throw error, karena upload ke Drive sudah berhasil
                }
            }

            const successMessage = `File berhasil diupload ke: ${data.data.folderPath}`
            setUploadSuccess(successMessage)
            showAlert('success', 'Berhasil', successMessage)

            // Reset dan tutup modal setelah 2 detik
            setTimeout(() => {
                setShowUploadModal(false)
                setSelectedFile(null)
                setUploadError('')
                setUploadSuccess('')
            }, 2000)

        } catch (err) {
            const errorMessage = err.message || 'Terjadi kesalahan saat upload'
            setUploadError(errorMessage)
            showAlert('error', 'Gagal Upload', errorMessage)
            console.error('Upload error:', err)
        } finally {
            setUploading(false)
        }
    }
    const [formData, setFormData] = useState({
        id: '',
        name: '',
        recipient: '',
        invoiceNumber: '',
        vendorName: '', // added missing field
        amount: '',
        budgetType: '',
        contractType: '',
        category: '', // added missing field
        location: '',
        status: 'Dalam Pekerjaan',
        startDate: '',
        endDate: '',
        amendmentDocNumber: '', // New field
        amendmentDescription: '' // New field
    });

    // State untuk daftar vendor aktif
    const [activeVendors, setActiveVendors] = useState([])

    // Fetch active vendors for dropdown
    const fetchActiveVendors = async () => {
        try {
            const { data, error } = await supabase
                .from('vendors')
                .select('nama, status')
                .in('status', ['Aktif', 'Berkontrak'])
                .order('nama', { ascending: true })

            if (error) throw error

            // Remove duplicates and filter out null/empty names
            const uniqueVendors = [...new Set(data.map(v => v.nama).filter(Boolean))]
            setActiveVendors(uniqueVendors)
        } catch (err) {
            console.error('Error fetching vendors:', err)
        }
    }

    // Loading state untuk UI feedback
    const [isLoading, setIsLoading] = useState(true)

    // Fetch data contracts & history - MENGGUNAKAN CACHE dari dataStore
    const fetchContracts = async (forceRefresh = false) => {
        const startTime = performance.now()
        setIsLoading(true)

        try {
            // 🚀 CACHED DATA - Jika data sudah di-prefetch, akan return instant
            const [data, allHistory] = await Promise.all([
                getContracts(forceRefresh),
                getContractHistory(forceRefresh)
            ])

            console.log('📊 Contracts:', data.length, '| History:', allHistory.length)

            // Format data sesuai struktur UI
            const formattedData = data.map(contract => {
                // Find history for this contract
                const contractHistory = allHistory
                    .filter(h => h.contract_id === contract.id)
                    .map(h => {
                        // Parse progress_date dari kolom baru ATAU dari details text
                        let progressDate = h.progress_date || null
                        if (!progressDate && h.details) {
                            // Try to parse "Tanggal: 2025-11-05 08:56" from details
                            const dateMatch = h.details.match(/Tanggal:\s*(\d{4}-\d{2}-\d{2}\s*\d{2}:\d{2})/)
                            if (dateMatch) {
                                progressDate = dateMatch[1]
                            }
                        }

                        return {
                            id: h.id,
                            action: h.action || '',
                            user: h.user_name || 'Admin',
                            details: h.details || '',
                            created_at: h.created_at, // Record creation timestamp
                            progress_date: progressDate, // User-input date for calculation
                            file_url: h.file_url || null,
                            file_name: h.file_name || null,
                            date: h.created_at ? new Date(h.created_at).toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            }) : ''
                        }
                    })

                // Debug: Log contract with progress tracker
                if (contractHistory.some(h => h.action?.includes('Progress Tracker'))) {
                    const progressEntries = contractHistory.filter(h => h.action?.includes('Progress Tracker'))
                    console.log('🔍 Contract dengan Progress:', {
                        id: contract.id,
                        name: contract.name,
                        totalProgress: progressEntries.length,
                        latestProgressDate: progressEntries[0]?.progress_date,
                        latestCreatedAt: progressEntries[0]?.created_at
                    })
                }

                // Calculate latest progress from progress tracker history
                let latestProgress = contract.progress || 0
                const progressTrackers = contractHistory.filter(h => h.action && h.action.includes('Progress Tracker'))
                if (progressTrackers.length > 0) {
                    // Get the most recent progress tracker
                    const latestTracker = progressTrackers[0] // Already sorted by created_at DESC
                    // Extract percentage from action text like "Progress Tracker: Title (60%)"
                    const percentageMatch = latestTracker.action.match(/\((\d+)%\)/)
                    if (percentageMatch) {
                        latestProgress = parseInt(percentageMatch[1], 10)
                    }
                }

                return {
                    id: contract.id || '',
                    name: contract.name || contract.perihal || '',
                    vendorName: contract.vendor_name || contract.pengirim || '',
                    recipient: contract.penerima || contract.recipient || '',
                    invoiceNumber: contract.nomor_surat || contract.invoice_number || '',
                    amount: contract.amount ? parseFloat(contract.amount) : 0,
                    budgetType: contract.budget_type || contract.kategori || '',
                    contractType: contract.contract_type || contract.kategori || '',
                    category: contract.kategori || contract.budget_type || '',
                    location: contract.location || contract.notes || '-',
                    status: contract.status || 'Dalam Pekerjaan',
                    startDate: contract.start_date || contract.tanggal_masuk || '',
                    endDate: contract.end_date || '',
                    updatedAt: contract.updated_at || contract.created_at || '',
                    progress: latestProgress,
                    history: contractHistory
                }
            })
            setAssets(formattedData)

            // Performance logging
            const endTime = performance.now()
            console.log(`⚡ Data loaded in ${(endTime - startTime).toFixed(0)}ms`)
        } catch (err) {
            console.error('Error fetching contracts:', err)
            setAssets([])
        } finally {
            setIsLoading(false)
        }
    }

    // Load data on mount
    useEffect(() => {
        fetchContracts()
        fetchActiveVendors()
    }, [])

    // Handle URL parameter untuk auto-expand kontrak yang dipilih
    useEffect(() => {
        const contractId = searchParams.get('id')
        if (contractId && assets.length > 0) {
            // Cek apakah kontrak dengan ID tersebut ada
            const contract = assets.find(c => c.id === contractId)
            if (contract) {
                // Auto-expand dropdown
                setExpandedContractId(contractId)
                setDetailTab('history')

                // Scroll ke kontrak setelah render
                setTimeout(() => {
                    const element = document.querySelector(`tr[data-contract-id="${contractId}"]`)
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }
                }, 300)
            }
        }
    }, [assets, searchParams])

    const getBadgeClass = (status) => {
        if (!status) return ''
        const normalized = status.toLowerCase()
        if (normalized === 'aktif' || normalized === 'dalam pekerjaan' || normalized === 'dalam proses pekerjaan') return 'status-dalam-pekerjaan'
        if (normalized === 'perbaikan') return 'status-maintenance'
        if (normalized === 'tidak aktif') return 'status-inactive'

        // Slugify for new statuses
        return `status-${normalized.replace(/\s+/g, '-')}`
    }

    // Helper function: Check progress update status
    // Return: { status: 'normal'|'no-progress'|'stale', daysSinceUpdate: number }
    // USES progress_date (user-input date) for calculation, NOT created_at
    const getProgressUpdateStatus = (history, status) => {
        // Only check for active contracts
        if (status !== 'Dalam Pekerjaan') {
            return { status: 'normal', daysSinceUpdate: 0 }
        }

        // Filter progress tracker entries
        const progressHistory = history.filter(h => h && h.action && h.action.includes('Progress Tracker'))

        if (progressHistory.length === 0) {
            return { status: 'no-progress', daysSinceUpdate: null } // No progress tracker at all
        }

        // Get the most recent progress tracker
        const latestProgress = progressHistory[0] // Already sorted DESC

        // Use progress_date (user-input) first, fallback to created_at
        const dateToUse = latestProgress.progress_date || latestProgress.created_at

        if (!dateToUse) {
            return { status: 'no-progress', daysSinceUpdate: null }
        }

        // Calculate days since update using the INPUT date
        try {
            const lastUpdateDate = new Date(dateToUse)
            const today = new Date()
            const diffTime = today.getTime() - lastUpdateDate.getTime()
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

            console.log('📅 Progress Date Calculation:', {
                progressDate: latestProgress.progress_date,
                createdAt: latestProgress.created_at,
                dateUsed: dateToUse,
                diffDays,
                isStale: diffDays >= 7
            })

            // If no update in last 7 days
            if (diffDays >= 7) {
                return { status: 'stale', daysSinceUpdate: diffDays } // Progress exists but outdated
            }
            return { status: 'normal', daysSinceUpdate: diffDays }
        } catch (err) {
            console.warn('Error parsing progress timestamp:', err)
            return { status: 'normal', daysSinceUpdate: 0 }
        }
    }

    // State untuk mode edit
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [isAmendment, setIsAmendment] = useState(false); // State for amendment option

    // Countdown timer for detail modal
    const [timeRemaining, setTimeRemaining] = useState('');
    useEffect(() => {
        if (!showDetailModal || !selectedAsset || !selectedAsset.endDate) return;
        function updateCountdown() {
            const now = new Date();
            let end;
            // Handle YYYY-MM-DD (Supabase) or DD/MM/YYYY (Legacy)
            if (selectedAsset.endDate.includes('/')) {
                end = new Date(selectedAsset.endDate.split('/').reverse().join('-'));
            } else {
                end = new Date(selectedAsset.endDate);
            }

            const diff = end.getTime() - now.getTime();
            if (diff <= 0) {
                setTimeRemaining('Sudah melewati tenggat!');
                return;
            }
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const minutes = Math.floor((diff / (1000 * 60)) % 60);
            const seconds = Math.floor((diff / 1000) % 60);
            setTimeRemaining(`${days} hari ${hours} jam ${minutes} menit ${seconds} detik`);
        }
        updateCountdown();
        const interval = setInterval(updateCountdown, 1000);
        return () => clearInterval(interval);
    }, [showDetailModal, selectedAsset]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event || !event.target) return
            if (columnSelectorRef.current && !columnSelectorRef.current.contains(event.target)) {
                setShowColumnSelector(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])


    // State for expanded row (Amendment view)
    const [expandedContractId, setExpandedContractId] = useState(null)

    // Helper function to calculate deadline status
    const getDeadlineStatus = (endDate, status) => {
        // Skip if status is already "Selesai" or "Terbayar"
        if (status === 'Selesai' || status === 'Terbayar') return null

        if (!endDate) return null
        const end = new Date(endDate)
        const now = new Date()
        const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        if (diffDays < 0) return 'overdue' // Terlambat
        if (diffDays <= 7) return 'warning' // Mendekati deadline (7 hari)
        return null
    }

    // Calculate deadline stats
    const deadlineStats = assets.reduce((acc, asset) => {
        const status = getDeadlineStatus(asset.endDate, asset.status)
        if (status === 'overdue') acc.overdue++
        if (status === 'warning') acc.warning++
        return acc
    }, { overdue: 0, warning: 0 })

    const toggleExpand = (id) => {
        if (expandedContractId === id) {
            setExpandedContractId(null)
        } else {
            setExpandedContractId(id)
            setDetailTab('history') // Reset tab to history on new expand
            if (id) fetchPaymentStages(id)
        }
    }

    // Helper to switch detail tabs
    const [detailTab, setDetailTab] = useState('history') // 'history' | 'payment'

    // State for Custom Confirmation Modal
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [pendingAmendment, setPendingAmendment] = useState(null)

    // State for Progress Tracker
    const [showProgressModal, setShowProgressModal] = useState(false)
    const [progressFormData, setProgressFormData] = useState({
        contractId: '',
        title: '',
        description: '',
        status: 'In Progress',
        percentage: 0,
        date: '',
        time: ''
    })
    const [progressFile, setProgressFile] = useState(null) // File PDF untuk progress tracker
    const [progressFileUploading, setProgressFileUploading] = useState(false)
    const [amendmentFile, setAmendmentFile] = useState<File | null>(null) // File PDF untuk amandemen
    const [amendmentFileUploading, setAmendmentFileUploading] = useState(false)
    const [activeHistoryTab, setActiveHistoryTab] = useState('all') // 'all', 'amendments', 'progress'

    // State for Payment Stages
    const [activeDetailTab, setActiveDetailTab] = useState('history') // 'history', 'payment'
    const [paymentStages, setPaymentStages] = useState([])
    const [paymentError, setPaymentError] = useState('')
    const [loadingPayment, setLoadingPayment] = useState(false)
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [paymentMode, setPaymentMode] = useState('single') // 'single', 'termin'
    const [paymentFormData, setPaymentFormData] = useState({
        contractId: '',
        name: '',
        percentage: '100',
        amount: '0',
        dueDate: ''
    })

    // -- GLOBAL ALERT & CONFIRM STATE --
    const [alertState, setAlertState] = useState({
        show: false,
        type: 'success', // 'success' | 'error' | 'info'
        title: '',
        message: ''
    })

    const [confirmState, setConfirmState] = useState({
        show: false,
        title: '',
        message: '',
        action: null // Function to execute on confirm
    })

    const showAlert = (type, title, message) => {
        setAlertState({ show: true, type, title, message })
        // Auto close success alerts after 3s
        if (type === 'success') {
            setTimeout(() => setAlertState(prev => ({ ...prev, show: false })), 3000)
        }
    }

    const showConfirm = (title, message, action) => {
        setConfirmState({ show: true, title, message, action })
    }

    const closeAlert = () => setAlertState(prev => ({ ...prev, show: false }))

    const closeConfirm = () => setConfirmState({ show: false, title: '', message: '', action: null })
    // -- END GLOBAL STATE --

    const fetchPaymentStages = async (contractId) => {
        if (!contractId) return
        setLoadingPayment(true)
        try {
            const { data, error } = await supabase
                .from('payment_stages')
                .select('*')
                .eq('contract_id', contractId)
                .order('due_date', { ascending: true })

            if (error) throw error
            setPaymentStages(data || [])
        } catch (err) {
            console.error('Error fetching payment stages:', err)
        } finally {
            setLoadingPayment(false)
        }
    }

    const handleOpenPaymentModal = (contract) => {
        setPaymentFormData({
            contractId: contract.id,
            name: 'Pembayaran Lunas',
            percentage: '100',
            amount: String(contract.amount || 0),
            dueDate: ''
        })
        setPaymentMode('single')
        setPaymentError('')
        setShowPaymentModal(true)
    }

    const handlePaymentSubmit = async (e) => {
        e.preventDefault()
        setPaymentError('')

        // Validasi input
        if (!paymentFormData.name || !paymentFormData.amount) {
            setPaymentError('Nama dan nominal harus diisi!')
            return
        }

        // Validasi: total termin tidak boleh melebihi nilai kontrak
        const contract = assets.find(a => a.id === paymentFormData.contractId)
        const contractAmount = contract ? Number(contract.amount) : 0
        // Hitung total termin existing (exclude current if editing)
        const totalTermin = paymentStages.reduce((sum, s) => sum + (Number(s.value) || 0), 0)
        const newTotal = totalTermin + Number(paymentFormData.amount)
        if (paymentMode === 'termin' && newTotal > contractAmount) {
            setPaymentError('Total nominal tahapan melebihi nilai kontrak!')
            return
        }
        try {
            const payload = {
                contract_id: paymentFormData.contractId,
                name: paymentFormData.name,
                percentage: String(parseFloat(paymentFormData.percentage) || 0),
                value: String(parseFloat(paymentFormData.amount) || 0),
                due_date: paymentFormData.dueDate || null,
                status: 'Pending'
            }

            console.log('Submitting payment payload:', payload)

            const { data, error } = await supabase.from('payment_stages').insert([payload]).select()

            if (error) {
                console.error('Supabase insert error:', error)
                throw new Error(error.message || error.details || 'Gagal menyimpan ke database')
            }

            console.log('Payment stage saved successfully:', data)

            showAlert('success', 'Berhasil', 'Tahapan pembayaran berhasil ditambahkan!')
            fetchPaymentStages(paymentFormData.contractId)
            setShowPaymentModal(false)
        } catch (err) {
            console.error('Error saving payment stage:', err)
            const errorMessage = err?.message || (typeof err === 'string' ? err : JSON.stringify(err))
            showAlert('error', 'Gagal', errorMessage)
        }
    }

    const handleMarkAsPaid = async (stageId, contractId) => {
        showConfirm('Konfirmasi Pembayaran', 'Tandai pembayaran ini sebagai SUDAH DIBAYAR?', async () => {
            try {
                const { error } = await supabase
                    .from('payment_stages')
                    .update({ status: 'Paid', paid_at: new Date().toISOString() })
                    .eq('id', stageId)

                if (error) throw error
                fetchPaymentStages(contractId)
                showAlert('success', 'Berhasil', 'Status pembayaran berhasil diperbarui!')

                // Optional: Check if all paid then update contract status to 'Terbayar'
                // For now just refresh the list
            } catch (err) {
                console.error('Error updating payment status:', err)
                showAlert('error', 'Gagal', 'Gagal update status: ' + err.message)
            }
        })
    }

    const handleDeletePaymentStage = async (stageId, contractId) => {
        showConfirm('Hapus Tahapan', 'Apakah Anda yakin ingin menghapus tahapan pembayaran ini?', async () => {
            try {
                const { error } = await supabase
                    .from('payment_stages')
                    .delete()
                    .eq('id', stageId)

                if (error) throw error
                showAlert('success', 'Berhasil', 'Tahapan pembayaran berhasil dihapus')
                fetchPaymentStages(contractId)
            } catch (err) {
                console.error('Error deleting payment stage:', err)
                showAlert('error', 'Gagal', 'Gagal menghapus: ' + err.message)
            }
        })
    }

    const handleCreateAmendment = (asset) => {
        // Calculate amendment number
        const existingAmendments = asset.history ? asset.history.filter(h => h && h.action && h.action.includes('Amandemen')).length : 0;
        const nextAmendmentNum = existingAmendments + 1;

        setPendingAmendment({ asset, nextAmendmentNum })
        setShowConfirmModal(true)
    }

    const handleConfirmAmendment = async () => {
        if (!pendingAmendment) return

        const { asset, nextAmendmentNum } = pendingAmendment

        // Refresh vendor list sebelum membuka modal amandemen
        await fetchActiveVendors()

        setFormData({
            ...asset,
            amount: asset.amount ? String(asset.amount) : '',
            category: asset.category || '',
            vendorName: asset.vendorName || '',
            amendmentDocNumber: `AMD-${asset.id}-${String(nextAmendmentNum).padStart(3, '0')}`, // Auto-generate suggestion
            amendmentDescription: ''
        })
        setEditId(asset.id)
        setIsEditing(true)
        setIsAmendment(true)
        setShowModal(true)

        // Close confirmation modal
        setShowConfirmModal(false)
        setPendingAmendment(null)
    }

    const handleCreateProgressTracker = (asset) => {
        setProgressFormData({
            contractId: asset.id,
            title: '',
            description: '',
            status: 'In Progress',
            percentage: asset.progress || 0,
            date: '',
            time: ''
        })
        setShowProgressModal(true)
    }

    const handleProgressSubmit = async (e) => {
        e.preventDefault()

        try {
            const percentage = progressFormData.percentage || 0;
            console.log('Submitting Progress:', { contractId: progressFormData.contractId, percentage });

            // 1. Handle file upload if present (optional)
            let fileUrl = null
            let fileName = null
            let googleDriveId = null

            if (progressFile) {
                setProgressFileUploading(true)
                try {
                    // Get contract info for folder naming
                    const contract = assets.find(a => a.id === progressFormData.contractId)
                    const formData = new FormData()
                    formData.append('file', progressFile)
                    formData.append('tipeAnggaran', contract?.budgetType || 'Progress')
                    formData.append('namaKontrak', contract?.name || 'Progress')
                    formData.append('nomorKontrak', contract?.invoiceNumber || progressFormData.contractId)
                    formData.append('contractId', progressFormData.contractId)
                    formData.append('subFolder', 'Progress Tracker')

                    const uploadRes = await fetch('/api/upload-contract', {
                        method: 'POST',
                        body: formData
                    })

                    if (uploadRes.ok) {
                        const uploadData = await uploadRes.json()
                        fileUrl = uploadData.data?.webViewLink || null
                        fileName = progressFile.name
                        googleDriveId = uploadData.data?.fileId || null
                    } else {
                        const errData = await uploadRes.json().catch(() => ({}))
                        const errMsg = errData?.error || `HTTP ${uploadRes.status}`
                        console.warn('File upload failed:', errMsg)
                        showAlert('error', 'Upload Gagal', `Dokumen tidak berhasil diupload: ${errMsg}. Progress tetap tersimpan.`)
                    }
                } catch (uploadErr) {
                    console.warn('File upload error:', uploadErr)
                    // Continue without file - it's optional
                } finally {
                    setProgressFileUploading(false)
                }
            }

            // 2. Build progress_date from user input
            let progressDate = null
            if (progressFormData.date) {
                const timeStr = progressFormData.time || '00:00'
                progressDate = `${progressFormData.date} ${timeStr}`
            }

            // 3. Add History Entry with progress_date and file info
            const progressDateTime = progressFormData.date && progressFormData.time
                ? `${progressFormData.date} ${progressFormData.time}`
                : '';

            const historyPayload = {
                contract_id: progressFormData.contractId,
                action: `Progress Tracker: ${progressFormData.title} (${percentage}%)`,
                user_name: 'Admin',
                details: `Progress: ${percentage}%. Status: ${progressFormData.status}. ${progressFormData.description || 'Tidak ada keterangan tambahan.'} ${progressDateTime ? `Tanggal: ${progressDateTime}` : ''}`,
                progress_date: progressDate, // Store the user-input date for calculation!
                file_url: fileUrl,
                file_name: fileName,
                google_drive_id: googleDriveId
            }

            console.log('Inserting history with progress_date:', progressDate)

            const { error: historyError } = await supabase
                .from('contract_history')
                .insert([historyPayload])

            if (historyError) {
                console.error('Supabase History Error:', historyError);
                throw historyError;
            }

            // 4. Update Contract Progress in database
            const { error: updateError } = await supabase
                .from('contracts')
                .update({ progress: percentage })
                .eq('id', progressFormData.contractId)

            if (updateError) {
                console.warn('Could not update progress column:', updateError.message);
                // Log but don't throw - we already saved to history which is the source of truth
            }

            showAlert('success', 'Berhasil', 'Progress tracker berhasil ditambahkan!' + (fileUrl ? ' File berhasil diupload.' : ''))

            // Store the contract ID before closing modal
            const contractId = progressFormData.contractId

            // Close modal and reset form
            setShowProgressModal(false)
            setProgressFormData({
                contractId: '',
                title: '',
                description: '',
                status: 'In Progress',
                percentage: 0,
                date: '',
                time: ''
            })
            setProgressFile(null) // Reset file

            // Refresh data to get updated history
            await fetchContracts()
        } catch (err) {
            console.error('Error adding progress tracker FULL:', err);
            const msg = err?.message || err?.error_description || JSON.stringify(err);
            showAlert('error', 'Gagal', 'Gagal menambahkan progress tracker: ' + msg);
        }
    }

    const toggleColumnVisibility = (column) => {
        setColumnVisibility(prev => ({
            ...prev,
            [column]: !prev[column]
        }))
    }

    const getVisibleColumnsCount = () => {
        return Object.values(columnVisibility).filter(Boolean).length
    }

    const getStatusClass = (status) => {
        switch (status) {
            case 'Aktif': return 'status-dalam-pekerjaan' // Legacy mapping
            case 'Dalam Pekerjaan': return 'status-dalam-pekerjaan'
            case 'Dalam Proses Pekerjaan': return 'status-dalam-pekerjaan'
            case 'Telah Diperiksa': return 'status-telah-diperiksa'
            case 'Terbayar': return 'status-terbayar'
            case 'Perbaikan': return 'status-maintenance'
            case 'Tidak Aktif': return 'status-inactive'
            default: return ''
        }
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleOpenAddModal = async () => {
        // Refresh vendor list sebelum membuka modal
        await fetchActiveVendors()
        setShowModal(true)
    }

    const handleEdit = async (asset) => {
        // Refresh vendor list sebelum membuka modal edit
        await fetchActiveVendors()
        setFormData({
            ...asset,
            amount: asset.amount ? String(asset.amount) : '', // Ensure amount is string for input
            category: asset.category || '',
            vendorName: asset.vendorName || '',
            amendmentDocNumber: '',
            amendmentDescription: ''
        })
        setEditId(asset.id)
        setIsEditing(true)
        setIsAmendment(false) // Reset amendment state
        setShowModal(true)
    }

    const handleCloseModal = () => {
        setShowModal(false)
        setIsEditing(false)
        setEditId(null)
        setIsAmendment(false)
        setAmendmentFile(null)
        setFormData({
            id: '',
            name: '',
            recipient: '',
            invoiceNumber: '',
            vendorName: '',
            amount: '',
            budgetType: '',
            contractType: '',
            category: '',
            location: '',
            status: 'Dalam Pekerjaan',
            startDate: '',
            endDate: '',
            amendmentDocNumber: '',
            amendmentDescription: ''
        })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        try {
            // Validasi: Cek duplikasi nomor kontrak/nomor surat
            if (!isEditing) {
                // Untuk tambah baru, cek apakah nomor kontrak sudah ada
                // Nomor kontrak disimpan di field nomor_surat
                const contractNumber = formData.invoiceNumber || formData.id
                if (contractNumber) {
                    const { data: existingContracts, error: checkError } = await supabase
                        .from('contracts')
                        .select('id, nomor_surat, name')
                        .eq('nomor_surat', contractNumber)

                    if (checkError) {
                        console.warn('Error checking duplicate:', checkError)
                    }

                    if (existingContracts && existingContracts.length > 0) {
                        const existing = existingContracts[0]
                        showAlert(
                            'error',
                            'Nomor Kontrak Sudah Ada',
                            `Nomor kontrak "${contractNumber}" sudah terdaftar dalam sistem untuk kontrak "${existing.name}". Silakan gunakan nomor kontrak yang berbeda.`
                        )
                        return
                    }
                }
            }

            if (isEditing) {
                // Get old data once for both vendor sync and history log
                const oldData = assets.find(a => a.id === editId)

                // 1. Auto-sync vendor jika vendor berubah
                let vendorCreated = false;
                if (formData.vendorName && formData.vendorName.trim() !== '' &&
                    oldData && oldData.vendorName !== formData.vendorName) {
                    const syncResult = await autoSyncVendor(formData.vendorName);
                    if (syncResult.success) {
                        console.log('Vendor sync on update:', syncResult.message);
                        if ((syncResult as any).data && !(syncResult as any).data.exists) {
                            vendorCreated = true;
                            console.log('✅ Vendor baru dibuat saat edit:', formData.vendorName);
                        }
                    }
                }

                // 2. Update Contracts Table
                const { error: updateError } = await supabase
                    .from('contracts')
                    .update({
                        name: formData.name,
                        nomor_surat: formData.invoiceNumber || '',
                        perihal: formData.name || '',
                        start_date: formData.startDate,
                        end_date: formData.endDate,
                        pengirim: formData.vendorName || '',
                        penerima: formData.recipient || '',
                        recipient: formData.recipient || '',
                        invoice_number: formData.invoiceNumber || '',
                        amount: formData.amount ? parseFloat(formData.amount) : 0,
                        budget_type: formData.budgetType || '',
                        contract_type: formData.contractType || '',
                        status: formData.status,
                        kategori: formData.category || '-',
                        location: formData.location || '',
                        vendor_name: formData.vendorName || '',
                        notes: formData.location || '',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', editId)

                if (updateError) throw updateError

                // 3. Insert History Log (skip if table doesn't exist)
                let changeDetails = []

                if (oldData) {
                    if (oldData.name !== formData.name) changeDetails.push(`Nama Kontrak: "${oldData.name}" ➝ "${formData.name}"`)
                    if (oldData.vendorName !== formData.vendorName) changeDetails.push(`Vendor: "${oldData.vendorName}" ➝ "${formData.vendorName}"`)

                    const oldAmount = Number(oldData.amount || 0)
                    const newAmount = Number(formData.amount || 0)
                    if (oldAmount !== newAmount) {
                        changeDetails.push(`Nilai: ${formatCurrency(oldAmount)} ➝ ${formatCurrency(newAmount)}`)
                    }

                    if (oldData.status !== formData.status) changeDetails.push(`Status: "${oldData.status}" ➝ "${formData.status}"`)
                    if (oldData.startDate !== formData.startDate) changeDetails.push(`Tgl Mulai: ${oldData.startDate} ➝ ${formData.startDate}`)
                    if (oldData.endDate !== formData.endDate) changeDetails.push(`Tgl Selesai: ${oldData.endDate} ➝ ${formData.endDate}`)
                    if (oldData.location !== formData.location) changeDetails.push(`Lokasi: "${oldData.location}" ➝ "${formData.location}"`)
                }

                const actionTitle = isAmendment
                    ? `Amandemen Kontrak ${formData.amendmentDocNumber ? `(No. ${formData.amendmentDocNumber})` : ''}`
                    : (changeDetails.length > 0 ? 'Update Data' : 'Update Data (Tanpa Perubahan)')

                let actionDetails = ''
                if (isAmendment) {
                    const changes = changeDetails.length > 0 ? ` Perubahan: ${changeDetails.join(', ')}` : ''
                    actionDetails = `${formData.amendmentDescription ? `Ket: ${formData.amendmentDescription}.` : ''}${changes}` || 'Amandemen tercatat.'
                } else {
                    actionDetails = changeDetails.length > 0
                        ? `Perubahan: ${changeDetails.join(', ')}`
                        : `Update data kontrak ${editId} tanpa perubahan signifikan`
                }

                try {
                    // === Upload file amandemen ke Google Drive jika ada ===
                    let amendmentFileUrl: string | null = null
                    let amendmentFileName: string | null = null
                    if (isAmendment && amendmentFile) {
                        setAmendmentFileUploading(true)
                        try {
                            const contract = assets.find(a => a.id === editId)
                            const amdFormData = new FormData()
                            amdFormData.append('file', amendmentFile)
                            amdFormData.append('tipeAnggaran', contract?.budgetType || 'Amandemen')
                            amdFormData.append('namaKontrak', contract?.name || formData.name || 'Kontrak')
                            amdFormData.append('nomorKontrak', contract?.invoiceNumber || editId)
                            amdFormData.append('contractId', editId)
                            amdFormData.append('subFolder', 'Amandemen')
                            const uploadRes = await fetch('/api/upload-contract', { method: 'POST', body: amdFormData })
                            if (uploadRes.ok) {
                                const uploadData = await uploadRes.json()
                                amendmentFileUrl = uploadData.data?.webViewLink || null
                                amendmentFileName = amendmentFile.name
                            } else {
                                const errData = await uploadRes.json().catch(() => ({}))
                                const errMsg = errData?.error || `HTTP ${uploadRes.status}`
                                console.warn('Amendment file upload failed:', errMsg)
                                showAlert('error', 'Upload Gagal', `Dokumen amandemen tidak berhasil diupload: ${errMsg}. Amandemen tetap tersimpan.`)
                            }
                        } catch (uploadErr) {
                            console.warn('Amendment upload error:', uploadErr)
                        } finally {
                            setAmendmentFileUploading(false)
                        }
                    }

                    await supabase.from('contract_history').insert([{
                        contract_id: editId,
                        action: actionTitle,
                        user_name: 'Admin',
                        details: actionDetails,
                        file_url: amendmentFileUrl,
                        file_name: amendmentFileName,
                    }])
                } catch (historyError) {
                    console.warn('History table not available:', historyError)
                }

                const updateMessage = vendorCreated
                    ? `Kontrak berhasil diperbarui! Vendor "${formData.vendorName}" juga telah ditambahkan ke Data Vendor.`
                    : 'Kontrak berhasil diperbarui!';

                // Update vendor status based on contracts
                await updateVendorContractStatus()

                showAlert('success', 'Berhasil', updateMessage)
            } else {
                // 1. Auto-sync vendor (create jika belum ada)
                let vendorCreated = false;
                if (formData.vendorName && formData.vendorName.trim() !== '') {
                    const syncResult = await autoSyncVendor(formData.vendorName);
                    if (syncResult.success) {
                        console.log('Vendor sync:', syncResult.message);
                        if (syncResult.data && !syncResult.data.exists) {
                            vendorCreated = true;
                            console.log('✅ Vendor baru dibuat:', formData.vendorName);
                        }
                    } else {
                        console.warn('Vendor sync warning:', (syncResult as any).error || 'Unknown error');
                    }
                }

                // 2. Insert New Contract
                const payload = {
                    name: formData.name,
                    nomor_surat: formData.invoiceNumber || formData.id || '',
                    perihal: formData.name || '',
                    tanggal_masuk: formData.startDate || new Date().toISOString().split('T')[0],
                    start_date: formData.startDate,
                    end_date: formData.endDate,
                    pengirim: formData.vendorName || '',
                    penerima: formData.recipient || '',
                    recipient: formData.recipient || '',
                    invoice_number: formData.invoiceNumber || '',
                    amount: formData.amount ? parseFloat(formData.amount) : 0,
                    budget_type: formData.budgetType || '',
                    contract_type: formData.contractType || '',
                    status: formData.status,
                    kategori: formData.category || '-',
                    location: formData.location || '',
                    vendor_name: formData.vendorName || '',
                    notes: formData.location || ''
                }

                const { error: insertError } = await supabase
                    .from('contracts')
                    .insert([payload])

                if (insertError) throw insertError

                // 2. Insert Initial History (skip if table doesn't exist)
                try {
                    await supabase.from('contract_history').insert([{
                        contract_id: formData.id,
                        action: 'Kontrak Dibuat',
                        user_name: 'Admin',
                        details: 'Kontrak baru ditambahkan ke sistem'
                    }])
                } catch (historyError) {
                    console.warn('History table not available:', historyError)
                }

                const successMessage = vendorCreated
                    ? `Kontrak berhasil ditambahkan! Vendor "${formData.vendorName}" juga telah ditambahkan ke Data Vendor.`
                    : 'Kontrak berhasil ditambahkan!';

                // Update vendor status based on contracts
                await updateVendorContractStatus()

                showAlert('success', 'Berhasil', successMessage)
            }

            // Refresh data
            fetchContracts()
            handleCloseModal()

        } catch (err) {
            console.error('Error saving contract:', err)
            console.error('Error details:', JSON.stringify(err, null, 2))

            const errorMessage = err.message || err.error_description || 'Terjadi kesalahan yang tidak diketahui.'

            // Handle duplicate key error
            if (errorMessage.includes('duplicate key') || err.code === '23505') {
                showAlert('error', 'Nomor Kontrak Sudah Ada', `Nomor kontrak "${formData.id}" sudah terdaftar dalam sistem. Silakan gunakan nomor kontrak yang berbeda.`)
            } else {
                showAlert('error', 'Gagal', 'Gagal menyimpan data: ' + errorMessage)
            }
        }
    }

    // History Detail Modal State
    const [selectedHistoryLog, setSelectedHistoryLog] = useState(null)
    const [showHistoryDetailModal, setShowHistoryDetailModal] = useState(false)

    const handleOpenHistoryDetail = (log) => {
        setSelectedHistoryLog(log)
        setShowHistoryDetailModal(true)
    }

    const handleCloseHistoryDetail = () => {
        setShowHistoryDetailModal(false)
        setSelectedHistoryLog(null)
    }

    const handleDelete = async (id) => {
        showConfirm('Hapus Kontrak', 'Apakah Anda yakin ingin menghapus kontrak ini? Data yang dihapus tidak dapat dikembalikan.', async () => {
            try {
                const { error } = await supabase
                    .from('contracts')
                    .delete()
                    .eq('id', id)

                if (error) throw error

                // Update vendor status based on contracts
                await updateVendorContractStatus()

                showAlert('success', 'Berhasil', 'Kontrak berhasil dihapus')
                fetchContracts() // Refresh data
            } catch (err) {
                console.error('Error deleting contract:', err)
                showAlert('error', 'Gagal', 'Gagal menghapus: ' + err.message)
            }
        })
    }

    const handleDeleteHistory = async (historyId, contractId) => {
        showConfirm('Hapus Riwayat', 'Apakah Anda yakin ingin menghapus riwayat ini?', async () => {
            try {
                const { error } = await supabase
                    .from('contract_history')
                    .delete()
                    .eq('id', historyId)

                if (error) throw error
                showAlert('success', 'Berhasil', 'Riwayat berhasil dihapus')

                // Refresh data - we need to refresh the selectedAsset as well
                // But fetchContracts updates 'assets', so we need to re-find the asset
                await fetchContracts()

                // Re-select the asset to update the view
                const updatedAssets = await supabase
                    .from('contracts')
                    .select(`*, history:contract_history(*)`)
                    .eq('id', contractId)
                    .single()

                if (updatedAssets.data) {
                    // Manually format to match our internal structure if needed, or better, just re-use the fetched list
                    // Since fetchContracts() updates 'assets' state, we can just find it from there? 
                    // Wait, fetchContracts is async and sets state. We can't immediately get the state.
                    // Better to fetch specific contract and update selectedAsset
                    const raw = updatedAssets.data
                    const formatted = {
                        id: raw.id || '',
                        name: raw.name || '',
                        vendorName: raw.vendor_name || '',
                        recipient: raw.recipient || '',
                        invoiceNumber: raw.invoice_number || '',
                        amount: raw.amount ? parseFloat(raw.amount) : 0,
                        budgetType: raw.budget_type || '',
                        contractType: raw.contract_type || '',
                        category: raw.category || '',
                        location: raw.location || '',
                        status: raw.status || 'Dalam Pekerjaan',
                        startDate: raw.start_date || '',
                        endDate: raw.end_date || '',
                        progress: raw.progress || 0,
                        history: raw.history || []
                    }
                    setSelectedAsset(formatted)
                }

            } catch (err) {
                console.error('Error deleting history:', err)
                showAlert('success', 'Gagal', 'Gagal menghapus riwayat: ' + err.message)
            }
        })
    }



    try {
        // Calculate no progress stats
        const noProgressCount = assets.filter(a => {
            const progressInfo = getProgressUpdateStatus(a.history || [], a.status)
            return progressInfo.status === 'no-progress' || progressInfo.status === 'stale'
        }).length

        return (
            <>
                {/* Deadline Alert Cards */}
                <div className="deadline-stats-container">
                    {/* Total Kontrak */}
                    <div className="deadline-stat-card">
                        <div className="deadline-stat-icon" style={{ background: '#eff6ff', color: '#3b82f6' }}>
                            <FileText size={24} />
                        </div>
                        <div className="deadline-stat-content">
                            <div className="deadline-stat-number">{assets.length}</div>
                            <div className="deadline-stat-label">Total Kontrak</div>
                        </div>
                    </div>

                    {/* Kontrak Aktif */}
                    <div className="deadline-stat-card">
                        <div className="deadline-stat-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
                            <Activity size={24} />
                        </div>
                        <div className="deadline-stat-content">
                            <div className="deadline-stat-number">
                                {assets.filter(a => a.status === 'Dalam Pekerjaan').length}
                            </div>
                            <div className="deadline-stat-label">Kontrak Aktif</div>
                        </div>
                    </div>

                    {/* Kontrak Terlambat */}
                    <div className="deadline-stat-card">
                        <div className="deadline-stat-icon" style={{ background: '#fef2f2', color: '#ef4444' }}>
                            <AlertCircle size={24} />
                        </div>
                        <div className="deadline-stat-content">
                            <div className="deadline-stat-number">{deadlineStats.overdue}</div>
                            <div className="deadline-stat-label">Kontrak Terlambat</div>
                        </div>
                    </div>

                    {/* Mendekati Deadline */}
                    <div className="deadline-stat-card">
                        <div className="deadline-stat-icon" style={{ background: '#fff7ed', color: '#f97316' }}>
                            <Clock size={24} />
                        </div>
                        <div className="deadline-stat-content">
                            <div className="deadline-stat-number">{deadlineStats.warning}</div>
                            <div className="deadline-stat-label">Mendekati Deadline</div>
                        </div>
                    </div>

                    {/* No Progress Update */}
                    <div className="deadline-stat-card">
                        <div className="deadline-stat-icon" style={{ background: '#fef3c7', color: '#ca8a04' }}>
                            <AlertTriangle size={24} />
                        </div>
                        <div className="deadline-stat-content">
                            <div className="deadline-stat-number">{noProgressCount}</div>
                            <div className="deadline-stat-label">Tanpa Update (1 Minggu)</div>
                        </div>
                    </div>
                </div>

                {/* Action Bar */}
                {/* Action Bar */}
                <div className="action-bar">
                    <div className="filter-section" style={{ flex: '1 1 500px' }}>
                        <select
                            value={filterStatus}
                            onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                            className="filter-select"
                            title="Pilih status kontrak"
                            style={{ display: 'block', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', background: 'white', minWidth: '160px' }}
                        >
                            <option value="all">Semua Status</option>
                            <option value="Dalam Pekerjaan">Dalam Pekerjaan</option>
                            <option value="Telah Diperiksa">Telah Diperiksa</option>
                            <option value="Terbayar">Terbayar</option>
                        </select>

                        <div style={{ position: 'relative', flex: '1 1 250px' }}>
                            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input
                                type="text"
                                placeholder="Cari Kontrak..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                className="search-input-table"
                                style={{ paddingLeft: '44px', width: '100%' }}
                            />
                        </div>

                        {/* Date Filter Placeholder - Styled to look intentional */}
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '6px 16px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            height: '46px',
                            justifyContent: 'center',
                            minWidth: '140px'
                        }}>
                            <label style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>Periode</label>
                            <span style={{ fontSize: '13px', color: '#334155', fontWeight: 500 }}>Semua Waktu</span>
                        </div>
                    </div>

                    <div className="action-buttons-group" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {searchTerm && (
                            <span className="search-result-count" style={{ marginRight: '8px' }}>
                                <b>{filteredAssets.length}</b> ditemukan
                            </span>
                        )}

                        <div className="column-selector" ref={columnSelectorRef}>
                            <button
                                className="column-selector-btn"
                                onClick={() => setShowColumnSelector(!showColumnSelector)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '12px 18px',
                                    background: 'white',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '12px',
                                    fontWeight: 600,
                                    fontSize: '14px',
                                    color: '#334155',
                                    cursor: 'pointer'
                                }}
                            >
                                <Eye size={18} /> <span className="hide-on-mobile">Kolom</span>
                            </button>
                            {showColumnSelector && (
                                <div className="column-dropdown">
                                    <div>
                                        <div className="column-dropdown-header">
                                            <span>Tampilkan Kolom</span>
                                        </div>
                                        <div className="column-options">
                                            <label className="column-option">
                                                <input
                                                    type="checkbox"
                                                    checked={columnVisibility.id}
                                                    onChange={() => toggleColumnVisibility('id')}
                                                />
                                                <span>Nomor Kontrak</span>
                                            </label>
                                            <label className="column-option">
                                                <input
                                                    type="checkbox"
                                                    checked={columnVisibility.name}
                                                    onChange={() => toggleColumnVisibility('name')}
                                                />
                                                <span>Nama Kontrak</span>
                                            </label>
                                            <label className="column-option">
                                                <input
                                                    type="checkbox"
                                                    checked={columnVisibility.vendorName}
                                                    onChange={() => toggleColumnVisibility('vendorName')}
                                                />
                                                <span>Nama Vendor</span>
                                            </label>
                                            <label className="column-option">
                                                <input
                                                    type="checkbox"
                                                    checked={columnVisibility.amount}
                                                    onChange={() => toggleColumnVisibility('amount')}
                                                />
                                                <span>Nilai Kontrak</span>
                                            </label>
                                            <label className="column-option">
                                                <input
                                                    type="checkbox"
                                                    checked={columnVisibility.budgetType}
                                                    onChange={() => toggleColumnVisibility('budgetType')}
                                                />
                                                <span>Tipe Anggaran</span>
                                            </label>
                                            <label className="column-option">
                                                <input
                                                    type="checkbox"
                                                    checked={columnVisibility.contractType}
                                                    onChange={() => toggleColumnVisibility('contractType')}
                                                />
                                                <span>Tipe Kontrak</span>
                                            </label>

                                            <label className="column-option">
                                                <input
                                                    type="checkbox"
                                                    checked={columnVisibility.location}
                                                    onChange={() => toggleColumnVisibility('location')}
                                                />
                                                <span>Lokasi</span>
                                            </label>
                                            <label className="column-option">
                                                <input
                                                    type="checkbox"
                                                    checked={columnVisibility.status}
                                                    onChange={() => toggleColumnVisibility('status')}
                                                />
                                                <span>Status</span>
                                            </label>
                                            <label className="column-option">
                                                <input
                                                    type="checkbox"
                                                    checked={columnVisibility.periode}
                                                    onChange={() => toggleColumnVisibility('periode')}
                                                />
                                                <span>Periode</span>
                                            </label>
                                            <label className="column-option">
                                                <input
                                                    type="checkbox"
                                                    checked={columnVisibility.startDate}
                                                    onChange={() => toggleColumnVisibility('startDate')}
                                                />
                                                <span>Tanggal Mulai</span>
                                            </label>
                                            <label className="column-option">
                                                <input
                                                    type="checkbox"
                                                    checked={columnVisibility.endDate}
                                                    onChange={() => toggleColumnVisibility('endDate')}
                                                />
                                                <span>Tanggal Selesai</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setShowCsvImportModal(true)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '12px 18px',
                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                border: 'none',
                                borderRadius: '12px',
                                fontWeight: 700,
                                fontSize: '14px',
                                color: 'white',
                                cursor: 'pointer',
                                boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)'
                            }}
                        >
                            <Upload size={18} /> <span className="hide-on-mobile">Import CSV</span>
                        </button>
                        <button className="btn-primary" onClick={handleOpenAddModal}>
                            <Plus size={18} /> <span className="hide-on-mobile">Kontrak Baru</span>
                        </button>
                    </div>
                </div>

                {/* Assets Table */}
                <div className="table-container">
                    <div className="table-header">
                        <h2>Daftar Kontrak</h2>
                    </div>

                    <div
                        className="table-scroll-wrapper"
                        ref={tableContainerRef}
                    >
                        <table className="assets-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '50px', padding: '16px 8px' }}></th>
                                    {columnVisibility.id && <th>Nomor Kontrak</th>}
                                    {columnVisibility.name && <th>Nama Kontrak</th>}
                                    {columnVisibility.vendorName && <th>Nama Vendor</th>}
                                    {columnVisibility.amount && <th>Nilai Kontrak</th>}
                                    {columnVisibility.budgetType && <th>Tipe Anggaran</th>}
                                    {columnVisibility.contractType && <th>Tipe Kontrak</th>}

                                    {columnVisibility.location && <th>Lokasi</th>}
                                    {columnVisibility.status && <th>Status</th>}
                                    {columnVisibility.periode && <th>Periode</th>}
                                    {columnVisibility.startDate && <th>Tanggal Mulai</th>}
                                    {columnVisibility.endDate && <th>Tanggal Selesai</th>}
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAssets.length > 0 ? (
                                    paginatedAssets.map((asset) => {
                                        const deadlineStatus = getDeadlineStatus(asset.endDate, asset.status)
                                        const progressInfo = getProgressUpdateStatus(asset.history || [], asset.status)
                                        const rowStyle = {
                                            background: expandedContractId === asset.id ? '#f8fafc' : undefined,
                                            borderLeft: deadlineStatus === 'overdue' ? '3px solid #ef4444' :
                                                deadlineStatus === 'warning' ? '3px solid #f59e0b' :
                                                    progressInfo.status !== 'normal' ? '3px solid #ca8a04' :
                                                        undefined
                                        }

                                        return (
                                            <Fragment key={asset.id}>
                                                <tr data-contract-id={asset.id} style={rowStyle}>
                                                    <td style={{ padding: '16px 8px', textAlign: 'center', width: '50px' }}>
                                                        <button
                                                            onClick={() => toggleExpand(asset.id)}
                                                            className="btn-icon"
                                                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
                                                            title={expandedContractId === asset.id ? 'Tutup detail' : 'Buka detail'}
                                                            aria-label={expandedContractId === asset.id ? 'Tutup detail kontrak' : 'Buka detail kontrak'}
                                                        >
                                                            {expandedContractId === asset.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                        </button>
                                                    </td>
                                                    {columnVisibility.id && (
                                                        <td className="asset-id">
                                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                                {/* Badge di atas nomor kontrak - Deadline Warning */}
                                                                {(deadlineStatus === 'overdue' || deadlineStatus === 'warning') && (
                                                                    <div style={{
                                                                        background: deadlineStatus === 'overdue' ? '#fee2e2' : '#fef3c7',
                                                                        color: deadlineStatus === 'overdue' ? '#dc2626' : '#d97706',
                                                                        padding: '4px 8px',
                                                                        fontSize: '10px',
                                                                        fontWeight: 600,
                                                                        borderRadius: '6px',
                                                                        borderLeft: `3px solid ${deadlineStatus === 'overdue' ? '#dc2626' : '#f59e0b'}`,
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px',
                                                                        width: 'fit-content'
                                                                    }}>
                                                                        {deadlineStatus === 'overdue' ? (
                                                                            <>
                                                                                <AlertOctagon size={12} />
                                                                                <span>Terlambat</span>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Clock size={12} />
                                                                                <span>Urgent</span>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {/* Badge Progress Warning - No Update in 1 Month */}
                                                                {progressInfo.status !== 'normal' && (
                                                                    <div className="progress-warning-badge">
                                                                        <AlertTriangle size={12} />
                                                                        <span>
                                                                            {progressInfo.status === 'no-progress'
                                                                                ? 'Belum Ada Progress'
                                                                                : `Tidak Update (${progressInfo.daysSinceUpdate} hari)`}
                                                                        </span>
                                                                    </div>
                                                                )}

                                                                {/* Nomor Kontrak */}
                                                                <span>{asset.invoiceNumber || asset.id}</span>
                                                            </div>
                                                        </td>
                                                    )}
                                                    {columnVisibility.name && <td className="asset-name">{asset.name}</td>}
                                                    {columnVisibility.vendorName && <td className="asset-vendor">{asset.vendorName}</td>}
                                                    {columnVisibility.amount && <td>Rp {formatCurrency(asset.amount)}</td>}
                                                    {columnVisibility.budgetType && (
                                                        <td>
                                                            <span className={`budget-badge budget-${asset.budgetType.toLowerCase()}`}>
                                                                {asset.budgetType}
                                                            </span>
                                                        </td>
                                                    )}
                                                    {columnVisibility.contractType && (
                                                        <td>
                                                            <span className={`contract-badge contract-${asset.contractType.toLowerCase()}`}>
                                                                {asset.contractType === 'NON-PO' ? 'NON-PO' : asset.contractType}
                                                            </span>
                                                        </td>
                                                    )}
                                                    {columnVisibility.location && <td>{asset.location}</td>}
                                                    {columnVisibility.status && (
                                                        <td>
                                                            <span className={`status-badge ${getBadgeClass(asset.status)}`}>
                                                                {asset.status}
                                                            </span>
                                                        </td>
                                                    )}
                                                    {columnVisibility.startDate && <td>{asset.startDate}</td>}
                                                    {columnVisibility.endDate && <td>{asset.endDate}</td>}
                                                    {columnVisibility.periode && (
                                                        <td style={{ whiteSpace: 'nowrap', fontSize: '13px' }}>
                                                            {asset.startDate && asset.endDate ? (
                                                                <span>
                                                                    {new Date(asset.startDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                                                                    {' - '}
                                                                    {new Date(asset.endDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })}
                                                                </span>
                                                            ) : '-'}
                                                        </td>
                                                    )}
                                                    <td>
                                                        <div className="action-buttons">
                                                            <button className="btn-icon btn-view" title="Lihat Detail" onClick={() => handleViewDetail(asset)}><Eye size={16} /></button>
                                                            <button className="btn-icon btn-edit" title="Edit" onClick={() => handleEdit(asset)}><Edit size={16} /></button>
                                                            <button className="btn-icon btn-delete" title="Hapus" onClick={() => handleDelete(asset.id)}><Trash2 size={16} /></button>
                                                            <button className="btn-icon btn-upload" title="Upload PDF" onClick={() => openUploadModal(asset.id)}><Upload size={16} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                                {expandedContractId === asset.id && (
                                                    <tr className="expanded-row-content">
                                                        <td colSpan={getVisibleColumnsCount() + 2} style={{ padding: '0 24px 24px 24px', background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                                            <div className="amendment-card-container" style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                                                    <div>
                                                                        <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                            <div style={{ background: '#eff6ff', padding: '8px', borderRadius: '8px', display: 'flex' }}>
                                                                                <FileText size={20} className="text-blue-500" style={{ color: '#3b82f6' }} />
                                                                            </div>
                                                                            Riwayat Amandemen & Perubahan
                                                                        </h4>
                                                                        <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#64748b', marginLeft: '48px' }}>
                                                                            Kelola riwayat perubahan dan amandemen untuk kontrak ini
                                                                        </p>

                                                                        {/* Progress Widget in Details */}
                                                                        <div style={{ marginTop: '16px', marginLeft: '48px', background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', maxWidth: '400px' }}>
                                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Progress Pekerjaan</span>
                                                                                <span style={{ fontSize: '14px', fontWeight: 700, color: asset.progress > 70 ? '#16a34a' : asset.progress > 30 ? '#d97706' : '#dc2626' }}>{asset.progress}% Selesai</span>
                                                                            </div>
                                                                            <div className="progress-bar-container" style={{ height: '10px', background: '#e2e8f0' }}>
                                                                                <div
                                                                                    className={`progress-bar-fill ${asset.progress < 30 ? 'low' : asset.progress < 70 ? 'medium' : 'high'}`}
                                                                                    style={{ width: `${asset.progress}%` }}
                                                                                ></div>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    <div style={{ display: 'flex', gap: '12px' }}>
                                                                        {detailTab === 'payment' ? (
                                                                            <button
                                                                                className="btn-primary"
                                                                                onClick={() => handleOpenPaymentModal(asset)}
                                                                                style={{ padding: '10px 18px', fontSize: '14px', background: '#10b981' }}
                                                                            >
                                                                                <Plus size={18} /> Tambah Tahapan
                                                                            </button>
                                                                        ) : (
                                                                            <>
                                                                                <button
                                                                                    className="btn-primary"
                                                                                    onClick={() => handleCreateProgressTracker(asset)}
                                                                                    style={{ padding: '10px 18px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}
                                                                                >
                                                                                    <Plus size={18} /> Buat Progress Tracker
                                                                                </button>
                                                                                <button
                                                                                    className="btn-primary"
                                                                                    onClick={() => handleCreateAmendment(asset)}
                                                                                    style={{ padding: '10px 18px', fontSize: '14px' }}
                                                                                >
                                                                                    <Plus size={18} /> Buat Amandemen
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* MAIN TABS (History vs Payment) */}
                                                                <div style={{ display: 'flex', gap: '20px', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
                                                                    <button
                                                                        onClick={() => setDetailTab('history')}
                                                                        style={{
                                                                            padding: '12px 4px',
                                                                            background: 'transparent',
                                                                            color: detailTab === 'history' ? '#3b82f6' : '#64748b',
                                                                            border: 'none',
                                                                            borderBottom: detailTab === 'history' ? '2px solid #3b82f6' : '2px solid transparent',
                                                                            fontSize: '15px',
                                                                            fontWeight: 600,
                                                                            cursor: 'pointer',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '8px'
                                                                        }}
                                                                    >
                                                                        <History size={18} /> Riwayat & Progress
                                                                    </button>
                                                                    <button
                                                                        onClick={() => { setDetailTab('payment'); fetchPaymentStages(asset.id); }}
                                                                        style={{
                                                                            padding: '12px 4px',
                                                                            background: 'transparent',
                                                                            color: detailTab === 'payment' ? '#be185d' : '#64748b', // Pink/Red for payment
                                                                            border: 'none',
                                                                            borderBottom: detailTab === 'payment' ? '2px solid #be185d' : '2px solid transparent',
                                                                            fontSize: '15px',
                                                                            fontWeight: 600,
                                                                            cursor: 'pointer',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '8px'
                                                                        }}
                                                                    >
                                                                        <FileCheck size={18} /> Tahapan Pembayaran
                                                                    </button>
                                                                </div>

                                                                {detailTab === 'payment' ? (
                                                                    /* PAYMENT STAGES TABLE */
                                                                    <div>
                                                                        {paymentStages.length === 0 ? (
                                                                            <div className="no-data" style={{ padding: '40px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                                                                                <div className="no-data-message">
                                                                                    <p>Belum ada tahapan pembayaran.</p>
                                                                                    <small>Tambahkan termin atau pembayaran sekaligus.</small>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <table className="assets-table" style={{ marginTop: '0' }}>
                                                                                <thead>
                                                                                    <tr>
                                                                                        <th style={{ background: '#f1f5f9' }}>Tahapan</th>
                                                                                        <th style={{ background: '#f1f5f9' }}>Persentase</th>
                                                                                        <th style={{ background: '#f1f5f9' }}>Nominal (Rp)</th>
                                                                                        <th style={{ background: '#f1f5f9' }}>Jatuh Tempo</th>
                                                                                        <th style={{ background: '#f1f5f9' }}>Status</th>
                                                                                        <th style={{ background: '#f1f5f9' }}>Aksi</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                    {paymentStages.map((stage) => (
                                                                                        <tr key={stage.id}>
                                                                                            <td style={{ fontWeight: 600 }}>{stage.name}</td>
                                                                                            <td>{stage.percentage}%</td>
                                                                                            <td>{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(stage.value || 0)}</td>
                                                                                            <td>{stage.due_date ? new Date(stage.due_date).toLocaleDateString('id-ID') : '-'}</td>
                                                                                            <td>
                                                                                                <span className={`status-badge ${stage.status === 'Paid' ? 'status-terbayar' : 'status-inactive'}`}>
                                                                                                    {stage.status === 'Paid' ? 'Lunas' : 'Belum Dibayar'}
                                                                                                </span>
                                                                                                {stage.paid_at && <div style={{ fontSize: '11px', marginTop: '4px', color: '#64748b' }}>{new Date(stage.paid_at).toLocaleDateString('id-ID')}</div>}
                                                                                            </td>
                                                                                            <td>
                                                                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                                                                    {stage.status !== 'Paid' && (
                                                                                                        <button
                                                                                                            onClick={() => handleMarkAsPaid(stage.id, asset.id)}
                                                                                                            className="btn-secondary"
                                                                                                            style={{ padding: '6px 12px', fontSize: '12px' }}
                                                                                                            title="Tandai Sudah Dibayar"
                                                                                                        >
                                                                                                            Tandai Bayar
                                                                                                        </button>
                                                                                                    )}
                                                                                                    <button
                                                                                                        onClick={() => handleDeletePaymentStage(stage.id, asset.id)}
                                                                                                        className="btn-icon-danger"
                                                                                                        style={{ background: '#fee2e2', border: 'none', borderRadius: '6px', padding: '6px', cursor: 'pointer', color: '#ef4444' }}
                                                                                                        title="Hapus Tahapan"
                                                                                                    >
                                                                                                        <Trash2 size={16} />
                                                                                                    </button>
                                                                                                </div>
                                                                                            </td>
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                                {/* Footer for Totals */}
                                                                                <tfoot>
                                                                                    <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                                                                                        <td colSpan={2} style={{ textAlign: 'right' }}>Total Terbayar:</td>
                                                                                        <td style={{ color: '#059669' }}>
                                                                                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(
                                                                                                paymentStages.filter(s => s.status === 'Paid').reduce((sum, s) => sum + Number(s.value || 0), 0)
                                                                                            )}
                                                                                        </td>
                                                                                        <td colSpan={3}></td>
                                                                                    </tr>
                                                                                </tfoot>
                                                                            </table>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    /* EXISTING HISTORY CONTENT WRAPPER */
                                                                    <>
                                                                        {/* Tab Filter (MOVED INSIDE) */}
                                                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
                                                                            <button
                                                                                onClick={() => setActiveHistoryTab('all')}
                                                                                style={{
                                                                                    padding: '8px 16px',
                                                                                    background: activeHistoryTab === 'all' ? '#3b82f6' : 'transparent',
                                                                                    color: activeHistoryTab === 'all' ? 'white' : '#64748b',
                                                                                    border: 'none',
                                                                                    borderRadius: '8px',
                                                                                    fontSize: '14px',
                                                                                    fontWeight: 600,
                                                                                    cursor: 'pointer',
                                                                                    transition: 'all 0.2s'
                                                                                }}
                                                                            >
                                                                                Semua
                                                                            </button>
                                                                            <button
                                                                                onClick={() => setActiveHistoryTab('amendments')}
                                                                                style={{
                                                                                    padding: '8px 16px',
                                                                                    background: activeHistoryTab === 'amendments' ? '#3b82f6' : 'transparent',
                                                                                    color: activeHistoryTab === 'amendments' ? 'white' : '#64748b',
                                                                                    border: 'none',
                                                                                    borderRadius: '8px',
                                                                                    fontSize: '14px',
                                                                                    fontWeight: 600,
                                                                                    cursor: 'pointer',
                                                                                    transition: 'all 0.2s'
                                                                                }}
                                                                            >
                                                                                Amandemen
                                                                            </button>
                                                                            <button
                                                                                onClick={() => setActiveHistoryTab('progress')}
                                                                                style={{
                                                                                    padding: '8px 16px',
                                                                                    background: activeHistoryTab === 'progress' ? '#3b82f6' : 'transparent',
                                                                                    color: activeHistoryTab === 'progress' ? 'white' : '#64748b',
                                                                                    border: 'none',
                                                                                    borderRadius: '8px',
                                                                                    fontSize: '14px',
                                                                                    fontWeight: 600,
                                                                                    cursor: 'pointer',
                                                                                    transition: 'all 0.2s'
                                                                                }}
                                                                            >
                                                                                Progress Tracker
                                                                            </button>
                                                                        </div>

                                                                        <div className="amendment-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                                            {
                                                                                (() => {
                                                                                    let filteredHistory = asset.history || [];
                                                                                    if (activeHistoryTab === 'amendments') {
                                                                                        filteredHistory = filteredHistory.filter(h => h && h.action && h.action.includes('Amandemen'));
                                                                                    } else if (activeHistoryTab === 'progress') {
                                                                                        filteredHistory = filteredHistory.filter(h => h && h.action && h.action.includes('Progress Tracker'));
                                                                                    }
                                                                                    if (filteredHistory.length > 0) {
                                                                                        // Show most recent first (history already sorted DESC from DB)
                                                                                        return filteredHistory.map((log, idx) => (
                                                                                            <div key={log.id || `${log.date}-${idx}`} className="amendment-item" style={{ display: 'flex', gap: '20px', padding: '16px', borderRadius: '12px', border: '1px solid #f1f5f9', background: '#fff', transition: 'all 0.2s', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                                                                                                <div style={{ minWidth: '140px', fontSize: '13px', color: '#64748b', borderRight: '1px solid #f1f5f9', paddingRight: '16px' }}>
                                                                                                    <div style={{ fontWeight: 600, color: '#334155', fontSize: '14px' }}>{log.date}</div>
                                                                                                    <div style={{ fontSize: '12px', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                                                        <div style={{ width: '20px', height: '20px', background: '#f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '10px', color: '#64748b' }}>
                                                                                                            {(log.user || 'Admin').charAt(0).toUpperCase()}
                                                                                                        </div>
                                                                                                        {log.user || 'Admin'}
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div style={{ flex: 1 }}>
                                                                                                    <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '8px', fontSize: '15px' }}>{log.action}</div>
                                                                                                    <div style={{ fontSize: '14px', color: '#475569', lineHeight: '1.6', background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                                                                                                        {/* Simple rendering of details, can be enhanced like in modal */}
                                                                                                        {(log.details || '').split('Perubahan:').map((part, i) => (
                                                                                                            <div key={i} style={{ marginBottom: i === 0 ? '4px' : '0' }}>
                                                                                                                {i === 1 ? (
                                                                                                                    <div>
                                                                                                                        <span style={{ fontWeight: 600, color: '#334155' }}>Perubahan: </span>
                                                                                                                        {part}
                                                                                                                    </div>
                                                                                                                ) : part}
                                                                                                            </div>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: '8px' }}>
                                                                                                    {/* Show file download button ONLY if file exists */}
                                                                                                    {log.file_url ? (
                                                                                                        <a
                                                                                                            href={log.file_url}
                                                                                                            target="_blank"
                                                                                                            rel="noopener noreferrer"
                                                                                                            style={{
                                                                                                                fontSize: '12px',
                                                                                                                padding: '6px 12px',
                                                                                                                background: '#dcfce7',
                                                                                                                color: '#16a34a',
                                                                                                                borderRadius: '20px',
                                                                                                                fontWeight: 600,
                                                                                                                border: '1px solid #bbf7d0',
                                                                                                                textDecoration: 'none',
                                                                                                                display: 'inline-flex',
                                                                                                                alignItems: 'center',
                                                                                                                gap: '6px'
                                                                                                            }}
                                                                                                        >
                                                                                                            <FileText size={14} />
                                                                                                            Dokumen Tersimpan
                                                                                                        </a>
                                                                                                    ) : null}
                                                                                                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                                                                                        <button
                                                                                                            onClick={() => handleOpenHistoryDetail(log)}
                                                                                                            style={{ fontSize: '12px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                                                                                                            title="Lihat detail riwayat"
                                                                                                        >
                                                                                                            Lihat Detail
                                                                                                        </button>
                                                                                                        {log.id && (
                                                                                                            <button
                                                                                                                onClick={() => handleDeleteHistory(log.id, asset.id)}
                                                                                                                title="Hapus Riyawat"
                                                                                                                style={{
                                                                                                                    color: '#ef4444',
                                                                                                                    background: '#fee2e2',
                                                                                                                    border: 'none',
                                                                                                                    borderRadius: '6px',
                                                                                                                    padding: '6px',
                                                                                                                    cursor: 'pointer',
                                                                                                                    display: 'flex',
                                                                                                                    alignItems: 'center',
                                                                                                                    justifyContent: 'center',
                                                                                                                    transition: 'all 0.2s'
                                                                                                                }}
                                                                                                            >
                                                                                                                <Trash2 size={16} />
                                                                                                            </button>
                                                                                                        )}
                                                                                                    </div>
                                                                                                </div>
                                                                                            </div>
                                                                                        ));
                                                                                    } else {
                                                                                        return (
                                                                                            <div style={{ textAlign: 'center', padding: '40px 24px', color: '#94a3b8', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                                                                                                <div style={{ display: 'inline-flex', padding: '16px', background: '#f1f5f9', borderRadius: '50%', marginBottom: '16px' }}>
                                                                                                    <History size={32} style={{ opacity: 0.5 }} />
                                                                                                </div>
                                                                                                <p style={{ margin: 0, fontWeight: 500 }}>
                                                                                                    {activeHistoryTab === 'amendments' ? 'Belum ada amandemen' : activeHistoryTab === 'progress' ? 'Belum ada progress tracker' : 'Belum ada riwayat'}
                                                                                                </p>
                                                                                                <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.8 }}>
                                                                                                    {activeHistoryTab === 'amendments' ? 'Klik tombol "Buat Amandemen" untuk memulai revisi kontrak.' : activeHistoryTab === 'progress' ? 'Klik tombol "Buat Progress Tracker" untuk menambahkan progress.' : 'Klik tombol di atas untuk menambahkan riwayat.'}
                                                                                                </p>
                                                                                            </div>
                                                                                        );
                                                                                    }
                                                                                })()
                                                                            }
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                                }
                                            </Fragment >
                                        )
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={getVisibleColumnsCount() + 1} className="no-data">
                                            <div className="no-data-message">
                                                <span className="no-data-icon"><Search size={48} /></span>
                                                <p>Tidak ada kontrak yang ditemukan</p>
                                                <small>Coba gunakan kata kunci yang berbeda atau ubah filter status</small>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody >
                        </table >
                    </div>
                </div >

                {/* Pagination */}
                {
                    filteredAssets.length > 0 && (
                        <div className="table-pagination">
                            <span className="pagination-info">
                                Menampilkan {Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredAssets.length)}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredAssets.length)} dari {filteredAssets.length} data
                            </span>
                            <div className="pagination-controls">
                                <button
                                    className={`pagination-btn${currentPage === 1 ? ' disabled-btn' : ''}`}
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    style={{ cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    ‹ Sebelumnya
                                </button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                                    .reduce<(number | string)[]>((acc, page, idx, arr) => {
                                        if (idx > 0 && (page as number) - (arr[idx - 1] as number) > 1) acc.push('...');
                                        acc.push(page);
                                        return acc;
                                    }, [])
                                    .map((page, idx) =>
                                        page === '...' ? (
                                            <span key={`ellipsis-${idx}`} className="pagination-btn" style={{ cursor: 'default' }}>…</span>
                                        ) : (
                                            <button
                                                key={page}
                                                className={`pagination-btn${currentPage === page ? ' active' : ''}`}
                                                onClick={() => setCurrentPage(page as number)}
                                            >
                                                {page}
                                            </button>
                                        )
                                    )
                                }
                                <button
                                    className={`pagination-btn${currentPage === totalPages ? ' disabled-btn' : ''}`}
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    style={{ cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    Selanjutnya ›
                                </button>
                            </div>
                        </div>
                    )
                }

                {/* Modal Detail Kontrak */}
                {
                    showDetailModal && selectedAsset && (
                        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
                            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h2>Detail Kontrak</h2>
                                    <button className="modal-close" onClick={() => setShowDetailModal(false)} title="Tutup modal" aria-label="Tutup modal detail kontrak">✕</button>
                                </div>
                                <div className="modal-body">
                                    <div className="detail-section">
                                        <h3 className="detail-section-title">
                                            <FileText size={20} /> Informasi Pekerjaan
                                        </h3>

                                        <div className="detail-grid">
                                            <div className="detail-item">
                                                <label className="detail-label">Nomor Kontrak</label>
                                                <div className="detail-value">{selectedAsset.invoiceNumber || selectedAsset.id}</div>
                                            </div>
                                            <div className="detail-item">
                                                <label className="detail-label">Status Saat Ini</label>
                                                <div>
                                                    <span className={`status-badge ${getBadgeClass(selectedAsset.status)}`}>
                                                        {selectedAsset.status}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="detail-item">
                                                <label className="detail-label">ID Kontrak</label>
                                                <div className="detail-value">{selectedAsset.invoiceNumber}</div>
                                            </div>
                                            <div className="detail-item">
                                                <label className="detail-label">Nilai Kontrak</label>
                                                <div className="detail-value">Rp {formatCurrency(selectedAsset.amount)}</div>
                                            </div>
                                            <div className="detail-item full-width">
                                                <label className="detail-label">Nama Pekerjaan / Kontrak</label>
                                                <div className="detail-value detail-value-lg">{selectedAsset.name}</div>
                                            </div>
                                            <div className="detail-item full-width">
                                                <label className="detail-label">Pelaksana (Vendor)</label>
                                                <div className="detail-value">{selectedAsset.vendorName}</div>
                                            </div>
                                            <div className="detail-item full-width">
                                                <label className="detail-label">Ditujukan Kepada</label>
                                                <div className="detail-value">{selectedAsset.recipient}</div>
                                            </div>
                                        </div>

                                        <div className="time-range-title">
                                            <Calendar size={18} /> Rentang Waktu Pelaksanaan
                                        </div>
                                        <div className="time-range-container">
                                            <div className="time-box">
                                                <div className="time-label">Tanggal Mulai</div>
                                                <div className="time-value">{selectedAsset.startDate}</div>
                                            </div>
                                            <div className="time-arrow">
                                                <ArrowRight size={24} strokeWidth={1.5} />
                                            </div>
                                            <div className="time-box">
                                                <div className="time-label">Tanggal Selesai</div>
                                                <div className="time-value">{selectedAsset.endDate}</div>
                                            </div>
                                        </div>
                                        {selectedAsset.status?.toLowerCase() !== 'selesai' && selectedAsset.status?.toLowerCase() !== 'terbayar' && (
                                            <>
                                                <div className="time-remaining-info" style={{ marginTop: 8, fontWeight: 500, color: timeRemaining.includes('melewati') ? 'red' : '#219150' }}>
                                                    Sisa waktu: {timeRemaining}
                                                </div>
                                                {timeRemaining.includes('melewati') && (
                                                    <div className="deadline-notif" style={{ color: 'red', fontWeight: 700, marginTop: 4 }}>
                                                        ⚠️ Kontrak ini sudah melewati tenggat waktu!
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        <div className="detail-table-wrapper">
                                            <table className="detail-table">
                                                <tbody>
                                                    <tr>
                                                        <td>Tipe Anggaran</td>
                                                        <td><span className={`budget-badge budget-${selectedAsset.budgetType.toLowerCase()}`}>{selectedAsset.budgetType}</span></td>
                                                    </tr>
                                                    <tr>
                                                        <td>Tipe Kontrak</td>
                                                        <td><span className={`contract-badge contract-${selectedAsset.contractType.toLowerCase()}`}>{selectedAsset.contractType}</span></td>
                                                    </tr>
                                                    <tr>
                                                        <td>Kategori Aset</td>
                                                        <td>{selectedAsset.category}</td>
                                                    </tr>
                                                    <tr>
                                                        <td>Lokasi Pekerjaan</td>
                                                        <td>{selectedAsset.location}</td>
                                                    </tr>
                                                    <tr>
                                                        <td>Terakhir Diupdate</td>
                                                        <td>
                                                            <span style={{ fontSize: '14px', color: '#1e293b', fontWeight: 500 }}>
                                                                {selectedAsset.updatedAt ? new Date(selectedAsset.updatedAt).toLocaleString('id-ID', {
                                                                    year: 'numeric',
                                                                    month: 'long',
                                                                    day: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                }) : 'Belum ada update'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>

                                        <div className="history-section" style={{ marginTop: '24px', borderTop: '1px solid #eff2f5', paddingTop: '24px' }}>
                                            <h3 className="detail-section-title" style={{ marginBottom: '16px' }}>
                                                <Clock size={20} /> Riwayat Perubahan
                                            </h3>
                                            <div className="history-list">
                                                {selectedAsset.history && selectedAsset.history.length > 0 ? (
                                                    selectedAsset.history.filter(h => h && h.action).slice().reverse().map((log, index) => (
                                                        <div key={index} className="history-item" style={{ display: 'flex', gap: '16px', marginBottom: '16px', paddingLeft: '8px', borderLeft: '3px solid #e2e8f0' }}>
                                                            <div className="history-time" style={{ minWidth: '130px', color: '#64748b', fontSize: '13px', paddingTop: '2px' }}>
                                                                {log.date}
                                                            </div>
                                                            <div className="history-content">
                                                                <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '2px' }}>
                                                                    {log.action}
                                                                    <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: '12px', marginLeft: '6px' }}>
                                                                        • {log.user}
                                                                    </span>
                                                                </div>
                                                                {(() => {
                                                                    const details = log.details || '';
                                                                    let note = '';
                                                                    let changes = [];

                                                                    // Parse "Ket:"
                                                                    const ketMatch = details.match(/Ket:\s*(.*?)(?=\.?\s*Perubahan:|$)/);
                                                                    if (ketMatch) note = ketMatch[1];

                                                                    // Parse "Perubahan:"
                                                                    const changesMatch = details.match(/Perubahan:\s*(.*)/);
                                                                    if (changesMatch) {
                                                                        // Split by comma, but be careful of commas inside values? 
                                                                        // Assuming our generator uses ", " to separate fields.
                                                                        // A better split might be needed if values contain commas. 
                                                                        // complex regex: split by comma that is likely a separator (followed by space and Uppercase usually? no field names are varied)
                                                                        // For now simpler split:
                                                                        changes = changesMatch[1].split(', ').map(c => c.trim());
                                                                    } else if (!ketMatch && details) {
                                                                        // Fallback if no specific format
                                                                        note = details;
                                                                    }

                                                                    return (
                                                                        <div style={{ marginTop: '4px' }}>
                                                                            {note && (
                                                                                <div style={{
                                                                                    background: '#f1f5f9',
                                                                                    padding: '8px 12px',
                                                                                    borderRadius: '6px',
                                                                                    fontSize: '13px',
                                                                                    color: '#334155',
                                                                                    marginBottom: changes.length > 0 ? '8px' : '0',
                                                                                    display: 'inline-block',
                                                                                    border: '1px solid #e2e8f0'
                                                                                }}>
                                                                                    <span style={{ fontWeight: 600 }}>Catatan:</span> {note}
                                                                                </div>
                                                                            )}

                                                                            {changes.length > 0 && (
                                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                                    {changes.map((change, i) => {
                                                                                        // Highlight values: "Field: Old -> New"
                                                                                        const parts = change.split('➝');
                                                                                        if (parts.length === 2) {
                                                                                            const fieldPart = parts[0].split(':');
                                                                                            const fieldName = fieldPart[0].trim();
                                                                                            const oldValue = fieldPart[1] ? fieldPart[1].trim() : '';
                                                                                            const newValue = parts[1].trim();
                                                                                            return (
                                                                                                <div key={i} style={{ fontSize: '13.5px', color: '#475569', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                                                                                                    <span style={{ minWidth: '8px', marginRight: '8px', color: '#cbd5e1' }}>•</span>
                                                                                                    <span style={{ fontWeight: 500, marginRight: '6px', color: '#1e293b' }}>{fieldName}:</span>
                                                                                                    <span style={{ color: '#ef4444', textDecoration: 'line-through', marginRight: '6px', fontSize: '13px', background: '#fef2f2', padding: '0 4px', borderRadius: '4px' }}>{oldValue.replace(/^"|"$/g, '')}</span>
                                                                                                    <span style={{ color: '#cbd5e1', margin: '0 6px' }}>➝</span>
                                                                                                    <span style={{ color: '#22c55e', fontWeight: 600, background: '#f0fdf4', padding: '0 4px', borderRadius: '4px' }}>{newValue.replace(/^"|"$/g, '')}</span>
                                                                                                </div>
                                                                                            )
                                                                                        }
                                                                                        return (
                                                                                            <div key={i} style={{ fontSize: '13.5px', color: '#475569', display: 'flex', alignItems: 'start' }}>
                                                                                                <span style={{ minWidth: '8px', marginRight: '8px', color: '#cbd5e1', marginTop: '4px' }}>•</span>
                                                                                                {change}
                                                                                            </div>
                                                                                        )
                                                                                    })}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )
                                                                })()}
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div style={{ color: '#94a3b8', fontStyle: 'italic', padding: '12px', background: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}>
                                                        Belum ada riwayat perubahan tercatat.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    )
                }

                {/* Modal Tambah Aset */}
                {
                    showModal && (
                        <div className="modal-overlay" onClick={handleCloseModal}>
                            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h2>{isEditing ? 'Edit Kontrak' : 'Tambah Kontrak Baru'}</h2>
                                    <button className="modal-close" onClick={handleCloseModal} title="Tutup modal" aria-label="Tutup modal form kontrak">✕</button>
                                </div>

                                <form onSubmit={handleSubmit} className="modal-form">
                                    <div className="form-grid">

                                        <div className="form-group">
                                            <label htmlFor="id">Nomor Kontrak <span className="required">*</span></label>
                                            <input
                                                type="text"
                                                id="id"
                                                name="id"
                                                value={formData.id}
                                                onChange={handleInputChange}
                                                placeholder="Contoh: KTR007"
                                                required
                                                readOnly={isEditing}
                                                style={isEditing ? { backgroundColor: '#f1f5f9', cursor: 'not-allowed' } : {}}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="name">Nama Kontrak <span className="required">*</span></label>
                                            <input
                                                type="text"
                                                id="name"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleInputChange}
                                                placeholder="Contoh: Pekerjaan Jasa Pembangunan Gardu Induk"
                                                required
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="vendorName">Nama Vendor <span className="required">*</span></label>
                                            <select
                                                id="vendorName"
                                                name="vendorName"
                                                value={formData.vendorName}
                                                onChange={handleInputChange}
                                                required
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #e2e8f0',
                                                    fontSize: '14px',
                                                    color: '#1e293b',
                                                    backgroundColor: 'white',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <option value="">-- Pilih Vendor --</option>
                                                {activeVendors.map((vendorName, index) => (
                                                    <option key={index} value={vendorName}>
                                                        {vendorName}
                                                    </option>
                                                ))}
                                            </select>
                                            <small style={{
                                                display: 'block',
                                                marginTop: '6px',
                                                fontSize: '12px',
                                                color: '#64748b'
                                            }}>
                                                Hanya menampilkan vendor dengan status Aktif atau Berkontrak
                                            </small>
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="recipient">Ditujukan Kepada <span className="required">*</span></label>
                                            <input
                                                type="text"
                                                id="recipient"
                                                name="recipient"
                                                value={formData.recipient}
                                                onChange={handleInputChange}
                                                placeholder="Contoh: Divisi Operasi PLN"
                                                required
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="invoiceNumber">ID Kontrak</label>
                                            <input
                                                type="text"
                                                id="invoiceNumber"
                                                name="invoiceNumber"
                                                value={formData.invoiceNumber}
                                                onChange={handleInputChange}
                                                placeholder="Contoh: K-2025-001"
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="amount">Nilai Kontrak (Rp) <span className="required">*</span></label>
                                            <input
                                                type="text"
                                                id="amount"
                                                name="amount"
                                                value={formData.amount ? formatCurrency(Number(formData.amount.toString().replace(/\D/g, ''))) : ''}
                                                onChange={(e) => {
                                                    // Hapus semua karakter non-digit
                                                    const numericValue = e.target.value.replace(/\D/g, '')
                                                    handleInputChange({
                                                        target: {
                                                            name: 'amount',
                                                            value: numericValue
                                                        }
                                                    })
                                                }}
                                                onBlur={(e) => {
                                                    // Pastikan value disimpan sebagai number
                                                    const numericValue = e.target.value.replace(/\D/g, '')
                                                    if (numericValue) {
                                                        handleInputChange({
                                                            target: {
                                                                name: 'amount',
                                                                value: numericValue
                                                            }
                                                        })
                                                    }
                                                }}
                                                placeholder="Contoh: 1500000000"
                                                required
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="budgetType">Tipe Anggaran <span className="required">*</span></label>
                                            <select
                                                id="budgetType"
                                                name="budgetType"
                                                value={formData.budgetType}
                                                onChange={handleInputChange}
                                                required
                                            >
                                                <option value="">Pilih Tipe Anggaran</option>
                                                <option value="AI">AI (Anggaran Investasi)</option>
                                                <option value="AO">AO (Anggaran Operasional)</option>
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="contractType">Tipe Kontrak <span className="required">*</span></label>
                                            <select
                                                id="contractType"
                                                name="contractType"
                                                value={formData.contractType}
                                                onChange={handleInputChange}
                                                required
                                            >
                                                <option value="">Pilih Tipe Kontrak</option>
                                                <option value="PJ">PJ (Perjanjian)</option>
                                                <option value="SPK">SPK (Surat Perintah Kerja)</option>
                                                <option value="NON-PO">NON-PO</option>
                                            </select>
                                        </div>



                                        <div className="form-group">
                                            <label htmlFor="location">Lokasi <span className="required">*</span></label>
                                            <input
                                                type="text"
                                                id="location"
                                                name="location"
                                                value={formData.location}
                                                onChange={handleInputChange}
                                                placeholder="Contoh: Gardu Induk Jakarta"
                                                required
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="status">Status <span className="required">*</span></label>
                                            <select
                                                id="status"
                                                name="status"
                                                value={formData.status}
                                                onChange={handleInputChange}
                                                required
                                            >
                                                <option value="Dalam Pekerjaan">Dalam Pekerjaan</option>
                                                <option value="Telah Diperiksa">Telah Diperiksa</option>
                                                <option value="Terbayar">Terbayar</option>
                                            </select>
                                        </div>

                                        {/* Tanggal hanya muncul di form tambah, di edit akan masuk ke amandemen */}
                                        {!isEditing && (
                                            <>
                                                <div className="form-group">
                                                    <label htmlFor="startDate">Tanggal Mulai <span className="required">*</span></label>
                                                    <input
                                                        type="date"
                                                        id="startDate"
                                                        name="startDate"
                                                        value={formData.startDate}
                                                        onChange={handleInputChange}
                                                        required
                                                    />
                                                </div>

                                                <div className="form-group">
                                                    <label htmlFor="endDate">Tanggal Selesai <span className="required">*</span></label>
                                                    <input
                                                        type="date"
                                                        id="endDate"
                                                        name="endDate"
                                                        value={formData.endDate}
                                                        onChange={handleInputChange}
                                                        required
                                                    />
                                                </div>
                                            </>
                                        )}

                                    </div>

                                    {isAmendment && (
                                        <div className="amendment-section" style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
                                                <div style={{ background: '#dbeafe', padding: '6px', borderRadius: '6px' }}>
                                                    <FileText size={18} color="#2563eb" />
                                                </div>
                                                <h4 style={{ margin: 0, fontSize: '16px', color: '#1e293b' }}>Detail Amandemen</h4>
                                            </div>

                                            <div className="amendment-fields" style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                                                <div className="form-group" style={{ marginBottom: '12px' }}>
                                                    <label style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px', display: 'block' }}>Nomor Surat Amandemen <span className="required">*</span></label>
                                                    <input
                                                        type="text"
                                                        name="amendmentDocNumber"
                                                        value={formData.amendmentDocNumber}
                                                        onChange={handleInputChange}
                                                        placeholder="Contoh: AMD/001/2025"
                                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                                        required={isAmendment}
                                                    />
                                                </div>

                                                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '12px' }}>
                                                    <div className="form-group" style={{ marginBottom: '0' }}>
                                                        <label style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px', display: 'block' }}>Tanggal Mulai <span className="required">*</span></label>
                                                        <input
                                                            type="date"
                                                            id="startDate"
                                                            name="startDate"
                                                            value={formData.startDate}
                                                            onChange={handleInputChange}
                                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                                            required={isAmendment}
                                                        />
                                                    </div>

                                                    <div className="form-group" style={{ marginBottom: '0' }}>
                                                        <label style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px', display: 'block' }}>Tanggal Selesai <span className="required">*</span></label>
                                                        <input
                                                            type="date"
                                                            id="endDate"
                                                            name="endDate"
                                                            value={formData.endDate}
                                                            onChange={handleInputChange}
                                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px' }}
                                                            required={isAmendment}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="form-group" style={{ marginBottom: '0' }}>
                                                    <label style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px', display: 'block' }}>Keterangan / Alasan Perubahan <span className="required">*</span></label>
                                                    <textarea
                                                        name="amendmentDescription"
                                                        value={formData.amendmentDescription}
                                                        onChange={handleInputChange}
                                                        placeholder="Jelaskan alasan amandemen (misal: Perpanjangan waktu, penambahan nilai, dll)"
                                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', minHeight: '80px', fontFamily: 'inherit' }}
                                                        required={isAmendment}
                                                    />
                                                </div>

                                                {/* Upload dokumen amandemen (opsional) */}
                                                <div className="form-group" style={{ marginTop: '12px', marginBottom: '0' }}>
                                                    <label style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px', display: 'block' }}>Dokumen Amandemen (Opsional)</label>
                                                    <div
                                                        onClick={() => document.getElementById('amendmentFileInput')?.click()}
                                                        style={{
                                                            border: '2px dashed #cbd5e1', borderRadius: '8px', padding: '14px 16px',
                                                            textAlign: 'center', cursor: 'pointer', background: amendmentFile ? '#f0fdf4' : '#f8fafc',
                                                            borderColor: amendmentFile ? '#86efac' : '#cbd5e1', transition: 'all 0.2s'
                                                        }}
                                                    >
                                                        {amendmentFile ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                                <FileText size={16} color="#16a34a" />
                                                                <span style={{ fontWeight: 600, color: '#16a34a', fontSize: '13px' }}>{amendmentFile.name}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); setAmendmentFile(null); }}
                                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', marginLeft: '4px', padding: 0 }}
                                                                >✕</button>
                                                            </div>
                                                        ) : (
                                                            <div style={{ color: '#94a3b8', fontSize: '13px' }}>
                                                                <Upload size={15} style={{ marginBottom: '2px' }} />
                                                                <div>Klik untuk upload file PDF amandemen</div>
                                                                <div style={{ fontSize: '11px', marginTop: '2px' }}>Maksimal 50MB</div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <input
                                                        id="amendmentFileInput"
                                                        type="file"
                                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                                        style={{ display: 'none' }}
                                                        onChange={(e) => {
                                                            const f = e.target.files?.[0]
                                                            if (f && f.size <= 50 * 1024 * 1024) {
                                                                setAmendmentFile(f)
                                                            } else if (f) {
                                                                showAlert('error', 'Error', 'Ukuran file maksimal 50MB')
                                                            }
                                                            e.target.value = ''
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                        </div>
                                    )}

                                    <div className="modal-modern-footer">
                                        <button type="button" className="btn-modern-cancel" onClick={handleCloseModal}>
                                            Batal
                                        </button>
                                        <button type="submit" className="btn-modern-submit">
                                            <Save size={18} /> {isAmendment ? 'Simpan Amandemen' : 'Simpan Kontrak'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }

                {/* Modal Upload Dokumen Kontrak */}
                {
                    showUploadModal && (
                        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
                            <div className="modal-upload-content" onClick={e => e.stopPropagation()}>
                                <div className="modal-upload-title">Upload Dokumen Kontrak</div>
                                <input
                                    className="modal-upload-input"
                                    type="file"
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                    placeholder="Pilih file dokumen"
                                    onChange={e => setSelectedFile(e.target.files[0])}
                                />
                                <button
                                    onClick={handleUpload}
                                    disabled={!selectedFile || uploading}
                                    className="modal-upload-btn"
                                >
                                    {uploading ? 'Uploading...' : 'Upload'}
                                </button>
                                {uploadError && <div className="modal-upload-status" style={{ color: 'red' }}>{uploadError}</div>}
                                {uploadSuccess && <div className="modal-upload-status" style={{ color: 'green' }}>{uploadSuccess}</div>}
                            </div>
                        </div>
                    )
                }

                {/* Confirm Amendment Modal */}
                {
                    showConfirmModal && (
                        <div className="modal-overlay" style={{ zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowConfirmModal(false)}>
                            <div
                                className="bg-white rounded-2xl p-6 shadow-2xl max-w-md w-full mx-4 transform transition-all scale-100"
                                style={{ maxWidth: '420px', background: 'white', borderRadius: '16px', padding: '24px', animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
                                onClick={e => e.stopPropagation()}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                                    <div style={{
                                        width: '64px', height: '64px', borderRadius: '50%', background: '#fff7ed',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px',
                                        border: '6px solid #ffedd5'
                                    }}>
                                        <AlertTriangle size={32} color="#f97316" />
                                    </div>
                                    <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 700, color: '#111827' }}>
                                        Konfirmasi Amandemen
                                    </h3>
                                    <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#6b7280', lineHeight: '1.5' }}>
                                        Apakah Anda yakin ingin membuat <strong>Amandemen ke-{pendingAmendment?.nextAmendmentNum}</strong> untuk kontrak ini?
                                        <br /><br />
                                        Tindakan ini akan membuka editor kontrak dalam mode amandemen.
                                    </p>
                                    <div style={{ display: 'flex', gap: '12px', width: '100%', justifyContent: 'flex-end', marginTop: '8px' }}>
                                        <button
                                            onClick={() => setShowConfirmModal(false)}
                                            className="btn-modern-cancel"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            onClick={handleConfirmAmendment}
                                            className="btn-modern-submit"
                                            style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', boxShadow: '0 4px 12px rgba(249, 115, 22, 0.2)' }}
                                        >
                                            Ya, Buat Amandemen
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* Progress Tracker Modal Modern Redesign */}
                {
                    showProgressModal && (
                        <div className="modal-overlay" onClick={() => setShowProgressModal(false)}>
                            <div className="modal-modern" onClick={(e) => e.stopPropagation()}>
                                <div className="modal-modern-header">
                                    <div className="modal-modern-title">
                                        <div className="modal-modern-icon">
                                            <Activity size={24} />
                                        </div>
                                        <h2>Buat Progress Tracker</h2>
                                    </div>
                                    <button className="modal-modern-close" onClick={() => setShowProgressModal(false)}>
                                        <X size={24} />
                                    </button>
                                </div>
                                <form onSubmit={handleProgressSubmit}>
                                    <div className="modal-modern-body">
                                        <div className="form-modern-group">
                                            <label htmlFor="progressTitle" className="form-modern-label">Judul Progress <span className="required">*</span></label>
                                            <input
                                                type="text"
                                                id="progressTitle"
                                                name="title"
                                                className="input-modern"
                                                value={progressFormData.title}
                                                onChange={(e) => setProgressFormData({ ...progressFormData, title: e.target.value })}
                                                placeholder="Contoh: Pengerjaan Tahap 1 Selesai"
                                                required
                                            />
                                        </div>

                                        <div className="form-modern-group">
                                            <label htmlFor="progressStatus" className="form-modern-label">Status <span className="required">*</span></label>
                                            <select
                                                id="progressStatus"
                                                name="status"
                                                className="select-modern"
                                                value={progressFormData.status}
                                                onChange={(e) => setProgressFormData({ ...progressFormData, status: e.target.value })}
                                                required
                                            >
                                                <option value="In Progress">In Progress</option>
                                                <option value="Completed">Completed</option>
                                                <option value="On Hold">On Hold</option>
                                                <option value="Delayed">Delayed</option>
                                            </select>
                                        </div>

                                        <div className="form-modern-group">
                                            <label className="form-modern-label">Persentase Selesai ({progressFormData.percentage}%)</label>
                                            <div className="range-slider-container">
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    step="5"
                                                    className="range-slider"
                                                    title="Pilih persentase penyelesaian"
                                                    value={progressFormData.percentage}
                                                    onChange={(e) => setProgressFormData({ ...progressFormData, percentage: parseInt(e.target.value) })}
                                                />
                                                <div className="percentage-display">{progressFormData.percentage}%</div>
                                            </div>
                                        </div>

                                        <div className="form-modern-group">
                                            <label className="form-modern-label">Tanggal Progress</label>
                                            <input
                                                type="date"
                                                className="input-modern"
                                                value={progressFormData.date}
                                                onChange={e => setProgressFormData({ ...progressFormData, date: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-modern-group">
                                            <label className="form-modern-label">Waktu Progress</label>
                                            <input
                                                type="time"
                                                className="input-modern"
                                                value={progressFormData.time}
                                                onChange={e => setProgressFormData({ ...progressFormData, time: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-modern-group">
                                            <label htmlFor="progressDescription" className="form-modern-label">Keterangan (Opsional)</label>
                                            <textarea
                                                id="progressDescription"
                                                name="description"
                                                className="textarea-modern"
                                                value={progressFormData.description}
                                                onChange={(e) => setProgressFormData({ ...progressFormData, description: e.target.value })}
                                                placeholder="Tambahkan keterangan lebih lanjut tentang progress ini..."
                                                rows={4}
                                            />
                                        </div>

                                        {/* File Upload - Optional */}
                                        <div className="form-modern-group">
                                            <label className="form-modern-label">Dokumen Pendukung (Opsional)</label>
                                            <div style={{
                                                border: '2px dashed #e2e8f0',
                                                borderRadius: '12px',
                                                padding: '20px',
                                                textAlign: 'center',
                                                background: progressFile ? '#f0fdf4' : '#f8fafc',
                                                transition: 'all 0.2s'
                                            }}>
                                                {progressFile ? (
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                                                        <FileText size={24} style={{ color: '#16a34a' }} />
                                                        <div style={{ textAlign: 'left' }}>
                                                            <div style={{ fontWeight: 600, color: '#16a34a' }}>{progressFile.name}</div>
                                                            <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                                {(progressFile.size / 1024 / 1024).toFixed(2)} MB
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setProgressFile(null)}
                                                            style={{
                                                                background: '#fee2e2',
                                                                color: '#dc2626',
                                                                border: 'none',
                                                                borderRadius: '8px',
                                                                padding: '8px',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <label style={{ cursor: 'pointer', display: 'block' }}>
                                                        <Upload size={32} style={{ color: '#94a3b8', marginBottom: '8px' }} />
                                                        <div style={{ color: '#64748b', marginBottom: '4px' }}>
                                                            Klik untuk upload dokumen
                                                        </div>
                                                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                                                            PDF, Word, Excel, Gambar — Maks. 50MB
                                                        </div>
                                                        <input
                                                            type="file"
                                                            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0]
                                                                if (file && file.size <= 50 * 1024 * 1024) {
                                                                    setProgressFile(file)
                                                                } else if (file) {
                                                                    showAlert('error', 'Error', 'Ukuran file maksimal 50MB')
                                                                }
                                                            }}
                                                            style={{ display: 'none' }}
                                                        />
                                                    </label>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="modal-modern-footer">
                                        <button type="button" className="btn-modern-cancel" onClick={() => { setShowProgressModal(false); setProgressFile(null); }}>
                                            Batal
                                        </button>
                                        <button type="submit" className="btn-modern-submit" disabled={progressFileUploading}>
                                            {progressFileUploading ? (
                                                <>Mengupload...</>
                                            ) : (
                                                <><Save size={18} /> Simpan Progress</>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }

                {/* Payment Stage Modal */}
                {
                    showPaymentModal && (
                        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
                            <div className="modal-modern" onClick={(e) => e.stopPropagation()}>
                                <div className="modal-modern-header">
                                    <div className="modal-modern-title">
                                        <div className="modal-modern-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>
                                            <FileCheck size={24} />
                                        </div>
                                        <h2>Tambah Tahapan Pembayaran (Termin)</h2>
                                    </div>
                                    <button className="modal-modern-close" onClick={() => setShowPaymentModal(false)}>
                                        <X size={24} />
                                    </button>
                                </div>
                                <form onSubmit={handlePaymentSubmit}>
                                    <div className="modal-modern-body">
                                        <div className="form-modern-group">
                                            <label className="form-modern-label">Mode Pembayaran</label>
                                            <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                                    <input
                                                        type="radio"
                                                        name="mode"
                                                        value="single"
                                                        checked={paymentMode === 'single'}
                                                        onChange={() => {
                                                            setPaymentMode('single');
                                                            setPaymentFormData(prev => ({
                                                                ...prev,
                                                                name: 'Pelunasan (100%)',
                                                                percentage: '100',
                                                                amount: prev.amount // Keep total
                                                            }))
                                                        }}
                                                    />
                                                    <span style={{ fontWeight: 500 }}>Sekaligus (100%)</span>
                                                </label>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                                    <input
                                                        type="radio"
                                                        name="mode"
                                                        value="termin"
                                                        checked={paymentMode === 'termin'}
                                                        onChange={() => {
                                                            setPaymentMode('termin');
                                                            setPaymentFormData(prev => {
                                                                const prevAmount = parseFloat(prev.amount) || 0;
                                                                return {
                                                                    ...prev,
                                                                    name: 'Termin 1 (DP)',
                                                                    percentage: '30', // Default DP
                                                                    amount: (prevAmount * 0.3).toString()
                                                                }
                                                            })
                                                        }}
                                                    />
                                                    <span style={{ fontWeight: 500 }}>Bertahap (Termin)</span>
                                                </label>
                                            </div>
                                        </div>

                                        <div className="form-modern-group">
                                            <label className="form-modern-label">Nama Tahapan <span className="required">*</span></label>
                                            <input
                                                type="text"
                                                className="input-modern"
                                                value={paymentFormData.name}
                                                onChange={(e) => setPaymentFormData({ ...paymentFormData, name: e.target.value })}
                                                placeholder="Masukkan nama tahapan pembayaran"
                                                required
                                            />
                                        </div>

                                        <div style={{ display: 'flex', gap: '16px' }}>
                                            <div className="form-modern-group" style={{ flex: 1 }}>
                                                <label className="form-modern-label">Persentase (%)</label>
                                                <input
                                                    type="number"
                                                    className="input-modern"
                                                    value={paymentFormData.percentage}
                                                    onChange={(e) => {
                                                        const pct = parseFloat(e.target.value) || 0;
                                                        // Calculate nominal automatically
                                                        const contract = assets.find(a => a.id === paymentFormData.contractId);
                                                        const contractAmount = contract ? Number(contract.amount) : 0;
                                                        const calculatedAmount = (contractAmount * pct) / 100;

                                                        setPaymentFormData({
                                                            ...paymentFormData,
                                                            percentage: pct.toString(),
                                                            amount: calculatedAmount.toString()
                                                        })
                                                    }}
                                                    title="Masukkan persentase pembayaran"
                                                    disabled={paymentMode === 'single'}
                                                />
                                            </div>
                                            <div className="form-modern-group" style={{ flex: 2 }}>
                                                <label className="form-modern-label">Nominal (Rp)</label>
                                                <input
                                                    type="number"
                                                    className="input-modern"
                                                    value={
                                                        paymentFormData.amount === '0' || paymentFormData.amount === '' || !paymentFormData.amount
                                                            ? ''
                                                            : paymentFormData.amount
                                                    }
                                                    onFocus={e => e.target.select()}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        const newAmount = val === '' ? 0 : parseFloat(val);

                                                        // Calculate percentage automatically
                                                        const contract = assets.find(a => a.id === paymentFormData.contractId);
                                                        const contractAmount = contract ? Number(contract.amount) : 0;
                                                        const calculatedPct = contractAmount > 0 ? (newAmount / contractAmount) * 100 : 0;

                                                        setPaymentFormData({
                                                            ...paymentFormData,
                                                            amount: val === '' ? '0' : newAmount.toString(),
                                                            percentage: parseFloat(calculatedPct.toFixed(2)).toString() // Limit decimals
                                                        });
                                                    }}
                                                    readOnly={paymentMode === 'single'}
                                                />
                                            </div>
                                        </div>

                                        <div className="form-modern-group">
                                            <label className="form-modern-label">Jatuh Tempo</label>
                                            <input
                                                type="date"
                                                className="input-modern"
                                                value={paymentFormData.dueDate}
                                                onChange={(e) => setPaymentFormData({ ...paymentFormData, dueDate: e.target.value })}
                                                title="Pilih tanggal jatuh tempo"
                                            />
                                        </div>
                                    </div>

                                    <div className="modal-modern-footer">
                                        <button type="button" className="btn-modern-cancel" onClick={() => setShowPaymentModal(false)}>
                                            Batal
                                        </button>
                                        {paymentError && (
                                            <div style={{ color: 'red', marginBottom: 8, fontWeight: 500 }}>{paymentError}</div>
                                        )}
                                        <button type="submit" className="btn-modern-submit" disabled={!!paymentError}>
                                            <Save size={18} /> Simpan Tahapan
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )
                }

                {/* Modal Detail Riwayat */}
                {
                    showHistoryDetailModal && selectedHistoryLog && (
                        <div style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0,0,0,0.5)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 2000
                        }}>
                            <div style={{
                                background: 'white',
                                borderRadius: '12px',
                                width: '600px',
                                maxWidth: '90%',
                                maxHeight: '80vh',
                                display: 'flex',
                                flexDirection: 'column',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                            }}>
                                <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <History size={20} /> Detail Riwayat
                                    </h3>
                                    <button onClick={handleCloseHistoryDetail} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b' }} aria-label="Tutup detail riwayat">
                                        <X size={24} />
                                    </button>
                                </div>

                                <div style={{ padding: '24px', overflowY: 'auto' }}>
                                    {(() => {
                                        // Extract progress date & time from details
                                        const details = selectedHistoryLog.details || '';
                                        let progressDateTime = '';
                                        const dateMatch = details.match(/Tanggal: ([0-9\-]+ [0-9:]+)/);
                                        if (dateMatch) progressDateTime = dateMatch[1];

                                        return (
                                            <>
                                                {/* Meta Info */}
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px', background: '#f8fafc', padding: '16px', borderRadius: '8px' }}>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Tanggal & Waktu</label>
                                                        <div style={{ fontWeight: 600, color: '#334155' }}>
                                                            {progressDateTime || selectedHistoryLog.date}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Dibuat Oleh</label>
                                                        <div style={{ fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <div style={{ width: '20px', height: '20px', background: '#e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
                                                                {(selectedHistoryLog.user || 'Admin').charAt(0).toUpperCase()}
                                                            </div>
                                                            {selectedHistoryLog.user || 'Admin'}
                                                        </div>
                                                    </div>
                                                    <div style={{ gridColumn: '1 / -1' }}>
                                                        <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Aksi</label>
                                                        <div style={{ fontWeight: 600, color: '#0f172a' }}>{selectedHistoryLog.action}</div>
                                                    </div>
                                                </div>

                                                {/* Changes Table */}
                                                {(() => {
                                                    const details = selectedHistoryLog.details || '';
                                                    let changes = [];
                                                    let note = '';

                                                    // Parse Note and Changes based on format
                                                    const ketMatch = details.match(/Ket:\s*(.*?)(?=\.?\s*Perubahan:|$)/);
                                                    if (ketMatch) note = ketMatch[1];
                                                    else note = details.split('Perubahan:')[0]; // Fallback

                                                    // Extract progress date & time if present
                                                    let progressDateTime = '';
                                                    const dateMatch = details.match(/Tanggal: ([0-9\-]+ [0-9:]+)/);
                                                    if (dateMatch) progressDateTime = dateMatch[1];

                                                    // Remove "Tanggal: ..." from note to avoid duplication
                                                    note = note.replace(/\s*Tanggal:\s*[0-9\-]+\s*[0-9:]+/g, '').trim();

                                                    const changesMatch = details.match(/Perubahan:\s*(.*)/);
                                                    if (changesMatch) {
                                                        changes = changesMatch[1].split('; ').map(c => c.trim()); // Use semicolon or handle comma better
                                                        if (changes.length === 1 && changes[0].includes(',')) {
                                                            changes = changesMatch[1].split(', ').map(c => c.trim());
                                                        }
                                                    }

                                                    return (
                                                        <>
                                                            {/* Note Section */}
                                                            {note && (
                                                                <div style={{ marginBottom: '24px' }}>
                                                                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Keterangan / Catatan</h4>
                                                                    <div style={{ padding: '12px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '6px', color: '#92400e', fontSize: '14px', lineHeight: '1.5' }}>
                                                                        {note}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Changes Table */}
                                                            {changes.length > 0 && (
                                                                <div>
                                                                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#475569', marginBottom: '12px' }}>Rincian Perubahan</h4>
                                                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                                                        <thead>
                                                                            <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                                                                                <th style={{ padding: '10px', border: '1px solid #e2e8f0', width: '30%', color: '#475569' }}>Data Terkait</th>
                                                                                <th style={{ padding: '10px', border: '1px solid #e2e8f0', width: '35%', color: '#475569' }}>Semula</th>
                                                                                <th style={{ padding: '10px', border: '1px solid #e2e8f0', width: '35%', color: '#475569' }}>Menjadi</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {changes.map((change, idx) => {
                                                                                const parts = change.split('➝');
                                                                                if (parts.length === 2) {
                                                                                    const fieldPart = parts[0].split(':');
                                                                                    const fieldName = fieldPart[0].trim();
                                                                                    const oldValue = fieldPart[1] ? fieldPart[1].trim().replace(/^"|"$/g, '') : '-';
                                                                                    const newValue = parts[1].trim().replace(/^"|"$/g, '');

                                                                                    return (
                                                                                        <tr key={idx}>
                                                                                            <td style={{ padding: '10px', border: '1px solid #e2e8f0', fontWeight: 500 }}>{fieldName}</td>
                                                                                            <td style={{ padding: '10px', border: '1px solid #e2e8f0', color: '#ef4444', backgroundColor: '#fef2f2' }}>{oldValue}</td>
                                                                                            <td style={{ padding: '10px', border: '1px solid #e2e8f0', color: '#16a34a', backgroundColor: '#f0fdf4', fontWeight: 600 }}>{newValue}</td>
                                                                                        </tr>
                                                                                    );
                                                                                } else {
                                                                                    return (
                                                                                        <tr key={idx}>
                                                                                            <td colSpan={3} style={{ padding: '10px', border: '1px solid #e2e8f0' }}>{change}</td>
                                                                                        </tr>
                                                                                    )
                                                                                }
                                                                            })}
                                                                        </tbody>
                                                                    </table>
                                                                </div>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </>
                                        );
                                    })()}
                                </div>

                                <div style={{ padding: '20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                    {/* Show download button only if file exists */}
                                    {selectedHistoryLog.file_url ? (
                                        <a
                                            href={selectedHistoryLog.file_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '8px',
                                                padding: '10px 16px', borderRadius: '8px', border: '1px solid #bbf7d0', background: '#dcfce7', color: '#16a34a', fontWeight: 600, cursor: 'pointer', textDecoration: 'none'
                                            }}
                                        >
                                            <FileText size={16} /> {selectedHistoryLog.file_name || 'Unduh Dokumen'}
                                        </a>
                                    ) : (
                                        <button
                                            disabled
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '8px',
                                                padding: '10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f1f5f9', color: '#94a3b8', fontWeight: 600, cursor: 'not-allowed'
                                            }}
                                        >
                                            <FileText size={16} /> Tidak Ada Dokumen
                                        </button>
                                    )}
                                    <button
                                        onClick={handleCloseHistoryDetail}
                                        className="btn-primary"
                                        style={{ padding: '10px 24px' }}
                                    >
                                        Tutup
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* --- GLOBAL CUSTOM MODALS --- */}

                {/* Modern Alert Modal */}
                {
                    alertState.show && (
                        <div className="modal-overlay" style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={closeAlert}>
                            <div
                                className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4"
                                style={{
                                    background: 'white',
                                    borderRadius: '16px',
                                    padding: '24px',
                                    maxWidth: '380px',
                                    animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                    textAlign: 'center'
                                }}
                                onClick={e => e.stopPropagation()}
                            >
                                <div style={{
                                    width: '60px', height: '60px', borderRadius: '50%', margin: '0 auto 16px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: alertState.type === 'success' ? '#def7ec' : alertState.type === 'error' ? '#fde8e8' : '#e1effe',
                                    color: alertState.type === 'success' ? '#057a55' : alertState.type === 'error' ? '#c81e1e' : '#1a56db'
                                }}>
                                    {alertState.type === 'success' && <CheckCircle size={32} />}
                                    {alertState.type === 'error' && <AlertCircle size={32} />}
                                    {alertState.type === 'info' && <Info size={32} />}
                                </div>

                                <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: '#1f2937' }}>
                                    {alertState.title}
                                </h3>

                                <p style={{ margin: '0 0 20px', fontSize: '14px', color: '#6b7280', lineHeight: 1.5 }}>
                                    {alertState.message}
                                </p>

                                <button
                                    onClick={closeAlert}
                                    style={{
                                        width: '100%', padding: '10px', borderRadius: '8px', border: 'none',
                                        fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                                        background: alertState.type === 'success' ? '#057a55' : alertState.type === 'error' ? '#c81e1e' : '#1a56db',
                                        color: 'white',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                    }}
                                >
                                    OK
                                </button>
                            </div>
                        </div>
                    )
                }

                {/* Modern Confirm Modal */}
                {
                    confirmState.show && (
                        <div className="modal-overlay" style={{ zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={closeConfirm}>
                            <div
                                className="bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4"
                                style={{
                                    background: 'white',
                                    borderRadius: '16px',
                                    padding: '24px',
                                    maxWidth: '400px',
                                    animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                    textAlign: 'center'
                                }}
                                onClick={e => e.stopPropagation()}
                            >
                                <div style={{
                                    width: '60px', height: '60px', borderRadius: '50%', margin: '0 auto 16px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: '#fde8e8', color: '#c81e1e'
                                }}>
                                    <AlertTriangle size={32} />
                                </div>

                                <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: '#1f2937' }}>
                                    {confirmState.title}
                                </h3>

                                <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#6b7280', lineHeight: 1.5 }}>
                                    {confirmState.message}
                                </p>

                                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                    <button
                                        onClick={closeConfirm}
                                        style={{
                                            padding: '10px 20px', borderRadius: '8px', border: '1px solid #d1d5db',
                                            fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                                            background: 'white', color: '#374151'
                                        }}
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (confirmState.action) confirmState.action();
                                            closeConfirm();
                                        }}
                                        style={{
                                            padding: '10px 20px', borderRadius: '8px', border: 'none',
                                            fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                                            background: '#c81e1e', color: 'white',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                        }}
                                    >
                                        Ya, Lanjutkan
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* CSV Import Modal */}
                <CsvImportModal
                    isOpen={showCsvImportModal}
                    onClose={() => setShowCsvImportModal(false)}
                    onImportComplete={() => fetchContracts()}
                    showAlert={showAlert}
                />
            </>
        )

    } catch (err) {
        // Fallback UI if error occurs
        return (
            <div style={{ padding: 40, color: 'red', fontSize: 18 }}>
                <b>Terjadi error saat render halaman Manajemen Kontrak:</b>
                <pre style={{ color: 'black', background: '#fff', padding: 16, borderRadius: 8, marginTop: 16 }}>{String(err)}</pre>
            </div>
        )
    }
}



export default ManajemenAset