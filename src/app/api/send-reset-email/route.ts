import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
    try {
        const { email, resetToken, companyName } = await request.json()

        if (!email || !resetToken) {
            return NextResponse.json(
                { success: false, error: 'Email dan kode reset harus diisi' },
                { status: 400 }
            )
        }

        // Konfigurasi Gmail SMTP
        // PENTING: Gunakan App Password, bukan password Gmail biasa
        // Cara membuat App Password: https://support.google.com/accounts/answer/185833
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER, // Email Gmail Anda
                pass: process.env.GMAIL_APP_PASSWORD, // App Password Gmail
            },
        })

        // Template email
        const mailOptions = {
            from: `"SAKTI PLN - Reset Password" <${process.env.GMAIL_USER}>`,
            to: email,
            subject: 'Kode Reset Password - SAKTI PLN',
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
                        .content {
                            background: #f8fafc;
                            padding: 30px;
                            border: 1px solid #e2e8f0;
                            border-top: none;
                        }
                        .reset-code {
                            background: white;
                            border: 2px dashed #0284c7;
                            border-radius: 8px;
                            padding: 20px;
                            text-align: center;
                            margin: 20px 0;
                        }
                        .code {
                            font-size: 36px;
                            font-weight: bold;
                            color: #0284c7;
                            letter-spacing: 8px;
                            font-family: 'Courier New', monospace;
                        }
                        .warning {
                            background: #fef3c7;
                            border-left: 4px solid #f59e0b;
                            padding: 15px;
                            margin: 20px 0;
                            border-radius: 4px;
                        }
                        .footer {
                            background: #1e293b;
                            color: #94a3b8;
                            padding: 20px;
                            border-radius: 0 0 10px 10px;
                            text-align: center;
                            font-size: 12px;
                        }
                        .button {
                            display: inline-block;
                            background: #0284c7;
                            color: white;
                            padding: 12px 30px;
                            text-decoration: none;
                            border-radius: 6px;
                            margin: 10px 0;
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1 style="margin: 0;">🔐 Reset Password</h1>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">SAKTI - Sistem Arsip & Kontrak Terintegrasi</p>
                    </div>
                    
                    <div class="content">
                        <p>Halo, <strong>${companyName || 'Vendor'}</strong></p>
                        
                        <p>Kami menerima permintaan untuk mereset password akun Anda. Gunakan kode berikut untuk melanjutkan proses reset password:</p>
                        
                        <div class="reset-code">
                            <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">KODE RESET PASSWORD</p>
                            <div class="code">${resetToken}</div>
                            <p style="margin: 10px 0 0 0; color: #64748b; font-size: 12px;">Kode berlaku selama 30 menit</p>
                        </div>
                        
                        <div class="warning">
                            <strong>⚠️ Penting:</strong>
                            <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                                <li>Jangan bagikan kode ini kepada siapapun</li>
                                <li>Tim PLN tidak akan pernah meminta kode reset password Anda</li>
                                <li>Kode ini akan kedaluwarsa dalam 30 menit</li>
                            </ul>
                        </div>
                        
                        <p>Jika Anda tidak meminta reset password, abaikan email ini atau hubungi administrator.</p>
                        
                        <p style="margin-top: 30px;">
                            <strong>Langkah selanjutnya:</strong><br>
                            1. Kembali ke halaman reset password<br>
                            2. Masukkan kode di atas<br>
                            3. Buat password baru yang aman
                        </p>
                    </div>
                    
                    <div class="footer">
                        <p style="margin: 0;">
                            Email otomatis dari SAKTI PLN<br>
                            Jangan balas email ini
                        </p>
                        <p style="margin: 10px 0 0 0; opacity: 0.7;">
                            © ${new Date().getFullYear()} PLN - Perusahaan Listrik Negara
                        </p>
                    </div>
                </body>
                </html>
            `,
            text: `
Reset Password - SAKTI PLN

Halo, ${companyName || 'Vendor'}

Kami menerima permintaan untuk mereset password akun Anda.

KODE RESET PASSWORD: ${resetToken}

Kode berlaku selama 30 menit.

PENTING:
- Jangan bagikan kode ini kepada siapapun
- Tim PLN tidak akan pernah meminta kode reset password Anda
- Kode ini akan kedaluwarsa dalam 30 menit

Jika Anda tidak meminta reset password, abaikan email ini.

---
Email otomatis dari SAKTI PLN
© ${new Date().getFullYear()} PLN - Perusahaan Listrik Negara
            `.trim()
        }

        // Kirim email
        await transporter.sendMail(mailOptions)

        return NextResponse.json({
            success: true,
            message: 'Email berhasil dikirim'
        })

    } catch (error) {
        console.error('Error sending email:', error)
        return NextResponse.json(
            {
                success: false,
                error: 'Gagal mengirim email. Pastikan konfigurasi email sudah benar.'
            },
            { status: 500 }
        )
    }
}
