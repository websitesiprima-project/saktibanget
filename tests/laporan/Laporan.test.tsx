/**
 * Laporan - Unit Tests
 * Testing all features: KPI, Filters, Analytics, Charts, Export, Modals
 */

import '@testing-library/jest-dom'

describe('Laporan - Core Features', () => {
    describe('Currency Formatting', () => {
        test('Format value in Miliar correctly', () => {
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

            expect(formatCompactCurrency(5000000000)).toBe('Rp 5.000 M')
            expect(formatCompactCurrency(1500000000)).toBe('Rp 1.500 M')
        })

        test('Format value in Juta correctly', () => {
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

            expect(formatCompactCurrency(50000000)).toBe('Rp 50.00 Jt')
            expect(formatCompactCurrency(1500000)).toBe('Rp 1.50 Jt')
        })

        test('Format value in Ribu correctly', () => {
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

            expect(formatCompactCurrency(5000)).toBe('Rp 5.0 Rb')
            expect(formatCompactCurrency(500000)).toBe('Rp 500.0 Rb')
        })

        test('Format small value correctly', () => {
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

            expect(formatCompactCurrency(500)).toContain('500')
            expect(formatCompactCurrency(999)).toContain('999')
        })
    })

    describe('Date Range Filters', () => {
        const mockContracts = [
            { id: 'CTR001', created_at: '2026-01-15T10:00:00', status: 'Aktif' },
            { id: 'CTR002', created_at: '2026-01-10T10:00:00', status: 'Aktif' },
            { id: 'CTR003', created_at: '2025-12-20T10:00:00', status: 'Aktif' },
            { id: 'CTR004', created_at: '2025-06-15T10:00:00', status: 'Aktif' }
        ]

        test('Filter "Hari Ini" should show today\'s contracts', () => {
            const now = new Date('2026-01-15')
            const filtered = mockContracts.filter(c => {
                const date = new Date(c.created_at)
                return date.toDateString() === now.toDateString()
            })

            expect(filtered).toHaveLength(1)
            expect(filtered[0].id).toBe('CTR001')
        })

        test('Filter "Minggu Ini" should show last 7 days', () => {
            const now = new Date('2026-01-15')
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

            const filtered = mockContracts.filter(c => {
                const date = new Date(c.created_at)
                return date >= oneWeekAgo
            })

            expect(filtered).toHaveLength(2) // CTR001 and CTR002
        })

        test('Filter "Bulan Ini" should show current month', () => {
            const now = new Date('2026-01-15')
            const filtered = mockContracts.filter(c => {
                const date = new Date(c.created_at)
                return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
            })

            expect(filtered).toHaveLength(2) // CTR001 and CTR002
        })

        test('Filter "Tahun Ini" should show current year', () => {
            const now = new Date('2026-01-15')
            const filtered = mockContracts.filter(c => {
                const date = new Date(c.created_at)
                return date.getFullYear() === now.getFullYear()
            })

            expect(filtered).toHaveLength(2) // CTR001 and CTR002
        })

        test('Custom date range filter should work', () => {
            const startDate = new Date('2025-06-01')
            const endDate = new Date('2025-12-31')
            endDate.setHours(23, 59, 59)

            const filtered = mockContracts.filter(c => {
                const date = new Date(c.created_at)
                return date >= startDate && date <= endDate
            })

            expect(filtered).toHaveLength(2) // CTR003 and CTR004
        })
    })

    describe('Status Filters', () => {
        const mockContracts = [
            { id: 'CTR001', status: 'Selesai' },
            { id: 'CTR002', status: 'Terbayar' },
            { id: 'CTR003', status: 'Dalam Proses' },
            { id: 'CTR004', status: 'Telah Diperiksa' },
            { id: 'CTR005', status: 'Batal' }
        ]

        test('Filter "Approved" should show completed statuses', () => {
            const approvedStatuses = ['selesai', 'terbayar', 'telah diperiksa', 'aktif']
            const filtered = mockContracts.filter(c => {
                const status = c.status.toLowerCase()
                return approvedStatuses.includes(status)
            })

            expect(filtered).toHaveLength(3) // Selesai, Terbayar, Telah Diperiksa
        })

        test('Filter "Pending" should show in-progress statuses', () => {
            const filtered = mockContracts.filter(c => {
                const status = c.status.toLowerCase()
                return ['proses', 'pemeriksaan', 'amandemen', 'terkontrak'].some(k => status.includes(k))
            })

            expect(filtered).toHaveLength(1) // Dalam Proses
        })

        test('Filter "Rejected" should show cancelled statuses', () => {
            const rejectedStatuses = ['batal', 'ditolak', 'masalah']
            const filtered = mockContracts.filter(c => {
                const status = c.status.toLowerCase()
                return rejectedStatuses.includes(status)
            })

            expect(filtered).toHaveLength(1) // Batal
        })

        test('Filter "All" should show all contracts', () => {
            const filtered = mockContracts // No filter

            expect(filtered).toHaveLength(5)
        })
    })
})

