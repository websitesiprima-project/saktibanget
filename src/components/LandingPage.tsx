'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
    LayoutDashboard,
    FileText,
    Users,
    CheckCircle,
    BarChart3,
    Settings,
    ArrowRight,
    Play,
    Shield,
    Clock,
    Zap,
    Building2,
    ChevronRight,
    LogIn,
    ClipboardCheck,
    TrendingUp
} from 'lucide-react'
import './LandingPage.css'

export default function LandingPage() {
    const [isScrolled, setIsScrolled] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const features = [
        {
            icon: LayoutDashboard,
            title: 'Dashboard Interaktif',
            description: 'Pantau statistik kontrak, vendor, dan aktivitas real-time dalam satu tampilan terpusat yang informatif.'
        },
        {
            icon: FileText,
            title: 'Manajemen Kontrak',
            description: 'Kelola kontrak dengan tracking progress, amandemen, dan tahapan pembayaran termin secara efisien.'
        },
        {
            icon: Users,
            title: 'Data Vendor',
            description: 'Kelola informasi vendor termasuk data bank, status aktif, dan riwayat kontrak dengan mudah.'
        },
        {
            icon: CheckCircle,
            title: 'Approval Surat',
            description: 'Proses persetujuan surat pengajuan vendor dengan sistem approval yang cepat dan transparan.'
        },
        {
            icon: BarChart3,
            title: 'Laporan & Analytics',
            description: 'Generate laporan KPI, analisis kontrak, dan export ke format Excel atau PDF secara otomatis.'
        },
        {
            icon: Settings,
            title: 'Pengaturan Sistem',
            description: 'Konfigurasi profil admin, preferensi sistem, dan manajemen akses pengguna dengan fleksibel.'
        }
    ]

    const steps = [
        {
            number: '01',
            icon: LogIn,
            title: 'Login ke Sistem',
            description: 'Masuk dengan akun admin yang sudah terdaftar untuk mengakses seluruh fitur platform SAKTI.'
        },
        {
            number: '02',
            icon: ClipboardCheck,
            title: 'Kelola Data',
            description: 'Tambahkan vendor baru, buat kontrak, kelola dokumen, dan proses approval surat dengan mudah.'
        },
        {
            number: '03',
            icon: TrendingUp,
            title: 'Monitor & Laporan',
            description: 'Pantau progress kontrak secara real-time dan generate laporan analitik untuk evaluasi kinerja.'
        }
    ]

    const benefits = [
        { icon: Shield, text: 'Keamanan Data Terjamin' },
        { icon: Clock, text: 'Proses Lebih Cepat' },
        { icon: Zap, text: 'Efisiensi Tinggi' },
        { icon: Building2, text: 'Terintegrasi Penuh' }
    ]

    return (
        <div className="landing-page">
            {/* Navigation */}
            <nav className={`landing-nav ${isScrolled ? 'scrolled' : ''}`}>
                <div className="nav-container">
                    <div className="nav-logo">
                        <Image src="/images/Logo SAKTI 2.png" alt="SAKTI" width={150} height={40} style={{ objectFit: 'contain' }} />
                    </div>
                    <div className="nav-links">
                        <a href="#features">Fitur</a>
                        <a href="#how-it-works">Cara Kerja</a>
                        <a href="#about">Tentang</a>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-container">
                    <div className="hero-image-wrapper">
                        <Image
                            src="/images/landing page.png"
                            alt="PLN UPT Manado"
                            fill
                            style={{ objectFit: 'cover' }}
                            priority
                        />
                    </div>
                    <div className="hero-cta-group">
                        <Link href="/login" className="hero-primary-btn">
                            Masuk Admin
                            <ArrowRight size={18} />
                        </Link>
                        <Link href="/vendor-login" className="hero-secondary-btn">
                            <Building2 size={18} />
                            Masuk Vendor
                        </Link>
                    </div>
                </div>
            </section>

            {/* Partner Logos */}
            <section className="partners-section">
                <div className="partners-container">
                    <span className="partners-label">Didukung oleh</span>
                    <div className="partners-logos">
                        <Image src="/images/Logo_Danantara (2).png" alt="Danantara" width={140} height={40} />
                        <Image src="/images/Logo_PLN.png" alt="PLN" width={50} height={50} />
                        <Image src="/images/Logo SAKTI 2.png" alt="SAKTI" width={100} height={40} />
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section" id="features">
                <div className="section-container">
                    <div className="section-header">
                        <div className="section-badge">
                            <span>Fitur</span>
                        </div>
                        <h2 className="section-title">
                            Semua yang Anda butuhkan,{' '}
                            <span className="text-gradient">dalam satu platform</span>
                        </h2>
                        <p className="section-subtitle">
                            SAKTI menyediakan solusi lengkap untuk pengelolaan kontrak dan vendor
                            dengan antarmuka yang intuitif dan fitur yang powerful.
                        </p>
                    </div>
                    <div className="features-grid">
                        {features.map((feature, index) => (
                            <div key={index} className="feature-card">
                                <div className="feature-icon-wrapper">
                                    <feature.icon size={24} />
                                </div>
                                <h3 className="feature-title">{feature.title}</h3>
                                <p className="feature-description">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="steps-section" id="how-it-works">
                <div className="section-container">
                    <div className="steps-content-centered">
                        <div className="section-badge">
                            <span>Cara Kerja</span>
                        </div>
                        <h2 className="section-title">
                            Mulai Mengelola{' '}
                            <span className="text-gradient">dalam 3 Langkah</span>
                        </h2>
                        <div className="steps-list-centered">
                            {steps.map((step, index) => (
                                <div key={index} className="step-item-centered">
                                    <div className="step-number-wrapper">
                                        <span className="step-number">{step.number}</span>
                                    </div>
                                    <div className="step-info">
                                        <h3 className="step-title">{step.title}</h3>
                                        <p className="step-description">{step.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <div className="section-container">
                    <div className="cta-card">
                        <div className="cta-content">
                            <h2 className="cta-title">Siap untuk Memulai?</h2>
                            <p className="cta-description">
                                Akses platform SAKTI sekarang dan rasakan kemudahan dalam mengelola
                                kontrak dan vendor PLN.
                            </p>
                            <div className="cta-buttons">
                                <Link href="/login" className="cta-primary-btn">
                                    Masuk Sekarang
                                    <ArrowRight size={18} />
                                </Link>
                                <Link href="/vendor-login" className="cta-secondary-btn">
                                    Portal Vendor
                                </Link>
                            </div>
                        </div>
                        <div className="cta-decoration">
                            <div className="decoration-circle"></div>
                            <div className="decoration-circle small"></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer" id="about">
                <div className="footer-container">
                    <div className="footer-main">
                        <div className="footer-brand">
                            <div className="footer-logo">
                                <Image src="/images/Logo SAKTI 2.png" alt="SAKTI" width={170} height={48} style={{ objectFit: 'contain' }} />
                            </div>
                            <p className="footer-tagline">
                                Sistem Arsip & Kontrak Terintegrasi<br />
                                PLN Unit Pelaksana Transmisi Manado
                            </p>
                        </div>
                        <div className="footer-links-group">
                            <div className="footer-links">
                                <h4>Platform</h4>
                                <span>Fitur</span>
                                <span>Cara Kerja</span>
                                <span>Login Admin</span>
                            </div>
                            <div className="footer-links">
                                <h4>Akses</h4>
                                <span>Admin Portal</span>
                                <span>Vendor Portal</span>
                            </div>
                            <div className="footer-links">
                                <h4>Kontak</h4>
                                <span>PLN UPT Manado</span>
                                <span>Jl. Tompakwa No.1, Bumi Nyiur</span>
                                <span>Kec. Wanea, Kota Manado</span>
                                <span>Sulawesi Utara 95117, Indonesia</span>
                            </div>
                            <div className="footer-links">
                                <h4>Developer</h4>
                                <span className="developer-name">Miftahuddin S. Arsyad</span>
                                <span className="developer-role">Informatics Engineering</span>
                                <span className="developer-name">Edward Benedict</span>
                                <span className="developer-role">Informatics Engineering</span>
                            </div>
                        </div>
                    </div>
                    <div className="footer-bottom">
                        <p>© 2026 PLN UPT Manado. All rights reserved.</p>
                        <p>Powered by SAKTI System</p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
