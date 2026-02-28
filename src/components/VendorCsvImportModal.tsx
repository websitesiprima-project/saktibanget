'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { Upload, X, FileText, AlertCircle, CheckCircle, Download, Loader2, Clock, Trash2, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import Papa from 'papaparse'
import { supabase } from '@/lib/supabaseClient'

// ============================================================
// Mapping CSV "MONITORING 2025 - DATA VENDOR" → Database vendors
// ============================================================
// File CSV memiliki 2-3 baris header (baris 1 = nomor kolom, baris 2 = header utama,
// baris 3 = sub-header untuk RATING KEUANGAN & AKTA).
// Data vendor dimulai setelah header rows.

interface MappedVendor {
    id: string
    nama: string
    alamat: string | null
    telepon: string | null
    email: string | null
    nama_pimpinan: string | null
    jabatan: string | null
    npwp: string | null
    status: string
    bank_pembayaran: string | null
    no_rekening: string | null
    nama_rekening: string | null
    notes: string | null
    _csvRowIndex?: number
    _warnings?: string[]
}

// ============================================================
// Import History (localStorage)
// ============================================================
interface ImportLogEntry {
    id: string
    timestamp: string
    fileName: string
    totalParsed: number
    success: number
    failed: number
    skipped: number
    updated: number
    errors: string[]
}

const VENDOR_IMPORT_HISTORY_KEY = 'vlaas_vendor_import_history'
const MAX_HISTORY = 50

function loadImportHistory(): ImportLogEntry[] {
    try {
        const raw = localStorage.getItem(VENDOR_IMPORT_HISTORY_KEY)
        if (!raw) return []
        return JSON.parse(raw) as ImportLogEntry[]
    } catch {
        return []
    }
}

function saveImportLog(entry: ImportLogEntry) {
    try {
        const history = loadImportHistory()
        history.unshift(entry)
        if (history.length > MAX_HISTORY) history.length = MAX_HISTORY
        localStorage.setItem(VENDOR_IMPORT_HISTORY_KEY, JSON.stringify(history))
    } catch {
        console.warn('Gagal menyimpan riwayat import vendor')
    }
}

function clearImportHistory() {
    try {
        localStorage.removeItem(VENDOR_IMPORT_HISTORY_KEY)
    } catch { }
}

// ============================================================
// Parse & normalize helpers
// ============================================================

// Normalize header text: trim, uppercase, remove extra spaces
function normalizeHeader(header: string): string {
    return header.replace(/\s+/g, ' ').trim().toUpperCase()
}

// Clean account number: remove "(IDR)" suffix and extra spaces
function cleanAccountNumber(value: string): string {
    if (!value) return ''
    return value.replace(/\s*\(IDR\)\s*/gi, '').trim()
}

// ============================================================
// Find the header row and build column mapping
// ============================================================
// The vendor CSV has a complex multi-row header:
// Row 1: Column numbers (,1,2,3,4,,,5,6,7,8,9,10...)
// Row 2: Main headers (No, Nama Vendor, NAMA PIMPINAN, Jabatan, Alamat, RATING KEUANGAN,,Bank Pembayaran,...)
// Row 3: Sub-headers (,,,,, RATING D&B, EXPIRED DATE,,,,,,, LEVEL CSMS, NO, TANGGAL, NOTARIS, ...)
//
// We need to merge row 2 and row 3 to get final column names for ambiguous columns.

interface ColumnMapping {
    namaVendor: number
    namaPimpinan: number
    jabatan: number
    alamat: number
    ratingDB: number
    ratingExpiredDate: number
    bankPembayaran: number
    noRekening: number
    namaRekening: number
    alamatEmail: number
    contactPerson: number
    levelCsms: number
    // AKTA PENDIRIAN sub-columns
    aktaPendirianNo: number
    aktaPendirianTanggal: number
    aktaPendirianNotaris: number
    aktaPendirianAlamatNotaris: number
    aktaPendirianNomorAhu: number
    // AKTA PERUBAHAN TERAKHIR sub-columns
    aktaPerubahanNo: number
    aktaPerubahanTanggal: number
    aktaPerubahanNotaris: number
    aktaPerubahanAlamatNotaris: number
    aktaPerubahanNomorAhu: number
}

