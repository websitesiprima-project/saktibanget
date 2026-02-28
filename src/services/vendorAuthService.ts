import { supabase } from '../lib/supabaseClient'
import { hashPassword } from '../lib/passwordUtils'

export interface VendorAuthResult {
    success: boolean
    data?: any
    error?: string
    message?: string
}

// Temporary storage for verification codes (in production, use database)
interface VerificationEntry {
    code: string
    email: string
    expiresAt: Date
    attempts: number
}

// In-memory storage (will be reset on server restart)
// For production, consider using database table or Redis
const verificationCodes = new Map<string, VerificationEntry>()

/**
 * Request email verification code for registration
 * Sends 6-digit code to email
 */
export const requestEmailVerification = async (email: string, companyName?: string): Promise<VendorAuthResult> => {
    try {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return {
                success: false,
                error: 'Format email tidak valid'
            }
        }

        // Check if email already registered
        const { data: existingVendor } = await supabase
            .from('vendor_users')
            .select('id, is_activated')
            .eq('email', email)
            .maybeSingle()

        // Only block if vendor is already activated (completed registration)
        if (existingVendor?.is_activated) {
            return {
                success: false,
                error: 'Email sudah terdaftar dan aktif. Silakan login.'
            }
        }

        // If vendor exists but not activated (pending invitation), allow re-verification
        if (existingVendor && !existingVendor.is_activated) {
            console.log('⚠️ Email exists but not activated (pending invitation). Allowing verification for self-registration.')
        }

        // Generate 6-digit verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes

        // Store verification code
        verificationCodes.set(email, {
            code: verificationCode,
            email: email,
            expiresAt: expiresAt,
            attempts: 0
        })

        console.log('🔐 Generated verification code for', email, ':', verificationCode)

        // Send verification email
        try {
            const emailResponse = await fetch('/api/send-verification-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    verificationCode: verificationCode,
                    companyName: companyName || 'Vendor'
                })
            })

            const emailResult = await emailResponse.json()

            if (!emailResult.success) {
                console.error('Failed to send verification email:', emailResult.error)
                // Tetap return success dengan kode untuk fallback
                return {
                    success: true,
                    message: `Email gagal terkirim. Gunakan kode ini: ${verificationCode}`,
                    data: {
                        verificationCode: verificationCode, // Fallback: tampilkan kode
                        expiresAt: expiresAt,
                        emailFailed: true
                    }
                }
            }

            console.log('✅ Verification email sent successfully to:', email)

            return {
                success: true,
                message: `Kode verifikasi telah dikirim ke ${email}. Silakan cek inbox atau folder spam.`,
                data: {
                    expiresAt: expiresAt
                    // TIDAK mengirim code untuk keamanan (kecuali email gagal)
                }
            }
        } catch (emailError) {
            console.error('Error sending verification email:', emailError)
            return {
                success: true,
                message: `Email gagal terkirim. Gunakan kode ini: ${verificationCode}`,
                data: {
                    verificationCode: verificationCode,
                    expiresAt: expiresAt,
                    emailFailed: true
                }
            }
        }
    } catch (error) {
        console.error('Request email verification error:', error)
        return {
            success: false,
            error: 'Terjadi kesalahan. Silakan coba lagi.'
        }
    }
}

/**
 * Verify email verification code
 * Returns true if code is valid
 */
export const verifyEmailCode = async (email: string, code: string): Promise<VendorAuthResult> => {
    try {
        const verification = verificationCodes.get(email)

        if (!verification) {
            return {
                success: false,
                error: 'Kode verifikasi tidak ditemukan. Silakan kirim ulang kode.'
            }
        }

        // Check if expired
        if (new Date() > verification.expiresAt) {
            verificationCodes.delete(email)
            return {
                success: false,
                error: 'Kode verifikasi sudah kadaluarsa. Silakan kirim ulang kode.'
            }
        }

        // Check attempts (max 5 attempts)
        if (verification.attempts >= 5) {
            verificationCodes.delete(email)
            return {
                success: false,
                error: 'Terlalu banyak percobaan gagal. Silakan kirim ulang kode.'
            }
        }

        // Verify code
        if (verification.code !== code.trim()) {
            verification.attempts++
            verificationCodes.set(email, verification)

            const remainingAttempts = 5 - verification.attempts
            return {
                success: false,
                error: `Kode verifikasi salah. Sisa percobaan: ${remainingAttempts}`
            }
        }

        // Code is correct - keep it for a bit longer (for registration process)
        // Will be deleted after successful registration
        console.log('✅ Email verified successfully:', email)

        return {
            success: true,
            message: 'Email berhasil diverifikasi!',
            data: {
                email: email,
                verified: true
            }
        }
    } catch (error) {
        console.error('Verify email code error:', error)
        return {
            success: false,
            error: 'Terjadi kesalahan. Silakan coba lagi.'
        }
    }
}

