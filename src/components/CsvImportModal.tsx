'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { Upload, X, FileText, AlertCircle, CheckCircle, Download, Loader2, Clock, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import Papa from 'papaparse'
import { supabase } from '@/lib/supabaseClient'
import { autoSyncVendor } from '@/services/vendorService'
import { updateVendorContractStatus } from '@/services/vendorAccountService'

// ============================================================
// Mapping CSV "MONITORING SKKI 2025" → Database contracts
// ============================================================
// File CSV memiliki 8 baris summary di atas, header kolom di baris 9,
// dan data mulai baris 10. Hanya baris dengan PROSES DOK tertentu
// yang diimport sebagai kontrak.

interface MappedContract {
    name: string
    nomor_surat: string
    perihal: string
    tanggal_masuk: string
    start_date: string
    end_date: string
    pengirim: string
    penerima: string
    recipient: string
    invoice_number: string
    amount: number
    budget_type: string
    contract_type: string
    status: string
    kategori: string
    location: string
    vendor_name: string
    notes: string
    progress: number
    _csvRowIndex?: number
    _warnings?: string[]
    _class?: string
}

// ============================================================
// Import History (localStorage)
// ============================================================
interface ImportLogEntry {
    id: string
    timestamp: string
    fileName: string
    budgetType: string
    totalParsed: number
    success: number
    failed: number
    skipped: number
    errors: string[]
}

const IMPORT_HISTORY_KEY = 'vlaas_import_history'
const MAX_HISTORY = 50

function loadImportHistory(): ImportLogEntry[] {
    try {
        const raw = localStorage.getItem(IMPORT_HISTORY_KEY)
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
        localStorage.setItem(IMPORT_HISTORY_KEY, JSON.stringify(history))
    } catch {
        console.warn('Gagal menyimpan riwayat import')
    }
}

function clearImportHistory() {
    try {
        localStorage.removeItem(IMPORT_HISTORY_KEY)
    } catch { }
}

// ============================================================
// Parse helpers
// ============================================================

// Parse tanggal Indonesia (16-Mei-2025, 14-Apr-2025, 10-Mar-2025, dll)
function parseDate(value: string): string {
    if (!value || value.trim() === '' || value === '-') return ''
    const cleaned = value.trim()

    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned

    const monthMap: Record<string, string> = {
        'jan': '01', 'januari': '01', 'january': '01',
        'feb': '02', 'februari': '02', 'february': '02',
        'mar': '03', 'maret': '03', 'march': '03',
        'apr': '04', 'april': '04',
        'mei': '05', 'may': '05',
        'jun': '06', 'juni': '06', 'june': '06',
        'jul': '07', 'juli': '07', 'july': '07',
        'agu': '08', 'agustus': '08', 'aug': '08', 'august': '08',
        'sep': '09', 'september': '09',
        'okt': '10', 'oktober': '10', 'oct': '10', 'october': '10',
        'nov': '11', 'november': '11',
        'des': '12', 'desember': '12', 'dec': '12', 'december': '12'
    }

    // DD-Mon-YYYY or DD Mon YYYY (16-Mei-2025, 14 Apr 2025)
    const ddMonYYYY = cleaned.match(/^(\d{1,2})[\s\-\/.](\w+)[\s\-\/.](\d{4})$/i)
    if (ddMonYYYY) {
        const [, d, mon, y] = ddMonYYYY
        const m = monthMap[mon.toLowerCase()]
        if (m) return `${y}-${m}-${d.padStart(2, '0')}`
    }

    // DD/MM/YYYY or DD-MM-YYYY (numeric)
    const ddmmyyyy = cleaned.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/)
    if (ddmmyyyy) {
        const [, d, m, y] = ddmmyyyy
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
    }

    // "17 Februari 2025 dan 14-Apr-2025" → take first date
    const multiDate = cleaned.match(/(\d{1,2})[\s\-\/.](\w+)[\s\-\/.](\d{4})/i)
    if (multiDate) {
        const [, d, mon, y] = multiDate
        const m = monthMap[mon.toLowerCase()]
        if (m) return `${y}-${m}-${d.padStart(2, '0')}`
    }

    // Fallback: native Date parse
    try {
        const d = new Date(cleaned)
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
    } catch { }

    return ''
}

// Parse angka dari format Indonesia (1.500.000 atau 1,500,000)
function parseAmount(value: string): number {
    if (!value || value.trim() === '' || value === '-' || value === '#REF!' || value === '#N/A') return 0
    let cleaned = value.trim().replace(/[Rr][Pp]\.?\s*/g, '').replace(/\s/g, '')

    // Format Indonesia: titik = ribuan, koma = desimal → 1.500.000,50
    if (cleaned.includes(',') && cleaned.includes('.')) {
        const lastComma = cleaned.lastIndexOf(',')
        const lastDot = cleaned.lastIndexOf('.')
        if (lastComma > lastDot) {
            cleaned = cleaned.replace(/\./g, '').replace(',', '.')
        } else {
            cleaned = cleaned.replace(/,/g, '')
        }
    } else if (cleaned.includes('.')) {
        const parts = cleaned.split('.')
        if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
            cleaned = cleaned.replace(/\./g, '')
        }
    } else if (cleaned.includes(',')) {
        const parts = cleaned.split(',')
        if (parts.length === 2 && parts[1].length <= 2) {
            cleaned = cleaned.replace(',', '.')
        } else {
            cleaned = cleaned.replace(/,/g, '')
        }
    }

    const num = parseFloat(cleaned)
    return isNaN(num) ? 0 : num
}

// Parse progress (100%, 0%, 27%, etc)
function parseProgress(value: string): number {
    if (!value || value.trim() === '' || value === '-') return 0
    const cleaned = value.trim().replace('%', '').replace(',', '.')
    const num = parseFloat(cleaned)
    if (isNaN(num)) return 0
    return Math.min(100, Math.max(0, Math.round(num)))
}

// Derive contract type from NOMOR KONTRAK (e.g. 0008.SPK/... → SPK, 0005.PJ/... → PJ)
function deriveContractType(nomorKontrak: string, jenisKontrak: string): string {
    if (jenisKontrak && jenisKontrak.trim()) {
        const j = jenisKontrak.toUpperCase().trim()
        if (j.includes('SPK')) return 'SPK'
        if (j.includes('PJ') || j.includes('PERJANJIAN')) return 'PJ'
        if (j.includes('NON') && j.includes('PO')) return 'NON-PO'
    }
    if (nomorKontrak) {
        const upper = nomorKontrak.toUpperCase()
        if (upper.includes('.SPK') || upper.includes('/SPK')) return 'SPK'
        if (upper.includes('.PJ') || upper.includes('/PJ')) return 'PJ'
    }
    return ''
}

// Map status from PROSES DOK and progress
function mapStatus(prosesDok: string, progress: number): string {
    const p = (prosesDok || '').toUpperCase().trim()
    if (progress >= 100) return 'Selesai'
    if (p === 'TERKONTRAK' || p === 'LAKSDA' || p === 'RENDAN') return 'Dalam Pekerjaan'
    return 'Dalam Pekerjaan'
}

// Map JENIS PENGADAAN abbreviation
function mapJenisPengadaan(value: string): string {
    if (!value) return ''
    const v = value.toUpperCase().trim()
    if (v === 'PL') return 'Pengadaan Langsung'
    if (v === 'PJ') return 'Perjanjian'
    if (v === 'SPK') return 'SPK'
    return value.trim()
}

// ============================================================
// Find the header row in raw CSV data
// ============================================================
function findHeaderRowIndex(lines: string[]): number {
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
        if (lines[i].includes('(1)') && lines[i].includes('(2)') && lines[i].includes('URAIAN PEKERJAAN')) {
            return i
        }
    }
    return -1
}