function findHeaderAndBuildMapping(rows: string[][]): { headerRowCount: number, mapping: ColumnMapping | null, dataStartRow: number } {
    // Strategy: Look for a row containing "Nama Vendor" or "NAMA VENDOR"
    let mainHeaderRow = -1

    for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const rowJoined = rows[i].join('|').toUpperCase()
        if (rowJoined.includes('NAMA VENDOR') && (rowJoined.includes('ALAMAT') || rowJoined.includes('BANK'))) {
            mainHeaderRow = i
            break
        }
    }

    if (mainHeaderRow === -1) {
        // Fallback: try to find row with "No" as first non-empty cell and at least 5 columns
        for (let i = 0; i < Math.min(rows.length, 10); i++) {
            const firstCell = (rows[i][0] || '').trim().toUpperCase()
            if ((firstCell === 'NO' || firstCell === 'NO.') && rows[i].length >= 5) {
                mainHeaderRow = i
                break
            }
        }
    }

    if (mainHeaderRow === -1) return { headerRowCount: 0, mapping: null, dataStartRow: 0 }

    const mainHeaders = rows[mainHeaderRow].map(h => normalizeHeader(h || ''))
    // Check if next row is sub-headers (contains RATING D&B, or NO/TANGGAL under AKTA)
    let subHeaders: string[] = []
    let dataStartRow = mainHeaderRow + 1
    if (mainHeaderRow + 1 < rows.length) {
        const nextRow = rows[mainHeaderRow + 1].map(h => normalizeHeader(h || ''))
        const nextJoined = nextRow.join('|')
        if (nextJoined.includes('RATING') || nextJoined.includes('D&B') || nextJoined.includes('EXPIRED') || nextJoined.includes('NOTARIS')) {
            subHeaders = nextRow
            dataStartRow = mainHeaderRow + 2
        }
    }

    // Build column index mapping by searching main headers
    const findCol = (keywords: string[], startAfter: number = -1): number => {
        for (let i = startAfter + 1; i < mainHeaders.length; i++) {
            const h = mainHeaders[i]
            if (keywords.every(k => h.includes(k))) return i
        }
        // Also search sub-headers
        if (subHeaders.length > 0) {
            for (let i = startAfter + 1; i < subHeaders.length; i++) {
                if (keywords.every(k => subHeaders[i].includes(k))) return i
            }
        }
        return -1
    }

    const namaVendor = findCol(['NAMA VENDOR'])
    const namaPimpinan = findCol(['NAMA PIMPINAN'])
    const jabatan = findCol(['JABATAN'])
    const alamat = findCol(['ALAMAT'], jabatan) // Alamat comes after Jabatan
    // If alamat was found before jabatan (wrong match for ALAMAT NOTARIS), search again
    const alamatIdx = (() => {
        // "ALAMAT" as main header (not ALAMAT NOTARIS, not ALAMAT EMAIL)
        for (let i = 0; i < mainHeaders.length; i++) {
            if (mainHeaders[i] === 'ALAMAT') return i
        }
        return findCol(['ALAMAT'], jabatan)
    })()

    // RATING KEUANGAN spans 2 sub-columns: RATING D&B, EXPIRED DATE
    const ratingKeuanganStart = findCol(['RATING KEUANGAN'])
    let ratingDB = -1
    let ratingExpiredDate = -1
    if (ratingKeuanganStart >= 0 && subHeaders.length > 0) {
        // Sub-headers under RATING KEUANGAN
        for (let i = ratingKeuanganStart; i < Math.min(ratingKeuanganStart + 3, subHeaders.length); i++) {
            if (subHeaders[i].includes('RATING') || subHeaders[i].includes('D&B')) ratingDB = i
            if (subHeaders[i].includes('EXPIRED') || subHeaders[i].includes('DATE')) ratingExpiredDate = i
        }
    } else {
        // May be in main headers directly
        ratingDB = findCol(['RATING', 'D&B'])
        ratingExpiredDate = findCol(['EXPIRED'])
    }

    const bankPembayaran = findCol(['BANK PEMBAYARAN'])
    const noRekening = findCol(['NO', 'REKENING'])
    // Special: "NO. REKENING" vs "NAMA REKENING"
    const namaRekening = findCol(['NAMA REKENING'])
    // If namaRekening == noRekening (both matched "REKENING"), find the second one
    const namaRekIdx = namaRekening === noRekening ? findCol(['REKENING'], noRekening) : namaRekening

    const alamatEmail = findCol(['ALAMAT EMAIL'])
    // Fallback: EMAIL
    const emailIdx = alamatEmail >= 0 ? alamatEmail : findCol(['EMAIL'])

    const contactPerson = findCol(['CONTACT PERSON'])
    // Fallback: KONTAK
    const contactIdx = contactPerson >= 0 ? contactPerson : findCol(['KONTAK'])

    const levelCsms = findCol(['LEVEL CSMS'])
    // If not in main, check sub
    const csmsIdx = levelCsms >= 0 ? levelCsms : (() => {
        if (subHeaders.length > 0) {
            for (let i = 0; i < subHeaders.length; i++) {
                if (subHeaders[i].includes('CSMS')) return i
            }
        }
        return -1
    })()

    // AKTA PENDIRIAN sub-columns (NO, TANGGAL, NOTARIS, ALAMAT NOTARIS, NOMOR AHU)
    const aktaPendirianStart = findCol(['AKTA PENDIRIAN'])
    let aktaPendirianNo = -1, aktaPendirianTanggal = -1, aktaPendirianNotaris = -1, aktaPendirianAlamatNotaris = -1, aktaPendirianNomorAhu = -1

    if (aktaPendirianStart >= 0 && subHeaders.length > 0) {
        // The sub-headers for AKTA PENDIRIAN start at aktaPendirianStart
        for (let i = aktaPendirianStart; i < Math.min(aktaPendirianStart + 6, subHeaders.length); i++) {
            const sh = subHeaders[i]
            if (sh === 'NO' || sh === 'NO.') aktaPendirianNo = i
            else if (sh === 'TANGGAL' || sh.includes('TGL')) aktaPendirianTanggal = i
            else if (sh === 'NOTARIS' && aktaPendirianNotaris === -1) aktaPendirianNotaris = i
            else if (sh.includes('ALAMAT') && sh.includes('NOTARIS')) aktaPendirianAlamatNotaris = i
            else if (sh.includes('AHU') || sh.includes('NOMOR AHU')) aktaPendirianNomorAhu = i
        }
    }

    // AKTA PERUBAHAN TERAKHIR sub-columns
    const aktaPerubahanStart = findCol(['AKTA PERUBAHAN'])
    let aktaPerubahanNo = -1, aktaPerubahanTanggal = -1, aktaPerubahanNotaris = -1, aktaPerubahanAlamatNotaris = -1, aktaPerubahanNomorAhu = -1

    if (aktaPerubahanStart >= 0 && subHeaders.length > 0) {
        for (let i = aktaPerubahanStart; i < Math.min(aktaPerubahanStart + 6, subHeaders.length); i++) {
            const sh = subHeaders[i]
            if (sh === 'NO' || sh === 'NO.') aktaPerubahanNo = i
            else if (sh === 'TANGGAL' || sh.includes('TGL')) aktaPerubahanTanggal = i
            else if (sh === 'NOTARIS' && aktaPerubahanNotaris === -1) aktaPerubahanNotaris = i
            else if (sh.includes('ALAMAT') && sh.includes('NOTARIS')) aktaPerubahanAlamatNotaris = i
            else if (sh.includes('AHU') || sh.includes('NOMOR AHU')) aktaPerubahanNomorAhu = i
        }
    }

    const mapping: ColumnMapping = {
        namaVendor: namaVendor >= 0 ? namaVendor : 1, // default col index 1
        namaPimpinan: namaPimpinan >= 0 ? namaPimpinan : 2,
        jabatan: jabatan >= 0 ? jabatan : 3,
        alamat: alamatIdx >= 0 ? alamatIdx : 4,
        ratingDB,
        ratingExpiredDate,
        bankPembayaran: bankPembayaran >= 0 ? bankPembayaran : -1,
        noRekening: noRekening >= 0 ? noRekening : -1,
        namaRekening: namaRekIdx >= 0 ? namaRekIdx : -1,
        alamatEmail: emailIdx >= 0 ? emailIdx : -1,
        contactPerson: contactIdx >= 0 ? contactIdx : -1,
        levelCsms: csmsIdx >= 0 ? csmsIdx : -1,
        aktaPendirianNo, aktaPendirianTanggal, aktaPendirianNotaris, aktaPendirianAlamatNotaris, aktaPendirianNomorAhu,
        aktaPerubahanNo, aktaPerubahanTanggal, aktaPerubahanNotaris, aktaPerubahanAlamatNotaris, aktaPerubahanNomorAhu
    }

    return { headerRowCount: dataStartRow - mainHeaderRow, mapping, dataStartRow }
}

