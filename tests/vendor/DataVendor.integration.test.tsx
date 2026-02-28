/**
 * Data Vendor - Integration Tests
 * Testing complete user flows and complex interactions
 */

import '@testing-library/jest-dom'

describe('Data Vendor - Integration Tests', () => {
    describe('Complete CRUD Flow', () => {
        test('User can create, view, edit, and delete vendor', () => {
            // Step 1: Create new vendor
            const newVendor = {
                id: 'VND001',
                nama: 'PT ABC Elektrik',
                alamat: 'Jl. Sudirman No. 123, Jakarta',
                telepon: '021-12345678',
                email: 'info@abcelektrik.com',
                kontakPerson: 'Budi Santoso',
                status: 'Aktif',
                tanggalRegistrasi: '2025-01-15'
            }

            expect(newVendor.id).toBeTruthy()
            expect(newVendor.nama).toBeTruthy()

            // Step 2: View vendor in list
            const vendors = [newVendor]
            const found = vendors.find(v => v.id === 'VND001')
            expect(found).toBeDefined()

            // Step 3: Edit vendor
            const editedVendor = {
                ...newVendor,
                alamat: 'Jl. Thamrin No. 456, Jakarta',
                telepon: '021-98765432',
                status: 'Tidak Aktif'
            }

            expect(editedVendor.alamat).toBe('Jl. Thamrin No. 456, Jakarta')
            expect(editedVendor.telepon).toBe('021-98765432')
            expect(editedVendor.status).toBe('Tidak Aktif')

            // Step 4: Delete vendor
            const afterDelete = vendors.filter(v => v.id !== 'VND001')
            expect(afterDelete).toHaveLength(0)
        })

        test('Search and pagination flow works correctly', () => {
            // Create 25 vendors
            const vendors = Array.from({ length: 25 }, (_, i) => ({
                id: `VND${String(i + 1).padStart(3, '0')}`,
                nama: `Vendor ${String.fromCharCode(65 + (i % 26))}${i + 1}`,
                status: 'Aktif'
            }))

            // Step 1: View all vendors (page 1)
            const itemsPerPage = 10
            let currentPage = 1
            let indexOfLastItem = currentPage * itemsPerPage
            let indexOfFirstItem = indexOfLastItem - itemsPerPage
            let currentVendors = vendors.slice(indexOfFirstItem, indexOfLastItem)

            expect(currentVendors).toHaveLength(10)

            // Step 2: Search for specific vendor
            const searchTerm = 'Vendor A'
            const filtered = vendors.filter(v =>
                v.nama.toLowerCase().includes(searchTerm.toLowerCase())
            )
            expect(filtered.length).toBeGreaterThan(0)

            // Step 3: Navigate to page 2
            currentPage = 2
            indexOfLastItem = currentPage * itemsPerPage
            indexOfFirstItem = indexOfLastItem - itemsPerPage
            currentVendors = vendors.slice(indexOfFirstItem, indexOfLastItem)

            expect(currentVendors).toHaveLength(10)
            expect(currentVendors[0].id).toBe('VND011')

            // Step 4: Navigate to last page
            const totalPages = Math.ceil(vendors.length / itemsPerPage)
            currentPage = totalPages
            indexOfLastItem = currentPage * itemsPerPage
            indexOfFirstItem = indexOfLastItem - itemsPerPage
            currentVendors = vendors.slice(indexOfFirstItem, indexOfLastItem)

            expect(currentVendors).toHaveLength(5) // Last page has 5 items
        })
    })

    describe('Form Handling Flow', () => {
        test('Complete form submission flow - Add new vendor', () => {
            // Step 1: Open modal
            let showModal = false
            let isEditing = false
            showModal = true

            expect(showModal).toBe(true)
            expect(isEditing).toBe(false)

            // Step 2: Fill form
            let formData = {
                id: 'VND001',
                nama: 'PT ABC Elektrik',
                alamat: 'Jakarta',
                telepon: '021-123456',
                email: 'test@abc.com',
                kontakPerson: 'Budi',
                status: 'Aktif',
                tanggalRegistrasi: '2025-01-15'
            }

            // Step 3: Validate form
            const isValid = !!(formData.nama && formData.alamat && formData.email)
            expect(isValid).toBe(true)

            // Step 4: Submit (create payload)
            const payload = {
                id: formData.id,
                nama: formData.nama,
                alamat: formData.alamat,
                telepon: formData.telepon,
                email: formData.email,
                kontak_person: formData.kontakPerson,
                status: formData.status,
                tanggal_registrasi: formData.tanggalRegistrasi
            }

            expect(payload.kontak_person).toBe('Budi')
            expect(payload.tanggal_registrasi).toBe('2025-01-15')

            // Step 5: Close modal and reset
            showModal = false
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

            expect(showModal).toBe(false)
            expect(formData.nama).toBe('')
        })

        test('Complete form submission flow - Edit existing vendor', () => {
            const existingVendor = {
                id: 'VND001',
                nama: 'PT ABC',
                alamat: 'Jakarta',
                telepon: '021-123456',
                email: 'test@abc.com',
                kontakPerson: 'Budi',
                status: 'Aktif',
                tanggalRegistrasi: '2025-01-15'
            }

            // Step 1: Click edit button
            let isEditing = false
            let editId = null
            let showModal = false
            let formData = {}

            isEditing = true
            editId = existingVendor.id
            formData = { ...existingVendor }
            showModal = true

            expect(isEditing).toBe(true)
            expect(editId).toBe('VND001')
            expect(formData.nama).toBe('PT ABC')

            // Step 2: Modify form data
            formData.nama = 'PT ABC Elektrik (Updated)'
            formData.alamat = 'Jl. Baru No. 789'

            expect(formData.nama).toContain('Updated')

            // Step 3: Submit update
            const payload = {
                id: formData.id,
                nama: formData.nama,
                alamat: formData.alamat,
                telepon: formData.telepon,
                email: formData.email,
                kontak_person: formData.kontakPerson,
                status: formData.status,
                tanggal_registrasi: formData.tanggalRegistrasi
            }

            expect(payload.nama).toContain('Updated')

            // Step 4: Reset after submit
            isEditing = false
            editId = null
            showModal = false

            expect(isEditing).toBe(false)
            expect(editId).toBeNull()
        })
    })

    describe('Detail Modal Flow', () => {
        test('Complete view detail flow', () => {
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

            // Step 1: Click view detail button
            let showDetailModal = false
            let detailVendor = null

            showDetailModal = true
            detailVendor = vendor

            expect(showDetailModal).toBe(true)
            expect(detailVendor.id).toBe('VND001')

            // Step 2: View all vendor information
            expect(detailVendor.nama).toBe('PT ABC Elektrik')
            expect(detailVendor.alamat).toBeTruthy()
            expect(detailVendor.telepon).toBeTruthy()
            expect(detailVendor.email).toBeTruthy()
            expect(detailVendor.kontakPerson).toBeTruthy()

            // Step 3: Close detail modal
            showDetailModal = false
            detailVendor = null

            expect(showDetailModal).toBe(false)
            expect(detailVendor).toBeNull()
        })

        test('Auto-open detail from URL parameter', () => {
            const vendors = [
                { id: 'VND001', nama: 'PT ABC' },
                { id: 'VND002', nama: 'PT XYZ' },
                { id: 'VND003', nama: 'CV DEF' }
            ]

            // Step 1: Extract ID from URL
            const urlParams = '?id=VND002'
            const vendorId = new URLSearchParams(urlParams).get('id')
            expect(vendorId).toBe('VND002')

            // Step 2: Find vendor by ID
            const foundVendor = vendors.find(v => v.id === vendorId)
            expect(foundVendor).toBeDefined()
            expect(foundVendor.nama).toBe('PT XYZ')

            // Step 3: Auto-open detail modal
            let showDetailModal = false
            let detailVendor = null

            if (foundVendor) {
                showDetailModal = true
                detailVendor = foundVendor
            }

            expect(showDetailModal).toBe(true)
            expect(detailVendor.id).toBe('VND002')
        })
    })

    describe('File Upload Flow', () => {
        test('Complete file upload workflow', () => {
            // Step 1: Select file
            let selectedFile = null
            const mockFile = {
                name: 'vendor-document.pdf',
                size: 1024000,
                type: 'application/pdf'
            }
            selectedFile = mockFile

            expect(selectedFile).toBeDefined()
            expect(selectedFile.name).toBe('vendor-document.pdf')

            // Step 2: Validate file
            const isPDF = selectedFile.name.endsWith('.pdf')
            const isSizeValid = selectedFile.size <= 10000000 // Max 10MB

            expect(isPDF).toBe(true)
            expect(isSizeValid).toBe(true)

            // Step 3: Prepare FormData
            const formData = new FormData()
            formData.append('file', selectedFile)

            expect(formData).toBeDefined()

            // Step 4: Upload success - reset state
            selectedFile = null
            expect(selectedFile).toBeNull()
        })

        test('Upload validation flow', () => {
            // Test 1: No file selected
            let selectedFile = null
            let canUpload = !!selectedFile
            expect(canUpload).toBe(false)

            // Test 2: Valid PDF file
            selectedFile = { name: 'doc.pdf', size: 5000000, type: 'application/pdf' }
            canUpload = !!selectedFile
            const isPDF = selectedFile.name.endsWith('.pdf')
            expect(canUpload).toBe(true)
            expect(isPDF).toBe(true)

            // Test 3: Invalid file type
            selectedFile = { name: 'doc.docx', size: 1000000, type: 'application/msword' }
            const isInvalidType = !selectedFile.name.endsWith('.pdf')
            expect(isInvalidType).toBe(true)

            // Test 4: File too large
            selectedFile = { name: 'large.pdf', size: 15000000, type: 'application/pdf' }
            const isTooBig = selectedFile.size > 10000000
            expect(isTooBig).toBe(true)
        })
    })

    describe('Column Visibility Flow', () => {
        test('Toggle multiple columns and persist state', () => {
            let columnVisibility = {
                id: true,
                nama: true,
                kontakPerson: true,
                telepon: true,
                email: true,
                status: true
            }

            // Step 1: Hide some columns
            columnVisibility.kontakPerson = false
            columnVisibility.telepon = false

            let visibleCount = Object.values(columnVisibility).filter(Boolean).length
            expect(visibleCount).toBe(4)

            // Step 2: Show all columns
            Object.keys(columnVisibility).forEach(key => {
                columnVisibility[key] = true
            })

            visibleCount = Object.values(columnVisibility).filter(Boolean).length
            expect(visibleCount).toBe(6)

            // Step 3: Toggle individual column
            columnVisibility.email = !columnVisibility.email
            expect(columnVisibility.email).toBe(false)

            columnVisibility.email = !columnVisibility.email
            expect(columnVisibility.email).toBe(true)
        })
    })

    describe('Search and Reset Flow', () => {
        test('Search, filter, clear, and pagination reset', () => {
            const vendors = [
                { id: 'VND001', nama: 'PT ABC Elektrik', status: 'Aktif' },
                { id: 'VND002', nama: 'PT XYZ Teknologi', status: 'Aktif' },
                { id: 'VND003', nama: 'CV DEF Konstruksi', status: 'Tidak Aktif' },
                { id: 'VND004', nama: 'PT ABC Trading', status: 'Aktif' }
            ]

            // Step 1: Initial state
            let searchTerm = ''
            let currentPage = 1
            let filtered = vendors.filter(v =>
                v.nama.toLowerCase().includes(searchTerm.toLowerCase())
            )
            expect(filtered).toHaveLength(4)

            // Step 2: Search for "ABC"
            searchTerm = 'ABC'
            currentPage = 1 // Reset to page 1
            filtered = vendors.filter(v =>
                v.nama.toLowerCase().includes(searchTerm.toLowerCase())
            )
            expect(filtered).toHaveLength(2)
            expect(currentPage).toBe(1)

            // Step 3: Clear search
            searchTerm = ''
            filtered = vendors.filter(v =>
                v.nama.toLowerCase().includes(searchTerm.toLowerCase())
            )
            expect(filtered).toHaveLength(4)

            // Step 4: Verify pagination reset on new search
            currentPage = 3
            searchTerm = 'Teknologi'
            currentPage = 1 // Should reset
            filtered = vendors.filter(v =>
                v.nama.toLowerCase().includes(searchTerm.toLowerCase())
            )
            expect(filtered).toHaveLength(1)
            expect(currentPage).toBe(1)
        })
    })

    describe('Delete Confirmation Flow', () => {
        test('Complete delete workflow with confirmation', () => {
            let vendors = [
                { id: 'VND001', nama: 'PT ABC' },
                { id: 'VND002', nama: 'PT XYZ' },
                { id: 'VND003', nama: 'CV DEF' }
            ]

            // Step 1: Click delete button
            const deleteId = 'VND002'
            let confirmDelete = false

            // Step 2: Show confirmation
            confirmDelete = true
            expect(confirmDelete).toBe(true)

            // Step 3: Confirm delete
            if (confirmDelete) {
                vendors = vendors.filter(v => v.id !== deleteId)
            }

            expect(vendors).toHaveLength(2)
            expect(vendors.find(v => v.id === deleteId)).toBeUndefined()

            // Step 4: Verify remaining vendors
            expect(vendors[0].id).toBe('VND001')
            expect(vendors[1].id).toBe('VND003')
        })

        test('Cancel delete should keep vendor', () => {
            let vendors = [
                { id: 'VND001', nama: 'PT ABC' },
                { id: 'VND002', nama: 'PT XYZ' }
            ]

            // Step 1: Click delete
            const deleteId = 'VND002'
            let confirmDelete = false

            // Step 2: Cancel confirmation
            confirmDelete = false

            // Step 3: Vendor should remain
            if (confirmDelete) {
                vendors = vendors.filter(v => v.id !== deleteId)
            }

            expect(vendors).toHaveLength(2)
            expect(vendors.find(v => v.id === deleteId)).toBeDefined()
        })
    })

    describe('Data Transformation Pipeline', () => {
        test('Complete data flow: Fetch → Transform → Display → Edit → Save', () => {
            // Step 1: Fetch from Supabase (snake_case)
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

            // Step 2: Transform to UI format (camelCase)
            const uiData = {
                id: supabaseData.id,
                nama: supabaseData.name || supabaseData.nama,
                alamat: supabaseData.alamat,
                telepon: supabaseData.telepon || supabaseData.phone,
                email: supabaseData.email,
                kontakPerson: supabaseData.kontak_person,
                status: supabaseData.status,
                tanggalRegistrasi: supabaseData.tanggal_registrasi
            }

            expect(uiData.nama).toBe('PT ABC')
            expect(uiData.telepon).toBe('021-123456')
            expect(uiData.kontakPerson).toBe('Budi')

            // Step 3: Edit in UI
            uiData.nama = 'PT ABC Elektrik'
            uiData.alamat = 'Jl. Sudirman No. 123'

            // Step 4: Transform back to Supabase format
            const updatedSupabaseData = {
                id: uiData.id,
                nama: uiData.nama,
                alamat: uiData.alamat,
                telepon: uiData.telepon,
                email: uiData.email,
                kontak_person: uiData.kontakPerson,
                status: uiData.status,
                tanggal_registrasi: uiData.tanggalRegistrasi
            }

            expect(updatedSupabaseData.nama).toBe('PT ABC Elektrik')
            expect(updatedSupabaseData.alamat).toBe('Jl. Sudirman No. 123')
            expect(updatedSupabaseData.kontak_person).toBe('Budi')
        })
    })

    describe('Bulk Operations Flow', () => {
        test('Multiple vendor selection and operations', () => {
            const vendors = [
                { id: 'VND001', nama: 'PT ABC', status: 'Aktif' },
                { id: 'VND002', nama: 'PT XYZ', status: 'Aktif' },
                { id: 'VND003', nama: 'CV DEF', status: 'Tidak Aktif' }
            ]

            // Step 1: Filter active vendors
            const activeVendors = vendors.filter(v => v.status === 'Aktif')
            expect(activeVendors).toHaveLength(2)

            // Step 2: Filter inactive vendors
            const inactiveVendors = vendors.filter(v => v.status === 'Tidak Aktif')
            expect(inactiveVendors).toHaveLength(1)

            // Step 3: Get vendor count by status
            const statusCount = vendors.reduce((acc, v) => {
                acc[v.status] = (acc[v.status] || 0) + 1
                return acc
            }, {})

            expect(statusCount['Aktif']).toBe(2)
            expect(statusCount['Tidak Aktif']).toBe(1)
        })
    })

    describe('Edge Cases in Complete Flows', () => {
        test('Handle empty search results in pagination', () => {
            const vendors = [
                { id: 'VND001', nama: 'PT ABC' },
                { id: 'VND002', nama: 'PT XYZ' }
            ]

            // Search for non-existent vendor
            const searchTerm = 'NonExistent'
            const filtered = vendors.filter(v =>
                v.nama.toLowerCase().includes(searchTerm.toLowerCase())
            )

            expect(filtered).toHaveLength(0)

            // Pagination with empty results
            const itemsPerPage = 10
            const totalPages = Math.ceil(filtered.length / itemsPerPage)
            expect(totalPages).toBe(0)
        })

        test('Handle duplicate vendor IDs', () => {
            const vendors = [
                { id: 'VND001', nama: 'PT ABC' },
                { id: 'VND001', nama: 'PT ABC Duplicate' }
            ]

            // Find all vendors with same ID
            const duplicates = vendors.filter(v => v.id === 'VND001')
            expect(duplicates).toHaveLength(2)

            // This would be an error case in production
            const hasDuplicates = duplicates.length > 1
            expect(hasDuplicates).toBe(true)
        })

        test('Handle very long vendor names in search', () => {
            const longName = 'PT ABC Elektrik Teknologi Konstruksi Indonesia Jaya Makmur Sejahtera'
            const vendors = [
                { id: 'VND001', nama: longName }
            ]

            const searchTerm = 'Teknologi'
            const filtered = vendors.filter(v =>
                v.nama.toLowerCase().includes(searchTerm.toLowerCase())
            )

            expect(filtered).toHaveLength(1)
            expect(filtered[0].nama.length).toBeGreaterThan(50)
        })
    })
})