/**
 * Clear verification code after successful registration
 */
export const clearVerificationCode = (email: string): void => {
    verificationCodes.delete(email)
    console.log('🗑️ Cleared verification code for:', email)
}

/**
 * Request password reset - sends email with reset token
 */
export const requestPasswordReset = async (email: string): Promise<VendorAuthResult> => {
    try {
        // Check if vendor exists
        const { data: vendor, error: fetchError } = await supabase
            .from('vendor_users')
            .select('id, email, company_name')
            .eq('email', email)
            .single()

        if (fetchError || !vendor) {
            return {
                success: false,
                error: 'Email tidak terdaftar sebagai vendor'
            }
        }

        // Generate reset token (6 digit code for simplicity)
        const resetToken = Math.floor(100000 + Math.random() * 900000).toString()
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes

        // Save reset token to database
        const { error: updateError } = await supabase
            .from('vendor_users')
            .update({
                reset_token: resetToken,
                reset_token_expires: expiresAt.toISOString()
            })
            .eq('id', vendor.id)

        if (updateError) {
            console.error('Error saving reset token:', updateError)
            return {
                success: false,
                error: 'Gagal membuat kode reset. Silakan coba lagi.'
            }
        }

        // Kirim email dengan kode reset
        try {
            const emailResponse = await fetch('/api/send-reset-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    resetToken: resetToken,
                    companyName: vendor.company_name
                })
            })

            const emailResult = await emailResponse.json()

            if (!emailResult.success) {
                console.error('Failed to send email:', emailResult.error)
                // Tetap lanjutkan meskipun email gagal dikirim
                // Tapi beri tahu user
                return {
                    success: true,
                    message: `Kode reset berhasil dibuat, tapi email gagal terkirim. Kode reset: ${resetToken}`,
                    data: {
                        resetToken: resetToken, // Sementara return token kalau email gagal
                        expiresAt: expiresAt
                    }
                }
            }

            console.log('Reset email sent successfully to:', email)

            return {
                success: true,
                message: `Kode reset password telah dikirim ke email ${email}. Silakan cek inbox atau folder spam Anda.`,
                data: {
                    expiresAt: expiresAt
                    // TIDAK mengirim resetToken di response untuk keamanan
                }
            }
        } catch (emailError) {
            console.error('Error sending reset email:', emailError)
            // Jika ada error saat kirim email, tetap berhasil tapi tampilkan kode
            return {
                success: true,
                message: `Kode reset berhasil dibuat. Kode reset: ${resetToken} (Email gagal terkirim)`,
                data: {
                    resetToken: resetToken, // Fallback: tampilkan kode jika email gagal
                    expiresAt: expiresAt
                }
            }
        }
    } catch (error) {
        console.error('Password reset request error:', error)
        return {
            success: false,
            error: 'Terjadi kesalahan. Silakan coba lagi.'
        }
    }
}

/**
 * Verify reset token and reset password
 */
export const resetPassword = async (
    email: string,
    resetToken: string,
    newPassword: string
): Promise<VendorAuthResult> => {
    try {
        // Validate password
        if (newPassword.length < 6) {
            return {
                success: false,
                error: 'Password minimal 6 karakter'
            }
        }

        // Find vendor with matching email and token
        const { data: vendor, error: fetchError } = await supabase
            .from('vendor_users')
            .select('id, email, reset_token, reset_token_expires')
            .eq('email', email)
            .eq('reset_token', resetToken)
            .single()

        if (fetchError || !vendor) {
            return {
                success: false,
                error: 'Kode reset tidak valid atau sudah digunakan'
            }
        }

        // Check if token is expired
        const expiresAt = new Date(vendor.reset_token_expires)
        if (expiresAt < new Date()) {
            return {
                success: false,
                error: 'Kode reset sudah kadaluarsa. Silakan minta kode baru.'
            }
        }

        // Hash password before saving
        const hashedPassword = hashPassword(newPassword)

        // Update password and clear reset token
        const { error: updateError } = await supabase
            .from('vendor_users')
            .update({
                password: hashedPassword, // Save hashed password
                reset_token: null,
                reset_token_expires: null
            })
            .eq('id', vendor.id)

        if (updateError) {
            console.error('Error updating password:', updateError)
            return {
                success: false,
                error: 'Gagal mengubah password. Silakan coba lagi.'
            }
        }

        return {
            success: true,
            message: 'Password berhasil diubah. Silakan login dengan password baru.'
        }
    } catch (error) {
        console.error('Password reset error:', error)
        return {
            success: false,
            error: 'Terjadi kesalahan. Silakan coba lagi.'
        }
    }
}

/**
 * Register new vendor with complete profile data
 * Requires email to be verified first
 */