// ============================================================
// Check if a row is a valid vendor (non-empty)
// ============================================================
function isVendorRow(cells: string[], mapping: ColumnMapping): boolean {
    const namaVendor = (cells[mapping.namaVendor] || '').trim()
    // Must have vendor name
    if (!namaVendor || namaVendor === '-' || namaVendor === '') return false
    // Skip if name is just a number (row number header leak)
    if (/^\d+$/.test(namaVendor)) return false
    return true
}

// ============================================================
// Map CSV row → DB vendor
// ============================================================
function mapRow(cells: string[], mapping: ColumnMapping, rowIndex: number): MappedVendor {
    const get = (colIdx: number): string => {
        if (colIdx < 0 || colIdx >= cells.length) return ''
        return (cells[colIdx] || '').trim()
    }
    const warnings: string[] = []

    // Core fields
    const namaVendor = get(mapping.namaVendor)
    const namaPimpinan = get(mapping.namaPimpinan)
    const jabatan = get(mapping.jabatan)
    const alamat = get(mapping.alamat)
    const bankPembayaran = get(mapping.bankPembayaran)
    const noRekening = cleanAccountNumber(get(mapping.noRekening))
    const namaRekening = get(mapping.namaRekening)
    const email = get(mapping.alamatEmail)
    const contactPerson = get(mapping.contactPerson)

    // Extra fields for notes
    const ratingDB = get(mapping.ratingDB)
    const ratingExpiredDate = get(mapping.ratingExpiredDate)
    const levelCsms = get(mapping.levelCsms)

    // AKTA PENDIRIAN
    const aktaPendirianNo = get(mapping.aktaPendirianNo)
    const aktaPendirianTanggal = get(mapping.aktaPendirianTanggal)
    const aktaPendirianNotaris = get(mapping.aktaPendirianNotaris)
    const aktaPendirianAlamatNotaris = get(mapping.aktaPendirianAlamatNotaris)
    const aktaPendirianNomorAhu = get(mapping.aktaPendirianNomorAhu)

    // AKTA PERUBAHAN TERAKHIR
    const aktaPerubahanNo = get(mapping.aktaPerubahanNo)
    const aktaPerubahanTanggal = get(mapping.aktaPerubahanTanggal)
    const aktaPerubahanNotaris = get(mapping.aktaPerubahanNotaris)
    const aktaPerubahanAlamatNotaris = get(mapping.aktaPerubahanAlamatNotaris)
    const aktaPerubahanNomorAhu = get(mapping.aktaPerubahanNomorAhu)

    // Validate email format
    if (email && !email.includes('@')) {
        warnings.push(`Email format tidak valid: "${email}"`)
    }

    // Build notes from extra fields
    const extraNotes: string[] = []

    if (contactPerson && contactPerson !== '-') extraNotes.push(`Contact Person: ${contactPerson}`)
    if (ratingDB && ratingDB !== '-') extraNotes.push(`Rating D&B: ${ratingDB}`)
    if (ratingExpiredDate && ratingExpiredDate !== '-') extraNotes.push(`Rating Expired Date: ${ratingExpiredDate}`)
    if (levelCsms && levelCsms !== '-') extraNotes.push(`Level CSMS: ${levelCsms}`)

    // Akta Pendirian
    const aktaPendirianParts: string[] = []
    if (aktaPendirianNo && aktaPendirianNo !== '-') aktaPendirianParts.push(`No: ${aktaPendirianNo}`)
    if (aktaPendirianTanggal && aktaPendirianTanggal !== '-') aktaPendirianParts.push(`Tanggal: ${aktaPendirianTanggal}`)
    if (aktaPendirianNotaris && aktaPendirianNotaris !== '-') aktaPendirianParts.push(`Notaris: ${aktaPendirianNotaris}`)
    if (aktaPendirianAlamatNotaris && aktaPendirianAlamatNotaris !== '-') aktaPendirianParts.push(`Alamat Notaris: ${aktaPendirianAlamatNotaris}`)
    if (aktaPendirianNomorAhu && aktaPendirianNomorAhu !== '-') aktaPendirianParts.push(`Nomor AHU: ${aktaPendirianNomorAhu}`)
    if (aktaPendirianParts.length > 0) {
        extraNotes.push(`[Akta Pendirian] ${aktaPendirianParts.join(' | ')}`)
    }

    // Akta Perubahan Terakhir
    const aktaPerubahanParts: string[] = []
    if (aktaPerubahanNo && aktaPerubahanNo !== '-') aktaPerubahanParts.push(`No: ${aktaPerubahanNo}`)
    if (aktaPerubahanTanggal && aktaPerubahanTanggal !== '-') aktaPerubahanParts.push(`Tanggal: ${aktaPerubahanTanggal}`)
    if (aktaPerubahanNotaris && aktaPerubahanNotaris !== '-') aktaPerubahanParts.push(`Notaris: ${aktaPerubahanNotaris}`)
    if (aktaPerubahanAlamatNotaris && aktaPerubahanAlamatNotaris !== '-') aktaPerubahanParts.push(`Alamat Notaris: ${aktaPerubahanAlamatNotaris}`)
    if (aktaPerubahanNomorAhu && aktaPerubahanNomorAhu !== '-') aktaPerubahanParts.push(`Nomor AHU: ${aktaPerubahanNomorAhu}`)
    if (aktaPerubahanParts.length > 0) {
        extraNotes.push(`[Akta Perubahan Terakhir] ${aktaPerubahanParts.join(' | ')}`)
    }

    const notesText = extraNotes.length > 0
        ? `[Data CSV Tambahan]\n${extraNotes.join('\n')}`
        : ''

    // Generate unique vendor ID
    const vendorId = `VND${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`

    return {
        id: vendorId,
        nama: namaVendor,
        alamat: alamat || null,
        telepon: contactPerson || null, // Contact Person CSV → telepon
        email: (email && email.includes('@')) ? email : null,
        nama_pimpinan: namaPimpinan || null, // NAMA PIMPINAN CSV → nama_pimpinan
        jabatan: jabatan || null,
        npwp: null,
        status: 'Aktif',
        bank_pembayaran: bankPembayaran || null,
        no_rekening: noRekening || null,
        nama_rekening: namaRekening || null,
        notes: notesText || null,
        _csvRowIndex: rowIndex,
        _warnings: warnings
    }
}

// ============================================================
// CSV Import Modal Component for Vendors
// ============================================================
interface VendorCsvImportModalProps {
    isOpen: boolean
    onClose: () => void
    onImportComplete: () => void
    showAlert: (type: string, message: string) => void
}

