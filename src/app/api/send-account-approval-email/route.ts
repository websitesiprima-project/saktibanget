import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
    try {
        const { email, companyName, password } = await request.json()

        if (!email || !password || !companyName) {
            return NextResponse.json(
                { success: false, error: 'Email, nama perusahaan, dan password harus diisi' },
                { status: 400 }
            )
        }

        // Konfigurasi Gmail SMTP
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD,
            },
        })

        // Template email dengan password akun
        const mailOptions = {
            from: `"SAKTI PLN - Akun Vendor Disetujui" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: 'Akun Vendor Anda Telah Disetujui - SAKTI PLN',
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
                        }
                        .header {
                            background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
                            color: white;
                            padding: 30px;
                            border-radius: 10px 10px 0 0;
                            text-align: center;
                        }
                        .logo {
                            font-size: 32px;
                            font-weight: bold;
                            margin-bottom: 10px;
                        }
                        .content {
                            background: #ffffff;
                            padding: 40px;
                            border: 1px solid #e5e7eb;
                            border-top: none;
                        }
                        .success-badge {
                            display: inline-block;
                            background: #dcfce7;
                            color: #16a34a;
                            padding: 10px 20px;
                            border-radius: 20px;
                            font-weight: bold;
                            font-size: 14px;
                            margin: 20px 0;
                        }
                        .credentials-box {
                            background: #f0f9ff;
                            border: 2px solid #0284c7;
                            border-radius: 8px;
                            padding: 30px;
                            margin: 30px 0;
                        }
                        .credential-row {
                            display: flex;
                            align-items: center;
                            margin: 15px 0;
                            padding: 10px;
                            background: white;
                            border-radius: 6px;
                        }
                        .credential-label {
                            font-weight: 600;
                            color: #6b7280;
                            min-width: 120px;
                        }
                        .credential-value {
                            font-family: 'Courier New', monospace;
                            font-size: 16px;
                            color: #0284c7;
                            font-weight: bold;
                        }
                        .info-box {
                            background: #fef3c7;
                            border-left: 4px solid #f59e0b;
                            padding: 15px;
                            margin: 20px 0;
                            border-radius: 4px;
                        }
                        .login-button {
                            display: inline-block;
                            background: #0284c7;
                            color: white;
                            padding: 14px 32px;
                            border-radius: 8px;
                            text-decoration: none;
                            font-weight: bold;
                            margin: 20px 0;
                            transition: background 0.3s;
                        }
                        .login-button:hover {
                            background: #0369a1;
                        }
                        .footer {
                            background: #f9fafb;
                            padding: 20px;
                            text-align: center;
                            font-size: 12px;
                            color: #6b7280;
                            border-radius: 0 0 10px 10px;
                        }
                        .security-notice {
                            background: #fee2e2;
                            border-left: 4px solid #dc2626;
                            padding: 15px;
                            margin: 20px 0;
                            border-radius: 4px;
                            color: #991b1b;
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="logo">⚡ SAKTI PLN</div>
                        <p>Sistem Arsip & Kontrak Terintegrasi</p>
                    </div>
                    
                    <div class="content">
                        <h2>🎉 Selamat, ${companyName}!</h2>
                        
                        <div class="success-badge">
                            ✓ Akun Vendor Disetujui
                        </div>
                        
                        <p>Terima kasih telah mendaftar sebagai vendor di sistem SAKTI PLN. Kami dengan senang hati mengumumkan bahwa akun vendor Anda telah <strong>disetujui</strong> oleh administrator kami.</p>
                        
                        <h3 style="color: #0284c7; margin-top: 30px;">Kredensial Login Anda:</h3>
                        
                        <div class="credentials-box">
                            <div class="credential-row">
                                <span class="credential-label">Email:</span>
                                <span class="credential-value">${email}</span>
                            </div>
                            <div class="credential-row">
                                <span class="credential-label">Password:</span>
                                <span class="credential-value">${password}</span>
                            </div>
                        </div>
                        
                        <div class="security-notice">
                            <strong>🔒 Keamanan Akun:</strong>
                            <ul style="margin: 10px 0;">
                                <li>Segera ubah password setelah login pertama kali</li>
                                <li>Jangan bagikan password kepada siapa pun</li>
                                <li>Gunakan password yang kuat dan unik</li>
                            </ul>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/vendor-login" class="login-button">
                                Login ke Portal Vendor →
                            </a>
                        </div>
                        
                        <div class="info-box">
                            <strong>ℹ️ Apa yang bisa Anda lakukan:</strong>
                            <ul style="margin: 10px 0;">
                                <li>Mengajukan surat pengajuan kontrak</li>
                                <li>Melihat riwayat pengajuan</li>
                                <li>Mengelola profil perusahaan</li>
                                <li>Memantau status pengajuan</li>
                            </ul>
                        </div>
                        
                        <p>Jika Anda mengalami kesulitan dalam login atau memiliki pertanyaan, silakan hubungi administrator sistem kami.</p>
                    </div>
                    
                    <div class="footer">
                        <p><strong>PLN SAKTI - Vendor Portal</strong></p>
                        <p>Email ini dikirim secara otomatis. Mohon tidak membalas email ini.</p>
                        <p>© ${new Date().getFullYear()} PT PLN (Persero). All rights reserved.</p>
                    </div>
                </body>
                </html>
            `,
        }

        // Kirim email
        await transporter.sendMail(mailOptions)

        console.log('✅ Account approval email sent successfully to:', email)

        return NextResponse.json({
            success: true,
            message: `Email berisi informasi akun telah dikirim ke ${email}`,
        })
    } catch (error) {
        console.error('❌ Error sending account approval email:', error)
        return NextResponse.json(
            {
                success: false,
                error: 'Gagal mengirim email',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        )
    }
}
