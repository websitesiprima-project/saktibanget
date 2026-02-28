/**
 * Test Email Verification System
 * Run: node test-email-verification.js
 */

const nodemailer = require('nodemailer');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

async function testEmailVerification() {
    console.log('🧪 Testing Email Verification System...\n');

    // Check environment variables
    console.log('📋 Checking environment variables:');
    console.log('GMAIL_USER:', process.env.GMAIL_USER || '❌ NOT SET');
    console.log('GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? '✅ SET' : '❌ NOT SET');
    console.log('');

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        console.error('❌ ERROR: Email credentials not configured in .env.local');
        console.log('\n💡 Setup guide:');
        console.log('1. Create .env.local file in project root');
        console.log('2. Add these variables:');
        console.log('   GMAIL_USER=your-email@gmail.com');
        console.log('   GMAIL_APP_PASSWORD=your-16-char-app-password');
        console.log('3. Get App Password from: https://myaccount.google.com/apppasswords');
        return;
    }

    try {
        // Create transporter
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_APP_PASSWORD,
            },
        });

        // Test connection
        console.log('🔌 Testing SMTP connection...');
        await transporter.verify();
        console.log('✅ SMTP connection successful!\n');

        // Generate test verification code
        const testCode = Math.floor(100000 + Math.random() * 900000).toString();
        console.log('🔐 Generated test verification code:', testCode);

        // Send test email
        console.log('\n📧 Sending test verification email...');
        const testEmail = process.env.GMAIL_USER; // Send to yourself for testing

        const mailOptions = {
            from: `"SAKTI PLN - Test Verification" <${process.env.GMAIL_USER}>`,
            to: testEmail,
            subject: '🧪 TEST - Kode Verifikasi Registrasi Vendor',
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
                        .test-badge {
                            background: #fef3c7;
                            border: 2px solid #f59e0b;
                            color: #92400e;
                            padding: 10px 20px;
                            border-radius: 20px;
                            font-weight: bold;
                            display: inline-block;
                            margin-bottom: 20px;
                        }
                        .footer {
                            background: #f9fafb;
                            padding: 20px;
                            text-align: center;
                            font-size: 12px;
                            color: #6b7280;
                            border-radius: 0 0 10px 10px;
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="logo">⚡ SAKTI PLN</div>
                        <p>Sistem Arsip & Kontrak Terintegrasi</p>
                    </div>
                    
                    <div class="content">
                        <div class="test-badge">🧪 TEST EMAIL - Ini adalah email testing</div>
                        
                        <h2>Test Email Verification</h2>
                        
                        <p>Ini adalah test email untuk memastikan sistem email verification berjalan dengan baik.</p>
                        
                        <div class="verification-box">
                            <p style="margin: 0; color: #6b7280;">Kode Verifikasi Test:</p>
                            <div class="verification-code">${testCode}</div>
                        </div>
                        
                        <p>✅ Jika Anda menerima email ini, berarti:</p>
                        <ul>
                            <li>SMTP Gmail berhasil dikonfigurasi</li>
                            <li>Email credentials valid</li>
                            <li>Sistem siap untuk production</li>
                        </ul>
                    </div>
                    
                    <div class="footer">
                        <p><strong>PLN SAKTI - Test Email</strong></p>
                        <p>Email ini dikirim secara otomatis untuk testing.</p>
                        <p>© ${new Date().getFullYear()} PT PLN (Persero). All rights reserved.</p>
                    </div>
                </body>
                </html>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Test email sent successfully!');
        console.log('📬 Message ID:', info.messageId);
        console.log('📨 Sent to:', testEmail);
        console.log('\n💡 Please check your inbox/spam folder!');
        console.log('\n✅ Email verification system is working correctly!');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.log('\n🔧 Troubleshooting steps:');
        console.log('1. Check your Gmail credentials in .env.local');
        console.log('2. Make sure you use App Password, not regular password');
        console.log('3. Enable 2-Step Verification in Google Account');
        console.log('4. Generate new App Password: https://myaccount.google.com/apppasswords');
        console.log('5. Check if your firewall allows SMTP (port 587/465)');
    }
}

// Run test
testEmailVerification();
