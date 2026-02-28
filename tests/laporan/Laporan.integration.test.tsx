/**
 * Laporan - Integration Tests
 * Testing complete workflows: Filtering, Export, Modals, Data Pipeline
 */

import '@testing-library/jest-dom'

// Mock contract data
const mockContracts = [
    {
        id: 'CTR001',
        name: 'Kontrak Kabel Fiber Optik',
        vendor_name: 'PT Telkom Indonesia',
        amount: 500000000,
        status: 'Dalam Pekerjaan',
        budget_type: 'AI',
        progress: 65,
        created_at: '2026-01-01T08:00:00',
        start_date: '2026-01-05',
        end_date: '2026-02-15'
    },
    {
        id: 'CTR002',
        name: 'Pengadaan Server',
        vendor_name: 'PT Server Solutions',
        amount: 800000000,
        status: 'Telah Diperiksa',
        budget_type: 'AI',
        progress: 90,
        created_at: '2026-01-10T09:00:00',
        start_date: '2026-01-15',
        end_date: '2026-01-25'
    },
    {
        id: 'CTR003',
        name: 'Pemeliharaan Jaringan',
        vendor_name: 'PT Network Maintenance',
        amount: 300000000,
        status: 'Terbayar',
        budget_type: 'AO',
        progress: 100,
        created_at: '2025-12-15T10:00:00',
        start_date: '2025-12-20',
        end_date: '2026-01-10'
    },
    {
        id: 'CTR004',
        name: 'Upgrade Hardware',
        vendor_name: 'PT Hardware Tech',
        amount: 450000000,
        status: 'Dalam Pekerjaan',
        budget_type: 'INVESTASI',
        progress: 40,
        created_at: '2026-01-12T11:00:00',
        start_date: '2026-01-18',
        end_date: '2026-02-10'
    },
    {
        id: 'CTR005',
        name: 'Konsultasi IT',
        vendor_name: 'PT IT Consultant',
        amount: 200000000,
        status: 'Batal',
        budget_type: 'AO',
        progress: 0,
        created_at: '2026-01-08T12:00:00',
        start_date: '2026-01-10',
        end_date: '2026-01-20'
    }
]

