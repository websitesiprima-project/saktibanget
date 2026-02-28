"use client"
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle, Loader2, Key, Building2 } from 'lucide-react'
import './VendorActivate.css'

function ActivateContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const token = searchParams.get('token')

    // Mode: 'token' untuk email link, 'code' untuk kode 6 digit
    const [mode, setMode] = useState<'loading' | 'token' | 'code' | 'password'>('loading')
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [vendorData, setVendorData] = useState<any>(null)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    // Claim code input
    const [claimCode, setClaimCode] = useState('')
    const [codeError, setCodeError] = useState('')

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [passwordError, setPasswordError] = useState('')

    // Verify token on load OR show claim code input
    useEffect(() => {
        const verifyToken = async () => {
            // Jika ada token di URL, verifikasi langsung
            if (token) {
                console.log('🔍 Verifying activation token...', {
                    tokenLength: token.length,
                    tokenPreview: token.substring(0, 10) + '...'
                })

                try {
                    // Find vendor with this activation token
                    const { data: vendor, error: fetchError } = await supabase
                        .from('vendor_users')
                        .select('*')
                        .eq('activation_token', token)
                        .single()

                    console.log('📋 Query result:', {
                        found: !!vendor,
                        error: fetchError?.message,
                        vendorEmail: vendor?.email
                    })

                    if (fetchError || !vendor) {
                        console.error('❌ Token verification failed:', fetchError)
                        setError('Link aktivasi tidak valid atau sudah tidak berlaku.')
                        setLoading(false)
                        return
                    }

                    // Check if already activated
                    if (vendor.is_activated) {
                        console.log('⚠️ Account already activated')
                        setError('Akun ini sudah diaktifkan sebelumnya. Silakan login.')
                        setLoading(false)
                        return
                    }

                    // Check if token expired
                    const tokenExpires = new Date(vendor.activation_token_expires)
                    const now = new Date()
                    console.log('⏰ Token expiry check:', {
                        expires: tokenExpires.toISOString(),
                        now: now.toISOString(),
                        isExpired: tokenExpires < now
                    })

                    if (tokenExpires < now) {
                        console.log('❌ Token expired')
                        setError('Link aktivasi sudah kadaluarsa. Silakan hubungi admin PLN untuk mengirim ulang undangan.')
                        setLoading(false)
                        return
                    }

                    console.log('✅ Token valid, showing password form')
                    setVendorData(vendor)
                    setMode('password')
                    setLoading(false)
                } catch (err) {
                    console.error('❌ Error verifying token:', err)
                    setError('Terjadi kesalahan saat memverifikasi link aktivasi.')
                    setLoading(false)
                }
            } else {
                // Tidak ada token, tampilkan form input kode aktivasi
                console.log('ℹ️ No token found, showing claim code form')
                setMode('code')
                setLoading(false)
            }
        }

        verifyToken()
    }, [token])

    // Verify claim code
    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault()

        if (claimCode.length !== 6) {
            setCodeError('Kode aktivasi harus 6 digit')
            return
        }

        setSubmitting(true)
        setCodeError('')

        try {
            // Check code di tabel vendors
            const { data: vendor, error: fetchError } = await supabase
                .from('vendors')
                .select('id, nama, alamat, email, telepon, is_claimed, claim_code')
                .eq('claim_code', claimCode)
                .single()

            if (fetchError || !vendor) {
                setCodeError('Kode aktivasi tidak valid atau tidak ditemukan')
                setSubmitting(false)
                return
            }

            if (vendor.is_claimed) {
                setCodeError('Kode aktivasi ini sudah digunakan. Hubungi admin jika ada masalah.')
                setSubmitting(false)
                return
            }

            // Kode valid, simpan data vendor dan lanjut ke form password
            setVendorData({
                ...vendor,
                company_name: vendor.nama, // Map field name
                isFromClaimCode: true
            })
            setMode('password')
        } catch (err) {
            console.error('Error verifying code:', err)
            setCodeError('Terjadi kesalahan. Silakan coba lagi.')
        } finally {
            setSubmitting(false)
        }
    }

    // Password validation
    const validatePassword = (pwd: string) => {
        if (pwd.length < 8) {
            return 'Password minimal 8 karakter'
        }
        if (!/[A-Z]/.test(pwd)) {
            return 'Password harus mengandung huruf besar'
        }
        if (!/[a-z]/.test(pwd)) {
            return 'Password harus mengandung huruf kecil'
        }
        if (!/[0-9]/.test(pwd)) {
            return 'Password harus mengandung angka'
        }
        return ''
    }

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const pwd = e.target.value
        setPassword(pwd)
        setPasswordError(validatePassword(pwd))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Validate password
        const pwdError = validatePassword(password)
        if (pwdError) {
            setPasswordError(pwdError)
            return
        }

        if (password !== confirmPassword) {
            setPasswordError('Password dan konfirmasi password tidak cocok')
            return
        }

        setSubmitting(true)

        try {
            if (vendorData?.isFromClaimCode) {
                // Mode claim code: Buat akun baru di vendor_users
                const { error: insertError } = await supabase
                    .from('vendor_users')
                    .insert([{
                        email: vendorData.email || `vendor_${vendorData.id}@placeholder.local`,
                        password: password,
                        company_name: vendorData.nama,
                        address: vendorData.alamat,
                        pic_phone: vendorData.telepon || null,
                        pic_email: vendorData.email || null,
                        status: 'Aktif',
                        is_activated: true,
                        created_at: new Date().toISOString()
                    }])

                if (insertError) {
                    console.error('Insert error:', insertError)
                    throw new Error(insertError.message)
                }

                // Update vendors table - mark as claimed
                const { error: updateError } = await supabase
                    .from('vendors')
                    .update({
                        is_claimed: true,
                        claimed_at: new Date().toISOString(),
                        status: 'Aktif'
                    })
                    .eq('id', vendorData.id)

                if (updateError) {
                    console.error('Update vendor error:', updateError)
                }

                setSuccess(true)
                setTimeout(() => {
                    router.push('/vendor-login')
                }, 3000)
            } else {
                // Mode token: Call existing API
                const response = await fetch('/api/vendor-activate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        token: token,
                        password: password
                    })
                })

                const result = await response.json()

                if (result.success) {
                    setSuccess(true)
                    setTimeout(() => {
                        router.push('/vendor-login')
                    }, 3000)
                } else {
                    setError(result.error || 'Gagal mengaktifkan akun. Silakan coba lagi.')
                }
            }
        } catch (err) {
            console.error('Error activating account:', err)
            setError('Terjadi kesalahan. Silakan coba lagi.')
        } finally {
            setSubmitting(false)
        }
    }

    // Password strength indicator
    const getPasswordStrength = () => {
        let strength = 0
        if (password.length >= 8) strength++
        if (/[A-Z]/.test(password)) strength++
        if (/[a-z]/.test(password)) strength++
        if (/[0-9]/.test(password)) strength++
        if (/[^A-Za-z0-9]/.test(password)) strength++
        return strength
    }

    const strengthLabels = ['Sangat Lemah', 'Lemah', 'Cukup', 'Kuat', 'Sangat Kuat']
    const strengthColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#059669']

    if (loading) {
        return (
            <div className="activate-container">
                <div className="activate-card loading-card">
                    <Loader2 size={48} className="spinning" />
                    <p>Memverifikasi link aktivasi...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="activate-container">
                <div className="activate-card error-card">
                    <div className="error-icon">
                        <AlertCircle size={64} />
                    </div>
                    <h2>Aktivasi Gagal</h2>
                    <p>{error}</p>
                    <button
                        className="btn-primary-activate"
                        onClick={() => router.push('/vendor-login')}
                    >
                        Kembali ke Login
                    </button>
                </div>
            </div>
        )
    }

    if (success) {
        return (
            <div className="activate-container">
                <div className="activate-card success-card">
                    <div className="success-icon">
                        <CheckCircle size={64} />
                    </div>
                    <h2>Akun Berhasil Diaktifkan!</h2>
                    <p>Selamat datang, <strong>{vendorData?.company_name || vendorData?.nama}</strong>!</p>
                    <p>Akun vendor Anda sudah aktif. Anda akan diarahkan ke halaman login...</p>
                    <div className="redirect-loader">
                        <Loader2 size={24} className="spinning" />
                        <span>Mengalihkan ke halaman login...</span>
                    </div>
                </div>
            </div>
        )
    }

    // Mode: Input kode aktivasi 6 digit
    if (mode === 'code') {
        return (
            <div className="activate-container">
                <div className="activate-card">
                    <div className="activate-header">
                        <div className="logo">
                            <img src="/images/Logo SAKTI 2.png" alt="SAKTI PLN" />
                        </div>
                        <h1>Aktivasi Akun Vendor</h1>
                        <p className="subtitle">Masukkan kode aktivasi yang Anda terima dari Admin PLN</p>
                    </div>

                    <form onSubmit={handleVerifyCode} className="activate-form">
                        <div className="code-input-section">
                            <label>
                                <Key size={16} />
                                Kode Aktivasi (6 digit)
                            </label>
                            <input
                                type="text"
                                value={claimCode}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                                    setClaimCode(value)
                                    setCodeError('')
                                }}
                                placeholder="000000"
                                className="code-input"
                                maxLength={6}
                                autoFocus
                            />
                            {codeError && (
                                <div className="form-error">
                                    <AlertCircle size={16} />
                                    {codeError}
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="btn-submit-activate"
                            disabled={submitting || claimCode.length !== 6}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 size={18} className="spinning" />
                                    Memverifikasi...
                                </>
                            ) : (
                                <>
                                    <Key size={18} />
                                    Verifikasi Kode
                                </>
                            )}
                        </button>
                    </form>

                    <div className="activate-footer">
                        <p>Belum punya kode? Hubungi Admin PLN untuk mendapatkan kode aktivasi.</p>
                        <p style={{ marginTop: '12px' }}>Sudah punya akun? <a href="/vendor-login">Login di sini</a></p>
                    </div>
                </div>
            </div>
        )
    }

    // Mode: Password (setelah verifikasi token atau kode)
    return (
        <div className="activate-container">
            <div className="activate-card">
                <div className="activate-header">
                    <div className="logo">
                        <img src="/images/Logo SAKTI 2.png" alt="SAKTI PLN" />
                    </div>
                    <h1>Aktivasi Akun Vendor</h1>
                    <p className="subtitle">Buat password untuk mengaktifkan akun Anda</p>
                </div>

                <div className="vendor-info">
                    <div className="vendor-info-row">
                        <span className="label">Perusahaan:</span>
                        <span className="value">{vendorData?.company_name || vendorData?.nama}</span>
                    </div>
                    {(vendorData?.email || vendorData?.pic_email) && (
                        <div className="vendor-info-row">
                            <span className="label">Email:</span>
                            <span className="value">{vendorData?.email || vendorData?.pic_email}</span>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="activate-form">
                    <div className="form-group">
                        <label htmlFor="password">
                            <Lock size={16} />
                            Password Baru
                        </label>
                        <div className="password-input-wrapper">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                value={password}
                                onChange={handlePasswordChange}
                                placeholder="Masukkan password baru"
                                required
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        {/* Password strength indicator */}
                        {password && (
                            <div className="password-strength">
                                <div className="strength-bars">
                                    {[1, 2, 3, 4, 5].map((level) => (
                                        <div
                                            key={level}
                                            className="strength-bar"
                                            style={{
                                                backgroundColor: level <= getPasswordStrength()
                                                    ? strengthColors[getPasswordStrength() - 1]
                                                    : '#e5e7eb'
                                            }}
                                        />
                                    ))}
                                </div>
                                <span
                                    className="strength-label"
                                    style={{ color: strengthColors[getPasswordStrength() - 1] || '#9ca3af' }}
                                >
                                    {password.length > 0 ? strengthLabels[getPasswordStrength() - 1] || 'Sangat Lemah' : ''}
                                </span>
                            </div>
                        )}

                        <div className="password-requirements">
                            <p>Password harus memenuhi kriteria:</p>
                            <ul>
                                <li className={password.length >= 8 ? 'valid' : ''}>
                                    {password.length >= 8 ? '✓' : '○'} Minimal 8 karakter
                                </li>
                                <li className={/[A-Z]/.test(password) ? 'valid' : ''}>
                                    {/[A-Z]/.test(password) ? '✓' : '○'} Mengandung huruf besar
                                </li>
                                <li className={/[a-z]/.test(password) ? 'valid' : ''}>
                                    {/[a-z]/.test(password) ? '✓' : '○'} Mengandung huruf kecil
                                </li>
                                <li className={/[0-9]/.test(password) ? 'valid' : ''}>
                                    {/[0-9]/.test(password) ? '✓' : '○'} Mengandung angka
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">
                            <Lock size={16} />
                            Konfirmasi Password
                        </label>
                        <div className="password-input-wrapper">
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Ulangi password baru"
                                required
                            />
                            <button
                                type="button"
                                className="toggle-password"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {confirmPassword && password !== confirmPassword && (
                            <span className="error-text">Password tidak cocok</span>
                        )}
                        {confirmPassword && password === confirmPassword && (
                            <span className="success-text">✓ Password cocok</span>
                        )}
                    </div>

                    {passwordError && (
                        <div className="form-error">
                            <AlertCircle size={16} />
                            {passwordError}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn-submit-activate"
                        disabled={submitting || !password || !confirmPassword || password !== confirmPassword || !!passwordError}
                    >
                        {submitting ? (
                            <>
                                <Loader2 size={18} className="spinning" />
                                Mengaktifkan Akun...
                            </>
                        ) : (
                            <>
                                <CheckCircle size={18} />
                                Aktifkan Akun
                            </>
                        )}
                    </button>
                </form>

                <div className="activate-footer">
                    <p>Sudah punya akun? <a href="/vendor-login">Login di sini</a></p>
                </div>
            </div>
        </div>
    )
}

export default function VendorActivatePage() {
    return (
        <Suspense fallback={
            <div className="activate-container">
                <div className="activate-card loading-card">
                    <Loader2 size={48} className="spinning" />
                    <p>Memuat halaman aktivasi...</p>
                </div>
            </div>
        }>
            <ActivateContent />
        </Suspense>
    )
}
