import { supabase } from '../lib/supabaseClient'

export interface SuratPengajuan {
    id: string
    nomor_surat: string
    perihal: string
    tanggal_surat: string
    nama_pekerjaan?: string
    nomor_kontrak?: string
    keterangan?: string
    file_name: string
    file_url: string
    status: 'PENDING' | 'APPROVED' | 'REJECTED'
    alasan_penolakan?: string
    vendor_id?: number
    vendor_email?: string
    created_at: string
    updated_at: string
}

export interface SuratPengajuanResult {
    success: boolean
    data?: any
    error?: string
    message?: string
}

/**
 * Submit surat pengajuan oleh vendor
 * Otomatis menyertakan vendor_id dan vendor_email
 */
export const submitSuratPengajuan = async (
    suratData: {
        nomor_surat: string
        perihal: string
        tanggal_surat: string
        nama_pekerjaan?: string
        nomor_kontrak?: string
        keterangan?: string
        file_name: string
        file_url: string
    }
): Promise<SuratPengajuanResult> => {
    try {
        // Get vendor info from localStorage
        const vendorUserId = localStorage.getItem('vendorUserId')
        const vendorEmail = localStorage.getItem('vendorEmail')

        if (!vendorUserId || !vendorEmail) {
            return {
                success: false,
                error: 'Sesi login tidak ditemukan. Silakan login ulang.'
            }
        }

        // Insert with vendor info
        const { data: surat, error: insertError } = await supabase
            .from('surat_pengajuan')
            .insert([{
                ...suratData,
                vendor_id: parseInt(vendorUserId),
                vendor_email: vendorEmail,
                status: 'PENDING'
            }])
            .select()
            .single()

        if (insertError) {
            console.error('Error submitting surat:', insertError)
            return {
                success: false,
                error: 'Gagal mengirim surat pengajuan. Silakan coba lagi.'
            }
        }

        return {
            success: true,
            message: 'Surat pengajuan berhasil dikirim',
            data: surat
        }
    } catch (error) {
        console.error('Submit surat pengajuan error:', error)
        return {
            success: false,
            error: 'Terjadi kesalahan. Silakan coba lagi.'
        }
    }
}

/**
 * Get riwayat surat pengajuan untuk vendor yang sedang login
 * Hanya menampilkan surat milik vendor tersebut
 */
export const getRiwayatSuratPengajuan = async (): Promise<SuratPengajuanResult> => {
    try {
        // Get vendor info from localStorage
        const vendorUserId = localStorage.getItem('vendorUserId')
        const vendorEmail = localStorage.getItem('vendorEmail')

        if (!vendorUserId || !vendorEmail) {
            return {
                success: false,
                error: 'Sesi login tidak ditemukan. Silakan login ulang.'
            }
        }

        // Fetch only this vendor's submissions
        const { data: suratList, error: fetchError } = await supabase
            .from('surat_pengajuan')
            .select('*')
            .eq('vendor_id', parseInt(vendorUserId))
            .order('created_at', { ascending: false })

        if (fetchError) {
            console.error('Error fetching surat:', fetchError)
            return {
                success: false,
                error: 'Gagal memuat riwayat surat. Silakan coba lagi.'
            }
        }

        return {
            success: true,
            data: suratList || []
        }
    } catch (error) {
        console.error('Get riwayat surat error:', error)
        return {
            success: false,
            error: 'Terjadi kesalahan. Silakan coba lagi.'
        }
    }
}

/**
 * Get detail surat pengajuan
 * Hanya jika surat tersebut milik vendor yang login
 */
export const getDetailSuratPengajuan = async (
    suratId: string
): Promise<SuratPengajuanResult> => {
    try {
        // Get vendor info from localStorage
        const vendorUserId = localStorage.getItem('vendorUserId')

        if (!vendorUserId) {
            return {
                success: false,
                error: 'Sesi login tidak ditemukan. Silakan login ulang.'
            }
        }

        // Fetch surat with vendor validation
        const { data: surat, error: fetchError } = await supabase
            .from('surat_pengajuan')
            .select('*')
            .eq('id', suratId)
            .eq('vendor_id', parseInt(vendorUserId))
            .single()

        if (fetchError || !surat) {
            return {
                success: false,
                error: 'Surat tidak ditemukan atau Anda tidak memiliki akses.'
            }
        }

        return {
            success: true,
            data: surat
        }
    } catch (error) {
        console.error('Get detail surat error:', error)
        return {
            success: false,
            error: 'Terjadi kesalahan. Silakan coba lagi.'
        }
    }
}

/**
 * Download file surat pengajuan
 */
export const downloadSuratFile = async (
    fileUrl: string,
    fileName: string
): Promise<void> => {
    try {
        // Create a temporary link to download
        const link = document.createElement('a')
        link.href = fileUrl
        link.download = fileName
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    } catch (error) {
        console.error('Download error:', error)
        alert('Gagal mengunduh file. Silakan coba lagi.')
    }
}