// Normalize header: hapus prefix (N) dan trim
function normalizeHeader(header: string): string {
    return header.replace(/^\(\d+\)\s*/, '').trim().toUpperCase()
}

// ============================================================
// Check if row is an actual contract (not summary/separator/amendment)
// ============================================================
function isContractRow(row: Record<string, string>, headerMap: Record<string, string>): boolean {
    const get = (key: string) => (row[headerMap[key]] || '').trim()

    const prosesDok = get('PROSES DOK')
    const nomorKontrak = get('NOMOR KONTRAK')
    const vendor = get('PENYEDIA JASA / VENDOR')
    const uraian = get('URAIAN PEKERJAAN')

    // Skip baris AMANDEMEN, KONTRAK INDUK, TAHAP BAYAR
    const upper = prosesDok.toUpperCase()
    if (upper === 'AMANDEMEN' || upper === 'KONTRAK INDUK' || upper === 'TAHAP BAYAR') return false

    // Must have at least: nomor kontrak OR (vendor AND uraian)
    const hasNomor = nomorKontrak && nomorKontrak !== '-'
    const hasVendor = vendor && vendor !== '-'
    const hasUraian = uraian && uraian !== '-'

    // Skip empty/separator rows
    if (!hasNomor && !hasVendor && !hasUraian) return false

    // Must have NOMOR KONTRAK to be a proper contract
    if (!hasNomor) return false

    // Should have vendor
    if (!hasVendor) return false

    return true
}

// ============================================================
// Map CSV row → DB contract
// ============================================================
function mapRow(row: Record<string, string>, headerMap: Record<string, string>, rowIndex: number, selectedBudgetType: string = 'AI'): MappedContract {
    const get = (key: string) => (row[headerMap[key]] || '').trim()
    const warnings: string[] = []

    // Core fields
    const classCol = get('CLASS')
    const uraian = get('URAIAN PEKERJAAN')
    const nomorKontrak = get('NOMOR KONTRAK')
    const vendor = get('PENYEDIA JASA / VENDOR')
    const nilaiKon = get('NILAI KON (RP)')
    const tglKon = get('TGL KON')
    const tglAkhirKon = get('TGL AKHIR KON')
    const dirpek = get('DIRPEK')
    const jenisPengadaan = get('JENIS PENGADAAN')
    const jenisKontrak = get('JENIS KONTRAK')
    const prosesDok = get('PROSES DOK')
    const progressStr = get('% PROGRESS')
    const infoPekerjaan = get('INFORMASI PEKERJAAN')
    const jangkaWaktu = get('JANGKA WAKTU (HKL)')

    // Parse values
    const amount = parseAmount(nilaiKon)
    const progress = parseProgress(progressStr)
    const startDate = parseDate(tglKon)
    const endDate = parseDate(tglAkhirKon)

    if (!startDate && tglKon) warnings.push(`Tgl kontrak tidak bisa diparse: "${tglKon}"`)
    if (!endDate && tglAkhirKon) warnings.push(`Tgl akhir tidak bisa diparse: "${tglAkhirKon}"`)

    const contractType = deriveContractType(nomorKontrak, jenisKontrak)
    const budgetType = selectedBudgetType
    const status = mapStatus(prosesDok, progress)

    // Build contract name: URAIAN PEKERJAAN is the primary name
    const contractName = uraian || nomorKontrak || `Import CSV Baris ${rowIndex + 1}`

    // Build notes from extra fields
    const extraNotes: string[] = []

    // Info Pekerjaan important info
    if (infoPekerjaan && infoPekerjaan !== '-') {
        extraNotes.push(`Info Pekerjaan: ${infoPekerjaan}`)
    }

    const notesFields: [string, string][] = [
        ['CLASS', classCol],
        ['NO SKK', get('NO SKK')],
        ['TGL SKK', get('TGL SKK')],
        ['PRK', get('PRK')],
        ['PAGU AI', get('PAGU AI')],
        ['STATUS DOK', get('STATUS DOK')],
        ['TGL UPDATE DOK', get('TGL UPDATE DOK')],
        ['NILAI HPE', get('NILAI HPE')],
        ['SISA PAGU HPE', get('SISA PAGU HPE')],
        ['NO ND RENDAN', get('NO ND RENDAN')],
        ['TGL ND RENDAN', get('TGL ND RENDAN')],
        ['NO ND LAKSDA', get('NO ND LAKSDA')],
        ['TGL ND LAKSDA', get('TGL ND LAKSDA')],
        ['EST TGL KON', get('EST TGL KON')],
        ['NO BA EFF', get('NO BA EFF')],
        ['TGL EFF', get('TGL EFF')],
        ['JANGKA WAKTU (HKL)', jangkaWaktu],
        ['TKDN', get('TKDN')],
        ['SISA PAGU KON', get('SISA PAGU KON')],
        ['TGL AWAL JAMPEL KON', get('TGL AWAL JAMPEL KON')],
        ['WAKTU JAMPEL', get('WAKTU JAMPEL')],
        ['TGL AKHIR JAMPEL KON', get('TGL AKHIR JAMPEL KON')],
        ['NOMOR ADM', get('NOMOR ADM')],
        ['TGL ADM', get('TGL ADM')],
        ['NILAI PEK (RP)', get('NILAI PEK (RP)')],
        ['WAKTU PEK (HKL)', get('WAKTU PEK (HKL)')],
        ['TGL AKHIR PEK', get('TGL AKHIR PEK')],
        ['SISA WAKTU (HKL)', get('SISA WAKTU (HKL)')],
        ['SISA PAGU PEK', get('SISA PAGU PEK')],
        ['WAKTU (JIKA BERUBAH)', get('WAKTU (JIKA BERUBAH)')],
        ['TGL AKHIR JAMPEL', get('TGL AKHIR JAMPEL')],
        ['SISA WKTU JAMPEL', get('SISA WKTU JAMPEL')],
        ['PENILAIAN VENDOR', get('PENILAIAN VENDOR (1-100)')],
        ['NOMOR BAPS', get('NOMOR BAPS')],
        ['TGL BAPP', get('TGL BAPP')],
        ['NOMOR BAP (PANITIA)', get('NOMOR BAP (PANITIA)')],
        ['TGL BAP', get('TGL BAP')],
        ['NOMOR BA SERAH TERIMA', get('NOMOR BA SERAH TERIMA')],
        ['TGL BAST', get('TGL BAST')],
        ['NOMOR BA DENDA', get('NOMOR BA DENDA (JIKA ADA)')],
        ['TGL BA DENDA', get('TGL BA DENDA')],
        ['TGL TERIMA DOK', get('TGL TERIMA DOK')],
        ['STATUS VIP', get('STATUS VIP')],
        ['RENC', get('RENC')],
        ['REAL', get('REAL')],
        ['NO DOK TAGIHAN', get('NO DOK TAGIHAN')],
        ['NO SPM', get('NO SPM')],
        ['TGL SPM', get('TGL SPM')],
        ['TOTAL TAGIHAN', get('TOTAL TAGIHAN')],
        ['NO DOK CLR', get('NO DOK CLR')],
        ['TGL DOK CLR', get('TGL DOK CLR')],
        ['TOTAL TERBAYAR', get('TOTAL TERBAYAR')],
        ['SISA AKI', get('SISA AKI')],
    ]

    for (const [label, val] of notesFields) {
        if (val && val !== '-' && val !== '0' && val !== '#REF!' && val !== '#N/A') {
            extraNotes.push(`${label}: ${val}`)
        }
    }

    const notesText = extraNotes.length > 0
        ? `[Data CSV Tambahan]\n${extraNotes.join('\n')}`
        : ''

    // Derive kategori from CLASS (2025-TR=Transmisi, 2025-GI=Gardu Induk, etc)
    let kategori = mapJenisPengadaan(jenisPengadaan)
    if (!kategori && classCol) {
        if (classCol.includes('TR')) kategori = 'Transmisi'
        else if (classCol.includes('GI')) kategori = 'Gardu Induk'
        else if (classCol.includes('K3')) kategori = 'K3'
        else if (classCol.includes('KU')) kategori = 'KU'
        else if (classCol.includes('IND')) kategori = 'Kontrak Induk'
        else kategori = classCol
    }

    return {
        name: contractName,
        nomor_surat: nomorKontrak || null,
        perihal: contractName,
        tanggal_masuk: startDate || new Date().toISOString().split('T')[0],
        start_date: startDate || null,
        end_date: endDate || null,
        pengirim: vendor || null,
        penerima: dirpek || null,
        recipient: dirpek || null,
        invoice_number: nomorKontrak || null,
        amount,
        budget_type: budgetType,
        contract_type: contractType || null,
        status,
        kategori: kategori || '-',
        location: null,
        vendor_name: vendor || null,
        notes: notesText || null,
        progress,
        _csvRowIndex: rowIndex,
        _warnings: warnings,
        _class: classCol
    }
}