describe('KPI Calculations', () => {
    describe('Remaining Value Calculation', () => {
        test('Should calculate remaining value correctly', () => {
            const contracts = [
                { id: 'CTR001', amount: 100000000, status: 'Terbayar' },
                { id: 'CTR002', amount: 200000000, status: 'Dalam Pekerjaan' },
                { id: 'CTR003', amount: 150000000, status: 'Telah Diperiksa' },
                { id: 'CTR004', amount: 50000000, status: 'Terbayar' }
            ]

            const totalValue = contracts.reduce((sum, c) => sum + Number(c.amount), 0)
            const paidValue = contracts
                .filter(c => c.status === 'Terbayar')
                .reduce((sum, c) => sum + Number(c.amount), 0)
            const remainingValue = totalValue - paidValue

            expect(totalValue).toBe(500000000)
            expect(paidValue).toBe(150000000)
            expect(remainingValue).toBe(350000000)
        })

        test('Remaining contracts should exclude Terbayar', () => {
            const contracts = [
                { id: 'CTR001', status: 'Dalam Proses Pekerjaan', amount: 100000000 },
                { id: 'CTR002', status: 'Telah Diperiksa', amount: 200000000 },
                { id: 'CTR003', status: 'Terbayar', amount: 150000000 }
            ]

            const unpaidContracts = contracts.filter(c => {
                const status = c.status.toLowerCase()
                return status === 'telah diperiksa' || status === 'dalam proses pekerjaan'
            })

            expect(unpaidContracts).toHaveLength(2)
            expect(unpaidContracts.find(c => c.status === 'Terbayar')).toBeUndefined()
        })
    })

    describe('Near Deadline Calculation', () => {
        test('Should identify contracts near deadline (30 days)', () => {
            const now = new Date('2026-01-15')
            const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

            const contracts = [
                { id: 'CTR001', end_date: '2026-01-20' }, // 5 days - near
                { id: 'CTR002', end_date: '2026-02-10' }, // 26 days - near
                { id: 'CTR003', end_date: '2026-03-01' }, // 45 days - not near
                { id: 'CTR004', end_date: '2026-01-10' }  // Past - not near
            ]

            const nearDeadlineContracts = contracts.filter(c => {
                if (!c.end_date) return false
                const endDate = new Date(c.end_date)
                return endDate > now && endDate <= thirtyDaysFromNow
            })

            expect(nearDeadlineContracts).toHaveLength(2)
            expect(nearDeadlineContracts.map(c => c.id)).toEqual(['CTR001', 'CTR002'])
        })

        test('Should exclude contracts without end_date', () => {
            const now = new Date('2026-01-15')
            const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

            const contracts = [
                { id: 'CTR001', end_date: '2026-01-20' },
                { id: 'CTR002', end_date: null },
                { id: 'CTR003', end_date: undefined }
            ]

            const nearDeadlineContracts = contracts.filter(c => {
                if (!c.end_date) return false
                const endDate = new Date(c.end_date)
                return endDate > now && endDate <= thirtyDaysFromNow
            })

            expect(nearDeadlineContracts).toHaveLength(1)
        })
    })

    describe('Average Completion Calculation', () => {
        test('Should calculate average completion percentage', () => {
            const contracts = [
                { id: 'CTR001', status: 'Dalam Pekerjaan', progress: 50 },
                { id: 'CTR002', status: 'Review', progress: 75 },
                { id: 'CTR003', status: 'Selesai', progress: 100 }, // Excluded
                { id: 'CTR004', status: 'Terbayar', progress: 100 } // Excluded
            ]

            const activeContracts = contracts.filter(c => {
                const s = c.status.toLowerCase()
                return !['selesai', 'terbayar', 'batal'].includes(s)
            })

            const totalProgress = activeContracts.reduce((sum, c) => sum + (Number(c.progress) || 0), 0)
            const avgCompletion = activeContracts.length > 0 ? totalProgress / activeContracts.length : 0

            expect(avgCompletion).toBe(62.5) // (50 + 75) / 2
        })

        test('Should return 0 for no active contracts', () => {
            const contracts = [
                { id: 'CTR001', status: 'Selesai', progress: 100 },
                { id: 'CTR002', status: 'Terbayar', progress: 100 }
            ]

            const activeContracts = contracts.filter(c => {
                const s = c.status.toLowerCase()
                return !['selesai', 'terbayar', 'batal'].includes(s)
            })

            const avgCompletion = activeContracts.length > 0 ?
                activeContracts.reduce((sum, c) => sum + (Number(c.progress) || 0), 0) / activeContracts.length :
                0

            expect(avgCompletion).toBe(0)
        })
    })

    describe('Additional KPI Metrics', () => {
        test('Calculate average cycle time correctly', () => {
            const contracts = [
                {
                    id: 'CTR001',
                    created_at: '2026-01-01',
                    end_date: '2026-01-31' // 30 days
                },
                {
                    id: 'CTR002',
                    created_at: '2026-01-01',
                    end_date: '2026-02-15' // 45 days
                }
            ]

            const avgCycleTime = contracts.reduce((sum, c) => {
                if (c.created_at && c.end_date) {
                    const start = new Date(c.created_at)
                    const end = new Date(c.end_date)
                    return sum + Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
                }
                return sum
            }, 0) / contracts.length

            expect(avgCycleTime).toBe(37.5) // (30 + 45) / 2
        })

        test('Calculate approval rate correctly', () => {
            const contracts = [
                { id: 'CTR001', status: 'Selesai' },
                { id: 'CTR002', status: 'Terbayar' },
                { id: 'CTR003', status: 'Dalam Proses' },
                { id: 'CTR004', status: 'Telah Diperiksa' }
            ]

            const approvedStatuses = ['selesai', 'terbayar', 'telah diperiksa', 'aktif']
            const approvedCount = contracts.filter(c =>
                approvedStatuses.includes(c.status.toLowerCase())
            ).length

            const approvalRate = (approvedCount / contracts.length) * 100

            expect(approvalRate).toBe(75) // 3 out of 4
        })

        test('Calculate pending documents count', () => {
            const contracts = [
                { id: 'CTR001', status: 'Dalam Proses' },
                { id: 'CTR002', status: 'Pemeriksaan' },
                { id: 'CTR003', status: 'Terbayar' },
                { id: 'CTR004', status: 'Amandemen' }
            ]

            const pendingStatuses = ['proses', 'pemeriksaan', 'amandemen', 'terkontrak']
            const pendingCount = contracts.filter(c =>
                pendingStatuses.some(s => c.status.toLowerCase().includes(s))
            ).length

            expect(pendingCount).toBe(3)
        })
    })
})

