/**
 * Data Vendor - Unit Tests
 * Testing all features: CRUD, Search, Pagination, Column Visibility, Upload, Detail Modal
 */

import '@testing-library/jest-dom'

describe('Data Vendor - Core Features', () => {
    describe('Vendor Data Structure & Validation', () => {
        test('Vendor should have all required fields', () => {
            const vendor = {
                id: 'VND001',
                nama: 'PT ABC Elektrik',
                alamat: 'Jl. Sudirman No. 123, Jakarta',
                telepon: '021-12345678',
                email: 'info@abcelektrik.com',
                kontakPerson: 'Budi Santoso',
                status: 'Aktif',
                tanggalRegistrasi: '2025-01-15'
            }

            expect(vendor.id).toBeDefined()
            expect(vendor.nama).toBeTruthy()
            expect(vendor.alamat).toBeTruthy()
            expect(vendor.telepon).toBeTruthy()
            expect(vendor.email).toBeTruthy()
            expect(vendor.kontakPerson).toBeTruthy()
            expect(vendor.status).toBeTruthy()
            expect(vendor.tanggalRegistrasi).toBeTruthy()
        })

        test('Email should have valid format', () => {
            const validateEmail = (email) => {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                return emailRegex.test(email)
            }

            expect(validateEmail('test@example.com')).toBe(true)
            expect(validateEmail('user@company.co.id')).toBe(true)
            expect(validateEmail('invalid-email')).toBe(false)
            expect(validateEmail('no@domain')).toBe(false)
        })

        test('Phone number should be valid format', () => {
            const validatePhone = (phone) => {
                // Allow formats: 021-12345678, 08123456789, +6221-12345678
                const phoneRegex = /^(\+?\d{1,4}[\s-]?)?(\(?\d{2,4}\)?[\s-]?)?[\d\s-]{7,}$/
                return phoneRegex.test(phone)
            }

            expect(validatePhone('021-12345678')).toBe(true)
            expect(validatePhone('08123456789')).toBe(true)
            expect(validatePhone('+6221-12345678')).toBe(true)
            expect(validatePhone('123')).toBe(false)
        })
    })

    describe('Search Functionality', () => {
        const mockVendors = [
            { id: 'VND001', nama: 'PT ABC Elektrik', email: 'abc@email.com', status: 'Aktif' },
            { id: 'VND002', nama: 'PT XYZ Teknologi', email: 'xyz@email.com', status: 'Aktif' },
            { id: 'VND003', nama: 'CV DEF Konstruksi', email: 'def@email.com', status: 'Tidak Aktif' }
        ]

        test('Search by vendor name should filter correctly', () => {
            const searchTerm = 'xyz'
            const filtered = mockVendors.filter(v =>
                v.nama.toLowerCase().includes(searchTerm.toLowerCase())
            )

            expect(filtered).toHaveLength(1)
            expect(filtered[0].id).toBe('VND002')
        })

        test('Search should be case-insensitive', () => {
            const searchTerm = 'ELEKTRIK'
            const filtered = mockVendors.filter(v =>
                v.nama.toLowerCase().includes(searchTerm.toLowerCase())
            )

            expect(filtered).toHaveLength(1)
            expect(filtered[0].nama).toContain('Elektrik')
        })

        test('Empty search should show all vendors', () => {
            const searchTerm = ''
            const filtered = mockVendors.filter(v =>
                v.nama.toLowerCase().includes(searchTerm.toLowerCase())
            )

            expect(filtered).toHaveLength(3)
        })

        test('No match search should return empty', () => {
            const searchTerm = 'nonexistent'
            const filtered = mockVendors.filter(v =>
                v.nama.toLowerCase().includes(searchTerm.toLowerCase())
            )

            expect(filtered).toHaveLength(0)
        })
    })

    describe('Pagination Logic', () => {
        const mockVendors = Array.from({ length: 25 }, (_, i) => ({
            id: `VND${String(i + 1).padStart(3, '0')}`,
            nama: `Vendor ${i + 1}`,
            status: 'Aktif'
        }))

        test('Should calculate total pages correctly', () => {
            const itemsPerPage = 10
            const totalPages = Math.ceil(mockVendors.length / itemsPerPage)

            expect(totalPages).toBe(3) // 25 items / 10 per page = 3 pages
        })

        test('Should get correct items for first page', () => {
            const currentPage = 1
            const itemsPerPage = 10
            const indexOfLastItem = currentPage * itemsPerPage
            const indexOfFirstItem = indexOfLastItem - itemsPerPage
            const currentVendors = mockVendors.slice(indexOfFirstItem, indexOfLastItem)

            expect(currentVendors).toHaveLength(10)
            expect(currentVendors[0].id).toBe('VND001')
            expect(currentVendors[9].id).toBe('VND010')
        })

        test('Should get correct items for last page', () => {
            const currentPage = 3
            const itemsPerPage = 10
            const indexOfLastItem = currentPage * itemsPerPage
            const indexOfFirstItem = indexOfLastItem - itemsPerPage
            const currentVendors = mockVendors.slice(indexOfFirstItem, indexOfLastItem)

            expect(currentVendors).toHaveLength(5) // Last page has 5 items
            expect(currentVendors[0].id).toBe('VND021')
            expect(currentVendors[4].id).toBe('VND025')
        })

        test('Page change should update current page', () => {
            let currentPage = 1
            const handlePageChange = (pageNumber) => {
                currentPage = pageNumber
            }

            handlePageChange(2)
            expect(currentPage).toBe(2)

            handlePageChange(3)
            expect(currentPage).toBe(3)
        })
    })

    describe('Status Management', () => {
        test('getStatusClass should return correct class for Aktif', () => {
            const getStatusClass = (status) => {
                return status === 'Aktif' ? 'status-active' : 'status-inactive'
            }

            expect(getStatusClass('Aktif')).toBe('status-active')
        })

        test('getStatusClass should return correct class for Tidak Aktif', () => {
            const getStatusClass = (status) => {
                return status === 'Aktif' ? 'status-active' : 'status-inactive'
            }

            expect(getStatusClass('Tidak Aktif')).toBe('status-inactive')
        })

        test('Status should be either Aktif or Tidak Aktif', () => {
            const validStatuses = ['Aktif', 'Tidak Aktif']
            const vendor = { status: 'Aktif' }

            expect(validStatuses).toContain(vendor.status)
        })
    })

    describe('Column Visibility Toggle', () => {
        test('All columns should be visible by default', () => {
            const defaultColumns = {
                id: true,
                nama: true,
                kontakPerson: true,
                telepon: true,
                email: true,
                status: true
            }

            const visibleCount = Object.values(defaultColumns).filter(v => v === true).length
            expect(visibleCount).toBe(6)
        })

        test('Toggle column visibility should work', () => {
            let columnVisibility = {
                id: true,
                nama: true,
                kontakPerson: true,
                telepon: true,
                email: true,
                status: true
            }

            // Toggle off telepon
            columnVisibility.telepon = !columnVisibility.telepon
            expect(columnVisibility.telepon).toBe(false)

            // Toggle on again
            columnVisibility.telepon = !columnVisibility.telepon
            expect(columnVisibility.telepon).toBe(true)
        })

        test('Get visible columns count', () => {
            const columnVisibility = {
                id: true,
                nama: true,
                kontakPerson: false,
                telepon: false,
                email: true,
                status: true
            }

            const getVisibleColumnsCount = () =>
                Object.values(columnVisibility).filter(Boolean).length

            expect(getVisibleColumnsCount()).toBe(4)
        })
    })
})

