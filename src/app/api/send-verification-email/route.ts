import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export const dynamic = 'force-dynamic';


export async function POST(request: NextRequest) {
    try {
        const { email, verificationCode, companyName } = await request.json()

        if (!email || !verificationCode) {
            return NextResponse.json(
                { success: false, error: 'Email dan kode verifikasi harus diisi' },
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

        // Template email verifikasi
        const mailOptions = {
            from: `"SAKTI PLN - Verifikasi Email" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: 'Kode Verifikasi Registrasi Vendor - SAKTI PLN',
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
                            background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
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
                        .verification-box {
                            background: #f0f9ff;
                            border: 2px dashed #0284c7;
                            border-radius: 8px;
                            padding: 30px;
                            text-align: center;
                            margin: 30px 0;
                        }
                        .verification-code {
                            font-size: 42px;
                            font-weight: bold;
                            color: #0284c7;
                            letter-spacing: 8px;
                            margin: 20px 0;
                            font-family: 'Courier New', monospace;
                        }
                        .info-box {
                            background: #fef3c7;
                            border-left: 4px solid #f59e0b;
                            padding: 15px;
                            margin: 20px 0;
                            border-radius: 4px;
                        }
                        .footer {
                            background: #f9fafb;
                            padding: 20px;
                            text-align: center;
                            font-size: 12px;
                            color: #6b7280;
                            border-radius: 0 0 10px 10px;
                        }
                        .warning {
                            color: #dc2626;
                            font-weight: bold;
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="logo">⚡ SAKTI PLN</div>
                        <p>Sistem Arsip & Kontrak Terintegrasi</p>
                    </div>
                    
                    <div class="content">
                        <h2>Selamat Datang, ${companyName || 'Calon Vendor'}!</h2>
                        
                        <p>Terima kasih telah mendaftar sebagai vendor di sistem SAKTI PLN.</p>
                        
                        <p>Untuk melanjutkan proses registrasi, silakan gunakan kode verifikasi berikut:</p>
                        
                        <div class="verification-box">
                            <p style="margin: 0; color: #6b7280;">Kode Verifikasi Anda:</p>
                            <div class="verification-code">${verificationCode}</div>
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">Masukkan kode ini di halaman registrasi</p>
                        </div>
                        
                        <div class="info-box">
                            <strong>⏰ Penting:</strong>
                            <ul style="margin: 10px 0;">
                                <li>Kode ini berlaku selama <strong>15 menit</strong></li>
                                <li>Jangan bagikan kode ini kepada siapa pun</li>
                                <li>Jika Anda tidak merasa melakukan registrasi, abaikan email ini</li>
                            </ul>
                        </div>
                        
                        <p>Setelah memasukkan kode verifikasi, Anda dapat melengkapi data perusahaan dan membuat akun vendor.</p>
                        
                        <p class="warning">⚠️ Jika Anda tidak melakukan permintaan registrasi ini, harap abaikan email ini.</p>
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

        console.log('✅ Verification email sent successfully to:', email)

        return NextResponse.json({
            success: true,
            message: `Kode verifikasi telah dikirim ke ${email}`,
        })
    } catch (error) {
        console.error('❌ Error sending verification email:', error)

        // Fallback: return success tapi dengan pesan alternatif
        return NextResponse.json({
            success: false,
            error: 'Gagal mengirim email verifikasi. Silakan coba lagi atau hubungi administrator.',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}