export default function VendorCsvImportModal({ isOpen, onClose, onImportComplete, showAlert }: VendorCsvImportModalProps) {
    const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'result' | 'history'>('upload')
    const [importHistory, setImportHistory] = useState<ImportLogEntry[]>([])
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null)
    const [logFilter, setLogFilter] = useState<'all' | 'duplikat' | 'diupdate' | 'gagal'>('all')
    const [resultFilter, setResultFilter] = useState<'all' | 'duplikat' | 'diupdate' | 'gagal'>('all')
    const [csvFile, setCsvFile] = useState<File | null>(null)
    const [parsedData, setParsedData] = useState<MappedVendor[]>([])
    const [skippedRows, setSkippedRows] = useState<{ row: number, reason: string }[]>([])
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0, errors: 0 })
    const [importResults, setImportResults] = useState<{ success: number, failed: number, skipped: number, updated: number, errors: string[] }>({ success: 0, failed: 0, skipped: 0, updated: 0, errors: [] })
    const [dragActive, setDragActive] = useState(false)
    const [previewPage, setPreviewPage] = useState(0)
    const [showSkipped, setShowSkipped] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const PREVIEW_PAGE_SIZE = 10

    // Load history on mount
    useEffect(() => {
        if (isOpen) {
            setImportHistory(loadImportHistory())
        }
    }, [isOpen])

    // Reset state when modal closes
    const resetState = useCallback(() => {
        setStep('upload')
        setCsvFile(null)
        setParsedData([])
        setSkippedRows([])
        setImportProgress({ current: 0, total: 0, errors: 0 })
        setImportResults({ success: 0, failed: 0, skipped: 0, updated: 0, errors: [] })
        setDragActive(false)
        setPreviewPage(0)
        setShowSkipped(false)
        setLogFilter('all')
        setResultFilter('all')
        setExpandedLogId(null)
    }, [])

    const handleClose = useCallback(() => {
        resetState()
        onClose()
    }, [resetState, onClose])

    // ============================================================
    // File handling
    // ============================================================
    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
        else if (e.type === 'dragleave') setDragActive(false)
    }, [])

    const processFile = useCallback((file: File) => {
        if (!file.name.endsWith('.csv')) {
            showAlert('error', 'Hanya file CSV (.csv) yang didukung')
            return
        }
        setCsvFile(file)

        Papa.parse(file, {
            complete: (results) => {
                const rawRows: string[][] = results.data as string[][]

                if (rawRows.length < 3) {
                    showAlert('error', 'File CSV terlalu pendek, minimal 3 baris (header + data)')
                    return
                }

                // Find header row and build mapping
                const { mapping, dataStartRow } = findHeaderAndBuildMapping(rawRows)

                if (!mapping) {
                    showAlert('error', 'Tidak dapat menemukan header "Nama Vendor" di file CSV. Pastikan format file sesuai.')
                    return
                }

                console.log('📊 Vendor CSV Header mapping:', mapping)
                console.log('📊 Data starts at row:', dataStartRow)

                const mapped: MappedVendor[] = []
                const skipped: { row: number, reason: string }[] = []

                for (let i = dataStartRow; i < rawRows.length; i++) {
                    const cells = rawRows[i]
                    // Skip completely empty rows
                    if (!cells || cells.every(c => !c || c.trim() === '')) continue

                    if (!isVendorRow(cells, mapping)) {
                        const name = (cells[mapping.namaVendor] || '').trim()
                        if (name && name !== '-') {
                            skipped.push({ row: i + 1, reason: `Baris ${i + 1}: "${name}" - Data vendor tidak lengkap` })
                        }
                        continue
                    }

                    const vendor = mapRow(cells, mapping, i)
                    mapped.push(vendor)
                }

                console.log(`✅ Parsed ${mapped.length} vendor records, skipped ${skipped.length}`)

                if (mapped.length === 0) {
                    showAlert('error', 'Tidak ada data vendor yang valid ditemukan dalam file CSV')
                    return
                }

                setParsedData(mapped)
                setSkippedRows(skipped)
                setStep('preview')
            },
            error: (error) => {
                console.error('Papa parse error:', error)
                showAlert('error', `Gagal membaca file CSV: ${error.message}`)
            },
            skipEmptyLines: false, // We handle empty lines ourselves
            header: false // We parse by column index
        })
    }, [showAlert])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0])
        }
    }, [processFile])

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0])
        }
    }, [processFile])

    // ============================================================
    // Import logic
    // ============================================================
    const startImport = useCallback(async () => {
        if (parsedData.length === 0) return

        setStep('importing')
        setImportProgress({ current: 0, total: parsedData.length, errors: 0 })

        let success = 0
        let failed = 0
        let skipped = 0
        let updated = 0
        const errors: string[] = []

        for (let i = 0; i < parsedData.length; i++) {
            const vendor = parsedData[i]
            setImportProgress(prev => ({ ...prev, current: i + 1 }))

            try {
                // Check for duplicate by name
                const { data: existingByName } = await supabase
                    .from('vendors')
                    .select('*')
                    .eq('nama', vendor.nama)
                    .maybeSingle()

                if (existingByName) {
                    // Vendor sudah ada → cek apakah ada kolom kosong yang bisa diisi dari CSV
                    const updateFields: Record<string, unknown> = {}
                    const isEmpty = (val: unknown) => !val || val === '' || val === '-' || val === null

                    // Hanya update kolom yang di DB masih kosong dan di CSV ada datanya
                    if (isEmpty(existingByName.alamat) && vendor.alamat) updateFields.alamat = vendor.alamat
                    if (isEmpty(existingByName.telepon) && vendor.telepon) updateFields.telepon = vendor.telepon
                    if (isEmpty(existingByName.email) && vendor.email) updateFields.email = vendor.email
                    if (isEmpty(existingByName.nama_pimpinan) && vendor.nama_pimpinan) updateFields.nama_pimpinan = vendor.nama_pimpinan
                    if (isEmpty(existingByName.jabatan) && vendor.jabatan) updateFields.jabatan = vendor.jabatan
                    if (isEmpty(existingByName.npwp) && vendor.npwp) updateFields.npwp = vendor.npwp
                    if (isEmpty(existingByName.bank_pembayaran) && vendor.bank_pembayaran) updateFields.bank_pembayaran = vendor.bank_pembayaran
                    if (isEmpty(existingByName.no_rekening) && vendor.no_rekening) updateFields.no_rekening = vendor.no_rekening
                    if (isEmpty(existingByName.nama_rekening) && vendor.nama_rekening) updateFields.nama_rekening = vendor.nama_rekening

                    if (Object.keys(updateFields).length > 0) {
                        // Ada kolom kosong yang bisa diisi → update
                        updateFields.updated_at = new Date().toISOString()
                        const { error: updateError } = await supabase
                            .from('vendors')
                            .update(updateFields)
                            .eq('id', existingByName.id)

                        if (updateError) throw updateError

                        updated++
                        const filledCols = Object.keys(updateFields).filter(k => k !== 'updated_at').join(', ')
                        errors.push(`Baris ${(vendor._csvRowIndex || 0) + 1}: "${vendor.nama}" diupdate - kolom terisi: ${filledCols}`)
                    } else {
                        // Semua kolom sudah terisi → skip
                        skipped++
                        errors.push(`Baris ${(vendor._csvRowIndex || 0) + 1}: "${vendor.nama}" dilewati - vendor sudah ada & semua kolom sudah terisi`)
                        setImportProgress(prev => ({ ...prev, errors: prev.errors + 1 }))
                    }
                    continue
                }

                // Check for duplicate by email (if email exists)
                if (vendor.email) {
                    const { data: existingByEmail } = await supabase
                        .from('vendors')
                        .select('id, nama, email')
                        .eq('email', vendor.email)
                        .maybeSingle()

                    if (existingByEmail) {
                        skipped++
                        errors.push(`Baris ${(vendor._csvRowIndex || 0) + 1}: "${vendor.nama}" dilewati - email "${vendor.email}" sudah terdaftar untuk "${existingByEmail.nama}"`)
                        setImportProgress(prev => ({ ...prev, errors: prev.errors + 1 }))
                        continue
                    }
                }

                // Generate claim code for new vendor
                const claimCode = Math.floor(100000 + Math.random() * 900000).toString()

                // Insert vendor (sesuai kolom yang ada di tabel vendors Supabase)
                const payload: Record<string, unknown> = {
                    id: vendor.id,
                    nama: vendor.nama,
                    alamat: vendor.alamat,
                    telepon: vendor.telepon,
                    email: vendor.email,
                    nama_pimpinan: vendor.nama_pimpinan,
                    // jabatan: vendor.jabatan || null, // TODO: Uncomment setelah migration dijalankan
                    npwp: vendor.npwp,
                    status: vendor.status,
                    claim_code: claimCode,
                    is_claimed: false,
                    created_at: new Date().toISOString()
                }

                const { error: insertError } = await supabase
                    .from('vendors')
                    .insert([payload])

                if (insertError) {
                    throw insertError
                }

                success++
            } catch (err: unknown) {
                failed++
                const errorMessage = err instanceof Error ? err.message : String(err)
                errors.push(`Baris ${(vendor._csvRowIndex || 0) + 1}: "${vendor.nama}" gagal - ${errorMessage}`)
                setImportProgress(prev => ({ ...prev, errors: prev.errors + 1 }))
            }
        }

        const results = { success, failed, skipped, updated, errors }
        setImportResults(results)
        setStep('result')

        // Save to history
        const logEntry: ImportLogEntry = {
            id: `vimp_${Date.now()}`,
            timestamp: new Date().toISOString(),
            fileName: csvFile?.name || 'unknown.csv',
            totalParsed: parsedData.length,
            success,
            failed,
            skipped,
            updated,
            errors
        }
        saveImportLog(logEntry)
        setImportHistory(loadImportHistory())

        if (success > 0 || updated > 0) {
            onImportComplete()
        }
    }, [parsedData, csvFile, onImportComplete])

    // ============================================================
    // Filter helpers for error logs
    // ============================================================
    const filterErrors = (errorList: string[], filterType: 'all' | 'duplikat' | 'diupdate' | 'gagal'): string[] => {
        if (filterType === 'all') return errorList
        if (filterType === 'diupdate') return errorList.filter(e => e.includes('diupdate'))
        if (filterType === 'duplikat') return errorList.filter(e => (e.includes('dilewati') || e.includes('sudah ada') || e.includes('duplikat')) && !e.includes('diupdate'))
        if (filterType === 'gagal') return errorList.filter(e => e.includes('gagal') && !e.includes('dilewati') && !e.includes('sudah ada') && !e.includes('duplikat') && !e.includes('diupdate'))
        return errorList
    }

    const countByType = (errorList: string[]) => {
        const diupdate = errorList.filter(e => e.includes('diupdate')).length
        const duplikat = errorList.filter(e => (e.includes('dilewati') || e.includes('sudah ada') || e.includes('duplikat')) && !e.includes('diupdate')).length
        const gagal = errorList.filter(e => e.includes('gagal') && !e.includes('dilewati') && !e.includes('sudah ada') && !e.includes('duplikat') && !e.includes('diupdate')).length
        return { duplikat, diupdate, gagal }
    }

    // ============================================================
    // Download template
    // ============================================================
    const downloadTemplate = useCallback(() => {
        const headers = 'No,Nama Vendor,NAMA PIMPINAN,Jabatan,Alamat,Bank Pembayaran,No. Rekening,Nama Rekening,Alamat Email,Contact Person\n'
        const example = '1,PT Contoh Vendor,John Doe,Direktur,"Jl. Contoh No. 1, Jakarta",BCA,1234567890,PT Contoh Vendor,vendor@contoh.com,081234567890\n'
        const blob = new Blob([headers + example], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'template_import_vendor.csv'
        a.click()
        URL.revokeObjectURL(url)
    }, [])

    // ============================================================
    // Render
    // ============================================================
    if (!isOpen) return null

    const previewStart = previewPage * PREVIEW_PAGE_SIZE
    const previewEnd = Math.min(previewStart + PREVIEW_PAGE_SIZE, parsedData.length)
    const previewSlice = parsedData.slice(previewStart, previewEnd)
    const totalPreviewPages = Math.ceil(parsedData.length / PREVIEW_PAGE_SIZE)

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                background: '#fff', borderRadius: 16, width: '95%', maxWidth: 1100,
                maxHeight: '92vh', display: 'flex', flexDirection: 'column',
                boxShadow: '0 25px 50px rgba(0,0,0,0.25)', overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '20px 28px', borderBottom: '1px solid #e5e7eb',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#fff'
                }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
                            {step === 'history' ? '📋 Riwayat Import Vendor' : '📥 Import Data Vendor dari CSV'}
                        </h2>
                        <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.9 }}>
                            {step === 'upload' && 'Upload file CSV data vendor'}
                            {step === 'preview' && `${parsedData.length} vendor siap diimport`}
                            {step === 'importing' && `Mengimport ${importProgress.current}/${importProgress.total}...`}
                            {step === 'result' && 'Import selesai'}
                            {step === 'history' && `${importHistory.length} riwayat import`}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {step === 'upload' && (
                            <button onClick={() => { setImportHistory(loadImportHistory()); setStep('history') }}
                                style={{
                                    background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
                                    color: '#fff', borderRadius: 8, padding: '8px 14px', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500
                                }}>
                                <Clock size={16} /> Riwayat
                            </button>
                        )}
                        <button onClick={handleClose} style={{
                            background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
                            borderRadius: 8, padding: 8, cursor: 'pointer', display: 'flex'
                        }}>
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>

                    {/* =================== UPLOAD STEP =================== */}
                    {step === 'upload' && (
                        <div>
                            {/* Drop zone */}
                            <div
                                onDragEnter={handleDrag} onDragOver={handleDrag} onDragLeave={handleDrag} onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    border: `2px dashed ${dragActive ? '#10b981' : '#d1d5db'}`,
                                    borderRadius: 12, padding: '48px 24px', textAlign: 'center',
                                    cursor: 'pointer', transition: 'all 0.2s',
                                    background: dragActive ? '#ecfdf5' : '#f9fafb'
                                }}
                            >
                                <Upload size={48} style={{ color: dragActive ? '#10b981' : '#9ca3af', marginBottom: 16 }} />
                                <p style={{ fontSize: 16, fontWeight: 600, color: '#374151', margin: 0 }}>
                                    {dragActive ? 'Lepaskan file di sini...' : 'Drag & drop file CSV atau klik untuk memilih'}
                                </p>
                                <p style={{ fontSize: 13, color: '#6b7280', marginTop: 8 }}>
                                    Format: MONITORING 2025 - DATA VENDOR.csv
                                </p>
                                <input
                                    ref={fileInputRef} type="file" accept=".csv"
                                    style={{ display: 'none' }} onChange={handleFileChange}
                                />
                            </div>

                            {/* Template download */}
                            <div style={{
                                marginTop: 20, padding: 16, background: '#f0fdf4', borderRadius: 10,
                                border: '1px solid #bbf7d0'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#166534' }}>
                                            💡 Format file CSV
                                        </p>
                                        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#15803d' }}>
                                            Kolom yang didukung: Nama Vendor, Nama Pimpinan (→ Nama Pimpinan), Jabatan, Alamat, Bank Pembayaran, No. Rekening, Nama Rekening, Alamat Email, Contact Person (→ Telepon), Rating D&B, Level CSMS, Akta Pendirian, Akta Perubahan
                                        </p>
                                    </div>
                                    <button onClick={downloadTemplate} style={{
                                        background: '#16a34a', color: '#fff', border: 'none', borderRadius: 8,
                                        padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                                        gap: 6, fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap'
                                    }}>
                                        <Download size={16} /> Template
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* =================== PREVIEW STEP =================== */}
                    {step === 'preview' && (
                        <div>
                            {/* Stats bar */}
                            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                                <div style={{
                                    flex: 1, padding: '14px 16px', background: '#ecfdf5', borderRadius: 10,
                                    border: '1px solid #a7f3d0'
                                }}>
                                    <div style={{ fontSize: 24, fontWeight: 700, color: '#059669' }}>{parsedData.length}</div>
                                    <div style={{ fontSize: 12, color: '#047857' }}>Vendor Terbaca</div>
                                </div>
                                {skippedRows.length > 0 && (
                                    <div style={{
                                        flex: 1, padding: '14px 16px', background: '#fef3c7', borderRadius: 10,
                                        border: '1px solid #fcd34d'
                                    }}>
                                        <div style={{ fontSize: 24, fontWeight: 700, color: '#d97706' }}>{skippedRows.length}</div>
                                        <div style={{ fontSize: 12, color: '#b45309' }}>Baris Dilewati</div>
                                    </div>
                                )}
                            </div>

                            {/* Skipped rows toggle */}
                            {skippedRows.length > 0 && (
                                <div style={{ marginBottom: 16 }}>
                                    <button onClick={() => setShowSkipped(!showSkipped)} style={{
                                        background: 'none', border: '1px solid #fcd34d', borderRadius: 8,
                                        padding: '8px 14px', cursor: 'pointer', display: 'flex',
                                        alignItems: 'center', gap: 6, fontSize: 13, color: '#92400e'
                                    }}>
                                        <AlertCircle size={14} /> {showSkipped ? 'Sembunyikan' : 'Lihat'} baris dilewati
                                        {showSkipped ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </button>
                                    {showSkipped && (
                                        <div style={{
                                            marginTop: 8, padding: 12, background: '#fffbeb', borderRadius: 8,
                                            border: '1px solid #fcd34d', maxHeight: 150, overflow: 'auto', fontSize: 12
                                        }}>
                                            {skippedRows.map((s, i) => (
                                                <div key={i} style={{ padding: '2px 0', color: '#92400e' }}>{s.reason}</div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Preview file info */}
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12,
                                fontSize: 13, color: '#6b7280'
                            }}>
                                <FileText size={16} />
                                <span>{csvFile?.name}</span>
                                <span style={{ color: '#d1d5db' }}>|</span>
                                <span>{parsedData.length} vendor</span>
                            </div>

                            {/* Preview table */}
                            <div style={{ overflow: 'auto', borderRadius: 10, border: '1px solid #e5e7eb' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                    <thead>
                                        <tr style={{ background: '#f3f4f6' }}>
                                            <th style={thStyle}>#</th>
                                            <th style={thStyle}>Nama Vendor</th>
                                            <th style={thStyle}>Alamat</th>
                                            <th style={thStyle}>Email</th>
                                            <th style={thStyle}>Nama Pimpinan</th>
                                            <th style={thStyle}>Bank</th>
                                            <th style={thStyle}>No. Rekening</th>
                                            <th style={thStyle}>Jabatan</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewSlice.map((v, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                <td style={tdStyle}>{previewStart + i + 1}</td>
                                                <td style={{ ...tdStyle, fontWeight: 600, maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {v.nama}
                                                    {v._warnings && v._warnings.length > 0 && (
                                                        <span title={v._warnings.join('\n')} style={{ color: '#f59e0b', marginLeft: 4 }}>⚠️</span>
                                                    )}
                                                </td>
                                                <td style={{ ...tdStyle, maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.alamat || '-'}</td>
                                                <td style={tdStyle}>{v.email || '-'}</td>
                                                <td style={tdStyle}>{v.nama_pimpinan || '-'}</td>
                                                <td style={tdStyle}>{v.bank_pembayaran || '-'}</td>
                                                <td style={tdStyle}>{v.no_rekening || '-'}</td>
                                                <td style={tdStyle}>{v.jabatan || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPreviewPages > 1 && (
                                <div style={{
                                    display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12,
                                    marginTop: 14, fontSize: 13
                                }}>
                                    <button disabled={previewPage === 0} onClick={() => setPreviewPage(p => p - 1)}
                                        style={paginationBtnStyle(previewPage === 0)}>
                                        ← Prev
                                    </button>
                                    <span style={{ color: '#6b7280' }}>
                                        Halaman {previewPage + 1} / {totalPreviewPages}
                                    </span>
                                    <button disabled={previewPage >= totalPreviewPages - 1} onClick={() => setPreviewPage(p => p + 1)}
                                        style={paginationBtnStyle(previewPage >= totalPreviewPages - 1)}>
                                        Next →
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* =================== IMPORTING STEP =================== */}
                    {step === 'importing' && (
                        <div style={{ textAlign: 'center', padding: '40px 0' }}>
                            <Loader2 size={48} style={{ color: '#10b981', animation: 'spin 1s linear infinite', marginBottom: 20 }} />
                            <h3 style={{ margin: 0, fontSize: 18, color: '#111827' }}>Mengimport Data Vendor...</h3>
                            <p style={{ color: '#6b7280', margin: '8px 0 24px' }}>
                                {importProgress.current} / {importProgress.total} vendor diproses
                            </p>
                            {/* Progress bar */}
                            <div style={{
                                width: '80%', maxWidth: 400, height: 8, background: '#e5e7eb',
                                borderRadius: 4, margin: '0 auto', overflow: 'hidden'
                            }}>
                                <div style={{
                                    height: '100%', background: '#10b981', borderRadius: 4,
                                    width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%`,
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                            {importProgress.errors > 0 && (
                                <p style={{ color: '#ef4444', fontSize: 13, marginTop: 12 }}>
                                    {importProgress.errors} error ditemukan
                                </p>
                            )}
                        </div>
                    )}

                    {/* =================== RESULT STEP =================== */}
                    {step === 'result' && (
                        <div>
                            {/* Summary cards */}
                            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                                <div style={{
                                    flex: 1, padding: '16px', background: '#ecfdf5', borderRadius: 10,
                                    border: '1px solid #a7f3d0', textAlign: 'center'
                                }}>
                                    <CheckCircle size={24} style={{ color: '#059669', marginBottom: 4 }} />
                                    <div style={{ fontSize: 28, fontWeight: 700, color: '#059669' }}>{importResults.success}</div>
                                    <div style={{ fontSize: 12, color: '#047857' }}>Berhasil</div>
                                </div>
                                {importResults.updated > 0 && (
                                    <div style={{
                                        flex: 1, padding: '16px', background: '#eff6ff', borderRadius: 10,
                                        border: '1px solid #93c5fd', textAlign: 'center'
                                    }}>
                                        <RefreshCw size={24} style={{ color: '#2563eb', marginBottom: 4 }} />
                                        <div style={{ fontSize: 28, fontWeight: 700, color: '#2563eb' }}>{importResults.updated}</div>
                                        <div style={{ fontSize: 12, color: '#1d4ed8' }}>Diupdate</div>
                                    </div>
                                )}
                                {importResults.skipped > 0 && (
                                    <div style={{
                                        flex: 1, padding: '16px', background: '#fef3c7', borderRadius: 10,
                                        border: '1px solid #fcd34d', textAlign: 'center'
                                    }}>
                                        <AlertCircle size={24} style={{ color: '#d97706', marginBottom: 4 }} />
                                        <div style={{ fontSize: 28, fontWeight: 700, color: '#d97706' }}>{importResults.skipped}</div>
                                        <div style={{ fontSize: 12, color: '#b45309' }}>Duplikat/Dilewati</div>
                                    </div>
                                )}
                                {importResults.failed > 0 && (
                                    <div style={{
                                        flex: 1, padding: '16px', background: '#fef2f2', borderRadius: 10,
                                        border: '1px solid #fca5a5', textAlign: 'center'
                                    }}>
                                        <AlertCircle size={24} style={{ color: '#ef4444', marginBottom: 4 }} />
                                        <div style={{ fontSize: 28, fontWeight: 700, color: '#ef4444' }}>{importResults.failed}</div>
                                        <div style={{ fontSize: 12, color: '#dc2626' }}>Gagal</div>
                                    </div>
                                )}
                            </div>

                            {/* Error details with filter tabs */}
                            {importResults.errors.length > 0 && (
                                <div style={{
                                    padding: 16, background: '#fef2f2', borderRadius: 10,
                                    border: '1px solid #fecaca'
                                }}>
                                    <div style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        marginBottom: 12
                                    }}>
                                        <span style={{ fontWeight: 600, color: '#991b1b', fontSize: 14 }}>
                                            Detail Error ({importResults.errors.length})
                                        </span>
                                    </div>
                                    {/* Filter tabs */}
                                    {(() => {
                                        const counts = countByType(importResults.errors)
                                        return (
                                            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                                                <button onClick={() => setResultFilter('all')}
                                                    style={filterTabStyle(resultFilter === 'all', '#6b7280')}>
                                                    Semua ({importResults.errors.length})
                                                </button>
                                                {counts.diupdate > 0 && (
                                                    <button onClick={() => setResultFilter('diupdate')}
                                                        style={filterTabStyle(resultFilter === 'diupdate', '#2563eb')}>
                                                        Diupdate ({counts.diupdate})
                                                    </button>
                                                )}
                                                {counts.duplikat > 0 && (
                                                    <button onClick={() => setResultFilter('duplikat')}
                                                        style={filterTabStyle(resultFilter === 'duplikat', '#d97706')}>
                                                        Duplikat ({counts.duplikat})
                                                    </button>
                                                )}
                                                {counts.gagal > 0 && (
                                                    <button onClick={() => setResultFilter('gagal')}
                                                        style={filterTabStyle(resultFilter === 'gagal', '#ef4444')}>
                                                        Gagal ({counts.gagal})
                                                    </button>
                                                )}
                                            </div>
                                        )
                                    })()}
                                    <div style={{ maxHeight: 200, overflow: 'auto', fontSize: 12 }}>
                                        {filterErrors(importResults.errors, resultFilter).map((err, i) => (
                                            <div key={i} style={{
                                                padding: '6px 8px', borderBottom: '1px solid #fee2e2',
                                                color: err.includes('diupdate') ? '#1d4ed8' : err.includes('dilewati') || err.includes('duplikat') ? '#92400e' : '#991b1b'
                                            }}>                                           
                                                {err}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* =================== HISTORY STEP =================== */}
                    {step === 'history' && (
                        <div>
                            {importHistory.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
                                    <Clock size={48} style={{ marginBottom: 12 }} />
                                    <p>Belum ada riwayat import vendor</p>
                                </div>
                            ) : (
                                <>
                                    <div style={{
                                        display: 'flex', justifyContent: 'flex-end', marginBottom: 12
                                    }}>
                                        <button onClick={() => {
                                            clearImportHistory()
                                            setImportHistory([])
                                        }} style={{
                                            background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5',
                                            borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: 6, fontSize: 12
                                        }}>
                                            <Trash2 size={14} /> Hapus Semua Riwayat
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {importHistory.map((log) => {
                                            const isExpanded = expandedLogId === log.id
                                            return (
                                                <div key={log.id} style={{
                                                    border: '1px solid #e5e7eb', borderRadius: 10,
                                                    overflow: 'hidden'
                                                }}>
                                                    <div onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                                        style={{
                                                            display: 'flex', justifyContent: 'space-between',
                                                            alignItems: 'center', padding: '12px 16px',
                                                            cursor: 'pointer', background: '#f9fafb'
                                                        }}>
                                                        <div>
                                                            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                                                                {log.fileName}
                                                            </div>
                                                            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                                                                {new Date(log.timestamp).toLocaleString('id-ID')} • {log.totalParsed} vendor
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            <span style={{
                                                                background: '#ecfdf5', color: '#059669', padding: '2px 8px',
                                                                borderRadius: 6, fontSize: 12, fontWeight: 600
                                                            }}>✓ {log.success}</span>
                                                            {(log.updated || 0) > 0 && (
                                                                <span style={{
                                                                    background: '#eff6ff', color: '#2563eb', padding: '2px 8px',
                                                                    borderRadius: 6, fontSize: 12, fontWeight: 600
                                                                }}>↻ {log.updated}</span>
                                                            )}
                                                            {log.skipped > 0 && (
                                                                <span style={{
                                                                    background: '#fef3c7', color: '#d97706', padding: '2px 8px',
                                                                    borderRadius: 6, fontSize: 12, fontWeight: 600
                                                                }}>⊘ {log.skipped}</span>
                                                            )}
                                                            {log.failed > 0 && (
                                                                <span style={{
                                                                    background: '#fef2f2', color: '#ef4444', padding: '2px 8px',
                                                                    borderRadius: 6, fontSize: 12, fontWeight: 600
                                                                }}>✗ {log.failed}</span>
                                                            )}
                                                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                        </div>
                                                    </div>
                                                    {isExpanded && log.errors.length > 0 && (
                                                        <div style={{
                                                            padding: '12px 16px', background: '#fff',
                                                            borderTop: '1px solid #e5e7eb'
                                                        }}>
                                                            {/* Filter tabs */}
                                                            {(() => {
                                                                const counts = countByType(log.errors)
                                                                return (
                                                                    <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                                                                        <button onClick={() => setLogFilter('all')}
                                                                            style={filterTabStyle(logFilter === 'all', '#6b7280')}>
                                                                            Semua ({log.errors.length})
                                                                        </button>
                                                                        {counts.diupdate > 0 && (
                                                                            <button onClick={() => setLogFilter('diupdate')}
                                                                                style={filterTabStyle(logFilter === 'diupdate', '#2563eb')}>
                                                                                Diupdate ({counts.diupdate})
                                                                            </button>
                                                                        )}
                                                                        {counts.duplikat > 0 && (
                                                                            <button onClick={() => setLogFilter('duplikat')}
                                                                                style={filterTabStyle(logFilter === 'duplikat', '#d97706')}>
                                                                                Duplikat ({counts.duplikat})
                                                                            </button>
                                                                        )}
                                                                        {counts.gagal > 0 && (
                                                                            <button onClick={() => setLogFilter('gagal')}
                                                                                style={filterTabStyle(logFilter === 'gagal', '#ef4444')}>
                                                                                Gagal ({counts.gagal})
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )
                                                            })()}
                                                            <div style={{ maxHeight: 180, overflow: 'auto', fontSize: 12 }}>
                                                                {filterErrors(log.errors, logFilter).map((err, i) => (
                                                                    <div key={i} style={{
                                                                        padding: '4px 0', color: '#6b7280',
                                                                        borderBottom: '1px solid #f3f4f6'
                                                                    }}>
                                                                        {err}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '16px 28px', borderTop: '1px solid #e5e7eb', background: '#f9fafb'
                }}>
                    <div>
                        {step === 'preview' && (
                            <button onClick={() => { resetState() }}
                                style={{
                                    background: '#fff', color: '#374151', border: '1px solid #d1d5db',
                                    borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontSize: 14
                                }}>
                                ← Kembali
                            </button>
                        )}
                        {step === 'history' && (
                            <button onClick={() => setStep('upload')}
                                style={{
                                    background: '#fff', color: '#374151', border: '1px solid #d1d5db',
                                    borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontSize: 14
                                }}>
                                ← Kembali
                            </button>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        {step === 'preview' && (
                            <button onClick={startImport}
                                style={{
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    color: '#fff', border: 'none', borderRadius: 8,
                                    padding: '10px 24px', cursor: 'pointer', fontSize: 14,
                                    fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8
                                }}>
                                <Upload size={18} /> Import {parsedData.length} Vendor
                            </button>
                        )}
                        {step === 'result' && (
                            <button onClick={handleClose}
                                style={{
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    color: '#fff', border: 'none', borderRadius: 8,
                                    padding: '10px 24px', cursor: 'pointer', fontSize: 14,
                                    fontWeight: 600
                                }}>
                                Selesai
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Spinner animation */}
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}

// ============================================================
// Style helpers
// ============================================================
const thStyle: React.CSSProperties = {
    padding: '10px 12px', textAlign: 'left', fontWeight: 600,
    color: '#374151', borderBottom: '2px solid #e5e7eb',
    whiteSpace: 'nowrap', fontSize: 12
}

const tdStyle: React.CSSProperties = {
    padding: '8px 12px', color: '#374151', fontSize: 12
}

const paginationBtnStyle = (disabled: boolean): React.CSSProperties => ({
    background: disabled ? '#f3f4f6' : '#fff',
    color: disabled ? '#d1d5db' : '#374151',
    border: `1px solid ${disabled ? '#e5e7eb' : '#d1d5db'}`,
    borderRadius: 6, padding: '6px 14px', cursor: disabled ? 'default' : 'pointer',
    fontSize: 13
})

const filterTabStyle = (active: boolean, activeColor: string): React.CSSProperties => ({
    background: active ? activeColor : '#f3f4f6',
    color: active ? '#fff' : '#6b7280',
    border: 'none', borderRadius: 6, padding: '4px 10px',
    cursor: 'pointer', fontSize: 11, fontWeight: 600
})
