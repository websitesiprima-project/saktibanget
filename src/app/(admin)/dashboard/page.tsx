'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Briefcase, CheckCircle, Clock, Users, FileText, TrendingUp, Activity, AlertCircle, X } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'
import * as vendorService from '../../../services/vendorService'
import './Dashboard.css'

export default function DashboardPage() {
    const router = useRouter()
    const currentYear = new Date().getFullYear()
    const [selectedYear, setSelectedYear] = useState(currentYear)
    const [allVendors, setAllVendors] = useState<any[]>([])
    const [chartData, setChartData] = useState(Array(12).fill(null).map((_, i) => ({
        month: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][i],
        dalamProses: 0,
        terbayar: 0,
        total: 0
    })))

    const [stats, setStats] = useState({
        totalContracts: 0,
        lateContracts: 0,
        pendingContracts: 0,
        totalVendors: 0
    })

    const [showModal, setShowModal] = useState(false)
    const [modalData, setModalData] = useState<any>(null)
    const [allContracts, setAllContracts] = useState<any[]>([])
    const [allVendorsComplete, setAllVendorsComplete] = useState<any[]>([])

    const [recentActivities, setRecentActivities] = useState<any[]>([])
    const [recentVendors, setRecentVendors] = useState<any[]>([])
    const [contractStatusDist, setContractStatusDist] = useState({
        dalamPekerjaan: 0,
        telahdiperiksa: 0,
        terbayar: 0,
        total: 0
    })

    useEffect(() => {
        let mounted = true

        const loadData = async () => {
            await fetchDashboardData()
        }

        // Initial load
        loadData()

        // Subscribe to real-time vendor changes
        const vendorSubscription = supabase
            .channel('dashboard-vendors')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'vendors' },
                (payload) => {
                    console.log('Vendor change detected:', payload)
                    if (mounted) {
                        // Refetch vendor data when vendor is added, updated, or deleted
                        fetchVendorData()
                    }
                }
            )
            .subscribe()

        return () => {
            mounted = false
            vendorSubscription.unsubscribe()
        }
    }, [])

    // Re-process contract chart data saat allContracts atau year berubah
    useEffect(() => {
        if (allContracts.length > 0) {
            processContractChartData(allContracts, selectedYear)
        }
    }, [selectedYear, allContracts])

    const fetchDashboardData = async () => {
        try {
            const results = await Promise.all([
                fetchContractData(),
                fetchVendorData()
            ])
        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        }
    }

    const fetchVendorData = async () => {
        try {
            const result = await vendorService.getDashboardVendorData()

            if (result.success && 'data' in result) {
                const { total, recent, allVendors: vendorsForChart } = result.data
                setStats(prev => ({
                    ...prev,
                    totalVendors: total || 0
                }))
                setRecentVendors(recent || [])

                if (vendorsForChart && vendorsForChart.length > 0) {
                    setAllVendors(vendorsForChart)
                }
            }

            // Fetch semua vendor lengkap untuk modal
            const { data: allVendorsData, error } = await supabase
                .from('vendors')
                .select('id, nama, email, kategori, status')
                .order('tanggal_registrasi', { ascending: false })

            if (!error && allVendorsData) {
                setAllVendorsComplete(allVendorsData)
            }
        } catch (error) {
            console.error('Error in fetchVendorData:', error)
        }
    }


    const fetchContractData = async () => {
        try {
            const { data, error } = await supabase
                .from('contracts')
                // Optimized query: Only fetch columns needed for stats & charts
                .select('id, name, status, start_date, end_date, created_at, vendor_name')
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Supabase query error:', error)
                throw error
            }

            if (data) {
                setAllContracts(data)
                processStatsAndActivities(data)
            }
        } catch (error: any) {
            const errorMsg = error?.message || error?.error_description || 'Unknown error'
            console.error('Error fetching contract data:', errorMsg)
            console.error('Full error object:', error)
            // Set empty data to prevent UI crash
            processStatsAndActivities([])
        }
    }

    const processContractChartData = (contracts: any[], year: number) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
        const newChartData = months.map(m => ({ month: m, dalamProses: 0, terbayar: 0, total: 0 }))

        contracts.forEach(contract => {
            if (!contract.created_at) return

            const date = new Date(contract.created_at)
            const contractYear = date.getFullYear()
            const monthIndex = date.getMonth()

            if (contractYear === year && monthIndex >= 0 && monthIndex < 12) {
                const status = (contract.status || '').toLowerCase()

                if (status === 'dalam proses pekerjaan' || status === 'dalam pekerjaan') {
                    newChartData[monthIndex].dalamProses += 1
                } else if (status === 'terbayar') {
                    newChartData[monthIndex].terbayar += 1
                }

                newChartData[monthIndex].total += 1
            }
        })

        setChartData(newChartData)
    }

    const processStatsAndActivities = (contracts: any[]) => {
        // 1. Calculate Stats
        const totalContracts = contracts.length
        let lateContracts = 0
        let pendingContracts = 0
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Status breakdown for Pie Chart
        let dist = { dalamPekerjaan: 0, telahdiperiksa: 0, terbayar: 0, total: totalContracts }

        contracts.forEach(c => {
            const status = (c.status || '').toLowerCase()

            // Hitung kontrak terlambat: yang sudah lewat end_date dan belum selesai/terbayar
            if (c.end_date) {
                const endDate = new Date(c.end_date)
                endDate.setHours(0, 0, 0, 0)
                if (endDate < today && status !== 'selesai' && status !== 'terbayar') {
                    lateContracts++
                }
            }

            if (status === 'dalam pekerjaan' || status === 'dalam proses pekerjaan') {
                dist.dalamPekerjaan++
            } else if (status.includes('diperiksa')) {
                dist.telahdiperiksa++
            } else if (status === 'terbayar') {
                dist.terbayar++
            }
        })

        setStats(prev => ({
            ...prev,
            totalContracts,
            lateContracts,
            pendingContracts
        }))

        setContractStatusDist(dist)

        // 2. Recent Activities (Latest 4)
        const latest = contracts.slice(0, 4).map(c => ({
            contractId: c.id,
            action: 'Kontrak Baru',
            item: c.name || 'Tanpa Judul',
            vendor: c.vendor_name || 'Vendor Unknown',
            time: new Date(c.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
            icon: Briefcase
        }))
        setRecentActivities(latest)
    }

    // Memoize handlers to prevent unnecessary re-renders
    const handleYearChange = useCallback((year: number) => {
        setSelectedYear(year)
    }, [])

    // Memoize available years - only recalculate when allContracts changes
    const availableYears = useMemo(() => {
        const years = new Set<number>()
        allContracts.forEach(contract => {
            if (contract.start_date) {
                years.add(new Date(contract.start_date).getFullYear())
            }
        })
        const yearArray = Array.from(years).sort((a, b) => b - a)
        if (yearArray.length === 0) yearArray.push(currentYear)
        return yearArray
    }, [allContracts, currentYear])

    const handleContractClick = useCallback((contractId: string) => {
        router.push(`/aset?id=${contractId}`)
    }, [router])

    const handleVendorClick = useCallback(() => {
        router.push('/vendor')
    }, [router])

    // Handler untuk menampilkan modal detail
    const handleCardClick = useCallback((cardType: string) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        let filteredData: any[] = []
        let title = ''

        switch (cardType) {
            case 'totalContracts':
                filteredData = allContracts
                title = 'Semua Kontrak'
                break
            case 'lateContracts':
                filteredData = allContracts.filter(c => {
                    const status = (c.status || '').toLowerCase()
                    if (c.end_date) {
                        const endDate = new Date(c.end_date)
                        endDate.setHours(0, 0, 0, 0)
                        return endDate < today && status !== 'selesai' && status !== 'terbayar'
                    }
                    return false
                })
                title = 'Kontrak Terlambat'
                break
            case 'pendingContracts':
                filteredData = allContracts.filter(c => {
                    const status = (c.status || '').toLowerCase()
                    return status.includes('review') || status.includes('proses')
                })
                title = 'Kontrak Dalam Proses/Review'
                break
            case 'totalVendors':
                filteredData = allVendorsComplete
                title = 'Semua Vendor'
                break
        }

        setModalData({ type: cardType, data: filteredData, title })
        setShowModal(true)
    }, [allContracts, allVendorsComplete])

    // Memoize statCards to prevent recreation on each render
    const statCards = useMemo(() => [
        { title: 'Total Kontrak', value: stats.totalContracts, icon: Briefcase, className: 'stat-blue', type: 'totalContracts' },
        { title: 'Kontrak Terlambat', value: stats.lateContracts, icon: AlertCircle, className: 'stat-red', type: 'lateContracts' },
        { title: 'Proses / Review', value: stats.pendingContracts, icon: Clock, className: 'stat-orange', type: 'pendingContracts' },
        { title: 'Total Vendor', value: stats.totalVendors, icon: Users, className: 'stat-purple', type: 'totalVendors' },
    ], [stats])

    // Pie Chart Calculations
    const getPieRotation = (percentage: number) => percentage * 3.6 // 360deg / 100%

    // Memoize pieGradient to prevent recalculation on each render
    const pieGradient = useMemo(() => `conic-gradient(
        #f39c12 0% ${getPieRotation((contractStatusDist.dalamPekerjaan / contractStatusDist.total) * 100 || 0)}deg, 
        #9333ea ${getPieRotation((contractStatusDist.dalamPekerjaan / contractStatusDist.total) * 100 || 0)}deg ${getPieRotation(((contractStatusDist.dalamPekerjaan + contractStatusDist.telahdiperiksa) / contractStatusDist.total) * 100 || 0)}deg,
        #2ecc71 ${getPieRotation(((contractStatusDist.dalamPekerjaan + contractStatusDist.telahdiperiksa) / contractStatusDist.total) * 100 || 0)}deg 100%
    )`, [contractStatusDist])
    return (
        <div>
            {/* Stats Cards */}
            <div className="stats-grid">
                {statCards.map((stat, index) => {
                    const IconComponent = stat.icon
                    return (
                        <div
                            key={index}
                            className="stat-card"
                            onClick={() => handleCardClick(stat.type)}
                            style={{ cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-4px)'
                                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)'
                                e.currentTarget.style.boxShadow = ''
                            }}
                        >
                            <div className={`stat-icon-wrapper ${stat.className}`}>
                                <IconComponent className="stat-icon-svg" strokeWidth={2.5} size={28} />
                            </div>
                            <div className="stat-info">
                                <h3 className="stat-value">{stat.value}</h3>
                                <p className="stat-title">{stat.title}</p>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Modal Detail */}
            {showModal && modalData && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '20px'
                    }}
                    onClick={() => setShowModal(false)}
                >
                    <div
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '12px',
                            maxWidth: '800px',
                            width: '100%',
                            maxHeight: '80vh',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div style={{
                            padding: '20px 24px',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1e293b', margin: 0 }}>
                                {modalData.title} ({modalData.data.length})
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{
                                    border: 'none',
                                    background: 'none',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '6px',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <X size={24} color="#64748b" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div style={{
                            padding: '20px 24px',
                            overflowY: 'auto',
                            flex: 1
                        }}>
                            {modalData.data.length === 0 ? (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '40px 20px',
                                    color: '#64748b'
                                }}>
                                    Tidak ada data
                                </div>
                            ) : modalData.type === 'totalVendors' ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {modalData.data.map((vendor: any, idx: number) => (
                                        <div
                                            key={idx}
                                            style={{
                                                padding: '16px',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '8px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                transition: 'all 0.2s',
                                                cursor: 'pointer'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor = '#cbd5e1'
                                                e.currentTarget.style.backgroundColor = '#f8fafc'
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor = '#e2e8f0'
                                                e.currentTarget.style.backgroundColor = 'transparent'
                                            }}
                                            onClick={() => {
                                                setShowModal(false)
                                                router.push(`/vendor?id=${vendor.id}`)
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontWeight: '600', color: '#1e293b', marginBottom: '4px' }}>
                                                    {vendor.nama}
                                                </div>
                                                <div style={{ fontSize: '14px', color: '#64748b' }}>
                                                    {vendor.kategori} • {vendor.email}
                                                </div>
                                            </div>
                                            <span style={{
                                                padding: '4px 12px',
                                                borderRadius: '6px',
                                                fontSize: '12px',
                                                fontWeight: '500',
                                                backgroundColor: vendor.status === 'Aktif' ? '#dcfce7' : '#fee2e2',
                                                color: vendor.status === 'Aktif' ? '#16a34a' : '#dc2626'
                                            }}>
                                                {vendor.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {modalData.data.map((contract: any, idx: number) => (
                                        <div
                                            key={idx}
                                            style={{
                                                padding: '16px',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '8px',
                                                transition: 'all 0.2s',
                                                cursor: 'pointer'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.borderColor = '#cbd5e1'
                                                e.currentTarget.style.backgroundColor = '#f8fafc'
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.borderColor = '#e2e8f0'
                                                e.currentTarget.style.backgroundColor = 'transparent'
                                            }}
                                            onClick={() => {
                                                setShowModal(false)
                                                router.push(`/aset?id=${contract.id}`)
                                            }}
                                        >
                                            <div style={{ fontWeight: '600', color: '#1e293b', marginBottom: '8px' }}>
                                                {contract.name || 'Tanpa Judul'}
                                            </div>
                                            <div style={{ display: 'flex', gap: '16px', fontSize: '14px', color: '#64748b' }}>
                                                <div>
                                                    <strong>Vendor:</strong> {contract.vendor_name || '-'}
                                                </div>
                                                <div>
                                                    <strong>Status:</strong> {contract.status || '-'}
                                                </div>
                                                {contract.end_date && (
                                                    <div>
                                                        <strong>Berakhir:</strong> {new Date(contract.end_date).toLocaleDateString('id-ID')}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Charts Section */}
            <div className="charts-section">
                <div className="chart-card">
                    <div className="card-header">
                        <h3 className="card-title">Tren Kontrak Bulanan</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <select
                                value={selectedYear}
                                onChange={(e) => handleYearChange(Number(e.target.value))}
                                style={{
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    color: '#334155',
                                    background: '#fff',
                                    cursor: 'pointer',
                                    outline: 'none'
                                }}
                            >
                                {availableYears.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                            <TrendingUp size={20} className="card-icon" />
                        </div>
                    </div>
                    <div className="chart-placeholder">
                        <div className="line-chart-container" style={{
                            position: 'relative',
                            height: '280px',
                            padding: '20px',
                            display: 'flex',
                            flexDirection: 'column'
                        }}>
                            {/* Y-axis labels */}
                            <div style={{ position: 'absolute', left: '40px', top: '30px', height: '200px', display: 'flex', flexDirection: 'column', fontSize: '13px', color: '#64748b', textAlign: 'right', paddingRight: '5px', width: '22px' }}>
                                {(() => {
                                    const maxVal = Math.max(...chartData.map(d => Math.max(d.dalamProses || 0, d.terbayar || 0)), 0);
                                    if (maxVal === 0) {
                                        return [0].map((val, i) => (
                                            <span key={i} style={{ position: 'absolute', top: '0px' }}>{val}</span>
                                        ))
                                    }

                                    // Buat array nilai unik tanpa duplikasi
                                    const uniqueValues = new Set<number>()
                                    uniqueValues.add(maxVal)
                                    if (maxVal >= 4) {
                                        uniqueValues.add(Math.floor(maxVal * 0.75))
                                        uniqueValues.add(Math.floor(maxVal * 0.5))
                                        uniqueValues.add(Math.floor(maxVal * 0.25))
                                    } else {
                                        // Untuk nilai kecil, gunakan semua angka dari max ke 1
                                        for (let i = maxVal - 1; i >= 1; i--) {
                                            uniqueValues.add(i)
                                        }
                                    }
                                    uniqueValues.add(0)

                                    const labels = Array.from(uniqueValues).sort((a, b) => b - a)
                                    const gridSpacing = 200 / (labels.length - 1)

                                    return labels.map((val, i) => (
                                        <span key={i} style={{ position: 'absolute', top: `${i * gridSpacing - 3}px` }}>{val}</span>
                                    ))
                                })()}
                            </div>

                            {/* Chart area */}
                            <svg
                                width="99%"
                                height="220"
                                style={{ marginLeft: '5px', marginTop: '10px' }}
                                viewBox="0 0 1000 200"
                                preserveAspectRatio="xMidYMid meet"
                            >
                                {/* Grid lines - dinamis sesuai jumlah label Y */}
                                {(() => {
                                    const maxVal = Math.max(...chartData.map(d => Math.max(d.dalamProses || 0, d.terbayar || 0)), 0)
                                    if (maxVal === 0) {
                                        return (
                                            <line
                                                x1="50"
                                                y1="0"
                                                x2="950"
                                                y2="0"
                                                stroke="#f1f5f9"
                                                strokeWidth="1"
                                                strokeDasharray="4 4"
                                            />
                                        )
                                    }

                                    const uniqueValues = new Set<number>()
                                    uniqueValues.add(maxVal)
                                    if (maxVal >= 4) {
                                        uniqueValues.add(Math.floor(maxVal * 0.75))
                                        uniqueValues.add(Math.floor(maxVal * 0.5))
                                        uniqueValues.add(Math.floor(maxVal * 0.25))
                                    } else {
                                        for (let i = maxVal - 1; i >= 1; i--) {
                                            uniqueValues.add(i)
                                        }
                                    }
                                    uniqueValues.add(0)

                                    const gridCount = uniqueValues.size
                                    const gridSpacing = 200 / (gridCount - 1)

                                    return Array.from({ length: gridCount }).map((_, i) => (
                                        <line
                                            key={i}
                                            x1="50"
                                            y1={i * gridSpacing}
                                            x2="950"
                                            y2={i * gridSpacing}
                                            stroke="#f1f5f9"
                                            strokeWidth="1"
                                            strokeDasharray="4 4"
                                        />
                                    ))
                                })()}

                                {/* Area fills and lines */}
                                <defs>
                                    <linearGradient id="areaGradientDalamProses" x1="0" x2="0" y1="0" y2="1">
                                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
                                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.02" />
                                    </linearGradient>
                                    <linearGradient id="areaGradientTerbayar" x1="0" x2="0" y1="0" y2="1">
                                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                                    </linearGradient>
                                </defs>

                                {chartData.length > 0 && (() => {
                                    const maxValue = Math.max(...chartData.map(d => Math.max(d.dalamProses || 0, d.terbayar || 0)), 1);
                                    const paddingLeft = 50;
                                    const paddingRight = 50;
                                    const chartWidth = 900;
                                    const spacing = chartWidth / (chartData.length - 1);

                                    // Dalam Proses line
                                    const dalamProsesPoints = chartData.map((data, index) => {
                                        const x = paddingLeft + (index * spacing);
                                        const y = 200 - ((data.dalamProses || 0) / maxValue) * 200;
                                        return `${x},${y}`;
                                    }).join(' ');

                                    const dalamProsesAreaPoints = `${paddingLeft},200 ${dalamProsesPoints} ${paddingLeft + chartWidth},200`;

                                    // Terbayar line
                                    const terbayarPoints = chartData.map((data, index) => {
                                        const x = paddingLeft + (index * spacing);
                                        const y = 200 - ((data.terbayar || 0) / maxValue) * 200;
                                        return `${x},${y}`;
                                    }).join(' ');

                                    const terbayarAreaPoints = `${paddingLeft},200 ${terbayarPoints} ${paddingLeft + chartWidth},200`;

                                    return (
                                        <>
                                            {/* Dalam Proses area and line */}
                                            <polyline
                                                points={dalamProsesAreaPoints}
                                                fill="url(#areaGradientDalamProses)"
                                            />
                                            <polyline
                                                points={dalamProsesPoints}
                                                fill="none"
                                                stroke="#f59e0b"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />

                                            {/* Terbayar area and line */}
                                            <polyline
                                                points={terbayarAreaPoints}
                                                fill="url(#areaGradientTerbayar)"
                                            />
                                            <polyline
                                                points={terbayarPoints}
                                                fill="none"
                                                stroke="#10b981"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />

                                            {/* Dalam Proses points */}
                                            {chartData.map((data, index) => {
                                                const x = paddingLeft + (index * spacing);
                                                const y = 200 - ((data.dalamProses || 0) / maxValue) * 200;
                                                return (
                                                    <g key={`dp-${index}`}>
                                                        <circle
                                                            cx={x}
                                                            cy={y}
                                                            r="5"
                                                            fill="#fff"
                                                            stroke="#f59e0b"
                                                            strokeWidth="3"
                                                            style={{ cursor: 'pointer' }}
                                                        />
                                                        <title>{`${data.month}: Dalam Proses ${data.dalamProses || 0}`}</title>
                                                    </g>
                                                );
                                            })}

                                            {/* Terbayar points */}
                                            {chartData.map((data, index) => {
                                                const x = paddingLeft + (index * spacing);
                                                const y = 200 - ((data.terbayar || 0) / maxValue) * 200;
                                                return (
                                                    <g key={`tb-${index}`}>
                                                        <circle
                                                            cx={x}
                                                            cy={y}
                                                            r="5"
                                                            fill="#fff"
                                                            stroke="#10b981"
                                                            strokeWidth="3"
                                                            style={{ cursor: 'pointer' }}
                                                        />
                                                        <title>{`${data.month}: Terbayar ${data.terbayar || 0}`}</title>
                                                    </g>
                                                );
                                            })}
                                        </>
                                    );
                                })()}
                            </svg>

                            {/* X-axis labels */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                paddingLeft: '50px',
                                paddingRight: '50px',
                                fontSize: '12px',
                                color: '#64748b',
                                fontWeight: 500
                            }}>
                                {chartData.map((data, index) => (
                                    <span key={index}>{data.month}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 18, marginTop: 10 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 14, height: 8, background: '#f59e0b', borderRadius: 4, display: 'inline-block' }}></span> Dalam Proses</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 14, height: 8, background: '#10b981', borderRadius: 4, display: 'inline-block' }}></span> Terbayar</span>
                    </div>
                </div>

                <div className="chart-card">
                    <div className="card-header">
                        <h3 className="card-title">Komposisi Status</h3>
                        <Activity size={20} className="card-icon" />
                    </div>
                    <div className="pie-chart-container">
                        <div className="pie-chart" style={{ background: contractStatusDist.total > 0 ? pieGradient : '#e2e8f0' }}>
                            <div className="pie-slice"></div>
                        </div>
                        <div className="pie-center">
                            <div className="pie-total">{contractStatusDist.total}</div>
                            <div className="pie-label">Kontrak</div>
                        </div>
                    </div>
                    <div className="pie-legend">
                        <div className="legend-item">
                            <span className="legend-color" style={{ background: '#f39c12' }}></span>
                            <span className="legend-text">Dalam Pekerjaan</span>
                            <span className="legend-value">{contractStatusDist.dalamPekerjaan}</span>
                        </div>
                        <div className="legend-item">
                            <span className="legend-color" style={{ background: '#9333ea' }}></span>
                            <span className="legend-text">Telah Diperiksa</span>
                            <span className="legend-value">{contractStatusDist.telahdiperiksa}</span>
                        </div>
                        <div className="legend-item">
                            <span className="legend-color" style={{ background: '#2ecc71' }}></span>
                            <span className="legend-text">Terbayar</span>
                            <span className="legend-value">{contractStatusDist.terbayar}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Grid: Recent Activities & Vendors */}
            <div className="dashboard-bottom-grid">
                {/* Recent Activities */}
                <div className="activity-section">
                    <div className="card-header">
                        <h3 className="card-title">Kontrak Terbaru</h3>
                        <FileText size={20} className="card-icon" />
                    </div>
                    <div className="activity-list">
                        {recentActivities.length > 0 ? recentActivities.map((activity, index) => {
                            const ActivityIcon = activity.icon
                            return (
                                <div
                                    key={index}
                                    className="activity-item"
                                    onClick={() => handleContractClick(activity.contractId)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className="activity-icon-wrapper">
                                        <ActivityIcon className="activity-icon-svg" size={20} strokeWidth={2} />
                                    </div>
                                    <div className="activity-details">
                                        <p className="activity-action">{activity.action} - {activity.vendor}</p>
                                        <p className="activity-item-name">{activity.item}</p>
                                    </div>
                                    <span className="activity-time">{activity.time}</span>
                                </div>
                            )
                        }) : (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Belum ada aktivitas kontrak terbaru.</div>
                        )}
                    </div>
                </div>

                {/* Vendor List */}
                <div className="vendor-section">
                    <div className="card-header">
                        <h3 className="card-title">Vendor Terbaru</h3>
                        <Users size={20} className="card-icon" />
                    </div>
                    <div className="vendor-list">
                        {recentVendors.length > 0 ? recentVendors.map((vendor, index) => (
                            <div
                                key={index}
                                className="vendor-item"
                                onClick={handleVendorClick}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="vendor-icon-wrapper">
                                    <Users className="activity-icon-svg" size={20} strokeWidth={2} />
                                </div>
                                <div className="activity-details">
                                    <p className="activity-action">{vendor.nama}</p>
                                    <p className="activity-item-name">{vendor.kategori} - {vendor.email}</p>
                                </div>
                                <span className={`vendor-status-badge ${vendor.status === 'Aktif' ? 'vendor-status-active' : 'vendor-status-inactive'}`}>
                                    {vendor.status}
                                </span>
                            </div>
                        )) : (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Belum ada data vendor.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