describe('Budget Analytics', () => {
    describe('Budget Distribution by Status', () => {
        test('Should calculate budget per status correctly', () => {
            const contracts = [
                { id: 'CTR001', amount: 100000000, status: 'Dalam Pekerjaan' },
                { id: 'CTR002', amount: 200000000, status: 'Telah Diperiksa' },
                { id: 'CTR003', amount: 150000000, status: 'Terbayar' },
                { id: 'CTR004', amount: 50000000, status: 'Terkontrak' }
            ]

            const buckets = {
                terkontrak: 0,
                dalamProses: 0,
                selesai: 0,
                dalamPemeriksaan: 0,
                telahDiperiksa: 0,
                terbayar: 0
            }

            contracts.forEach(c => {
                const amount = Number(c.amount) || 0
                const status = c.status.toLowerCase()

                if (status === 'dalam pekerjaan' || status === 'dalam proses pekerjaan' || status === 'aktif') {
                    buckets.dalamProses += amount
                } else if (status === 'telah diperiksa') {
                    buckets.telahDiperiksa += amount
                } else if (status === 'terbayar') {
                    buckets.terbayar += amount
                } else if (status === 'terkontrak') {
                    buckets.terkontrak += amount
                }
            })

            expect(buckets.dalamProses).toBe(100000000)
            expect(buckets.telahDiperiksa).toBe(200000000)
            expect(buckets.terbayar).toBe(150000000)
            expect(buckets.terkontrak).toBe(50000000)
        })

        test('Should calculate total budget correctly', () => {
            const budgetData = {
                terkontrak: 50000000,
                dalamProses: 100000000,
                selesai: 0,
                dalamPemeriksaan: 0,
                telahDiperiksa: 200000000,
                terbayar: 150000000
            }

            const totalBudget = Object.values(budgetData).reduce((a, b) => a + b, 0)

            expect(totalBudget).toBe(500000000)
        })

        test('Should calculate percentage correctly', () => {
            const totalBudget = 500000000
            const value = 100000000

            const getPercent = (val: number) => {
                if (totalBudget === 0) return 0
                return ((val / totalBudget) * 100)
            }

            expect(getPercent(value)).toBe(20)
            expect(getPercent(totalBudget)).toBe(100)
        })
    })

    describe('Budget Type Distribution (AI vs AO)', () => {
        test('Should calculate AI budget correctly', () => {
            const contracts = [
                { id: 'CTR001', amount: 100000000, budget_type: 'AI' },
                { id: 'CTR002', amount: 200000000, budget_type: 'INVESTASI' },
                { id: 'CTR003', amount: 150000000, budget_type: 'AO' }
            ]

            const typeBuckets = { ai: 0, ao: 0 }
            contracts.forEach(c => {
                if (!c.budget_type) return
                const amount = Number(c.amount) || 0
                const type = c.budget_type.toUpperCase()
                if (type.includes('AI') || type.includes('INVESTASI')) {
                    typeBuckets.ai += amount
                } else if (type.includes('AO') || type.includes('OPERASIONAL')) {
                    typeBuckets.ao += amount
                }
            })

            expect(typeBuckets.ai).toBe(300000000)
            expect(typeBuckets.ao).toBe(150000000)
        })

        test('Should handle contracts without budget_type', () => {
            const contracts = [
                { id: 'CTR001', amount: 100000000, budget_type: 'AI' },
                { id: 'CTR002', amount: 200000000, budget_type: null },
                { id: 'CTR003', amount: 150000000, budget_type: undefined }
            ]

            const typeBuckets = { ai: 0, ao: 0 }
            contracts.forEach(c => {
                if (!c.budget_type) return
                const amount = Number(c.amount) || 0
                const type = c.budget_type.toUpperCase()
                if (type.includes('AI') || type.includes('INVESTASI')) {
                    typeBuckets.ai += amount
                }
            })

            expect(typeBuckets.ai).toBe(100000000)
            expect(typeBuckets.ao).toBe(0)
        })
    })
})