export const registerVendor = async (vendorData: {
    email: string
    password: string
    companyName: string
    companyType?: string
    phone: string
    address?: string
    city?: string
    province?: string
    postalCode?: string
    fax?: string
    picName?: string
    picPosition?: string
    picPhone?: string
    picEmail?: string
    npwp?: string
    siup?: string
    tdp?: string
    established?: number
}): Promise<VendorAuthResult> => {
    try {
        // Validate required fields
        if (!vendorData.email || !vendorData.password || !vendorData.companyName || !vendorData.phone) {
            return {
                success: false,
                error: 'Data wajib (Email, Password, Nama Perusahaan, Telepon) harus diisi'
            }
        }

        if (vendorData.password.length < 6) {
            return {
                success: false,
                error: 'Password minimal 6 karakter'
            }
        }

        // Check if vendor already exists
        const { data: existingVendor } = await supabase
            .from('vendor_users')
            .select('id, is_activated')
            .eq('email', vendorData.email)
            .maybeSingle()

        // Only block if vendor is already activated
        if (existingVendor?.is_activated) {
            return {
                success: false,
                error: 'Email sudah terdaftar dan aktif'
            }
        }

        // Hash password for security
        const hashedPassword = hashPassword(vendorData.password)

        // If vendor exists but not activated (from invitation), update the record
        if (existingVendor && !existingVendor.is_activated) {
            console.log('📝 Updating pending invitation vendor to self-registered')

            const { data: updatedVendor, error: updateError } = await supabase
                .from('vendor_users')
                .update({
                    password: 'PENDING_APPROVAL', // Password sementara, akan diganti saat admin approve
                    company_name: vendorData.companyName,
                    company_type: vendorData.companyType || 'PT',
                    phone: vendorData.phone,
                    address: vendorData.address,
                    city: vendorData.city,
                    province: vendorData.province,
                    postal_code: vendorData.postalCode,
                    fax: vendorData.fax,
                    pic_name: vendorData.picName,
                    pic_position: vendorData.picPosition,
                    pic_phone: vendorData.picPhone,
                    pic_email: vendorData.picEmail,
                    npwp: vendorData.npwp,
                    siup: vendorData.siup,
                    tdp: vendorData.tdp,
                    established: vendorData.established,
                    status: 'Pending', // Menunggu approval admin
                    is_activated: false, // Belum aktif, menunggu admin
                    activation_token: null, // Clear invitation token
                    activation_token_expires: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingVendor.id)
                .select()
                .single()

            if (updateError) {
                console.error('Error updating vendor:', updateError)
                return {
                    success: false,
                    error: 'Gagal mendaftar. Silakan coba lagi.'
                }
            }

            // Clear verification code
            clearVerificationCode(vendorData.email)

            return {
                success: true,
                message: 'Pendaftaran berhasil! Data Anda sedang dalam proses verifikasi oleh Admin. Password untuk login akan dikirimkan ke email setelah data diverifikasi.',
                data: updatedVendor
            }
        }

        // Insert new vendor (normal self-registration flow)
        // Status 'Pending' - menunggu approval admin sebelum bisa login
        const { data: newVendor, error: insertError } = await supabase
            .from('vendor_users')
            .insert([{
                email: vendorData.email,
                password: 'PENDING_APPROVAL', // Password sementara, akan diganti saat admin approve
                company_name: vendorData.companyName,
                company_type: vendorData.companyType || 'PT',
                phone: vendorData.phone,
                address: vendorData.address,
                city: vendorData.city,
                province: vendorData.province,
                postal_code: vendorData.postalCode,
                fax: vendorData.fax,
                pic_name: vendorData.picName,
                pic_position: vendorData.picPosition,
                pic_phone: vendorData.picPhone,
                pic_email: vendorData.picEmail,
                npwp: vendorData.npwp,
                siup: vendorData.siup,
                tdp: vendorData.tdp,
                established: vendorData.established,
                status: 'Pending', // Menunggu approval admin
                is_activated: false, // Belum aktif sampai admin approve
                created_at: new Date().toISOString()
            }])
            .select()
            .single()

        if (insertError) {
            console.error('Error inserting vendor:', insertError)
            return {
                success: false,
                error: 'Gagal mendaftar. Silakan coba lagi.'
            }
        }

        // Clear verification code after successful registration
        clearVerificationCode(vendorData.email)

        return {
            success: true,
            message: 'Pendaftaran berhasil! Data Anda sedang dalam proses verifikasi oleh Admin. Password untuk login akan dikirimkan ke email setelah data diverifikasi.',
            data: newVendor
        }
    } catch (error) {
        console.error('Vendor registration error:', error)
        return {
            success: false,
            error: 'Terjadi kesalahan. Silakan coba lagi.'
        }
    }
}