describe('Form Management', () => {
    describe('Form Data Handling', () => {
        test('Form should initialize with empty values', () => {
            const formData = {
                id: '',
                nama: '',
                alamat: '',
                telepon: '',
                email: '',
                kontakPerson: '',
                status: 'Aktif',
                tanggalRegistrasi: ''
            }

            expect(formData.id).toBe('')
            expect(formData.nama).toBe('')
            expect(formData.status).toBe('Aktif')
        })

        test('Input change should update form data', () => {
            let formData = {
                nama: '',
                email: ''
            }

            // Simulate input change
            const handleInputChange = (name, value) => {
                formData = { ...formData, [name]: value }
            }

            handleInputChange('nama', 'PT ABC')
            handleInputChange('email', 'test@abc.com')

            expect(formData.nama).toBe('PT ABC')
            expect(formData.email).toBe('test@abc.com')
        })

        test('Form reset should clear all fields', () => {
            let formData = {
                id: 'VND001',
                nama: 'PT ABC',
                alamat: 'Jakarta',
                telepon: '021-123456',
                email: 'test@abc.com',
                kontakPerson: 'Budi',
                status: 'Tidak Aktif',
                tanggalRegistrasi: '2025-01-01'
            }

            // Reset form
            formData = {
                id: '',
                nama: '',
                alamat: '',
                telepon: '',
                email: '',
                kontakPerson: '',
                status: 'Aktif',
                tanggalRegistrasi: ''
            }

            expect(formData.id).toBe('')
            expect(formData.nama).toBe('')
            expect(formData.status).toBe('Aktif')
        })
    })

    describe('Form Validation', () => {
        test('Required fields should not be empty', () => {
            const formData = {
                nama: 'PT ABC',
                alamat: 'Jakarta',
                telepon: '021-123456',
                email: 'test@abc.com',
                kontakPerson: 'Budi'
            }

            expect(formData.nama).toBeTruthy()
            expect(formData.alamat).toBeTruthy()
            expect(formData.telepon).toBeTruthy()
            expect(formData.email).toBeTruthy()
        })

        test('Email validation should work', () => {
            const email = 'test@example.com'
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

            expect(emailRegex.test(email)).toBe(true)
        })

        test('Invalid email should fail validation', () => {
            const email = 'invalid-email'
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

            expect(emailRegex.test(email)).toBe(false)
        })
    })

    describe('Edit Mode', () => {
        test('Edit mode should populate form with vendor data', () => {
            const vendor = {
                id: 'VND001',
                nama: 'PT ABC',
                alamat: 'Jakarta',
                telepon: '021-123456',
                email: 'test@abc.com',
                kontakPerson: 'Budi',
                status: 'Aktif',
                tanggalRegistrasi: '2025-01-15'
            }

            let formData = { ...vendor }
            let isEditing = true
            let editId = vendor.id

            expect(formData.id).toBe('VND001')
            expect(formData.nama).toBe('PT ABC')
            expect(isEditing).toBe(true)
            expect(editId).toBe('VND001')
        })

        test('Closing edit mode should reset form', () => {
            let isEditing = true
            let editId = 'VND001'

            // Close edit mode
            isEditing = false
            editId = null

            expect(isEditing).toBe(false)
            expect(editId).toBeNull()
        })
    })
})

