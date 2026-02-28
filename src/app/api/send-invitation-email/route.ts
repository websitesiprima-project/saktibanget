import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
    try {
        const { email, companyName, activationToken, invitedBy } = await request.json()

        if (!email || !activationToken) {
            return NextResponse.json(
                { success: false, error: 'Email dan token aktivasi harus diisi' },
                { status: 400 }
            )
        }

        // Get base URL from environment or construct from request
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
            process.env.NEXTAUTH_URL ||
            `${request.nextUrl.protocol}//${request.nextUrl.host}`

        const activationLink = `${baseUrl}/vendor-activate?token=${activationToken}`

        // Konfigurasi Gmail SMTP
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD,
            },
        })

        // Template email undangan
        const mailOptions = {
            from: `"SAKTI PLN - Undangan Vendor" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: 'Undangan Bergabung sebagai Vendor - SAKTI PLN',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body {
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            line-height: 1.6;
                            color: #333;
                            max-width: 600px;
                            margin: 0 auto;
                            padding: 20px;
                            background: #f5f5f5;
                        }
                        .container {
                            background: white;
                            border-radius: 16px;
                            overflow: hidden;
                            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                        }
                        .header {
                            background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
                            color: white;
                            padding: 40px 30px;
                            text-align: center;
                        }
                        .logo {
                            font-size: 36px;
                            font-weight: bold;
                            margin-bottom: 10px;
                        }
                        .header p {
                            margin: 0;
                            opacity: 0.9;
                            font-size: 14px;
                        }
                        .content {
                            padding: 40px 30px;
                        }
                        .welcome-text {
                            font-size: 24px;
                            font-weight: 600;
                            color: #1e293b;
                            margin-bottom: 20px;
                        }
                        .company-name {
                            color: #0284c7;
                        }
                        .invitation-box {
                            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
                            border: 2px solid #0284c7;
                            border-radius: 12px;
                            padding: 30px;
                            text-align: center;
                            margin: 30px 0;
                        }
                        .invitation-text {
                            font-size: 16px;
                            color: #475569;
                            margin-bottom: 20px;
                        }
                        .activate-btn {
                            display: inline-block;
                            background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
                            color: white !important;
                            text-decoration: none;
                            padding: 16px 40px;
                            border-radius: 8px;
                            font-size: 16px;
                            font-weight: 600;
                            box-shadow: 0 4px 14px rgba(2, 132, 199, 0.4);
                            transition: all 0.3s;
                        }
                        .activate-btn:hover {
                            transform: translateY(-2px);
                            box-shadow: 0 6px 20px rgba(2, 132, 199, 0.5);
                        }
                        .steps {
                            background: #f8fafc;
                            border-radius: 12px;
                            padding: 25px;
                            margin: 30px 0;
                        }
                        .steps-title {
                            font-weight: 600;
                            color: #1e293b;
                            margin-bottom: 15px;
                            font-size: 16px;
                        }
                        .step {
                            display: flex;
                            align-items: flex-start;
                            margin-bottom: 12px;
                        }
                        .step-number {
                            background: #0284c7;
                            color: white;
                            width: 24px;
                            height: 24px;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 12px;
                            font-weight: bold;
                            margin-right: 12px;
                            flex-shrink: 0;
                        }
                        .step-text {
                            color: #475569;
                            font-size: 14px;
                        }
                        .info-box {
                            background: #fef3c7;
                            border-left: 4px solid #f59e0b;
                            padding: 15px 20px;
                            margin: 25px 0;
                            border-radius: 0 8px 8px 0;
                        }
                        .info-box strong {
                            color: #92400e;
                        }
                        .link-text {
                            background: #f1f5f9;
                            padding: 15px;
                            border-radius: 8px;
                            font-size: 12px;
                            word-break: break-all;
                            color: #64748b;
                            margin-top: 20px;
                        }
                        .footer {
                            background: #f8fafc;
                            padding: 25px 30px;
                            text-align: center;
                            font-size: 12px;
                            color: #64748b;
                            border-top: 1px solid #e2e8f0;
                        }
                        .footer p {
                            margin: 5px 0;
                        }
                        .warning {
                            color: #dc2626;
                            font-weight: 500;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <div class="logo">⚡ SAKTI PLN</div>
                            <p>Sistem Arsip & Kontrak Terintegrasi</p>
                        </div>
                        
                        <div class="content">
                            <div class="welcome-text">
                                Selamat Datang, <span class="company-name">${companyName || 'Vendor'}!</span>
                            </div>
                            
                            <p>Anda telah diundang oleh <strong>${invitedBy || 'Admin PLN'}</strong> untuk bergabung sebagai vendor di sistem SAKTI PLN.</p>
                            
                            <div class="invitation-box">
                                <p class="invitation-text">Klik tombol di bawah ini untuk mengaktifkan akun Anda dan membuat password:</p>
                                <a href="${activationLink}" class="activate-btn">
                                    🚀 Aktifkan Akun Saya
                                </a>
                            </div>
                            
                            <div class="steps">
                                <div class="steps-title">📋 Langkah Aktivasi:</div>
                                <div class="step">
                                    <div class="step-number">1</div>
                                    <div class="step-text">Klik tombol "Aktifkan Akun Saya" di atas</div>
                                </div>
                                <div class="step">
                                    <div class="step-number">2</div>
                                    <div class="step-text">Buat password yang kuat untuk akun Anda</div>
                                </div>
                                <div class="step">
                                    <div class="step-number">3</div>
                                    <div class="step-text">Login ke portal vendor dengan email dan password baru</div>
                                </div>
                            </div>
                            
                            <div class="info-box">
                                <strong>⏰ Penting:</strong>
                                <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                                    <li>Link aktivasi ini berlaku selama <strong>7 hari</strong></li>
                                    <li>Jangan bagikan link ini kepada siapa pun</li>
                                    <li>Jika link kadaluarsa, hubungi admin PLN untuk mengirim ulang undangan</li>
                                </ul>
                            </div>
                            
                            <p class="warning">⚠️ Jika Anda tidak merasa mendaftar sebagai vendor PLN, harap abaikan email ini.</p>
                            
                            <div class="link-text">
                                <strong>Link aktivasi:</strong><br>
                                ${activationLink}
                            </div>
                        </div>
                        
                        <div class="footer">
                            <p><strong>PLN SAKTI - Vendor Portal</strong></p>
                            <p>Email ini dikirim secara otomatis. Mohon tidak membalas email ini.</p>
                            <p>© ${new Date().getFullYear()} PT PLN (Persero). All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
        }

        // Kirim email
        await transporter.sendMail(mailOptions)

        console.log('✅ Invitation email sent successfully to:', email)

        return NextResponse.json({
            success: true,
            message: `Email undangan berhasil dikirim ke ${email}`,
            activationLink: activationLink // For debugging, remove in production
        })
    } catch (error) {
        console.error('❌ Error sending invitation email:', error)

        return NextResponse.json({
            success: false,
            error: 'Gagal mengirim email undangan. Silakan coba lagi.',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