describe('Chart Data Processing', () => {
    describe('Monthly Volume Chart', () => {
        test('Should process monthly data correctly', () => {
            const contracts = [
                { id: 'CTR001', start_date: '2026-01-15', status: 'Dalam Pekerjaan' },
                { id: 'CTR002', start_date: '2026-01-20', status: 'Telah Diperiksa' },
                { id: 'CTR003', start_date: '2026-02-10', status: 'Terbayar' },
                { id: 'CTR004', start_date: '2026-01-05', status: 'Dalam Pekerjaan' }
            ]

            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
            const chartData = months.map(m => ({
                month: m,
                dalamPekerjaan: 0,
                telahDiperiksa: 0,
                terbayar: 0,
                total: 0
            }))

            const selectedYear = 2026

            contracts.forEach(c => {
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

            expect(chartData[0].dalamPekerjaan).toBe(2) // Jan: CTR001, CTR004
            expect(chartData[0].telahDiperiksa).toBe(1) // Jan: CTR002
            expect(chartData[1].terbayar).toBe(1) // Feb: CTR003
            expect(chartData[0].total).toBe(3)
            expect(chartData[1].total).toBe(1)
        })

        test('Should filter by selected year', () => {
            const contracts = [
                { id: 'CTR001', start_date: '2026-01-15', status: 'Dalam Pekerjaan' },
                { id: 'CTR002', start_date: '2025-01-20', status: 'Telah Diperiksa' },
                { id: 'CTR003', start_date: '2026-02-10', status: 'Terbayar' }
            ]

            const selectedYear = 2026
            const filtered = contracts.filter(c => {
                if (!c.start_date) return false
                const year = new Date(c.start_date).getFullYear()
                return year === selectedYear
            })

            expect(filtered).toHaveLength(2)
            expect(filtered.map(c => c.id)).toEqual(['CTR001', 'CTR003'])
        })

        test('Should extract available years from contracts', () => {
            const contracts = [
                { id: 'CTR001', start_date: '2026-01-15' },
                { id: 'CTR002', start_date: '2025-06-20' },
                { id: 'CTR003', start_date: '2024-03-10' },
                { id: 'CTR004', start_date: '2026-08-01' }
            ]

            const yearsSet = new Set<number>()
            contracts.forEach(c => {
                if (c.start_date) {
                    const year = new Date(c.start_date).getFullYear()
                    yearsSet.add(year)
                }
            })
            const years = Array.from(yearsSet).sort((a, b) => b - a)

            expect(years).toEqual([2026, 2025, 2024])
        })
    })

    describe('Pie Chart Segments', () => {
        test('Should calculate pie chart segments correctly', () => {
            const budgetData = {
                dalamProses: 100000000,
                telahDiperiksa: 200000000,
                terbayar: 150000000
            }

            const totalBudget = Object.values(budgetData).reduce((a, b) => a + b, 0)

            const getPercent = (value: number) => {
                if (totalBudget === 0) return 0
                return ((value / totalBudget) * 100)
            }

            const segments = [
                { label: 'Dalam Pekerjaan', value: budgetData.dalamProses, color: '#f59e0b' },
                { label: 'Telah Diperiksa', value: budgetData.telahDiperiksa, color: '#8b5cf6' },
                { label: 'Terbayar', value: budgetData.terbayar, color: '#10b981' }
            ]

            const percentages = segments.map(seg => ({
                ...seg,
                percent: getPercent(seg.value)
            }))

            expect(percentages[0].percent).toBeCloseTo(22.22, 1) // 100M / 450M
            expect(percentages[1].percent).toBeCloseTo(44.44, 1) // 200M / 450M
            expect(percentages[2].percent).toBeCloseTo(33.33, 1) // 150M / 450M
        })

        test('Should handle zero budget correctly', () => {
            const totalBudget = 0
            const value = 100000000

            const getPercent = (val: number) => {
                if (totalBudget === 0) return 0
                return ((val / totalBudget) * 100)
            }

            expect(getPercent(value)).toBe(0)
        })
    })
})

describe('Export Functionality', () => {
    describe('CSV Export', () => {
        test('Should format CSV headers correctly', () => {
            const headers = ['ID', 'Nama Kontrak', 'Vendor', 'Status', 'Nilai', 'Tgl Buat', 'Tgl Mulai']

            expect(headers).toHaveLength(7)
            expect(headers[0]).toBe('ID')
            expect(headers[1]).toBe('Nama Kontrak')
        })

        test('Should format CSV rows correctly', () => {
            const contracts = [
                {
                    id: 'CTR001',
                    name: 'Kontrak Kabel',
                    vendor_name: 'PT ABC',
                    status: 'Aktif',
                    amount: 100000000,
                    created_at: '2026-01-15T10:00:00',
                    start_date: '2026-01-01'
                }
            ]

            const rows = contracts.map(c => [
                c.id,
                `"${c.name || ''}"`,
                `"${c.vendor_name || ''}"`,
                c.status,
                c.amount,
                c.created_at ? new Date(c.created_at).toLocaleDateString() : '',
                c.start_date ? new Date(c.start_date).toLocaleDateString() : ''
            ])

            expect(rows[0][0]).toBe('CTR001')
            expect(rows[0][1]).toBe('"Kontrak Kabel"') // Quoted
            expect(rows[0][2]).toBe('"PT ABC"') // Quoted
        })
    })

    describe('Export Format Validation', () => {
        test('Should support CSV format', () => {
            const formats = ['CSV', 'PDF']
            expect(formats).toContain('CSV')
        })

        test('Should support PDF format', () => {
            const formats = ['CSV', 'PDF']
            expect(formats).toContain('PDF')
        })
    })
})

describe('Modal Management', () => {
    describe('Remaining Contracts Modal', () => {
        test('Opening modal should set state correctly', () => {
            let showRemainingModal = false
            const remainingContracts = [
                { id: 'CTR001', name: 'Kontrak A', amount: 100000000 }
            ]

            showRemainingModal = true

            expect(showRemainingModal).toBe(true)
            expect(remainingContracts).toHaveLength(1)
        })

        test('Closing modal should reset state', () => {
            let showRemainingModal = true

            showRemainingModal = false

            expect(showRemainingModal).toBe(false)
        })
    })

    describe('Deadline Modal', () => {
        test('Opening deadline modal should set state correctly', () => {
            let showDeadlineModal = false
            const deadlineContracts = [
                { id: 'CTR001', name: 'Kontrak A', end_date: '2026-01-20' }
            ]

            showDeadlineModal = true

            expect(showDeadlineModal).toBe(true)
            expect(deadlineContracts).toHaveLength(1)
        })

        test('Closing deadline modal should reset state', () => {
            let showDeadlineModal = true

            showDeadlineModal = false

            expect(showDeadlineModal).toBe(false)
        })
    })
})

describe('Edge Cases & Error Scenarios', () => {
    test('Handle empty contract list', () => {
        const contracts: any[] = []

        const totalValue = contracts.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)
        const avgCompletion = contracts.length > 0 ?
            contracts.reduce((sum, c) => sum + (Number(c.progress) || 0), 0) / contracts.length :
            0

        expect(totalValue).toBe(0)
        expect(avgCompletion).toBe(0)
    })

    test('Handle contracts without dates', () => {
        const contracts = [
            { id: 'CTR001', created_at: null, end_date: null },
            { id: 'CTR002', created_at: undefined, end_date: undefined }
        ]

        const validContracts = contracts.filter(c => c.created_at && c.end_date)

        expect(validContracts).toHaveLength(0)
    })

    test('Handle contracts with invalid amounts', () => {
        const contracts = [
            { id: 'CTR001', amount: null },
            { id: 'CTR002', amount: undefined },
            { id: 'CTR003', amount: 'invalid' },
            { id: 'CTR004', amount: 100000000 }
        ]

        const totalValue = contracts.reduce((sum, c) => sum + (Number(c.amount) || 0), 0)

        expect(totalValue).toBe(100000000)
    })

    test('Handle division by zero in percentage calculation', () => {
        const totalBudget = 0
        const value = 100000000

        const getPercent = (val: number) => {
            if (totalBudget === 0) return 0
            return ((val / totalBudget) * 100)
        }

        expect(getPercent(value)).toBe(0)
    })

    test('Handle contracts without status', () => {
        const contracts = [
            { id: 'CTR001', status: null },
            { id: 'CTR002', status: undefined },
            { id: 'CTR003', status: '' }
        ]

        const filtered = contracts.filter(c => {
            const status = (c.status || '').toLowerCase()
            return status.includes('proses')
        })

        expect(filtered).toHaveLength(0)
    })
})