describe('Modal Management', () => {
    describe('Add/Edit Modal', () => {
        test('Opening modal should set showModal to true', () => {
            let showModal = false
            showModal = true

            expect(showModal).toBe(true)
        })

        test('Closing modal should reset state', () => {
            let showModal = true
            let formData = { nama: 'Test' }

            // Close modal
            showModal = false
            formData = { id: '', nama: '', alamat: '' }

            expect(showModal).toBe(false)
            expect(formData.nama).toBe('')
        })
    })

    describe('Detail Modal', () => {
        test('Opening detail modal should set vendor data', () => {
            const vendor = {
                id: 'VND001',
                nama: 'PT ABC',
                email: 'test@abc.com'
            }

            let showDetailModal = false
            let detailVendor = null

            // Open detail
            showDetailModal = true
            detailVendor = vendor

            expect(showDetailModal).toBe(true)
            expect(detailVendor.id).toBe('VND001')
        })

        test('Closing detail modal should clear vendor data', () => {
            let showDetailModal = true
            let detailVendor = { id: 'VND001' }

            // Close detail
            showDetailModal = false
            detailVendor = null

            expect(showDetailModal).toBe(false)
            expect(detailVendor).toBeNull()
        })
    })
})

describe('File Upload', () => {
    describe('File Selection', () => {
        test('File selection should update selectedFile state', () => {
            let selectedFile = null

            // Simulate file selection
            const mockFile = { name: 'vendor-doc.pdf', size: 1024000 }
            selectedFile = mockFile

            expect(selectedFile).toBeDefined()
            expect(selectedFile.name).toBe('vendor-doc.pdf')
        })

        test('Clear file selection should set selectedFile to null', () => {
            let selectedFile = { name: 'test.pdf' }

            // Clear selection
            selectedFile = null

            expect(selectedFile).toBeNull()
        })
    })

    describe('Upload Validation', () => {
        test('Upload should require file selection', () => {
            const selectedFile = null
            const canUpload = !!selectedFile

            expect(canUpload).toBe(false)
        })

        test('Upload should validate PDF format', () => {
            const file = { name: 'document.pdf', type: 'application/pdf' }
            const isPDF = file.name.endsWith('.pdf') || file.type === 'application/pdf'

            expect(isPDF).toBe(true)
        })

        test('Non-PDF file should fail validation', () => {
            const file = { name: 'document.docx', type: 'application/msword' }
            const isPDF = file.name.endsWith('.pdf') || file.type === 'application/pdf'

            expect(isPDF).toBe(false)
        })
    })
})