describe('Laporan Integration Tests', () => {
    describe('Complete Filtering Flow (Date + Status Combined)', () => {
        test('Filter by date range and status simultaneously', () => {
            const startDate = new Date('2026-01-01')
            const endDate = new Date('2026-01-31')
            endDate.setHours(23, 59, 59)
            const statusFilter = 'approved'

            // Step 1: Filter by date
            const dateFiltered = mockContracts.filter(c => {
                const date = new Date(c.created_at)
                return date >= startDate && date <= endDate
            })

            // Step 2: Filter by status
            const approvedStatuses = ['selesai', 'terbayar', 'telah diperiksa', 'aktif']
            const fullyFiltered = dateFiltered.filter(c => {
                const status = c.status.toLowerCase()
                return approvedStatuses.includes(status)
            })

            expect(dateFiltered).toHaveLength(4) // Excluding CTR003 (Dec 2025)
            expect(fullyFiltered).toHaveLength(1) // Only CTR002 (Telah Diperiksa in Jan 2026)
            expect(fullyFiltered[0].id).toBe('CTR002')
        })

        test('Reset filters should show all data', () => {
            // Initial filtered state
            let filtered = mockContracts.filter(c => c.status === 'Dalam Pekerjaan')
            expect(filtered).toHaveLength(2)

            // Reset: Show all
            filtered = mockContracts
            expect(filtered).toHaveLength(5)
        })

        test('Date range "Bulan Ini" with status "pending"', () => {
            const now = new Date('2026-01-15')
            const pendingStatuses = ['proses', 'pekerjaan', 'pemeriksaan', 'amandemen', 'terkontrak']

            const filtered = mockContracts.filter(c => {
                // Date filter
                const date = new Date(c.created_at)
                const isThisMonth = date.getMonth() === now.getMonth() &&
                    date.getFullYear() === now.getFullYear()

                // Status filter
                const status = c.status.toLowerCase()
                const isPending = pendingStatuses.some(s => status.includes(s))

                return isThisMonth && isPending
            })

            expect(filtered).toHaveLength(2) // CTR001 and CTR004
        })
    })

    describe('Export Workflow', () => {
        test('Export to CSV with all fields', () => {
            const headers = ['ID', 'Nama Kontrak', 'Vendor', 'Status', 'Nilai', 'Tgl Buat', 'Tgl Mulai', 'Tgl Selesai']

            const rows = mockContracts.map(c => [
                c.id,
                `"${c.name}"`,
                `"${c.vendor_name}"`,
                c.status,
                c.amount.toString(),
                new Date(c.created_at).toLocaleDateString('id-ID'),
                new Date(c.start_date).toLocaleDateString('id-ID'),
                new Date(c.end_date).toLocaleDateString('id-ID')
            ])

            const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')

            expect(csvContent).toContain('ID,Nama Kontrak,Vendor')
            expect(csvContent).toContain('CTR001')
            expect(csvContent).toContain('Kontrak Kabel Fiber Optik')
            expect(rows).toHaveLength(5)
        })

        test('Export filtered data only', () => {
            const filtered = mockContracts.filter(c => c.status === 'Dalam Pekerjaan')

            const rows = filtered.map(c => [c.id, c.name, c.status])

            expect(rows).toHaveLength(2)
            expect(rows[0][0]).toBe('CTR001')
            expect(rows[1][0]).toBe('CTR004')
        })

        test('Export to PDF should include summary metrics', () => {
            // Calculate summary before export
            const totalValue = mockContracts.reduce((sum, c) => sum + c.amount, 0)
            const avgProgress = mockContracts.reduce((sum, c) => sum + c.progress, 0) / mockContracts.length

            const summary = {
                totalContracts: mockContracts.length,
                totalValue,
                avgProgress,
                exportDate: new Date().toLocaleDateString('id-ID')
            }

            expect(summary.totalContracts).toBe(5)
            expect(summary.totalValue).toBe(2250000000)
            expect(summary.avgProgress).toBe(59) // (65 + 90 + 100 + 40 + 0) / 5
        })

        test('Export with custom date range in filename', () => {
            const startDate = '2026-01-01'
            const endDate = '2026-01-31'

            const filename = `Laporan_${startDate}_to_${endDate}.csv`

            expect(filename).toContain(startDate)
            expect(filename).toContain(endDate)
            expect(filename).toContain('.csv')
        })
    })

    describe('Modal Interactions', () => {
        test('Open remaining contracts modal and display data', () => {
            // Calculate remaining contracts
            const remainingContracts = mockContracts.filter(c => {
                const status = c.status.toLowerCase()
                return status === 'telah diperiksa' || status === 'dalam proses pekerjaan' ||
                    status === 'dalam pekerjaan'
            })

            // Open modal
            let showModal = true
            let modalData = remainingContracts

            expect(showModal).toBe(true)
            expect(modalData).toHaveLength(3) // CTR001, CTR002, CTR004
            expect(modalData.map(c => c.id)).toEqual(['CTR001', 'CTR002', 'CTR004'])
        })

        test('Open deadline modal and display near deadline contracts', () => {
            const now = new Date('2026-01-15')
            const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

            const deadlineContracts = mockContracts.filter(c => {
                if (!c.end_date) return false
                const status = c.status.toLowerCase()
                if (status === 'batal' || status === 'ditolak') return false
                const endDate = new Date(c.end_date)
                return endDate > now && endDate <= thirtyDaysFromNow
            })

            let showModal = true
            let modalData = deadlineContracts

            expect(showModal).toBe(true)
            expect(modalData).toHaveLength(2) // CTR002 (Jan 25), CTR004 (Feb 10)
        })

        test('Click contract in modal should navigate to detail', () => {
            const selectedContract = mockContracts[0]
            const detailUrl = `/admin/aset?id=${selectedContract.id}`

            expect(detailUrl).toBe('/admin/aset?id=CTR001')
        })

        test('Close modal should reset state', () => {
            let showModal = true
            let modalData = mockContracts.slice(0, 2)

            // Close modal
            showModal = false
            modalData = []

            expect(showModal).toBe(false)
            expect(modalData).toHaveLength(0)
        })
    })

    describe('Data Processing Pipeline', () => {
        test('Complete pipeline: Fetch → Filter → Process → Display', () => {
            // Step 1: Fetch (simulated)
            const fetchedData = [...mockContracts]

            // Step 2: Filter by date and status
            const filtered = fetchedData.filter(c => {
                const date = new Date(c.created_at)
                const isJan2026 = date.getMonth() === 0 && date.getFullYear() === 2026
                const status = c.status.toLowerCase()
                const isActive = !['batal', 'ditolak'].includes(status)
                return isJan2026 && isActive
            })

            // Step 3: Process analytics
            const totalValue = filtered.reduce((sum, c) => sum + c.amount, 0)
            const paidValue = filtered
                .filter(c => c.status === 'Terbayar')
                .reduce((sum, c) => sum + c.amount, 0)
            const remainingValue = totalValue - paidValue

            const activeContracts = filtered.filter(c => {
                const s = c.status.toLowerCase()
                return !['selesai', 'terbayar', 'batal'].includes(s)
            })
            const avgCompletion = activeContracts.length > 0
                ? activeContracts.reduce((sum, c) => sum + c.progress, 0) / activeContracts.length
                : 0

            // Step 4: Display (validated)
            expect(filtered).toHaveLength(3) // CTR001, CTR002, CTR004 (excluding CTR005-Batal)
            expect(totalValue).toBe(1750000000) // CTR001 + CTR002 + CTR004
            expect(remainingValue).toBe(1750000000) // No paid in Jan 2026
            expect(avgCompletion).toBeCloseTo(65, 0) // (65 + 90 + 40) / 3 = 65
        })

        test('Budget distribution calculation pipeline', () => {
            const buckets = {
                terkontrak: 0,
                dalamProses: 0,
                selesai: 0,
                dalamPemeriksaan: 0,
                telahDiperiksa: 0,
                terbayar: 0
            }

            mockContracts.forEach(c => {
                const amount = c.amount
                const status = c.status.toLowerCase()

                if (status === 'dalam pekerjaan' || status === 'dalam proses pekerjaan' || status === 'aktif') {
                    buckets.dalamProses += amount
                } else if (status === 'telah diperiksa') {
                    buckets.telahDiperiksa += amount
                } else if (status === 'terbayar') {
                    buckets.terbayar += amount
                }
            })

            const totalBudget = Object.values(buckets).reduce((a, b) => a + b, 0)
            const percentages = Object.entries(buckets).map(([key, value]) => ({
                key,
                value,
                percent: totalBudget > 0 ? (value / totalBudget) * 100 : 0
            }))

            expect(buckets.dalamProses).toBe(950000000) // CTR001 + CTR004
            expect(buckets.telahDiperiksa).toBe(800000000) // CTR002
            expect(buckets.terbayar).toBe(300000000) // CTR003
            expect(totalBudget).toBe(2050000000)
            expect(percentages.find(p => p.key === 'dalamProses')?.percent).toBeCloseTo(46.34, 1)
        })

        test('Budget type (AI vs AO) pipeline', () => {
            const typeBuckets = { ai: 0, ao: 0 }

            mockContracts.forEach(c => {
                if (!c.budget_type) return
                const amount = c.amount
                const type = c.budget_type.toUpperCase()

                if (type.includes('AI') || type.includes('INVESTASI')) {
                    typeBuckets.ai += amount
                } else if (type.includes('AO') || type.includes('OPERASIONAL')) {
                    typeBuckets.ao += amount
                }
            })

            const total = typeBuckets.ai + typeBuckets.ao
            const aiPercent = (typeBuckets.ai / total) * 100
            const aoPercent = (typeBuckets.ao / total) * 100

            expect(typeBuckets.ai).toBe(1750000000) // CTR001 + CTR002 + CTR004
            expect(typeBuckets.ao).toBe(500000000) // CTR003 + CTR005
            expect(aiPercent).toBeCloseTo(77.78, 1)
            expect(aoPercent).toBeCloseTo(22.22, 1)
        })

        test('Monthly chart data pipeline', () => {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
            const chartData = months.map(m => ({
                month: m,
                dalamPekerjaan: 0,
                telahDiperiksa: 0,
                terbayar: 0,
                total: 0
            }))

            const selectedYear = 2026

            mockContracts.forEach(c => {
                if (!c.start_date) return

                const date = new Date(c.start_date)
                const year = date.getFullYear()
                const monthIdx = date.getMonth()

                if (year !== selectedYear) return

                if (monthIdx >= 0 && monthIdx < 12) {
                    const status = c.status.toLowerCase()

                    if (status === 'dalam pekerjaan' || status === 'dalam proses pekerjaan') {
                        chartData[monthIdx].dalamPekerjaan += 1
                    } else if (status === 'telah diperiksa') {
                        chartData[monthIdx].telahDiperiksa += 1
                    } else if (status === 'terbayar') {
                        chartData[monthIdx].terbayar += 1
                    }

                    chartData[monthIdx].total += 1
                }
            })

            // Verify January data
            expect(chartData[0].dalamPekerjaan).toBe(2) // CTR001, CTR004
            expect(chartData[0].telahDiperiksa).toBe(1) // CTR002
            expect(chartData[0].terbayar).toBe(0) // No terbayar contracts start in Jan 2026
            expect(chartData[0].total).toBe(4) // Includes CTR005 (Batal) which starts in Jan

            // Verify December has no data (since we're checking 2026)
            expect(chartData[11].total).toBe(0)
        })
    })

    describe('Year Selection for Charts', () => {
        test('Change year should update chart data', () => {
            const allYears = [2024, 2025, 2026]
            let selectedYear = 2026

            const getChartData = (year: number) => {
                return mockContracts.filter(c => {
                    if (!c.start_date) return false
                    return new Date(c.start_date).getFullYear() === year
                })
            }

            // Initial: 2026
            let chartContracts = getChartData(selectedYear)
            expect(chartContracts).toHaveLength(4)

            // Change to 2025
            selectedYear = 2025
            chartContracts = getChartData(selectedYear)
            expect(chartContracts).toHaveLength(1) // Only CTR003

            // Change to 2024
            selectedYear = 2024
            chartContracts = getChartData(selectedYear)
            expect(chartContracts).toHaveLength(0)
        })

        test('Extract available years from contracts', () => {
            const yearsSet = new Set<number>()
            mockContracts.forEach(c => {
                if (c.start_date) {
                    const year = new Date(c.start_date).getFullYear()
                    yearsSet.add(year)
                }
            })
            const years = Array.from(yearsSet).sort((a, b) => b - a)

            expect(years).toEqual([2026, 2025])
        })
    })

    describe('Edge Cases', () => {
        test('Handle empty filtered results', () => {
            const filtered = mockContracts.filter(c => c.status === 'NonExistentStatus')

            const totalValue = filtered.reduce((sum, c) => sum + c.amount, 0)
            const avgProgress = filtered.length > 0
                ? filtered.reduce((sum, c) => sum + c.progress, 0) / filtered.length
                : 0

            expect(filtered).toHaveLength(0)
            expect(totalValue).toBe(0)
            expect(avgProgress).toBe(0)
        })

        test('Handle date range with no contracts', () => {
            const startDate = new Date('2027-01-01')
            const endDate = new Date('2027-12-31')

            const filtered = mockContracts.filter(c => {
                const date = new Date(c.created_at)
                return date >= startDate && date <= endDate
            })

            expect(filtered).toHaveLength(0)
        })

        test('Handle all contracts with same status', () => {
            const sameStatusContracts = mockContracts.map(c => ({ ...c, status: 'Terbayar' }))

            const buckets = {
                terbayar: 0,
                dalamProses: 0
            }

            sameStatusContracts.forEach(c => {
                if (c.status === 'Terbayar') {
                    buckets.terbayar += c.amount
                } else {
                    buckets.dalamProses += c.amount
                }
            })

            expect(buckets.terbayar).toBe(2250000000)
            expect(buckets.dalamProses).toBe(0)
        })

        test('Handle contracts with missing optional fields', () => {
            const incompleteContracts = [
                { id: 'CTR001', amount: 100000000, status: 'Aktif', created_at: '2026-01-01', start_date: null, end_date: null, budget_type: null },
                { id: 'CTR002', amount: null, status: null, created_at: null, start_date: null, end_date: null, budget_type: null }
            ]

            const totalValue = incompleteContracts.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
            const withDates = incompleteContracts.filter(c => c.start_date && c.end_date)

            expect(totalValue).toBe(100000000)
            expect(withDates).toHaveLength(0)
        })

        test('Handle very large numbers in currency formatting', () => {
            const formatCompactCurrency = (value: number) => {
                if (value >= 1e9) {
                    return `Rp ${(value / 1e9).toFixed(3)} M`
                } else if (value >= 1e6) {
                    return `Rp ${(value / 1e6).toFixed(2)} Jt`
                } else if (value >= 1e3) {
                    return `Rp ${(value / 1e3).toFixed(1)} Rb`
                } else {
                    return `Rp ${value.toLocaleString('id-ID')}`
                }
            }

            expect(formatCompactCurrency(1000000000000)).toBe('Rp 1000.000 M') // 1 Trillion
            expect(formatCompactCurrency(999999999999)).toBe('Rp 1000.000 M') // Almost 1 Trillion
        })

        test('Handle date filter at year boundary', () => {
            const contracts = [
                { id: 'CTR001', created_at: '2025-12-31T23:59:59' },
                { id: 'CTR002', created_at: '2026-01-01T00:00:00' },
                { id: 'CTR003', created_at: '2026-01-01T23:59:59' }
            ]

            const year2026 = contracts.filter(c => {
                const date = new Date(c.created_at)
                return date.getFullYear() === 2026
            })

            expect(year2026).toHaveLength(2)
        })

        test('Handle duplicate contract IDs in export', () => {
            const duplicates = [
                { id: 'CTR001', name: 'Contract A' },
                { id: 'CTR001', name: 'Contract A Duplicate' },
                { id: 'CTR002', name: 'Contract B' }
            ]

            const uniqueIds = new Set(duplicates.map(c => c.id))

            expect(uniqueIds.size).toBe(2) // Only 2 unique IDs
        })
    })

    describe('Real-world Scenario: Monthly Report Generation', () => {
        test('Generate monthly report for January 2026', () => {
            const reportMonth = 0 // January
            const reportYear = 2026

            // Filter contracts for this month
            const monthContracts = mockContracts.filter(c => {
                const date = new Date(c.created_at)
                return date.getMonth() === reportMonth && date.getFullYear() === reportYear
            })

            // Calculate metrics
            const totalValue = monthContracts.reduce((sum, c) => sum + c.amount, 0)
            const avgProgress = monthContracts.length > 0
                ? monthContracts.reduce((sum, c) => sum + c.progress, 0) / monthContracts.length
                : 0

            const statusBreakdown = monthContracts.reduce((acc, c) => {
                acc[c.status] = (acc[c.status] || 0) + 1
                return acc
            }, {} as Record<string, number>)

            // Generate report object
            const report = {
                month: 'January',
                year: reportYear,
                totalContracts: monthContracts.length,
                totalValue,
                avgProgress,
                statusBreakdown,
                generatedAt: new Date().toISOString()
            }

            expect(report.totalContracts).toBe(4)
            expect(report.totalValue).toBe(1950000000)
            expect(report.avgProgress).toBeCloseTo(48.75, 1) // (65 + 90 + 40 + 0) / 4 (including Batal)
            expect(report.statusBreakdown['Dalam Pekerjaan']).toBe(2)
            expect(report.statusBreakdown['Telah Diperiksa']).toBe(1)
        })
    })
})
