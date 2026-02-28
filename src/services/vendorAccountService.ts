import { supabase } from '../lib/supabaseClient'

export interface VendorDeactivateResult {
    success: boolean
    message?: string
    error?: string
}

export interface VendorReactivateResult {
    success: boolean
    message?: string
    error?: string
}

/**
 * Deactivate vendor account (soft delete)
 * Sets vendor status to 'Tidak Aktif' instead of deleting
 */
export const deactivateVendorAccount = async (vendorUserId: string): Promise<VendorDeactivateResult> => {
    try {
        console.log('🔒 Attempting to DEACTIVATE vendor account ID:', vendorUserId)

        // Get vendor user email to sync with vendors table
        const { data: vendorUser, error: fetchError } = await supabase
            .from('vendor_users')
            .select('email')
            .eq('id', vendorUserId)
            .single()

        if (fetchError || !vendorUser) {
            return {
                success: false,
                error: 'Akun tidak ditemukan'
            }
        }

        // Update vendor_users status to 'Tidak Aktif' (soft delete)
        const { data, error: updateError } = await supabase
            .from('vendor_users')
            .update({ status: 'Tidak Aktif' })
            .eq('id', vendorUserId)
            .select()

        if (updateError) {
            console.error('❌ Error deactivating vendor account:', updateError)
            return {
                success: false,
                error: 'Gagal menonaktifkan akun. Silakan coba lagi.'
            }
        }

        if (!data || data.length === 0) {
            console.warn('⚠️ No rows were updated. This might be due to RLS policies or invalid ID.')
            return {
                success: false,
                error: 'Akun tidak ditemukan'
            }
        }

        // Sync status to vendors table
        const { error: vendorUpdateError } = await supabase
            .from('vendors')
            .update({ status: 'Tidak Aktif' })
            .eq('email', vendorUser.email)

        if (vendorUpdateError) {
            console.warn('⚠️ Failed to sync status to vendors table:', vendorUpdateError)
            // Don't fail the entire operation, just log warning
        }

        return {
            success: true,
            message: 'Akun berhasil dinonaktifkan'
        }
    } catch (error) {
        console.error('Unexpected error deactivating vendor account:', error)
        return {
            success: false,
            error: 'Terjadi kesalahan yang tidak terduga'
        }
    }
}

/**
 * Generate and send reactivation code to email
 */
export const sendReactivationCode = async (email: string): Promise<VendorReactivateResult> => {
    try {
        console.log('📧 Sending reactivation code to:', email)

        // Check if account exists and is deactivated
        const { data: userData, error: fetchError } = await supabase
            .from('vendor_users')
            .select('id, email, status, company_name')
            .eq('email', email)
            .single()

        if (fetchError || !userData) {
            return {
                success: false,
                error: 'Email tidak ditemukan'
            }
        }

        if (userData.status !== 'Tidak Aktif') {
            return {
                success: false,
                error: 'Akun masih aktif. Tidak perlu reaktivasi.'
            }
        }

        // Generate 6-digit OTP code
        const reactivationCode = Math.floor(100000 + Math.random() * 900000).toString()
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

        // Store code in database
        const { error: updateError } = await supabase
            .from('vendor_users')
            .update({
                reset_token: reactivationCode,
                reset_token_expires: expiresAt.toISOString()
            })
            .eq('email', email)

        if (updateError) {
            console.error('Error storing reactivation code:', updateError)
            return {
                success: false,
                error: 'Gagal membuat kode reaktivasi'
            }
        }

        // Send email via API endpoint
        let emailSent = false
        try {
            const response = await fetch('/api/send-reactivation-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    code: reactivationCode,
                    companyName: userData.company_name || 'Vendor'
                })
            })

            const result = await response.json()

            if (response.ok && result.success) {
                emailSent = true
                console.log('✅ Reactivation email sent successfully')
            } else {
                console.warn('⚠️ Email sending failed:', result.error || 'Unknown error')
            }
        } catch (emailError) {
            console.error('❌ Error sending email:', emailError)
        }

        // Return success with code in console if email failed (for development)
        if (!emailSent) {
            console.log('🔐 KODE REAKTIVASI (Email gagal):', reactivationCode)
        }

        return {
            success: true,
            message: emailSent
                ? 'Kode reaktivasi telah dikirim ke email Anda'
                : `Kode reaktivasi: ${reactivationCode} (Email gagal terkirim, gunakan kode ini)`
        }
    } catch (error) {
        console.error('Error in sendReactivationCode:', error)
        return {
            success: false,
            error: 'Terjadi kesalahan yang tidak terduga'
        }
    }
}