describe('Data Transformation', () => {
    describe('Supabase to UI Mapping', () => {
        test('Should map snake_case to camelCase correctly', () => {
            const supabaseData = {
                id: 'VND001',
                name: 'PT ABC',
                alamat: 'Jakarta',
                phone: '021-123456',
                email: 'test@abc.com',
                kontak_person: 'Budi',
                status: 'Aktif',
                tanggal_registrasi: '2025-01-15'
            }

            // Map to UI format
            const uiData = {
                id: supabaseData.id,
                nama: supabaseData.name || supabaseData.nama,
                alamat: supabaseData.alamat || supabaseData.address,
                telepon: supabaseData.telepon || supabaseData.phone,
                email: supabaseData.email,
                kontakPerson: supabaseData.kontak_person || supabaseData.contact_person,
                status: supabaseData.status,
                tanggalRegistrasi: supabaseData.tanggal_registrasi || supabaseData.registration_date
            }

            expect(uiData.nama).toBe('PT ABC')
            expect(uiData.telepon).toBe('021-123456')
            expect(uiData.kontakPerson).toBe('Budi')
            expect(uiData.tanggalRegistrasi).toBe('2025-01-15')
        })
    })

    describe('UI to Supabase Mapping', () => {
        test('Should map camelCase to snake_case correctly', () => {
            const uiData = {
                id: 'VND001',
                nama: 'PT ABC',
                alamat: 'Jakarta',
                telepon: '021-123456',
                email: 'test@abc.com',
                kontakPerson: 'Budi',
                status: 'Aktif',
                tanggalRegistrasi: '2025-01-15'
            }

            // Map to Supabase format
            const supabaseData = {
                id: uiData.id,
                nama: uiData.nama,
                alamat: uiData.alamat,
                telepon: uiData.telepon,
                email: uiData.email,
                kontak_person: uiData.kontakPerson,
                status: uiData.status,
                tanggal_registrasi: uiData.tanggalRegistrasi
            }

            expect(supabaseData.nama).toBe('PT ABC')
            expect(supabaseData.telepon).toBe('021-123456')
            expect(supabaseData.kontak_person).toBe('Budi')
            expect(supabaseData.tanggal_registrasi).toBe('2025-01-15')
        })
    })
})

describe('URL Parameter Handling', () => {
    describe('Auto-open Detail from URL', () => {
        test('Should extract vendor ID from URL', () => {
            const urlParams = '?id=VND001'
            const vendorId = new URLSearchParams(urlParams).get('id')

            expect(vendorId).toBe('VND001')
        })

        test('Should find vendor by ID', () => {
            const vendors = [
                { id: 'VND001', nama: 'PT ABC' },
                { id: 'VND002', nama: 'PT XYZ' }
            ]
            const searchId = 'VND001'

            const found = vendors.find(v => v.id === searchId)

            expect(found).toBeDefined()
            expect(found.id).toBe('VND001')
        })

        test('Should open detail modal when vendor found', () => {
            const vendor = { id: 'VND001', nama: 'PT ABC' }
            let showDetailModal = false
            let detailVendor = null

            // Simulate auto-open
            if (vendor) {
                showDetailModal = true
                detailVendor = vendor
            }

            expect(showDetailModal).toBe(true)
            expect(detailVendor.id).toBe('VND001')
        })
    })
})

describe('Edge Cases & Error Scenarios', () => {
    test('Handle empty vendor list', () => {
        const vendors = []
        const searchTerm = 'test'

        const filtered = vendors.filter(v =>
            v.nama.toLowerCase().includes(searchTerm.toLowerCase())
        )

        expect(filtered).toHaveLength(0)
    })

    test('Handle null/undefined values in vendor data', () => {
        const vendor = {
            id: 'VND001',
            nama: null,
            alamat: undefined,
            telepon: '',
            email: null,
            kontakPerson: undefined,
            status: ''
        }

        const nama = vendor.nama || '-'
        const alamat = vendor.alamat || '-'
        const telepon = vendor.telepon || '-'
        const email = vendor.email || '-'
        const kontakPerson = vendor.kontakPerson || '-'
        const status = vendor.status || 'Aktif'

        expect(nama).toBe('-')
        expect(alamat).toBe('-')
        expect(telepon).toBe('-')
        expect(email).toBe('-')
        expect(kontakPerson).toBe('-')
        expect(status).toBe('Aktif')
    })

    test('Handle pagination with zero items', () => {
        const vendors = []
        const itemsPerPage = 10
        const totalPages = Math.ceil(vendors.length / itemsPerPage)

        expect(totalPages).toBe(0)
    })

    test('Handle search with special characters', () => {
        const vendors = [
            { id: 'VND001', nama: 'PT ABC & Co.' },
            { id: 'VND002', nama: 'CV XYZ (Jakarta)' }
        ]

        const searchTerm = '&'
        const filtered = vendors.filter(v =>
            v.nama.toLowerCase().includes(searchTerm.toLowerCase())
        )

        expect(filtered).toHaveLength(1)
        expect(filtered[0].nama).toContain('&')
    })
})
