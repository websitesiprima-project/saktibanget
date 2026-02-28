'use client'
import React, { useState, useEffect } from 'react';
import { Download, Calendar, Clock, CheckCircle, XCircle } from 'lucide-react';
import { getRiwayatSuratPengajuan } from '@/services/suratPengajuanService';
import './VendorDashboard.css';

export default function VendorDashboard() {
    const [currentPage, setCurrentPage] = useState(1);
    const [suratData, setSuratData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const itemsPerPage = 5;

    // Load data from Supabase
    useEffect(() => {
        const loadSubmissions = async () => {
            setIsLoading(true);
            const result = await getRiwayatSuratPengajuan();

            if (result.success && result.data) {
                // Transform data to match component structure
                const transformedData = result.data.map(surat => ({
                    id: surat.id,
                    nomorSurat: surat.nomor_surat,
                    perihal: surat.perihal,
                    namaPekerjaan: surat.nama_pekerjaan,
                    nomorKontrak: surat.nomor_kontrak,
                    tanggalPengajuan: new Date(surat.created_at).toLocaleDateString('id-ID'),
                    tanggalSurat: new Date(surat.tanggal_surat).toLocaleDateString('id-ID'),
                    status: surat.status,
                    fileUrl: surat.file_url
                }));
                setSuratData(transformedData.reverse()); // Newest first
            }
            setIsLoading(false);
        };

        loadSubmissions();

        // Refresh data every 30 seconds
        const interval = setInterval(loadSubmissions, 30000);
        return () => clearInterval(interval);
    }, []);

    // Calculate statistics
    const totalPengajuan = suratData.length;
    const pendingCount = suratData.filter(s => s.status === 'PENDING').length;
    const approvedCount = suratData.filter(s => s.status === 'APPROVED').length;
    const rejectedCount = suratData.filter(s => s.status === 'REJECTED').length;

    // Pagination
    const totalPages = Math.ceil(suratData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentData = suratData.slice(startIndex, startIndex + itemsPerPage);

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    // Status badge dengan icon
    const getStatusBadge = (status) => {
        const statusConfig = {
            'PENDING': {
                className: 'status-pending',
                icon: Clock,
                text: 'Menunggu'
            },
            'APPROVED': {
                className: 'status-approved',
                icon: CheckCircle,
                text: 'Disetujui'
            },
            'REJECTED': {
                className: 'status-rejected',
                icon: XCircle,
                text: 'Ditolak'
            }
        };

        const config = statusConfig[status] || statusConfig['PENDING'];
        const IconComponent = config.icon;

        return (
            <span className={`status-badge ${config.className}`}>
                <IconComponent size={14} />
                {config.text}
            </span>
        );
    };

    return (
        <div className="vendor-dashboard">
            {/* Stats Cards */}
            <div className="stats-grid">
                {[
                    {
                        title: 'Total Pengajuan',
                        value: totalPengajuan,
                        icon: Calendar,
                        color: '#3b82f6',
                        bgColor: '#eff6ff',
                    },
                    {
                        title: 'Menunggu Persetujuan',
                        value: pendingCount,
                        icon: Clock,
                        color: '#f39c12',
                        bgColor: '#fff8e1',
                    },
                    {
                        title: 'Disetujui',
                        value: approvedCount,
                        icon: CheckCircle,
                        color: '#2ecc71',
                        bgColor: '#e8f5e9',
                    },
                    {
                        title: 'Ditolak',
                        value: rejectedCount,
                        icon: XCircle,
                        color: '#e74c3c',
                        bgColor: '#ffebee',
                    },
                ].map((stat, index) => {
                    const IconComponent = stat.icon;
                    return (
                        <div key={index} className="stat-card">
                            <div className="stat-icon" style={{ background: stat.bgColor }}>
                                <IconComponent size={28} style={{ color: stat.color }} strokeWidth={2.5} />
                            </div>
                            <div className="stat-info">
                                <div className="stat-value">{stat.value}</div>
                                <div className="stat-label">{stat.title}</div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Table */}
            <div className="table-container">
                <div className="table-header">
                    <h2>Riwayat Pengajuan Surat</h2>
                </div>

                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                        <p>Memuat data...</p>
                    </div>
                ) : (
                    <>
                        <table className="vendor-table">
                            <thead>
                                <tr>
                                    <th>Nomor Surat</th>
                                    <th>Perihal</th>
                                    <th>Nama Pekerjaan</th>
                                    <th>Nomor Kontrak</th>
                                    <th>Tanggal Pengajuan</th>
                                    <th>Tanggal Surat</th>
                                    <th>Status</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentData.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                                            Belum ada pengajuan surat
                                        </td>
                                    </tr>
                                ) : (
                                    currentData.map((surat, index) => (
                                        <tr key={index}>
                                            <td>{surat.nomorSurat}</td>
                                            <td>{surat.perihal}</td>
                                            <td style={{ color: surat.namaPekerjaan ? 'inherit' : '#94a3b8' }}>
                                                {surat.namaPekerjaan || '-'}
                                            </td>
                                            <td style={{ color: surat.nomorKontrak ? 'inherit' : '#94a3b8' }}>
                                                {surat.nomorKontrak || '-'}
                                            </td>
                                            <td>{surat.tanggalPengajuan}</td>
                                            <td>{surat.tanggalSurat}</td>
                                            <td>{getStatusBadge(surat.status)}</td>
                                            <td>
                                                <button className="btn-download">
                                                    <Download size={16} />
                                                    Unduh
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>

                        {suratData.length > 0 && (
                            <div className="pagination">
                                <button
                                    onClick={handlePreviousPage}
                                    disabled={currentPage === 1}
                                    className="pagination-btn"
                                >
                                    ← Sebelumnya
                                </button>
                                <span className="page-info">
                                    Halaman {currentPage} dari {totalPages || 1}
                                </span>
                                <button
                                    onClick={handleNextPage}
                                    disabled={currentPage === totalPages}
                                    className="pagination-btn"
                                >
                                    Selanjutnya →
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
