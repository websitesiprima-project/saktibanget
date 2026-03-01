"use client"
import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Users, CheckCircle, Search, Eye, Edit, Trash2, PauseCircle, ClipboardList, Plus, Save, X, Briefcase, Mail, Send, RefreshCw, Copy, Key, Upload } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'
import { updateVendorContractStatus } from '../../../services/vendorAccountService'
import NotificationModal from '../../../components/NotificationModal'
import ConfirmModal from '../../../components/ConfirmModal'
import { useFormGuard } from '@/hooks/useFormGuard'
import VendorCsvImportModal from '../../../components/VendorCsvImportModal'
import './DataVendor.css'

// Generate 6-digit claim code untuk aktivasi vendor
const generateClaimCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString()
}

// Generate activation token using Web Crypto API
const generateActivationToken = () => {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

function DataVendor() {
    const searchParams = useSearchParams()
    const [vendors, setVendors] = useState([])
    const [loading, setLoading] = useState(true)
    const [showClaimCodeModal, setShowClaimCodeModal] = useState(false)
    const [newVendorClaimCode, setNewVendorClaimCode] = useState('')
    const [newVendorName, setNewVendorName] = useState('')
    const [error, setError] = useState(null)
    const [notification, setNotification] = useState({ show: false, type: 'success' as 'success' | 'error' | 'warning' | 'info', message: '' })
    const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: () => { } })
    // State untuk form tambah/edit vendor
    const [formData, setFormData] = useState({
        id: '',
        nama: '',
        alamat: '',
        telepon: '',
        email: '',
        namaPimpinan: '',
        jabatan: '',
        npwp: '',
        status: 'Aktif',
        tanggalRegistrasi: new Date().toISOString().split('T')[0],
        bankPembayaran: '',
        noRekening: '',
        namaRekening: ''
    });

    // const [sidebarOpen, setSidebarOpen] = useState(false) // Removed as handled by layout
    const [searchTerm, setSearchTerm] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10
    const [showModal, setShowModal] = useState(false)
    const [showCsvImportModal, setShowCsvImportModal] = useState(false)
    // Kolom selector
    const [showColumnSelector, setShowColumnSelector] = useState(false);
    const [columnVisibility, setColumnVisibility] = useState({
        nama: true,
        namaPimpinan: true,
        telepon: true,
        email: true,
        status: true,
    });
    const columnSelectorRef = useRef(null);

    // Sync vendor claimed status dengan vendor_users activation status
    const syncVendorClaimedStatus = async () => {
        try {
            // Get all activated vendor_users
            const { data: activatedUsers, error: usersError } = await supabase
                .from('vendor_users')
                .select('id, email, activated_at')
                .eq('is_activated', true)

            if (usersError) {
                console.error('Error fetching activated users:', usersError)
                return
            }

            if (!activatedUsers || activatedUsers.length === 0) {
                return
            }

            // Get all vendors that haven't been marked as claimed
            const { data: unclaimedVendors, error: vendorsError } = await supabase
                .from('vendors')
                .select('id, email')
                .eq('is_claimed', false)

            if (vendorsError) {
                console.error('Error fetching unclaimed vendors:', vendorsError)
                return
            }

            if (!unclaimedVendors || unclaimedVendors.length === 0) {
                return
            }

            // Match and update vendors
            const updates = []
            for (const user of activatedUsers) {
                const matchingVendor = unclaimedVendors.find(v => v.email === user.email)
                if (matchingVendor) {
                    updates.push(
                        supabase
                            .from('vendors')
                            .update({
                                is_claimed: true,
                                claimed_at: user.activated_at,
                                claimed_by_user_id: user.id,
                                status: 'Aktif'
                            })
                            .eq('id', matchingVendor.id)
                    )
                }
            }

            if (updates.length > 0) {
                await Promise.all(updates)
                console.log(`✅ Synced ${updates.length} vendor(s) claimed status`)
            }
        } catch (err) {
            console.error('Error syncing vendor claimed status:', err)
        }
    }

    const fetchVendors = useCallback(async () => {
        const startTime = performance.now()
        try {
            setLoading(true)

            // 🚀 PARALLEL EXECUTION - Status update & Data fetch bersamaan
            const [, , vendorsResult] = await Promise.all([
                updateVendorContractStatus(),      // Tidak perlu await hasilnya
                syncVendorClaimedStatus(),         // Tidak perlu await hasilnya
                supabase
                    .from('vendors')
                    .select('*')
                    .order('created_at', { ascending: false })
            ])

            const { data, error } = vendorsResult
            if (error) throw error

            // Map DB columns to frontend format
            const formattedData = data.map(vendor => {
                return {
                    id: vendor.id || '',
                    nama: vendor.nama || '',
                    alamat: vendor.alamat || '',
                    telepon: vendor.telepon || '',
                    email: vendor.email || '',
                    namaPimpinan: vendor.nama_pimpinan || '',
                    jabatan: vendor.jabatan || '',
                    npwp: vendor.npwp || '',
                    status: vendor.status || 'Aktif',
                    tanggalRegistrasi: vendor.created_at || vendor.tanggal_registrasi || '',
                    kategori: vendor.kategori || '',
                    // Claim code fields
                    claimCode: vendor.claim_code || null,
                    isClaimed: vendor.is_claimed || false,
                    claimedByUserId: vendor.claimed_by_user_id || null,
                    claimedAt: vendor.claimed_at || null,
                    createdBy: vendor.created_by || null
                }
            })

            setVendors(formattedData)

            // Performance logging
            const endTime = performance.now()
            console.log(`⚡ Vendors loaded in ${(endTime - startTime).toFixed(0)}ms`)
        } catch (err) {
            console.error('Error fetching vendors:', err)
            setError('Gagal mengambil data vendor')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchVendors()
    }, [fetchVendors])

    // Auto-open detail modal jika ada parameter ID di URL
    useEffect(() => {
        const vendorId = searchParams.get('id')
        if (vendorId && vendors.length > 0) {
            const vendor = vendors.find(v => v.id === vendorId)
            if (vendor) {
                handleShowDetail(vendor)
            }
        }
    }, [searchParams, vendors])

    // Use fetched data instead of mock
    const vendorsData = vendors

    // Filter vendors berdasarkan search term
    const filteredVendors = vendorsData.filter(vendor =>
        vendor.nama.toLowerCase().includes(searchTerm.toLowerCase())
    )

    // Pagination logic
    const totalPages = Math.ceil(filteredVendors.length / itemsPerPage)
    const indexOfLastItem = currentPage * itemsPerPage
    const indexOfFirstItem = indexOfLastItem - itemsPerPage
    const currentVendors = filteredVendors.slice(indexOfFirstItem, indexOfLastItem)

    const handlePageChange = (pageNumber) => {
        setCurrentPage(pageNumber)
    }

    const getStatusClass = (status, isClaimed) => {
        if (!isClaimed) return 'status-pending' // Belum diklaim
        if (status === 'Aktif') return 'status-active'
        if (status === 'Berkontrak') return 'status-dalam-kontrak'
        return 'status-inactive'
    }

    const handleSearch = (e) => {
        setSearchTerm(e.target.value)
        setCurrentPage(1) // Reset ke halaman pertama saat search
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const [isEditing, setIsEditing] = useState(false)
    const [editId, setEditId] = useState(null)
    // State for detail modal
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailVendor, setDetailVendor] = useState(null);
    const vendorGuard = useFormGuard(300)

    const handleSubmit = (e) => {
        e.preventDefault()
        vendorGuard.run(async () => {
        setLoading(true)

        try {
            // Get admin name from localStorage
            const adminName = localStorage.getItem('userName') || localStorage.getItem('userEmail') || 'Admin PLN'

            if (isEditing) {
                // Update existing vendor di tabel vendors
                const payload = {
                    nama: formData.nama,
                    alamat: formData.alamat,
                    telepon: formData.telepon || null,
                    email: formData.email || null,
                    nama_pimpinan: formData.namaPimpinan || null,
                    // jabatan: formData.jabatan || null, // TODO: Uncomment setelah migration dijalankan
                    npwp: formData.npwp || null,
                    status: formData.status,
                    updated_at: new Date().toISOString()
                }

                const { error } = await supabase
                    .from('vendors')
                    .update(payload)
                    .eq('id', editId)

                if (error) throw error

                // ========================================
                // SINKRONISASI KE VENDOR_USERS
                // Update profil vendor user jika ada perubahan
                // ========================================
                try {
                    // Cari vendor_user berdasarkan company_name atau email
                    // Gunakan filter yang lebih aman
                    let vendorUser = null
                    let vendorUserFindError = null

                    // Coba cari berdasarkan email dulu
                    if (formData.email) {
                        const { data, error } = await supabase
                            .from('vendor_users')
                            .select('id')
                            .eq('email', formData.email)
                            .maybeSingle()
                        vendorUser = data
                        vendorUserFindError = error
                    }

                    // Jika tidak ditemukan, coba cari berdasarkan pic_email
                    if (!vendorUser && formData.email) {
                        const { data, error } = await supabase
                            .from('vendor_users')
                            .select('id')
                            .eq('pic_email', formData.email)
                            .maybeSingle()
                        vendorUser = data
                        vendorUserFindError = error
                    }

                    // Jika tidak ditemukan, coba cari berdasarkan company_name
                    if (!vendorUser && formData.nama) {
                        const { data, error } = await supabase
                            .from('vendor_users')
                            .select('id')
                            .eq('company_name', formData.nama)
                            .maybeSingle()
                        vendorUser = data
                        vendorUserFindError = error
                    }

                    console.log('🔍 Found vendor_user:', vendorUser)

                    if (vendorUser && !vendorUserFindError) {
                        // Update data vendor_users dengan info terbaru dari admin
                        const { error: vendorUserUpdateError } = await supabase
                            .from('vendor_users')
                            .update({
                                company_name: formData.nama || null,
                                pic_name: formData.namaPimpinan || null,
                                // pic_position: formData.jabatan || null, // TODO: Uncomment setelah migration
                                pic_phone: formData.telepon || null,
                                pic_email: formData.email || null,
                                address: formData.alamat || null,
                                bank_name: formData.bankPembayaran || null,
                                account_number: formData.noRekening || null,
                                account_name: formData.namaRekening || null
                            })
                            .eq('id', vendorUser.id)

                        if (vendorUserUpdateError) {
                            console.warn('Warning: Gagal sync ke vendor_users table:', vendorUserUpdateError)
                        } else {
                            console.log('✅ Vendor user data synced successfully')
                        }
                    } else {
                        console.log('ℹ️ No vendor_user found to sync')
                    }
                } catch (syncError) {
                    // Jangan throw error, cukup log warning
                    console.warn('Warning: Sync to vendor_users table failed:', syncError)
                }

                // Auto-update status based on contracts after save
                await updateVendorContractStatus()

                // Refresh data vendor untuk update detail
                await fetchVendors()

                // Trigger event untuk update profil vendor (jika sedang dibuka)
                window.dispatchEvent(new Event('vendorDataUpdated'))

                setNotification({ show: true, type: 'success', message: 'Vendor berhasil diperbarui!' })
                setShowModal(false)
            } else {
                // ========================================
                // VALIDASI DUPLIKASI EMAIL DAN NAMA VENDOR
                // ========================================

                // 1. Validasi duplikasi nama vendor
                if (formData.nama && formData.nama.trim() !== '') {
                    const { data: existingVendorByName, error: checkNameError } = await supabase
                        .from('vendors')
                        .select('id, nama, email')
                        .eq('nama', formData.nama.trim())
                        .maybeSingle()

                    if (checkNameError) {
                        console.error('Error checking vendor name:', checkNameError)
                        throw new Error('Gagal memeriksa duplikasi nama vendor')
                    }

                    if (existingVendorByName) {
                        setLoading(false)
                        setNotification({
                            show: true,
                            type: 'error',
                            message: `Vendor dengan nama "${formData.nama}" sudah terdaftar dalam sistem. Gunakan nama lain atau periksa data vendor yang sudah ada.`
                        })
                        return // Stop proses insert
                    }
                }

                // 2. Validasi duplikasi email
                if (formData.email && formData.email.trim() !== '') {
                    const { data: existingVendorByEmail, error: checkEmailError } = await supabase
                        .from('vendors')
                        .select('id, nama, email')
                        .eq('email', formData.email.trim())
                        .maybeSingle()

                    if (checkEmailError) {
                        console.error('Error checking email:', checkEmailError)
                        throw new Error('Gagal memeriksa duplikasi email')
                    }

                    if (existingVendorByEmail) {
                        setLoading(false)
                        setNotification({
                            show: true,
                            type: 'error',
                            message: `Email ${formData.email} sudah terdaftar untuk vendor "${existingVendorByEmail.nama}". Gunakan email lain.`
                        })
                        return // Stop proses insert
                    }
                }

                // Generate 6-digit claim code untuk vendor baru
                const claimCode = generateClaimCode()

                // Generate unique ID (VND + timestamp)
                const vendorId = `VND${Date.now()}`

                // Insert ke tabel vendors (master data perusahaan)
                const payload = {
                    id: vendorId,
                    nama: formData.nama,
                    alamat: formData.alamat,
                    telepon: formData.telepon || null,
                    email: formData.email || null, // Email opsional
                    nama_pimpinan: formData.namaPimpinan || null,
                    // jabatan: formData.jabatan || null, // TODO: Uncomment setelah migration dijalankan
                    npwp: formData.npwp || null,
                    status: 'Aktif',
                    claim_code: claimCode,
                    is_claimed: false,
                    created_by: adminName,
                    created_at: new Date().toISOString()
                }

                const { data: insertedVendor, error } = await supabase
                    .from('vendors')
                    .insert([payload])
                    .select()
                    .single()

                if (error) throw error

                // Jika email diisi, buat vendor_users dan kirim email undangan
                let emailSentSuccessfully = false
                if (formData.email && formData.email.trim() !== '') {
                    try {
                        // Generate activation token
                        const activationToken = generateActivationToken()
                        const tokenExpires = new Date()
                        tokenExpires.setDate(tokenExpires.getDate() + 7) // 7 hari

                        console.log('🔐 Generated activation token:', {
                            tokenLength: activationToken.length,
                            tokenPreview: activationToken.substring(0, 10) + '...',
                            expires: tokenExpires.toISOString(),
                            email: formData.email
                        })

                        // Cek apakah vendor_users sudah ada dengan email ini
                        const { data: existingVendorUser } = await supabase
                            .from('vendor_users')
                            .select('id')
                            .eq('email', formData.email)
                            .maybeSingle()

                        if (existingVendorUser) {
                            console.log('📝 Updating existing vendor_user:', existingVendorUser.id)
                            // Update existing vendor_users dengan token baru
                            const { error: updateError } = await supabase
                                .from('vendor_users')
                                .update({
                                    company_name: formData.nama,
                                    pic_name: formData.namaPimpinan || null,
                                    pic_phone: formData.telepon || null,
                                    pic_email: formData.email,
                                    address: formData.alamat || null,
                                    activation_token: activationToken,
                                    activation_token_expires: tokenExpires.toISOString(),
                                    invited_by: adminName,
                                    is_activated: false,
                                    status: 'Menunggu Aktivasi'
                                })
                                .eq('id', existingVendorUser.id)

                            if (updateError) {
                                console.error('❌ Error updating vendor_user:', updateError)
                                throw updateError
                            }
                            console.log('✅ Vendor_user updated successfully')
                        } else {
                            console.log('➕ Creating new vendor_user')
                            // Create new vendor_users
                            // TEMPORARY: Using placeholder password until database migration is run
                            const tempPassword = 'TEMP_PENDING_ACTIVATION_' + Date.now()

                            const { error: insertError } = await supabase
                                .from('vendor_users')
                                .insert([{
                                    email: formData.email,
                                    password: tempPassword, // Temporary - will be replaced during activation
                                    company_name: formData.nama,
                                    pic_name: formData.namaPimpinan || null,
                                    pic_phone: formData.telepon || null,
                                    pic_email: formData.email,
                                    address: formData.alamat || null,
                                    activation_token: activationToken,
                                    activation_token_expires: tokenExpires.toISOString(),
                                    invited_by: adminName,
                                    is_activated: false,
                                    status: 'Menunggu Aktivasi'
                                }])

                            if (insertError) {
                                console.error('❌ Error creating vendor_user:', insertError)
                                throw insertError
                            }
                            console.log('✅ Vendor_user created successfully')
                        }

                        // Kirim email undangan
                        const emailResponse = await fetch('/api/send-invitation-email', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                email: formData.email,
                                companyName: formData.nama,
                                activationToken: activationToken,
                                invitedBy: adminName
                            })
                        })

                        const emailResult = await emailResponse.json()
                        if (emailResult.success) {
                            emailSentSuccessfully = true
                            console.log('✅ Email undangan berhasil dikirim ke:', formData.email)
                        } else {
                            console.error('❌ Gagal mengirim email undangan:', emailResult.error)
                        }
                    } catch (emailError) {
                        console.error('❌ Error saat mengirim email undangan:', emailError)
                    }
                }

                // Refresh data vendor
                await fetchVendors()

                // Tampilkan modal dengan kode aktivasi
                setNewVendorName(formData.nama)
                setNewVendorClaimCode(claimCode)
                setShowModal(false)
                setShowClaimCodeModal(true)

                // Jika email berhasil dikirim, tambahkan notifikasi sukses
                if (emailSentSuccessfully) {
                    setTimeout(() => {
                        setNotification({
                            show: true,
                            type: 'success',
                            message: `Email undangan berhasil dikirim ke ${formData.email}`
                        })
                    }, 2000)
                }
            }

            resetForm()
        } catch (err) {
            console.error('Error saving vendor:', err)
            setNotification({ show: true, type: 'error', message: 'Gagal menyimpan vendor: ' + err.message })
        } finally {
            setLoading(false)
        }
        }) // end vendorGuard.run
    }

    // Copy claim code to clipboard
    const copyClaimCode = () => {
        navigator.clipboard.writeText(newVendorClaimCode)
        setNotification({ show: true, type: 'success', message: 'Kode aktivasi berhasil disalin!' })
    }

    const resetForm = () => {
        setFormData({
            id: '',
            nama: '',
            alamat: '',
            telepon: '',
            email: '',
            namaPimpinan: '',
            jabatan: '',
            npwp: '',
            status: 'Aktif',
            tanggalRegistrasi: new Date().toISOString().split('T')[0],
            bankPembayaran: '',
            noRekening: '',
            namaRekening: ''
        })
        setIsEditing(false)
        setEditId(null)
    }

    // Regenerate claim code untuk vendor yang belum claim
    const handleRegenerateClaimCode = async (vendor) => {
        setConfirmModal({
            show: true,
            title: 'Generate Ulang Kode Aktivasi',
            message: `Generate ulang kode aktivasi untuk "${vendor.nama}"? Kode lama tidak akan berlaku lagi.`,
            onConfirm: async () => {
                setConfirmModal({ ...confirmModal, show: false })
                setLoading(true)

                try {
                    const newCode = generateClaimCode()

                    const { error } = await supabase
                        .from('vendors')
                        .update({ claim_code: newCode })
                        .eq('id', vendor.id)

                    if (error) throw error

                    // Show new code
                    setNewVendorName(vendor.nama)
                    setNewVendorClaimCode(newCode)
                    setShowClaimCodeModal(true)

                    fetchVendors() // Refresh data
                } catch (err) {
                    console.error('Error regenerating claim code:', err)
                    setNotification({
                        show: true,
                        type: 'error',
                        message: `Gagal generate ulang kode: ${err.message}`
                    })
                } finally {
                    setLoading(false)
                }
            }
        })
    }

    // Show existing claim code
    const handleShowClaimCode = (vendor) => {
        setNewVendorName(vendor.nama)
        setNewVendorClaimCode(vendor.claimCode)
        setShowClaimCodeModal(true)
    }

    // Resend invitation email
    const handleResendInvitation = async (vendor) => {
        if (!vendor.email || vendor.email.trim() === '') {
            setNotification({
                show: true,
                type: 'warning',
                message: 'Vendor tidak memiliki email. Silakan edit data vendor dan tambahkan email terlebih dahulu.'
            })
            return
        }

        setConfirmModal({
            show: true,
            title: 'Kirim Ulang Undangan',
            message: `Kirim ulang email undangan ke ${vendor.email} untuk vendor "${vendor.nama}"?`,
            onConfirm: async () => {
                setConfirmModal({ ...confirmModal, show: false })
                setLoading(true)

                try {
                    // Get admin name
                    const adminName = localStorage.getItem('userName') || localStorage.getItem('userEmail') || 'Admin PLN'

                    // Generate new activation token
                    const activationToken = generateActivationToken()
                    const tokenExpires = new Date()
                    tokenExpires.setDate(tokenExpires.getDate() + 7) // 7 hari

                    console.log('🔄 Resending invitation:', {
                        tokenLength: activationToken.length,
                        tokenPreview: activationToken.substring(0, 10) + '...',
                        expires: tokenExpires.toISOString(),
                        email: vendor.email,
                        vendorName: vendor.nama
                    })

                    // Cek apakah vendor_users sudah ada dengan email ini
                    const { data: existingVendorUser } = await supabase
                        .from('vendor_users')
                        .select('id')
                        .eq('email', vendor.email)
                        .maybeSingle()

                    if (existingVendorUser) {
                        console.log('📝 Updating existing vendor_user for resend:', existingVendorUser.id)
                        // Update existing vendor_users dengan token baru
                        const { error: updateError } = await supabase
                            .from('vendor_users')
                            .update({
                                company_name: vendor.nama,
pic_name: vendor.namaPimpinan || null,
                                pic_phone: vendor.telepon || null,
                                pic_email: vendor.email,
                                address: vendor.alamat || null,
                                activation_token: activationToken,
                                activation_token_expires: tokenExpires.toISOString(),
                                invited_by: adminName,
                                is_activated: false,
                                status: 'Menunggu Aktivasi'
                            })
                            .eq('id', existingVendorUser.id)

                        if (updateError) {
                            console.error('❌ Error updating vendor_user for resend:', updateError)
                            throw updateError
                        }
                        console.log('✅ Vendor_user updated for resend')
                    } else {
                        console.log('➕ Creating new vendor_user for resend')
                        // Create new vendor_users
                        // TEMPORARY: Using placeholder password until database migration is run
                        const tempPassword = 'TEMP_PENDING_ACTIVATION_' + Date.now()

                        const { error: insertError } = await supabase
                            .from('vendor_users')
                            .insert([{
                                email: vendor.email,
                                password: tempPassword, // Temporary - will be replaced during activation
                                company_name: vendor.nama,
                                pic_name: vendor.namaPimpinan || null,
                                pic_phone: vendor.telepon || null,
                                pic_email: vendor.email,
                                address: vendor.alamat || null,
                                activation_token: activationToken,
                                activation_token_expires: tokenExpires.toISOString(),
                                invited_by: adminName,
                                is_activated: false,
                                status: 'Menunggu Aktivasi'
                            }])

                        if (insertError) {
                            console.error('❌ Error creating vendor_user for resend:', insertError)
                            throw insertError
                        }
                        console.log('✅ Vendor_user created for resend')
                    }

                    // Kirim email undangan
                    const emailResponse = await fetch('/api/send-invitation-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            email: vendor.email,
                            companyName: vendor.nama,
                            activationToken: activationToken,
                            invitedBy: adminName
                        })
                    })

                    const emailResult = await emailResponse.json()
                    if (emailResult.success) {
                        setNotification({
                            show: true,
                            type: 'success',
                            message: `Email undangan berhasil dikirim ulang ke ${vendor.email}`
                        })
                    } else {
                        throw new Error(emailResult.error || 'Gagal mengirim email')
                    }
                } catch (err) {
                    console.error('Error resending invitation:', err)
                    setNotification({
                        show: true,
                        type: 'error',
                        message: `Gagal mengirim ulang undangan: ${err.message}`
                    })
                } finally {
                    setLoading(false)
                }
            }
        })
    }

    const handleCloseModal = () => {
        setShowModal(false)
        resetForm()
    }

    const handleEdit = (vendor) => {
        setEditId(vendor.id)
        setFormData({
            id: vendor.id,
            nama: vendor.nama,
            alamat: vendor.alamat,
            telepon: vendor.telepon,
            email: vendor.email,
            namaPimpinan: vendor.namaPimpinan,
            jabatan: vendor.jabatan || '',
            npwp: vendor.npwp || '',
            status: vendor.status,
            tanggalRegistrasi: vendor.tanggalRegistrasi,
            bankPembayaran: vendor.bankPembayaran || '',
            noRekening: vendor.noRekening || '',
            namaRekening: vendor.namaRekening || ''
        })
        setIsEditing(true)
        setShowModal(true)
    }

    // Handler for showing detail modal
    const handleShowDetail = async (vendor) => {
        // Jika vendor sudah diklaim, ambil data lengkap dari vendor_users
        if (vendor.isClaimed) {
            try {
                let vendorUser = null
                let error = null

                // Coba cari berdasarkan email dulu
                if (vendor.email) {
                    const result = await supabase
                        .from('vendor_users')
                        .select('*')
                        .eq('pic_email', vendor.email)
                        .maybeSingle()
                    vendorUser = result.data
                    error = result.error
                }

                // Jika tidak ditemukan, coba cari berdasarkan company_name
                if (!vendorUser && vendor.nama) {
                    const result = await supabase
                        .from('vendor_users')
                        .select('*')
                        .eq('company_name', vendor.nama)
                        .maybeSingle()
                    vendorUser = result.data
                    error = result.error
                }

                console.log('🔍 Detail vendor_user found:', vendorUser)

                if (vendorUser && !error) {
                    // Merge data vendor dengan data vendor_users
                    setDetailVendor({
                        ...vendor,
                        bankPembayaran: vendorUser.bank_name || vendor.bankPembayaran || '',
                        noRekening: vendorUser.account_number || vendor.noRekening || '',
                        namaRekening: vendorUser.account_name || vendor.namaRekening || '',
                        jabatan: vendorUser.pic_position || vendor.jabatan || '',
                        namaPimpinan: vendorUser.pic_name || vendor.namaPimpinan || '',
                        telepon: vendorUser.pic_phone || vendor.telepon || '',
                        email: vendorUser.pic_email || vendor.email || ''
                    });
                } else {
                    console.log('ℹ️ No vendor_user found, using vendor data')
                    setDetailVendor(vendor);
                }
            } catch (err) {
                console.error('Error fetching vendor user data:', err)
                setDetailVendor(vendor);
            }
        } else {
            setDetailVendor(vendor);
        }
        setShowDetailModal(true);
    };
    const handleCloseDetailModal = () => {
        setShowDetailModal(false);
        setDetailVendor(null);
    };

    const handleDelete = async (id) => {
        const vendorToDelete = vendors.find(v => v.id === id)

        setConfirmModal({
            show: true,
            title: 'Hapus Vendor',
            message: `Apakah Anda yakin ingin menghapus vendor "${vendorToDelete?.nama}"? Data yang dihapus tidak dapat dikembalikan.`,
            onConfirm: async () => {
                setConfirmModal({ ...confirmModal, show: false })

                try {
                    setLoading(true)

                    const vendorName = vendors.find(v => v.id === id)?.nama

                    // 1. Cek apakah vendor sedang digunakan di table assets
                    const { data: assets, error: assetsError } = await supabase
                        .from('assets')
                        .select('id, name')
                        .eq('vendor_id', id)
                        .limit(5)

                    if (assetsError) {
                        console.warn('Error checking assets:', assetsError)
                    }

                    // 2. Cek apakah vendor sedang digunakan di kontrak
                    const { data: contracts, error: checkError } = await supabase
                        .from('contracts')
                        .select('id, name, vendor_name')
                        .or(`vendor_name.eq.${vendorName},pengirim.eq.${vendorName}`)
                        .limit(5)

                    if (checkError) {
                        console.warn('Error checking contracts:', checkError)
                    }

                    // 3. Jika vendor masih dipakai, tampilkan peringatan
                    const usedInAssets = assets && assets.length > 0
                    const usedInContracts = contracts && contracts.length > 0

                    if (usedInAssets || usedInContracts) {
                        let message = `Vendor "${vendorName}" tidak dapat dihapus karena masih digunakan di:\n\n`

                        if (usedInAssets) {
                            const assetNames = assets.map(a => a.name).join(', ')
                            message += `📦 Assets (${assets.length}): ${assetNames}\n`
                        }

                        if (usedInContracts) {
                            const contractNames = contracts.map(c => c.name).join(', ')
                            message += `📄 Kontrak (${contracts.length}): ${contractNames}\n`
                        }

                        message += '\nHapus atau ubah data tersebut terlebih dahulu.'

                        setNotification({ show: true, type: 'warning', message: message })
                        setLoading(false)
                        return
                    }

                    // 4. Jika tidak dipakai, lanjutkan delete
                    // Get vendor email first untuk menghapus dari vendor_users juga
                    const vendorEmail = vendors.find(v => v.id === id)?.email

                    // Delete dari tabel vendors
                    const { error } = await supabase
                        .from('vendors')
                        .delete()
                        .eq('id', id)

                    if (error) {
                        console.error('Supabase delete error:', error)
                        throw new Error(error.message || error.hint || 'Gagal menghapus vendor dari database')
                    }

                    // Delete dari tabel vendor_users jika ada email
                    if (vendorEmail) {
                        const { error: userDeleteError } = await supabase
                            .from('vendor_users')
                            .delete()
                            .eq('email', vendorEmail)

                        if (userDeleteError) {
                            console.warn('Warning: Gagal menghapus vendor_users:', userDeleteError)
                            // Don't fail the whole operation, just log it
                        }
                    }

                    setNotification({ show: true, type: 'success', message: 'Vendor berhasil dihapus dari semua tabel' })
                    fetchVendors()
                } catch (err) {
                    const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui'
                    console.error('Error deleting vendor:', errorMessage)
                    setNotification({ show: true, type: 'error', message: `Gagal menghapus vendor: ${errorMessage}` })
                } finally {
                    setLoading(false)
                }
            }
        })
    }

    // Kolom selector logic
    const toggleColumnVisibility = (column) => {
        setColumnVisibility(prev => ({
            ...prev,
            [column]: !prev[column]
        }))
    }
    const getVisibleColumnsCount = () => Object.values(columnVisibility).filter(Boolean).length;

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (columnSelectorRef.current && !columnSelectorRef.current.contains(event.target)) {
                setShowColumnSelector(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <>
            {/* Stats Cards */}
            {/* Stats Cards */}
            <div className="stats-grid-vendor">
                {[
                    {
                        title: 'Total Vendor',
                        value: vendorsData.length,
                        icon: Users,
                        color: '#3498db',
                        bgColor: '#e3f2fd',
                    },
                    {
                        title: 'Vendor Aktif',
                        value: vendorsData.filter(v => v.status === 'Aktif').length,
                        icon: CheckCircle,
                        color: '#2ecc71',
                        bgColor: '#e8f5e9',
                    },
                    {
                        title: 'Vendor Berkontrak',
                        value: vendorsData.filter(v => v.status === 'Berkontrak').length,
                        icon: Briefcase,
                        color: '#f59e0b',
                        bgColor: '#fef3c7',
                    },
                    {
                        title: 'Vendor Tidak Aktif',
                        value: vendorsData.filter(v => v.status === 'Tidak Aktif').length,
                        icon: PauseCircle,
                        color: '#e74c3c',
                        bgColor: '#ffebee',
                    },
                    // ...existing stat cards only, no empty object...
                ].map((stat, index) => {
                    const IconComponent = stat.icon;
                    return (
                        <div key={index} className="stat-card-vendor">
                            <div className="stat-icon-wrapper-vendor" style={{ background: stat.bgColor }}>
                                <IconComponent className="stat-icon-svg-vendor" style={{ color: stat.color }} strokeWidth={2.5} size={28} />
                            </div>
                            <div className="stat-info-vendor">
                                <h3 className="stat-value-vendor">{stat.value}</h3>
                                <p className="stat-title-vendor">{stat.title}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Action Bar */}
            <div className="action-bar-vendor">
                <div className="search-section-vendor">
                    <div className="search-box-vendor">
                        <span className="search-icon-vendor"><Search size={18} /></span>
                        <input
                            type="text"
                            placeholder="Cari vendor berdasarkan nama..."
                            value={searchTerm}
                            onChange={handleSearch}
                            className="search-input-vendor"
                        />
                    </div>
                    {searchTerm && (
                        <span className="search-result-count">
                            Ditemukan {filteredVendors.length} vendor
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div className="column-selector-vendor" ref={columnSelectorRef}>
                        <button
                            className="column-selector-btn-vendor"
                            onClick={() => setShowColumnSelector(!showColumnSelector)}
                            type="button"
                        >
                            <Eye size={18} /> Pilih Kolom ({getVisibleColumnsCount()}/5)
                        </button>
                        {showColumnSelector && (
                            <div className="column-dropdown-vendor">
                                <div className="column-dropdown-header-vendor">
                                    <span>Tampilkan Kolom</span>
                                </div>
                                <div className="column-options-vendor">
                                    <label className="column-option-vendor">
                                        <input type="checkbox" checked={columnVisibility.nama} onChange={() => toggleColumnVisibility('nama')} />
                                        <span>Nama Vendor</span>
                                    </label>
                                    <label className="column-option-vendor">
                                        <input type="checkbox" checked={columnVisibility.namaPimpinan} onChange={() => toggleColumnVisibility('namaPimpinan')} />
                                        <span>Nama Pimpinan</span>
                                    </label>
                                    <label className="column-option-vendor">
                                        <input type="checkbox" checked={columnVisibility.telepon} onChange={() => toggleColumnVisibility('telepon')} />
                                        <span>Telepon</span>
                                    </label>
                                    <label className="column-option-vendor">
                                        <input type="checkbox" checked={columnVisibility.email} onChange={() => toggleColumnVisibility('email')} />
                                        <span>Email</span>
                                    </label>
                                    <label className="column-option-vendor">
                                        <input type="checkbox" checked={columnVisibility.status} onChange={() => toggleColumnVisibility('status')} />
                                        <span>Status</span>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => setShowCsvImportModal(true)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: '#fff', border: 'none', borderRadius: 8,
                            padding: '10px 18px', cursor: 'pointer', fontSize: 14,
                            fontWeight: 600
                        }}
                    >
                        <Upload size={18} /> Import CSV
                    </button>
                    <button
                        className="btn-primary-vendor"
                        onClick={() => setShowModal(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Mail size={18} /> Undang Vendor Baru
                    </button>
                </div>
            </div>

            {/* Vendors Table */}
            <div className="table-container-vendor">
                <table className="vendors-table">
                    <thead>
                        <tr>
                            {columnVisibility.nama && <th>Nama Vendor</th>}
                            {columnVisibility.namaPimpinan && <th>Nama Pimpinan</th>}
                            {columnVisibility.telepon && <th>Telepon</th>}
                            {columnVisibility.email && <th>Email</th>}
                            {columnVisibility.status && <th>Status</th>}
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={8} style={{ textAlign: 'center', padding: '20px' }}>Loading data...</td>
                            </tr>
                        ) : currentVendors.length > 0 ? (
                            currentVendors.map((vendor) => (
                                <tr key={vendor.id}>
                                    {columnVisibility.nama && (
                                        <td className="vendor-name">
                                            <div className="vendor-name-container">
                                                <span className="vendor-name-text">{vendor.nama}</span>
                                                <span className="vendor-address">{vendor.alamat}</span>
                                            </div>
                                        </td>
                                    )}
                                    {/* Removed Kategori column */}
                                    {columnVisibility.namaPimpinan && <td>{vendor.namaPimpinan}</td>}
                                    {columnVisibility.telepon && <td>{vendor.telepon}</td>}
                                    {columnVisibility.email && <td className="vendor-email">{vendor.email}</td>}
                                    {columnVisibility.status && (
                                        <td>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <span className={`status-badge ${getStatusClass(vendor.status, vendor.isClaimed)}`}>
                                                    {vendor.status}
                                                </span>
                                                {!vendor.isClaimed && vendor.claimCode && (
                                                    <span style={{
                                                        fontSize: '11px',
                                                        color: '#f59e0b',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}>
                                                        <Key size={12} /> Belum diklaim
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                    <td>
                                        <div className="action-buttons-vendor">
                                            <button className="btn-icon-vendor btn-view" title="Lihat Detail" onClick={() => handleShowDetail(vendor)}><Eye size={16} /></button>
                                            <button className="btn-icon-vendor btn-edit" title="Edit" onClick={() => handleEdit(vendor)}><Edit size={16} /></button>
                                            {vendor.email && vendor.email.trim() !== '' && (
                                                <button
                                                    className="btn-icon-vendor"
                                                    title="Kirim Ulang Undangan Email"
                                                    onClick={() => handleResendInvitation(vendor)}
                                                    style={{
                                                        background: '#3b82f6',
                                                        color: 'white'
                                                    }}
                                                >
                                                    <Send size={16} />
                                                </button>
                                            )}
                                            {!vendor.isClaimed && vendor.claimCode && (
                                                <>
                                                    <button
                                                        className="btn-icon-vendor"
                                                        title="Lihat Kode Aktivasi"
                                                        onClick={() => handleShowClaimCode(vendor)}
                                                        style={{
                                                            background: '#22c55e',
                                                            color: 'white'
                                                        }}
                                                    >
                                                        <Key size={16} />
                                                    </button>
                                                    <button
                                                        className="btn-icon-vendor"
                                                        title="Generate Ulang Kode"
                                                        onClick={() => handleRegenerateClaimCode(vendor)}
                                                        style={{
                                                            background: '#f59e0b',
                                                            color: 'white'
                                                        }}
                                                    >
                                                        <RefreshCw size={16} />
                                                    </button>
                                                </>
                                            )}
                                            <button className="btn-icon-vendor btn-delete" title="Hapus" onClick={() => handleDelete(vendor.id)}><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={getVisibleColumnsCount() + 1} className="no-data">
                                    <div className="no-data-message">
                                        <span className="no-data-icon"><Search size={48} /></span>
                                        <p>Tidak ada vendor yang ditemukan</p>
                                        <small>Coba gunakan kata kunci yang berbeda</small>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {filteredVendors.length > 0 && (
                <div className="table-pagination-vendor">
                    <span className="pagination-info-vendor">
                        Menampilkan {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredVendors.length)} dari {filteredVendors.length} vendor
                    </span>
                    <div className="pagination-controls-vendor">
                        <button
                            className={`pagination-btn-vendor${totalPages <= 1 ? ' disabled-btn' : ''}`}
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={totalPages <= 1 || currentPage === 1}
                            style={{ cursor: totalPages <= 1 ? 'not-allowed' : 'pointer', opacity: totalPages <= 1 ? 0.5 : 1, textAlign: 'center', justifyContent: 'center', alignItems: 'center', display: 'flex' }}
                        >
                            ‹ Sebelumnya
                        </button>

                        {totalPages > 1 ? (
                            [...Array(totalPages)].map((_, index) => (
                                <button
                                    key={index + 1}
                                    className={`pagination-btn-vendor ${currentPage === index + 1 ? 'active' : ''}`}
                                    onClick={() => handlePageChange(index + 1)}
                                >
                                    {index + 1}
                                </button>
                            ))
                        ) : (
                            <button
                                className="pagination-btn-vendor active"
                                style={{ textAlign: 'center', justifyContent: 'center', alignItems: 'center', display: 'flex' }}
                                disabled
                            >
                                1
                            </button>
                        )}

                        <button
                            className={`pagination-btn-vendor${totalPages <= 1 ? ' disabled-btn' : ''}`}
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={totalPages <= 1 || currentPage === totalPages}
                            style={{ cursor: totalPages <= 1 ? 'not-allowed' : 'pointer', opacity: totalPages <= 1 ? 0.5 : 1, textAlign: 'center', justifyContent: 'center', alignItems: 'center', display: 'flex' }}
                        >
                            Selanjutnya ›
                        </button>
                    </div>
                </div>
            )}

            {/* Modal Tambah/Edit Vendor */}
            {showModal && (
                <div className="modal-overlay-vendor" onClick={handleCloseModal}>
                    <div className="modal-content-vendor" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-vendor">
                            <h2>{isEditing ? 'Edit Vendor' : 'Tambah Vendor Baru'}</h2>
                            <button className="modal-close-vendor" onClick={handleCloseModal}>✕</button>
                        </div>

                        {/* Claim Code Info Banner (only for new vendor) */}
                        {!isEditing && (
                            <div style={{
                                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                                border: '1px solid #22c55e',
                                borderRadius: '12px',
                                padding: '16px 20px',
                                margin: '20px 40px 0 40px',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '12px'
                            }}>
                                <Key size={24} style={{ color: '#16a34a', flexShrink: 0, marginTop: '2px' }} />
                                <div>
                                    <div style={{ fontWeight: 600, color: '#15803d', marginBottom: '4px' }}>
                                        Sistem Kode Aktivasi
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5' }}>
                                        Setelah data vendor disimpan, sistem akan menghasilkan <strong>Kode Aktivasi 6 digit</strong>.
                                        Berikan kode ini kepada vendor (via WhatsApp, telepon, atau langsung).
                                        Vendor dapat membuat akun di halaman <code>/vendor-activate</code> dengan memasukkan kode tersebut.
                                    </div>
                                </div>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="modal-form-vendor">

                            <div className="form-grid-vendor">
                                {isEditing && (
                                    <div className="form-group-vendor">
                                        <label htmlFor="id">ID Vendor <span className="required-vendor">*</span></label>
                                        <input
                                            type="text"
                                            id="id"
                                            name="id"
                                            value={formData.id}
                                            onChange={handleInputChange}
                                            placeholder="Contoh: VND013"
                                            required
                                            disabled={isEditing}
                                        />
                                    </div>
                                )}
                                {isEditing && (
                                    <div className="form-group-vendor">
                                        <label htmlFor="status">Status <span className="required-vendor">*</span></label>
                                        <select
                                            id="status"
                                            name="status"
                                            value={formData.status}
                                            onChange={handleInputChange}
                                            required
                                        >
                                            <option value="Aktif">Aktif</option>
                                            <option value="Berkontrak">Berkontrak</option>
                                            <option value="Belum Diklaim">Belum Diklaim</option>
                                            <option value="Tidak Aktif">Tidak Aktif</option>
                                        </select>
                                        <small style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                                            💡 Status akan otomatis disesuaikan dengan kontrak aktif setelah disimpan
                                        </small>
                                    </div>
                                )}
                                <div className="form-group-vendor full-width">
                                    <label htmlFor="nama">Nama Vendor <span className="required-vendor">*</span></label>
                                    <input
                                        type="text"
                                        id="nama"
                                        name="nama"
                                        value={formData.nama}
                                        onChange={handleInputChange}
                                        placeholder="Contoh: PT ABC Elektrik"
                                        required
                                    />
                                </div>
                                <div className="form-group-vendor full-width">
                                    <label htmlFor="alamat">Alamat <span className="required-vendor">*</span></label>
                                    <textarea
                                        id="alamat"
                                        name="alamat"
                                        value={formData.alamat}
                                        onChange={handleInputChange}
                                        placeholder="Contoh: Jl. Merdeka No. 123, Jakarta"
                                        rows={3}
                                        required
                                    />
                                </div>
                                <div className="form-group-vendor">
                                    <label htmlFor="namaPimpinan">Nama Pimpinan</label>
                                    <input
                                        type="text"
                                        id="namaPimpinan"
                                        name="namaPimpinan"
                                        value={formData.namaPimpinan}
                                        onChange={handleInputChange}
                                        placeholder="Contoh: John Doe"
                                    />
                                </div>
                                <div className="form-group-vendor">
                                    <label htmlFor="jabatan">Jabatan</label>
                                    <input
                                        type="text"
                                        id="jabatan"
                                        name="jabatan"
                                        value={formData.jabatan}
                                        onChange={handleInputChange}
                                        placeholder="Contoh: Direktur"
                                    />
                                </div>
                                <div className="form-group-vendor">
                                    <label htmlFor="telepon">Telepon</label>
                                    <input
                                        type="tel"
                                        id="telepon"
                                        name="telepon"
                                        value={formData.telepon}
                                        onChange={handleInputChange}
                                        placeholder="Contoh: 021-1234567"
                                    />
                                </div>
                                <div className="form-group-vendor">
                                    <label htmlFor="email">Email Vendor</label>
                                    <input
                                        type="email"
                                        id="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        placeholder="Opsional: info@vendor.com"
                                    />
                                </div>
                                <div className="form-group-vendor full-width">
                                    <label htmlFor="bankPembayaran">Bank Pembayaran</label>
                                    <input
                                        type="text"
                                        id="bankPembayaran"
                                        name="bankPembayaran"
                                        value={formData.bankPembayaran}
                                        onChange={handleInputChange}
                                        placeholder="Contoh: Bank Mandiri"
                                    />
                                </div>
                                <div className="form-group-vendor">
                                    <label htmlFor="noRekening">No. Rekening</label>
                                    <input
                                        type="text"
                                        id="noRekening"
                                        name="noRekening"
                                        value={formData.noRekening}
                                        onChange={handleInputChange}
                                        placeholder="Contoh: 1234567890"
                                    />
                                </div>
                                <div className="form-group-vendor">
                                    <label htmlFor="namaRekening">Nama Rekening</label>
                                    <input
                                        type="text"
                                        id="namaRekening"
                                        name="namaRekening"
                                        value={formData.namaRekening}
                                        onChange={handleInputChange}
                                        placeholder="Contoh: PT ABC Elektrik"
                                    />
                                </div>
                            </div>
                            <div className="modal-footer-vendor">
                                <button type="button" className="btn-cancel-vendor" onClick={handleCloseModal}>
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="btn-submit-vendor"
                                    disabled={loading || vendorGuard.isSubmitting}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        background: isEditing ? undefined : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                                    }}
                                >
                                    {loading ? (
                                        <>
                                            <RefreshCw size={18} className="spinning" />
                                            Menyimpan...
                                        </>
                                    ) : isEditing ? (
                                        <>
                                            <Save size={18} /> Update Vendor
                                        </>
                                    ) : (
                                        <>
                                            <Plus size={18} /> Simpan & Generate Kode
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Detail Vendor - Styled like contract detail */}
            {showDetailModal && detailVendor && (
                <div className="modal-overlay-vendor" onClick={handleCloseDetailModal}>
                    <div className="modal-content-vendor" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header-vendor" style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: 16, marginBottom: 0 }}>
                            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: '#1a1a1a' }}>Detail Vendor</h2>
                            <button className="modal-close-vendor" onClick={handleCloseDetailModal} style={{ fontSize: 24, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}>✕</button>
                        </div>
                        <div style={{ padding: '24px 40px 32px 40px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                                <ClipboardList size={20} style={{ color: '#2563eb' }} />
                                <span style={{ fontWeight: 600, fontSize: 15, color: '#2563eb' }}>Informasi Vendor</span>
                            </div>
                            <div className="detail-grid-vendor" style={{ marginTop: 20 }}>
                                <div className="detail-group-vendor full-width">
                                    <span className="detail-label-vendor" style={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.5px', color: '#6b7280', marginBottom: 6 }}>Nama Vendor</span>
                                    <div style={{ fontSize: 15, fontWeight: 600, color: '#1f2937', padding: '4px 0' }}>{detailVendor.nama}</div>
                                </div>
                                <div className="detail-group-vendor">
                                    <span className="detail-label-vendor" style={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.5px', color: '#6b7280', marginBottom: 6 }}>Status Saat Ini</span>
                                    <div style={{ marginTop: 2 }}>
                                        <span style={{ background: detailVendor.status === 'Aktif' ? '#d1fae5' : detailVendor.status === 'Berkontrak' ? '#fef3c7' : '#fee2e2', color: detailVendor.status === 'Aktif' ? '#065f46' : detailVendor.status === 'Berkontrak' ? '#92400e' : '#991b1b', fontWeight: 600, borderRadius: 6, padding: '6px 16px', fontSize: 13, display: 'inline-block' }}>{detailVendor.status}</span>
                                    </div>
                                </div>
                                <div className="detail-group-vendor">
                                    <span className="detail-label-vendor" style={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.5px', color: '#6b7280', marginBottom: 6 }}>Tanggal Registrasi</span>
                                    <div className="detail-value-vendor" style={{ background: '#f9fafb', border: '1px solid #e5e7eb', padding: '10px 14px', fontSize: 14, color: '#1f2937' }}>
                                        {detailVendor.tanggalRegistrasi ? new Date(detailVendor.tanggalRegistrasi).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                                    </div>
                                </div>
                                <div className="detail-group-vendor">
                                    <span className="detail-label-vendor" style={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.5px', color: '#6b7280', marginBottom: 6 }}>Telepon</span>
                                    <div className="detail-value-vendor" style={{ background: '#f9fafb', border: '1px solid #e5e7eb', padding: '10px 14px', fontSize: 14, color: '#1f2937' }}>{detailVendor.telepon}</div>
                                </div>
                                <div className="detail-group-vendor">
                                    <span className="detail-label-vendor" style={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.5px', color: '#6b7280', marginBottom: 6 }}>Email</span>
                                    <div className="detail-value-vendor" style={{ background: '#f9fafb', border: '1px solid #e5e7eb', padding: '10px 14px', fontSize: 14, color: '#1f2937' }}>{detailVendor.email}</div>
                                </div>
                                <div className="detail-group-vendor full-width">
                                    <span className="detail-label-vendor" style={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.5px', color: '#6b7280', marginBottom: 6 }}>Nama Pimpinan</span>
                                    <div className="detail-value-vendor" style={{ background: '#f9fafb', border: '1px solid #e5e7eb', padding: '10px 14px', fontSize: 14, color: '#1f2937' }}>{detailVendor.namaPimpinan}</div>
                                </div>
                                <div className="detail-group-vendor full-width">
                                    <span className="detail-label-vendor" style={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.5px', color: '#6b7280', marginBottom: 6 }}>Jabatan</span>
                                    <div className="detail-value-vendor" style={{ background: '#f9fafb', border: '1px solid #e5e7eb', padding: '10px 14px', fontSize: 14, color: '#1f2937' }}>{detailVendor.jabatan || '-'}</div>
                                </div>
                                <div className="detail-group-vendor full-width">
                                    <span className="detail-label-vendor" style={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.5px', color: '#6b7280', marginBottom: 6 }}>Alamat</span>
                                    <div className="detail-value-vendor" style={{ background: '#f9fafb', border: '1px solid #e5e7eb', padding: '10px 14px', fontSize: 14, color: '#1f2937' }}>{detailVendor.alamat}</div>
                                </div>
                                {/* Informasi Bank */}
                                <div className="detail-group-vendor">
                                    <span className="detail-label-vendor" style={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.5px', color: '#6b7280', marginBottom: 6 }}>Bank Pembayaran</span>
                                    <div className="detail-value-vendor" style={{ background: '#f9fafb', border: '1px solid #e5e7eb', padding: '10px 14px', fontSize: 14, color: '#1f2937' }}>{detailVendor.bankPembayaran || '-'}</div>
                                </div>
                                <div className="detail-group-vendor">
                                    <span className="detail-label-vendor" style={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.5px', color: '#6b7280', marginBottom: 6 }}>No. Rekening</span>
                                    <div className="detail-value-vendor" style={{ background: '#f9fafb', border: '1px solid #e5e7eb', padding: '10px 14px', fontSize: 14, color: '#1f2937' }}>{detailVendor.noRekening || '-'}</div>
                                </div>
                                <div className="detail-group-vendor full-width">
                                    <span className="detail-label-vendor" style={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.5px', color: '#6b7280', marginBottom: 6 }}>Nama Rekening</span>
                                    <div className="detail-value-vendor" style={{ background: '#f9fafb', border: '1px solid #e5e7eb', padding: '10px 14px', fontSize: 14, color: '#1f2937' }}>{detailVendor.namaRekening || '-'}</div>
                                </div>
                            </div>
                            <div className="modal-footer-vendor" style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid #e5e7eb' }}>
                                <button type="button" className="btn-cancel-vendor" onClick={handleCloseDetailModal} style={{ minWidth: 100, padding: '10px 24px', fontSize: 14 }}>
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Claim Code - Ditampilkan setelah vendor baru dibuat */}
            {showClaimCodeModal && (
                <div className="modal-overlay-vendor" onClick={() => setShowClaimCodeModal(false)}>
                    <div className="modal-content-vendor" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <div className="modal-header-vendor" style={{
                            borderBottom: '1px solid #e5e7eb',
                            paddingBottom: 16,
                            marginBottom: 0,
                            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
                        }}>
                            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: '#15803d', display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Key size={24} /> Vendor Berhasil Ditambahkan!
                            </h2>
                            <button
                                className="modal-close-vendor"
                                onClick={() => setShowClaimCodeModal(false)}
                                style={{ fontSize: 24, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}
                            >
                                ✕
                            </button>
                        </div>
                        <div style={{ padding: '32px 40px' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{
                                    fontSize: 15,
                                    color: '#374151',
                                    marginBottom: 24,
                                    lineHeight: 1.6
                                }}>
                                    Vendor <strong>"{newVendorName}"</strong> telah ditambahkan. <br />
                                    Berikan kode aktivasi berikut kepada vendor:
                                </div>

                                {/* Claim Code Display */}
                                <div style={{
                                    background: '#1f2937',
                                    borderRadius: '16px',
                                    padding: '24px 32px',
                                    marginBottom: 24
                                }}>
                                    <div style={{
                                        fontFamily: 'monospace',
                                        fontSize: '48px',
                                        fontWeight: 700,
                                        color: '#22c55e',
                                        letterSpacing: '12px',
                                        textAlign: 'center'
                                    }}>
                                        {newVendorClaimCode}
                                    </div>
                                </div>

                                {/* Copy Button */}
                                <button
                                    onClick={copyClaimCode}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '12px 24px',
                                        background: '#2563eb',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        marginBottom: 24
                                    }}
                                >
                                    <Copy size={18} />
                                    Salin Kode
                                </button>

                                {/* Instructions */}
                                <div style={{
                                    background: '#fef3c7',
                                    border: '1px solid #f59e0b',
                                    borderRadius: '8px',
                                    padding: '16px',
                                    textAlign: 'left',
                                    fontSize: '13px',
                                    color: '#92400e',
                                    lineHeight: 1.6
                                }}>
                                    <strong>⚠️ Penting:</strong>
                                    <ul style={{ margin: '8px 0 0 16px', paddingLeft: 0 }}>
                                        <li>Berikan kode ini kepada vendor via WhatsApp, telepon, atau langsung</li>
                                        <li>Vendor dapat aktivasi di: <code style={{ background: '#fef9c3', padding: '2px 6px', borderRadius: 4 }}>/vendor-activate</code></li>
                                        <li>Kode ini hanya bisa digunakan satu kali</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div style={{
                            padding: '16px 40px 24px',
                            borderTop: '1px solid #e5e7eb',
                            display: 'flex',
                            justifyContent: 'center'
                        }}>
                            <button
                                onClick={() => setShowClaimCodeModal(false)}
                                style={{
                                    padding: '10px 32px',
                                    background: '#f3f4f6',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    color: '#374151'
                                }}
                            >
                                Tutup
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
                type="delete"
                title={confirmModal.title}
                message={confirmModal.message}
                onConfirm={confirmModal.onConfirm}
                onCancel={() => setConfirmModal({ ...confirmModal, show: false })}
            />

            {/* Vendor CSV Import Modal */}
            <VendorCsvImportModal
                isOpen={showCsvImportModal}
                onClose={() => setShowCsvImportModal(false)}
                onImportComplete={() => fetchVendors()}
                showAlert={(type, message) => {
                    setNotification({
                        show: true,
                        type: type as 'success' | 'error' | 'warning' | 'info',
                        message
                    })
                }}
            />
        </>
    )
}

export default DataVendor