// ============================================================
// CSV Import Modal Component
// ============================================================
interface CsvImportModalProps {
    isOpen: boolean
    onClose: () => void
    onImportComplete: () => void
    showAlert: (type: string, title: string, message: string) => void
}

export default function CsvImportModal({ isOpen, onClose, onImportComplete, showAlert }: CsvImportModalProps) {
    const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'result' | 'history'>('upload')
    const [importHistory, setImportHistory] = useState<ImportLogEntry[]>([])
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null)
    const [logFilter, setLogFilter] = useState<'all' | 'duplikat' | 'gagal'>('all')
    const [resultFilter, setResultFilter] = useState<'all' | 'duplikat' | 'gagal'>('all')
    const [csvFile, setCsvFile] = useState<File | null>(null)
    const [parsedData, setParsedData] = useState<MappedContract[]>([])
    const [skippedRows, setSkippedRows] = useState<{ row: number, reason: string }[]>([])
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0, errors: 0 })
    const [importResults, setImportResults] = useState<{ success: number, failed: number, skipped: number, errors: string[] }>({ success: 0, failed: 0, skipped: 0, errors: [] })
    const [dragActive, setDragActive] = useState(false)
    const [previewPage, setPreviewPage] = useState(0)
    const [showSkipped, setShowSkipped] = useState(false)
    const [budgetType, setBudgetType] = useState<'AI' | 'AO'>('AI')
    const fileInputRef = useRef<HTMLInputElement>(null)

    const PREVIEW_PAGE_SIZE = 10

    // Load history on mount
    useEffect(() => {
        if (isOpen) {
            setImportHistory(loadImportHistory())
        }
    }, [isOpen])

    const resetState = () => {
        setStep('upload')
        setCsvFile(null)
        setParsedData([])
        setSkippedRows([])
        setImportProgress({ current: 0, total: 0, errors: 0 })
        setImportResults({ success: 0, failed: 0, skipped: 0, errors: [] })
        setPreviewPage(0)
        setShowSkipped(false)
        setBudgetType('AI')
    }

    const handleClose = () => {
        resetState()
        onClose()
    }

    // Process the CSV file
    const processFile = useCallback((file: File) => {
        setCsvFile(file)

        const reader = new FileReader()
        reader.onload = (e) => {
            const text = e.target?.result as string
            if (!text) {
                showAlert('error', 'File Kosong', 'File CSV tidak memiliki konten')
                return
            }

            // Split into lines to find the header row
            const allLines = text.split('\n')
            const headerRowIdx = findHeaderRowIndex(allLines)

            if (headerRowIdx === -1) {
                // Fallback: try parsing as regular CSV (no summary rows)
                parseWithPapa(text, 0)
                return
            }

            // Reconstruct CSV from header row onward
            const dataLines = allLines.slice(headerRowIdx).join('\n')
            parseWithPapa(dataLines, headerRowIdx)
        }
        reader.readAsText(file, 'UTF-8')
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showAlert])

    const parseWithPapa = (csvText: string, headerOffset: number) => {
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const rawFields = results.meta.fields || []

                // Build normalized header map
                const headerMap: Record<string, string> = {}
                for (const field of rawFields) {
                    const normalized = normalizeHeader(field)
                    headerMap[normalized] = field
                }

                // Process rows
                const contracts: MappedContract[] = []
                const skipped: { row: number, reason: string }[] = []
                const rows = results.data as Record<string, string>[]

                for (let i = 0; i < rows.length; i++) {
                    const row = rows[i]
                    const actualRow = headerOffset + i + 2 // +1 for header, +1 for 1-based

                    const get = (key: string) => (row[headerMap[key]] || '').trim()
                    const prosesDok = get('PROSES DOK')
                    const nomorKontrak = get('NOMOR KONTRAK')
                    const vendor = get('PENYEDIA JASA / VENDOR')
                    const uraian = get('URAIAN PEKERJAAN')

                    // Determine skip reason
                    const upper = prosesDok.toUpperCase()
                    if (upper === 'AMANDEMEN') {
                        skipped.push({ row: actualRow, reason: `Amandemen: ${uraian || '-'}` })
                        continue
                    }
                    if (upper === 'KONTRAK INDUK') {
                        skipped.push({ row: actualRow, reason: `Kontrak Induk: ${uraian || '-'}` })
                        continue
                    }
                    if (upper === 'TAHAP BAYAR') {
                        skipped.push({ row: actualRow, reason: `Tahap Bayar: ${uraian || '-'}` })
                        continue
                    }

                    if (!isContractRow(row, headerMap)) {
                        // Only log if row has some data
                        if (uraian || nomorKontrak) {
                            skipped.push({ row: actualRow, reason: `Baris ringkasan/tidak lengkap: ${uraian || nomorKontrak || '-'}` })
                        }
                        continue
                    }

                    const contract = mapRow(row, headerMap, actualRow, budgetType)
                    contracts.push(contract)
                }

                setParsedData(contracts)
                setSkippedRows(skipped)
                setStep('preview')
            },
            error: (error: any) => {
                showAlert('error', 'Gagal Parse CSV', `Error: ${error.message}`)
            }
        })
    }

    // File input handler
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (!file.name.endsWith('.csv')) {
                showAlert('error', 'Format Salah', 'Hanya file CSV (.csv) yang diperbolehkan')
                return
            }
            processFile(file)
        }
    }

    // Drag & drop
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true)
        else if (e.type === 'dragleave') setDragActive(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)
        const file = e.dataTransfer.files?.[0]
        if (file) {
            if (!file.name.endsWith('.csv')) {
                showAlert('error', 'Format Salah', 'Hanya file CSV (.csv) yang diperbolehkan')
                return
            }
            processFile(file)
        }
    }

    // Remove a row from preview
    const handleRemoveRow = (index: number) => {
        setParsedData(prev => prev.filter((_, i) => i !== index))
    }

    // Download template CSV
    const handleDownloadTemplate = () => {
        const headers = [
            '(1) CLASS', '(2) URAIAN PEKERJAAN', '(3) NO SKK', '(4) TGL SKK', '(5) PRK',
            '(6) PAGU AI', '(7) STATUS DOK', '(8) TGL UPDATE DOK', '(9) NILAI HPE',
            '(10) SISA PAGU HPE', '(11) NO ND RENDAN', '(12) TGL ND RENDAN',
            '(13) NO ND LAKSDA', '(14) TGL ND LAKSDA', '(15) PROSES DOK',
            '(16) PENYEDIA JASA / VENDOR', '(17) NOMOR KONTRAK', '(18) NILAI KON (RP)',
            '(19) EST TGL KON', '(20) TGL KON', '(21) NO BA EFF', '(22) TGL EFF',
            '(23) JANGKA WAKTU (HKL)', '(24) TGL AKHIR KON', '(25) DIRPEK',
            '(26) JENIS PENGADAAN', '(27) JENIS KONTRAK', '(28) TKDN',
            '(29) SISA PAGU KON', '(30) TGL AWAL JAMPEL KON', '(31) WAKTU JAMPEL',
            '(32) TGL AKHIR JAMPEL KON', '(33) NOMOR ADM', '(34) TGL ADM',
            '(35) NILAI PEK (RP)', '(36) WAKTU PEK (HKL)', '(37) TGL AKHIR PEK',
            '(38) SISA WAKTU (HKL)', '(39) SISA PAGU PEK', '(40) WAKTU (JIKA BERUBAH)',
            '(41) TGL AKHIR JAMPEL', '(42) SISA WKTU JAMPEL', '(43) % PROGRESS',
            '(44) INFORMASI PEKERJAAN', '(45) PENILAIAN VENDOR (1-100)'
        ]

        const example = [
            '2025-TR', 'PEKERJAAN PENANGANAN TOWER KRITIS', '', '', '',
            '', 'LAKSDA', '14-Apr-2025', '299.064.116',
            '', '', '', '', '', 'TERKONTRAK',
            'PT CONTOH VENDOR', '0008.SPK/DAN.01.03/F47040000/2025', '298.973.095',
            '', '10-Mar-2025', '', '10-Mar-2025',
            '90', '07-Jun-2025', 'ASMAN KONSTRUKSI',
            'PL', '', '',
            '', '', '',
            '', '', '',
            '298.973.095', '90', '07-Jun-2025',
            '', '', '',
            '', '', '100%',
            'Pekerjaan Selesai', ''
        ]

        const csvContent = headers.join(',') + '\n' + example.map(v => v.includes(',') ? `"${v}"` : v).join(',') + '\n'
        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'template_import_kontrak.csv'
        a.click()
        URL.revokeObjectURL(url)
    }

    // Run import
    const handleImport = async () => {
        if (parsedData.length === 0) return

        setStep('importing')
        setImportProgress({ current: 0, total: parsedData.length, errors: 0 })

        const results = { success: 0, failed: 0, skipped: 0, errors: [] as string[] }

        for (let i = 0; i < parsedData.length; i++) {
            const contract = parsedData[i]

            try {
                // Check duplicate nomor_surat
                if (contract.nomor_surat) {
                    const { data: existing } = await supabase
                        .from('contracts')
                        .select('id')
                        .eq('nomor_surat', contract.nomor_surat)
                        .limit(1)

                    if (existing && existing.length > 0) {
                        results.skipped++
                        results.errors.push(`Baris ${contract._csvRowIndex}: "${contract.nomor_surat}" sudah ada di sistem → dilewati`)
                        setImportProgress(prev => ({ ...prev, current: i + 1 }))
                        continue
                    }
                }

                // Prepare payload (remove internal fields)
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { _csvRowIndex, _warnings, _class, ...payload } = contract

                // Insert contract
                const { error: insertError } = await supabase
                    .from('contracts')
                    .insert([payload])

                if (insertError) throw insertError

                // Auto-sync vendor
                if (contract.vendor_name && contract.vendor_name.trim() !== '') {
                    try {
                        await autoSyncVendor(contract.vendor_name)
                    } catch (vendorErr) {
                        console.warn('Vendor sync warning:', vendorErr)
                    }
                }

                // Insert history
                try {
                    await supabase.from('contract_history').insert([{
                        contract_id: contract.nomor_surat,
                        action: 'Import CSV',
                        user_name: 'Admin',
                        details: `Kontrak diimport dari file CSV: ${csvFile?.name || 'unknown'}`
                    }])
                } catch { }

                results.success++
            } catch (err: any) {
                results.failed++
                const msg = err?.message || 'Unknown error'
                results.errors.push(`Baris ${contract._csvRowIndex} (${contract.name.substring(0, 50)}): ${msg}`)
            }

            setImportProgress(prev => ({
                ...prev,
                current: i + 1,
                errors: results.failed + results.skipped
            }))
        }

        // Update vendor statuses
        try { await updateVendorContractStatus() } catch { }

        // Save to import history
        const logEntry: ImportLogEntry = {
            id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
            timestamp: new Date().toISOString(),
            fileName: csvFile?.name || 'unknown',
            budgetType,
            totalParsed: parsedData.length,
            success: results.success,
            failed: results.failed,
            skipped: results.skipped,
            errors: results.errors
        }
        saveImportLog(logEntry)
        setImportHistory(loadImportHistory())

        setImportResults(results)
        setStep('result')
        if (results.success > 0) onImportComplete()
    }

    // Format currency
    const fmtCurrency = (val: number) => {
        if (!val) return '-'
        return 'Rp ' + val.toLocaleString('id-ID')
    }

    if (!isOpen) return null

    const paginatedData = parsedData.slice(
        previewPage * PREVIEW_PAGE_SIZE,
        (previewPage + 1) * PREVIEW_PAGE_SIZE
    )
    const totalPages = Math.ceil(parsedData.length / PREVIEW_PAGE_SIZE)

    return (
        <div className="modal-overlay" onClick={handleClose} style={{ zIndex: 9999 }}>
            <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{
                    maxWidth: step === 'preview' ? '1200px' : '620px',
                    width: '95%',
                    maxHeight: '90vh',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Upload size={20} color="white" />
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>Import Kontrak dari CSV</h2>
                            <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                                {step === 'upload' && 'Upload file CSV Monitoring SKKI untuk migrasi data'}
                                {step === 'preview' && `${parsedData.length} kontrak terdeteksi, siap diimport`}
                                {step === 'importing' && 'Sedang mengimport data...'}
                                {step === 'result' && 'Import selesai'}
                                {step === 'history' && `${importHistory.length} riwayat import tercatat`}
                            </p>
                        </div>
                    </div>
                    <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                        <X size={20} color="#64748b" />
                    </button>
                </div>

                {/* Body */}
                <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>

                    {/* STEP 1: Upload */}
                    {step === 'upload' && (
                        <div>
                            {/* History button */}
                            {importHistory.length > 0 && (
                                <div style={{ marginBottom: '16px' }}>
                                    <button
                                        onClick={() => setStep('history')}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                                            padding: '12px 16px', borderRadius: '12px',
                                            border: '1px solid #e2e8f0', background: '#f8fafc',
                                            cursor: 'pointer', fontSize: '14px', fontWeight: 600, color: '#475569',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <Clock size={18} color="#64748b" />
                                        <span>Riwayat Import</span>
                                        {importHistory.some(h => h.failed > 0 || h.skipped > 0) && (
                                            <span style={{
                                                marginLeft: 'auto', padding: '2px 10px', borderRadius: '20px',
                                                fontSize: '12px', fontWeight: 700,
                                                background: '#fef2f2', color: '#dc2626'
                                            }}>
                                                {importHistory.filter(h => h.failed > 0).length} ada error
                                            </span>
                                        )}
                                        {!importHistory.some(h => h.failed > 0) && (
                                            <span style={{
                                                marginLeft: 'auto', padding: '2px 10px', borderRadius: '20px',
                                                fontSize: '12px', fontWeight: 700,
                                                background: '#f0fdf4', color: '#16a34a'
                                            }}>
                                                {importHistory.length} log
                                            </span>
                                        )}
                                    </button>
                                </div>
                            )}

                            {/* Drop zone */}
                            <div
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    border: `2px dashed ${dragActive ? '#3b82f6' : '#cbd5e1'}`,
                                    borderRadius: '16px',
                                    padding: '48px 24px',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    background: dragActive ? '#eff6ff' : '#f8fafc',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <FileText size={48} color={dragActive ? '#3b82f6' : '#94a3b8'} style={{ marginBottom: '16px' }} />
                                <p style={{ fontSize: '16px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                                    {dragActive ? 'Lepaskan file di sini' : 'Klik atau seret file CSV ke sini'}
                                </p>
                                <p style={{ fontSize: '13px', color: '#64748b' }}>
                                    Mendukung format Monitoring SKKI (.csv)
                                </p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileSelect}
                                    style={{ display: 'none' }}
                                />
                            </div>

                            {/* Budget Type Selector */}
                            <div style={{
                                marginTop: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '12px'
                            }}>
                                <label style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                                    Tipe Anggaran:
                                </label>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => setBudgetType('AI')}
                                        style={{
                                            padding: '10px 24px',
                                            borderRadius: '10px',
                                            border: budgetType === 'AI' ? '2px solid #2563eb' : '2px solid #e2e8f0',
                                            background: budgetType === 'AI' ? 'linear-gradient(135deg, #dbeafe, #eff6ff)' : 'white',
                                            fontWeight: 700,
                                            fontSize: '14px',
                                            color: budgetType === 'AI' ? '#1d4ed8' : '#64748b',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        AI
                                        <span style={{ display: 'block', fontSize: '11px', fontWeight: 500, opacity: 0.8 }}>Anggaran Investasi</span>
                                    </button>
                                    <button
                                        onClick={() => setBudgetType('AO')}
                                        style={{
                                            padding: '10px 24px',
                                            borderRadius: '10px',
                                            border: budgetType === 'AO' ? '2px solid #7c3aed' : '2px solid #e2e8f0',
                                            background: budgetType === 'AO' ? 'linear-gradient(135deg, #ede9fe, #f5f3ff)' : 'white',
                                            fontWeight: 700,
                                            fontSize: '14px',
                                            color: budgetType === 'AO' ? '#6d28d9' : '#64748b',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        AO
                                        <span style={{ display: 'block', fontSize: '11px', fontWeight: 500, opacity: 0.8 }}>Anggaran Operasional</span>
                                    </button>
                                </div>
                            </div>

                            {/* Download template */}
                            <div style={{ marginTop: '20px', textAlign: 'center' }}>
                                <button
                                    onClick={handleDownloadTemplate}
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                                        padding: '10px 20px', background: 'white', border: '1px solid #e2e8f0',
                                        borderRadius: '10px', fontSize: '14px', fontWeight: 600, color: '#334155', cursor: 'pointer'
                                    }}
                                >
                                    <Download size={16} /> Download Template CSV
                                </button>
                            </div>

                            {/* Column mapping info */}
                            <div style={{ marginTop: '24px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '16px' }}>
                                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#166534', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <CheckCircle size={16} /> Kolom CSV yang Diambil Otomatis
                                </h4>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '6px', fontSize: '13px', color: '#15803d' }}>
                                    <div><b>(2) URAIAN PEKERJAAN</b> → Nama Kontrak</div>
                                    <div><b>(16) PENYEDIA JASA / VENDOR</b> → Nama Vendor</div>
                                    <div><b>(17) NOMOR KONTRAK</b> → Nomor Surat/Kontrak</div>
                                    <div><b>(18) NILAI KON (RP)</b> → Nilai Kontrak</div>
                                    <div><b>(20) TGL KON</b> → Tanggal Mulai</div>
                                    <div><b>(24) TGL AKHIR KON</b> → Tanggal Selesai</div>
                                    <div><b>(25) DIRPEK</b> → Ditujukan Kepada</div>
                                    <div><b>(26) JENIS PENGADAAN</b> → Kategori</div>
                                    <div><b>(27) JENIS KONTRAK</b> → Tipe Kontrak</div>
                                    <div><b>(43) % PROGRESS</b> → Progress</div>
                                    <div><b>Tipe Anggaran</b> → Dipilih via dropdown ({budgetType})</div>
                                    <div><b>(15) PROSES DOK</b> → Status</div>
                                </div>
                                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '12px' }}>
                                    * Baris AMANDEMEN, KONTRAK INDUK, TAHAP BAYAR, dan ringkasan otomatis dilewati.<br />
                                    * Kolom lain (NO SKK, TKDN, BAST, VIP, dll) disimpan di catatan kontrak.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Preview */}
                    {step === 'preview' && (
                        <div>
                            {/* Budget type indicator + changer */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '16px',
                                padding: '12px 16px',
                                borderRadius: '12px',
                                background: budgetType === 'AI'
                                    ? 'linear-gradient(135deg, #dbeafe, #eff6ff)'
                                    : 'linear-gradient(135deg, #ede9fe, #f5f3ff)',
                                border: `1px solid ${budgetType === 'AI' ? '#93c5fd' : '#c4b5fd'}`
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                        width: '36px', height: '36px', borderRadius: '8px', fontWeight: 800, fontSize: '14px',
                                        background: budgetType === 'AI' ? '#2563eb' : '#7c3aed', color: 'white'
                                    }}>
                                        {budgetType}
                                    </span>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '14px', color: budgetType === 'AI' ? '#1e40af' : '#5b21b6' }}>
                                            {budgetType === 'AI' ? 'Anggaran Investasi' : 'Anggaran Operasional'}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>Semua kontrak akan diimport dengan tipe {budgetType}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        const newType = budgetType === 'AI' ? 'AO' : 'AI'
                                        setBudgetType(newType)
                                        setParsedData(prev => prev.map(c => ({ ...c, budget_type: newType })))
                                    }}
                                    style={{
                                        padding: '6px 14px', borderRadius: '8px',
                                        border: `1px solid ${budgetType === 'AI' ? '#93c5fd' : '#c4b5fd'}`,
                                        background: 'white', fontWeight: 600, fontSize: '13px',
                                        color: budgetType === 'AI' ? '#2563eb' : '#7c3aed',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Ganti ke {budgetType === 'AI' ? 'AO' : 'AI'}
                                </button>
                            </div>

                            {/* Stats bar */}
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                                <StatCard value={parsedData.length} label="Kontrak Siap Import" bg="#eff6ff" color="#1d4ed8" />
                                <StatCard value={skippedRows.length} label="Baris Dilewati" bg="#fef3c7" color="#92400e" />
                                <StatCard value={parsedData.filter(d => (d._warnings?.length || 0) > 0).length} label="Ada Warning" bg="#fdf2f8" color="#9d174d" />
                            </div>

                            {/* Skipped rows toggle */}
                            {skippedRows.length > 0 && (
                                <div style={{ marginBottom: '16px' }}>
                                    <button
                                        onClick={() => setShowSkipped(!showSkipped)}
                                        style={{
                                            background: 'none', border: '1px solid #e2e8f0', padding: '8px 16px',
                                            borderRadius: '8px', fontSize: '13px', color: '#64748b', cursor: 'pointer', fontWeight: 600
                                        }}
                                    >
                                        {showSkipped ? '▼' : '▶'} {skippedRows.length} baris dilewati (AMANDEMEN, ringkasan, dll)
                                    </button>
                                    {showSkipped && (
                                        <div style={{ marginTop: '8px', background: '#fefce8', border: '1px solid #fde68a', borderRadius: '12px', padding: '12px', maxHeight: '200px', overflowY: 'auto' }}>
                                            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '12px', color: '#78350f' }}>
                                                {skippedRows.slice(0, 50).map((s, i) => (
                                                    <li key={i}>Baris {s.row}: {s.reason}</li>
                                                ))}
                                                {skippedRows.length > 50 && <li>...dan {skippedRows.length - 50} lainnya</li>}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Preview table */}
                            <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                    <thead>
                                        <tr style={{ background: '#f8fafc' }}>
                                            <th style={{ ...thStyle, width: '40px' }}>#</th>
                                            <th style={thStyle}>Class</th>
                                            <th style={thStyle}>Nomor Kontrak</th>
                                            <th style={{ ...thStyle, minWidth: '200px' }}>Nama Kontrak</th>
                                            <th style={thStyle}>Vendor</th>
                                            <th style={{ ...thStyle, textAlign: 'right' }}>Nilai (Rp)</th>
                                            <th style={thStyle}>Tgl Mulai</th>
                                            <th style={thStyle}>Tgl Selesai</th>
                                            <th style={thStyle}>Tipe</th>
                                            <th style={thStyle}>Progress</th>
                                            <th style={thStyle}>Status</th>
                                            <th style={{ ...thStyle, width: '40px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedData.map((row, idx) => {
                                            const globalIdx = previewPage * PREVIEW_PAGE_SIZE + idx
                                            const hasWarning = (row._warnings?.length || 0) > 0
                                            return (
                                                <tr key={globalIdx} style={{ borderBottom: '1px solid #f1f5f9', background: hasWarning ? '#fffbeb' : 'white' }}>
                                                    <td style={tdStyle}>{globalIdx + 1}</td>
                                                    <td style={tdStyle}>
                                                        <span style={{
                                                            display: 'inline-block', padding: '2px 8px', borderRadius: '6px',
                                                            fontSize: '11px', fontWeight: 700,
                                                            background: row._class?.includes('TR') ? '#dbeafe' :
                                                                row._class?.includes('GI') ? '#dcfce7' :
                                                                    row._class?.includes('K3') ? '#fef3c7' : '#f1f5f9',
                                                            color: row._class?.includes('TR') ? '#1e40af' :
                                                                row._class?.includes('GI') ? '#166534' :
                                                                    row._class?.includes('K3') ? '#92400e' : '#475569'
                                                        }}>
                                                            {row._class || '-'}
                                                        </span>
                                                    </td>
                                                    <td style={tdStyle}>
                                                        <span style={{ fontSize: '11px', fontWeight: 600, color: '#1e293b', fontFamily: 'monospace' }}>
                                                            {row.nomor_surat ? (row.nomor_surat.length > 25 ? row.nomor_surat.substring(0, 25) + '...' : row.nomor_surat) : '-'}
                                                        </span>
                                                    </td>
                                                    <td style={{ ...tdStyle, maxWidth: '250px' }}>
                                                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.name}>
                                                            {row.name || '-'}
                                                        </div>
                                                        {hasWarning && (
                                                            <div style={{ fontSize: '11px', color: '#d97706', marginTop: '2px' }}>
                                                                ⚠ {row._warnings?.join(', ')}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td style={{ ...tdStyle, maxWidth: '150px' }}>
                                                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.vendor_name}>
                                                            {row.vendor_name || '-'}
                                                        </div>
                                                    </td>
                                                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, fontFamily: 'monospace', fontSize: '12px' }}>
                                                        {fmtCurrency(row.amount)}
                                                    </td>
                                                    <td style={tdStyle}>{row.start_date || '-'}</td>
                                                    <td style={tdStyle}>{row.end_date || '-'}</td>
                                                    <td style={tdStyle}>
                                                        <span style={{
                                                            display: 'inline-block', padding: '2px 8px', borderRadius: '6px',
                                                            fontSize: '11px', fontWeight: 700,
                                                            background: row.contract_type === 'PJ' ? '#ede9fe' : row.contract_type === 'SPK' ? '#fce7f3' : '#f1f5f9',
                                                            color: row.contract_type === 'PJ' ? '#6d28d9' : row.contract_type === 'SPK' ? '#be185d' : '#475569'
                                                        }}>
                                                            {row.contract_type || '-'}
                                                        </span>
                                                    </td>
                                                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                        <span style={{ fontWeight: 700, color: row.progress >= 100 ? '#16a34a' : row.progress > 0 ? '#2563eb' : '#94a3b8' }}>
                                                            {row.progress}%
                                                        </span>
                                                    </td>
                                                    <td style={tdStyle}>
                                                        <span style={{
                                                            display: 'inline-block', padding: '3px 10px', borderRadius: '20px',
                                                            fontSize: '11px', fontWeight: 700,
                                                            background: row.status === 'Selesai' ? '#dcfce7' : '#e0e7ff',
                                                            color: row.status === 'Selesai' ? '#166534' : '#3730a3'
                                                        }}>
                                                            {row.status}
                                                        </span>
                                                    </td>
                                                    <td style={tdStyle}>
                                                        <button
                                                            onClick={() => handleRemoveRow(globalIdx)}
                                                            title="Hapus baris ini dari import"
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#ef4444' }}
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
                                    <button
                                        disabled={previewPage === 0}
                                        onClick={() => setPreviewPage(p => p - 1)}
                                        style={{ ...pagBtnStyle, opacity: previewPage === 0 ? 0.5 : 1 }}
                                    >
                                        ← Sebelumnya
                                    </button>
                                    <span style={{ fontSize: '13px', color: '#64748b' }}>
                                        {previewPage + 1} / {totalPages}
                                    </span>
                                    <button
                                        disabled={previewPage >= totalPages - 1}
                                        onClick={() => setPreviewPage(p => p + 1)}
                                        style={{ ...pagBtnStyle, opacity: previewPage >= totalPages - 1 ? 0.5 : 1 }}
                                    >
                                        Selanjutnya →
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 3: Importing */}
                    {step === 'importing' && (
                        <div style={{ textAlign: 'center', padding: '40px 0' }}>
                            <div style={{ marginBottom: '24px' }}>
                                <Loader2 size={48} color="#3b82f6" style={{ animation: 'csv-spin 1s linear infinite' }} />
                            </div>
                            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>
                                Mengimport Data...
                            </h3>
                            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
                                {importProgress.current} dari {importProgress.total} kontrak
                            </p>
                            <div style={{ width: '100%', height: '12px', background: '#e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                                <div style={{
                                    width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%`,
                                    height: '100%',
                                    background: importProgress.errors > 0 ? 'linear-gradient(90deg, #3b82f6, #f59e0b)' : 'linear-gradient(90deg, #3b82f6, #10b981)',
                                    borderRadius: '6px',
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                            {importProgress.errors > 0 && (
                                <p style={{ fontSize: '13px', color: '#f59e0b', marginTop: '12px' }}>{importProgress.errors} dilewati/gagal</p>
                            )}
                            <style>{`@keyframes csv-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                        </div>
                    )}

                    {/* STEP 5: Import History */}
                    {step === 'history' && (
                        <div>
                            {importHistory.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                    <Clock size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} />
                                    <p style={{ fontSize: '16px', fontWeight: 600, color: '#94a3b8' }}>Belum ada riwayat import</p>
                                </div>
                            ) : (
                                <div>
                                    {/* Summary */}
                                    <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                                        <StatCard value={importHistory.length} label="Total Import" bg="#eff6ff" color="#1d4ed8" />
                                        <StatCard value={importHistory.reduce((sum, h) => sum + h.success, 0)} label="Total Berhasil" bg="#f0fdf4" color="#166534" />
                                        <StatCard value={importHistory.filter(h => h.failed > 0).length} label="Import Bermasalah" bg="#fef2f2" color="#991b1b" />
                                    </div>

                                    {/* Log list */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
                                        {importHistory.map((log) => {
                                            const date = new Date(log.timestamp)
                                            const dateStr = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
                                            const timeStr = date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                                            const hasErrors = log.failed > 0
                                            const hasSkipped = log.skipped > 0
                                            const isExpanded = expandedLogId === log.id
                                            const allGood = !hasErrors && !hasSkipped

                                            return (
                                                <div
                                                    key={log.id}
                                                    style={{
                                                        borderRadius: '12px',
                                                        border: `1px solid ${hasErrors ? '#fecaca' : hasSkipped ? '#fde68a' : '#d1fae5'}`,
                                                        background: hasErrors ? '#fffbfb' : hasSkipped ? '#fffdf5' : '#f0fdf4',
                                                        overflow: 'hidden'
                                                    }}
                                                >
                                                    {/* Header row */}
                                                    <div
                                                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: '12px',
                                                            padding: '14px 16px', cursor: 'pointer',
                                                            transition: 'background 0.15s',
                                                        }}
                                                    >
                                                        {/* Status icon */}
                                                        <div style={{
                                                            width: '36px', height: '36px', borderRadius: '8px',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            background: hasErrors ? '#fee2e2' : hasSkipped ? '#fef3c7' : '#dcfce7',
                                                            flexShrink: 0
                                                        }}>
                                                            {hasErrors ? <AlertCircle size={18} color="#dc2626" /> :
                                                                hasSkipped ? <AlertCircle size={18} color="#d97706" /> :
                                                                    <CheckCircle size={18} color="#16a34a" />}
                                                        </div>

                                                        {/* Info */}
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                <span style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                                                                    {log.fileName}
                                                                </span>
                                                                <span style={{
                                                                    padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                                                                    background: log.budgetType === 'AI' ? '#dbeafe' : '#ede9fe',
                                                                    color: log.budgetType === 'AI' ? '#1d4ed8' : '#6d28d9'
                                                                }}>
                                                                    {log.budgetType}
                                                                </span>
                                                            </div>
                                                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                                                {dateStr} • {timeStr} • {log.totalParsed} data diproses
                                                            </div>
                                                        </div>

                                                        {/* Counts */}
                                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                                                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a' }}>
                                                                ✓ {log.success}
                                                            </span>
                                                            {hasSkipped && (
                                                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#d97706' }}>
                                                                    ⊘ {log.skipped}
                                                                </span>
                                                            )}
                                                            {hasErrors && (
                                                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626' }}>
                                                                    ✗ {log.failed}
                                                                </span>
                                                            )}
                                                            {isExpanded ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
                                                        </div>
                                                    </div>

                                                    {/* Expanded details */}
                                                    {isExpanded && (
                                                        <div style={{ borderTop: '1px solid #e2e8f0', padding: '16px' }}>
                                                            {/* Filter tabs */}
                                                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                                                                <button
                                                                    onClick={() => setLogFilter('all')}
                                                                    style={{
                                                                        padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                                                                        border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                                                                        background: logFilter === 'all' ? '#1e293b' : '#f1f5f9',
                                                                        color: logFilter === 'all' ? 'white' : '#64748b',
                                                                    }}
                                                                >
                                                                    Semua ({log.errors.length})
                                                                </button>
                                                                {log.skipped > 0 && (
                                                                    <button
                                                                        onClick={() => setLogFilter('duplikat')}
                                                                        style={{
                                                                            padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                                                                            border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                                                                            background: logFilter === 'duplikat' ? '#f59e0b' : '#fef3c7',
                                                                            color: logFilter === 'duplikat' ? 'white' : '#92400e',
                                                                        }}
                                                                    >
                                                                        Duplikat/Dilewati ({log.errors.filter(e => e.includes('dilewati') || e.includes('sudah ada')).length})
                                                                    </button>
                                                                )}
                                                                {log.failed > 0 && (
                                                                    <button
                                                                        onClick={() => setLogFilter('gagal')}
                                                                        style={{
                                                                            padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                                                                            border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                                                                            background: logFilter === 'gagal' ? '#ef4444' : '#fee2e2',
                                                                            color: logFilter === 'gagal' ? 'white' : '#991b1b',
                                                                        }}
                                                                    >
                                                                        Gagal ({log.errors.filter(e => !e.includes('dilewati') && !e.includes('sudah ada')).length})
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {/* Filtered error details */}
                                                            {log.errors.length > 0 && (() => {
                                                                const filtered = logFilter === 'all' ? log.errors
                                                                    : logFilter === 'duplikat' ? log.errors.filter(e => e.includes('dilewati') || e.includes('sudah ada'))
                                                                        : log.errors.filter(e => !e.includes('dilewati') && !e.includes('sudah ada'))
                                                                const isGagalView = logFilter === 'gagal'
                                                                const isDupView = logFilter === 'duplikat'
                                                                return filtered.length > 0 ? (
                                                                    <div style={{
                                                                        background: isGagalView ? '#fef2f2' : isDupView ? '#fffbeb' : (hasErrors ? '#fef2f2' : '#fffbeb'),
                                                                        border: `1px solid ${isGagalView ? '#fecaca' : isDupView ? '#fde68a' : (hasErrors ? '#fecaca' : '#fde68a')}`,
                                                                        borderRadius: '10px', padding: '12px',
                                                                        maxHeight: '200px', overflowY: 'auto'
                                                                    }}>
                                                                        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: isGagalView ? '#7f1d1d' : isDupView ? '#78350f' : (hasErrors ? '#7f1d1d' : '#78350f') }}>
                                                                            {filtered.map((err, i) => {
                                                                                const isDup = err.includes('dilewati') || err.includes('sudah ada')
                                                                                return (
                                                                                    <li key={i} style={{
                                                                                        marginBottom: '6px', lineHeight: '1.5',
                                                                                        padding: '4px 8px', borderRadius: '6px',
                                                                                        background: isDup ? '#fefce8' : '#fef2f2',
                                                                                        display: 'flex', alignItems: 'flex-start', gap: '8px',
                                                                                        listStyle: 'none'
                                                                                    }}>
                                                                                        <span style={{
                                                                                            display: 'inline-block', marginTop: '2px', flexShrink: 0,
                                                                                            width: '18px', height: '18px', borderRadius: '50%',
                                                                                            background: isDup ? '#fde68a' : '#fecaca',
                                                                                            color: isDup ? '#92400e' : '#dc2626',
                                                                                            fontSize: '10px', fontWeight: 800,
                                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                                                        } as any}>
                                                                                            {isDup ? '⊘' : '✗'}
                                                                                        </span>
                                                                                        <span>{err}</span>
                                                                                    </li>
                                                                                )
                                                                            })}
                                                                        </ul>
                                                                    </div>
                                                                ) : (
                                                                    <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
                                                                        Tidak ada data untuk filter ini
                                                                    </p>
                                                                )
                                                            })()}

                                                            {log.errors.length === 0 && (
                                                                <p style={{ margin: 0, fontSize: '13px', color: '#16a34a', fontWeight: 600 }}>
                                                                    ✓ Tidak ada error pada import ini
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 4: Results */}
                    {step === 'result' && (
                        <div>
                            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                                {importResults.success > 0 ? (
                                    <CheckCircle size={56} color="#10b981" style={{ marginBottom: '16px' }} />
                                ) : (
                                    <AlertCircle size={56} color="#ef4444" style={{ marginBottom: '16px' }} />
                                )}
                                <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>
                                    {importResults.failed === 0 && importResults.skipped === 0
                                        ? 'Import Berhasil!'
                                        : 'Import Selesai'}
                                </h3>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                                <StatCard value={importResults.success} label="Berhasil" bg="#f0fdf4" color="#166534" />
                                <StatCard value={importResults.skipped} label="Duplikat/Dilewati" bg="#fefce8" color="#854d0e" />
                                <StatCard value={importResults.failed} label="Gagal" bg="#fef2f2" color="#991b1b" />
                            </div>

                            {importResults.errors.length > 0 && (() => {
                                const allErrors = importResults.errors
                                const dupErrors = allErrors.filter(e => e.includes('dilewati') || e.includes('sudah ada'))
                                const failErrors = allErrors.filter(e => !e.includes('dilewati') && !e.includes('sudah ada'))
                                const filtered = resultFilter === 'all' ? allErrors
                                    : resultFilter === 'duplikat' ? dupErrors
                                        : failErrors

                                return (
                                    <div>
                                        {/* Filter tabs */}
                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                                            <button
                                                onClick={() => setResultFilter('all')}
                                                style={{
                                                    padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                                                    border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                                                    background: resultFilter === 'all' ? '#1e293b' : '#f1f5f9',
                                                    color: resultFilter === 'all' ? 'white' : '#64748b',
                                                }}
                                            >
                                                Semua ({allErrors.length})
                                            </button>
                                            {dupErrors.length > 0 && (
                                                <button
                                                    onClick={() => setResultFilter('duplikat')}
                                                    style={{
                                                        padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                                                        border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                                                        background: resultFilter === 'duplikat' ? '#f59e0b' : '#fef3c7',
                                                        color: resultFilter === 'duplikat' ? 'white' : '#92400e',
                                                    }}
                                                >
                                                    Duplikat ({dupErrors.length})
                                                </button>
                                            )}
                                            {failErrors.length > 0 && (
                                                <button
                                                    onClick={() => setResultFilter('gagal')}
                                                    style={{
                                                        padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                                                        border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                                                        background: resultFilter === 'gagal' ? '#ef4444' : '#fee2e2',
                                                        color: resultFilter === 'gagal' ? 'white' : '#991b1b',
                                                    }}
                                                >
                                                    Gagal ({failErrors.length})
                                                </button>
                                            )}
                                        </div>

                                        {/* Filtered list */}
                                        {filtered.length > 0 ? (
                                            <div style={{
                                                background: resultFilter === 'gagal' ? '#fef2f2' : resultFilter === 'duplikat' ? '#fffbeb' : '#fef2f2',
                                                border: `1px solid ${resultFilter === 'gagal' ? '#fecaca' : resultFilter === 'duplikat' ? '#fde68a' : '#fecaca'}`,
                                                borderRadius: '12px', padding: '16px', maxHeight: '250px', overflowY: 'auto'
                                            }}>
                                                <ul style={{ margin: 0, paddingLeft: '0', fontSize: '12px', listStyle: 'none' }}>
                                                    {filtered.map((err, i) => {
                                                        const isDup = err.includes('dilewati') || err.includes('sudah ada')
                                                        return (
                                                            <li key={i} style={{
                                                                marginBottom: '6px', lineHeight: '1.5',
                                                                padding: '6px 10px', borderRadius: '8px',
                                                                background: isDup ? '#fefce8' : '#fef2f2',
                                                                border: `1px solid ${isDup ? '#fde68a' : '#fecaca'}`,
                                                                display: 'flex', alignItems: 'flex-start', gap: '8px'
                                                            }}>
                                                                <span style={{
                                                                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                                                    flexShrink: 0, marginTop: '1px',
                                                                    width: '20px', height: '20px', borderRadius: '50%',
                                                                    background: isDup ? '#fde68a' : '#fecaca',
                                                                    color: isDup ? '#92400e' : '#dc2626',
                                                                    fontSize: '11px', fontWeight: 800
                                                                }}>
                                                                    {isDup ? '⊘' : '✗'}
                                                                </span>
                                                                <span style={{ color: isDup ? '#78350f' : '#7f1d1d' }}>{err}</span>
                                                            </li>
                                                        )
                                                    })}
                                                </ul>
                                            </div>
                                        ) : (
                                            <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
                                                Tidak ada data untuk filter ini
                                            </p>
                                        )}
                                    </div>
                                )
                            })()}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 24px', borderTop: '1px solid #e2e8f0',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px'
                }}>
                    {step === 'upload' && (
                        <>
                            <div />
                            <button onClick={handleClose} style={cancelBtnStyle}>Batal</button>
                        </>
                    )}

                    {step === 'history' && (
                        <>
                            <button onClick={() => setStep('upload')} style={cancelBtnStyle}>← Kembali</button>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                {importHistory.length > 0 && (
                                    <button
                                        onClick={() => {
                                            if (confirm('Hapus semua riwayat import?')) {
                                                clearImportHistory()
                                                setImportHistory([])
                                                setExpandedLogId(null)
                                            }
                                        }}
                                        style={{ ...cancelBtnStyle, color: '#dc2626', borderColor: '#fecaca', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <Trash2 size={14} /> Hapus Riwayat
                                    </button>
                                )}
                                <button onClick={handleClose} style={cancelBtnStyle}>Tutup</button>
                            </div>
                        </>
                    )}

                    {step === 'preview' && (
                        <>
                            <button onClick={resetState} style={cancelBtnStyle}>← Upload Ulang</button>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button onClick={handleClose} style={cancelBtnStyle}>Batal</button>
                                <button
                                    onClick={handleImport}
                                    disabled={parsedData.length === 0}
                                    style={{ ...primaryBtnStyle, opacity: parsedData.length === 0 ? 0.5 : 1 }}
                                >
                                    <Upload size={16} /> Import {parsedData.length} Kontrak
                                </button>
                            </div>
                        </>
                    )}

                    {step === 'importing' && (
                        <div style={{ width: '100%', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
                            Mohon tunggu, jangan tutup halaman ini...
                        </div>
                    )}

                    {step === 'result' && (
                        <>
                            <div />
                            <button onClick={handleClose} style={primaryBtnStyle}>
                                <CheckCircle size={16} /> Selesai
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

// ============================================================
// Sub-components & Styles
// ============================================================

function StatCard({ value, label, bg, color }: { value: number, label: string, bg: string, color: string }) {
    return (
        <div style={{ flex: 1, minWidth: '120px', background: bg, borderRadius: '12px', padding: '14px 18px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: '12px', color, fontWeight: 600, opacity: 0.85 }}>{label}</div>
        </div>
    )
}

const thStyle: React.CSSProperties = {
    padding: '12px 10px', textAlign: 'left', fontSize: '11px', fontWeight: 700,
    color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px',
    borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap'
}

const tdStyle: React.CSSProperties = {
    padding: '10px 10px', color: '#334155', whiteSpace: 'nowrap', fontSize: '13px'
}

const cancelBtnStyle: React.CSSProperties = {
    padding: '10px 20px', borderRadius: '10px', border: '1px solid #e2e8f0',
    background: 'white', fontWeight: 600, fontSize: '14px', color: '#64748b', cursor: 'pointer'
}

const primaryBtnStyle: React.CSSProperties = {
    padding: '10px 24px', borderRadius: '10px', border: 'none',
    background: 'linear-gradient(135deg, #10b981, #059669)', fontWeight: 700, fontSize: '14px',
    color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
    boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)'
}

const pagBtnStyle: React.CSSProperties = {
    padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0',
    background: 'white', fontWeight: 600, fontSize: '13px', color: '#334155', cursor: 'pointer'
}