/**
 * Verify reactivation code and reactivate account
 */
export const verifyReactivationCode = async (
    email: string,
    code: string
): Promise<VendorReactivateResult> => {
    try {
        console.log('🔐 Verifying reactivation code for:', email)

        // Get user data with verification code
        const { data: userData, error: fetchError } = await supabase
            .from('vendor_users')
            .select('id, email, status, reset_token, reset_token_expires')
            .eq('email', email)
            .single()

        if (fetchError || !userData) {
            return {
                success: false,
                error: 'Email tidak ditemukan'
            }
        }

        // Check if account is deactivated
        if (userData.status !== 'Tidak Aktif') {
            return {
                success: false,
                error: 'Akun sudah aktif'
            }
        }

        // Verify code
        if (!userData.reset_token || userData.reset_token !== code) {
            return {
                success: false,
                error: 'Kode verifikasi salah'
            }
        }

        // Check if code is expired
        if (!userData.reset_token_expires || new Date(userData.reset_token_expires) < new Date()) {
            return {
                success: false,
                error: 'Kode verifikasi telah kadaluarsa'
            }
        }

        // Reactivate account in vendor_users
        const { error: updateError } = await supabase
            .from('vendor_users')
            .update({
                status: 'Aktif',
                reset_token: null,
                reset_token_expires: null
            })
            .eq('email', email)

        if (updateError) {
            console.error('Error reactivating account:', updateError)
            return {
                success: false,
                error: 'Gagal mengaktifkan kembali akun'
            }
        }

        // Sync status to vendors table
        const { error: vendorUpdateError } = await supabase
            .from('vendors')
            .update({ status: 'Aktif' })
            .eq('email', email)

        if (vendorUpdateError) {
            console.warn('⚠️ Failed to sync status to vendors table:', vendorUpdateError)
            // Don't fail the entire operation, just log warning
        }

        console.log('✅ Account reactivated successfully')

        return {
            success: true,
            message: 'Akun berhasil diaktifkan kembali'
        }
    } catch (error) {
        console.error('Error in verifyReactivationCode:', error)
        return {
            success: false,
            error: 'Terjadi kesalahan yang tidak terduga'
        }
    }
}

/**
 * Check if vendor has active contracts
 * Updates vendor status to 'Dalam Kontrak' if they have active contracts
 * Works with both 'vendors' and 'vendor_users' tables
 */
export const updateVendorContractStatus = async (): Promise<void> => {
    try {
        // Get all active contracts (status yang menandakan vendor sedang berkontrak)
        const { data: contracts, error: contractError } = await supabase
            .from('contracts')
            .select('vendor_name, status')
            .in('status', ['Dalam Pekerjaan', 'Telah Diperiksa', 'Terkontrak', 'Dalam Proses Pekerjaan', 'Dalam Pemeriksaan'])

        if (contractError) return

        // Get unique vendor names with active contracts
        const vendorsWithContracts = new Set(
            contracts?.map(c => c.vendor_name?.trim().toLowerCase()).filter(Boolean) || []
        )

        // Update 'vendors' table
        const { data: vendorsTable } = await supabase
            .from('vendors')
            .select('id, nama, status')
            .neq('status', 'Tidak Aktif')

        if (vendorsTable) {
            for (const vendor of vendorsTable) {
                const vendorName = vendor.nama?.trim().toLowerCase()
                const hasActiveContract = vendorName && vendorsWithContracts.has(vendorName)
                const newStatus = hasActiveContract ? 'Berkontrak' : 'Aktif'

                if (vendor.status !== newStatus) {
                    await supabase
                        .from('vendors')
                        .update({ status: newStatus })
                        .eq('id', vendor.id)
                }
            }
        }

        // Update 'vendor_users' table
        const { data: vendorUsers } = await supabase
            .from('vendor_users')
            .select('id, company_name, status')
            .neq('status', 'Tidak Aktif')

        if (vendorUsers) {
            for (const vendor of vendorUsers) {
                const vendorName = vendor.company_name?.trim().toLowerCase()
                const hasActiveContract = vendorName && vendorsWithContracts.has(vendorName)
                const newStatus = hasActiveContract ? 'Berkontrak' : 'Aktif'

                if (vendor.status !== newStatus) {
                    await supabase
                        .from('vendor_users')
                        .update({ status: newStatus })
                        .eq('id', vendor.id)
                }
            }
        }
    } catch (error) {
        // Silent error
    }
}
