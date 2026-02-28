/**
 * Script untuk generate Google Drive OAuth Token
 * 
 * Cara penggunaan:
 * 1. Pastikan file credentials.json ada di root project
 * 2. Jalankan: node scripts/generate-drive-token.js
 * 3. Buka URL yang muncul di browser
 * 4. Login dengan akun Google yang punya Drive
 * 5. Copy authorization code dan paste di terminal
 * 6. Token akan tersimpan di token.json
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Gunakan scope penuh untuk akses semua file & folder di Drive
const SCOPES = ['https://www.googleapis.com/auth/drive'];
const CREDENTIALS_PATH = path.join(process.cwd(), 'src', 'services', 'server', 'credentials.json');
const TOKEN_PATH = path.join(process.cwd(), 'src', 'services', 'server', 'token.json');

// Load credentials
function loadCredentials() {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
        console.error('❌ File credentials.json tidak ditemukan!');
        console.log('📝 Silakan rename file client_secret_*.json menjadi credentials.json');
        console.log('📁 Lokasi: root folder project');
        process.exit(1);
    }

    const content = fs.readFileSync(CREDENTIALS_PATH, 'utf-8');
    const credentials = JSON.parse(content);
    return credentials;
}

// Create OAuth2 client
function authorize(credentials) {
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    // Generate auth URL
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });

    console.log('\n🔐 Authorize this app by visiting this URL:\n');
    console.log('👉', authUrl);
    console.log('\n');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    rl.question('📋 Enter the authorization code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) {
                console.error('❌ Error retrieving access token:', err);
                return;
            }

            // Save token
            fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
            console.log('\n✅ Token berhasil disimpan ke token.json');
            console.log('✅ Upload ke Google Drive sekarang sudah bisa digunakan!');
            console.log('\n📝 Jangan lupa:');
            console.log('   1. Tambahkan token.json ke .gitignore');
            console.log('   2. Untuk production, simpan credentials di environment variables');
        });
    });
}

// Main
console.log('🚀 Google Drive Token Generator\n');
const credentials = loadCredentials();
authorize(credentials);
