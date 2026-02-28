/**
 * ============================================================
 * Script untuk mendapatkan Google OAuth2 Refresh Token
 * ============================================================
 *
 * PRASYARAT:
 *  1. Buka https://console.cloud.google.com
 *  2. Pilih project "sakti-488613"
 *  3. Masuk ke "APIs & Services" > "Credentials"
 *  4. Klik "+ CREATE CREDENTIALS" > "OAuth client ID"
 *     - Application type: "Desktop app"
 *     - Name: "vlaas-pln-drive"
 *  5. Download JSON → salin nilai client_id dan client_secret ke bawah
 *     atau isi dulu di .env sebelum menjalankan script ini.
 *  6. Pastikan Google Drive API sudah diaktifkan di project.
 *
 * CARA MENJALANKAN:
 *  node scripts/get-google-refresh-token.js
 *
 * SETELAH MENDAPAT TOKEN:
 *  Salin ketiga nilai berikut ke file .env:
 *    GOOGLE_OAUTH_CLIENT_ID=...
 *    GOOGLE_OAUTH_CLIENT_SECRET=...
 *    GOOGLE_OAUTH_REFRESH_TOKEN=...
 * ============================================================
 */

'use strict';

const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// ── Baca dari .env jika ada ──────────────────────────────────
function loadEnv() {
    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) return;
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx < 0) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
    }
}
loadEnv();

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';
const REDIRECT_URI = 'http://localhost:3333/oauth2callback';
const SCOPES = ['https://www.googleapis.com/auth/drive'];

async function promptInput(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(question, (answer) => { rl.close(); resolve(answer.trim()); });
    });
}

async function main() {
    // Jika belum ada di env, minta input manual
    let clientId = CLIENT_ID;
    let clientSecret = CLIENT_SECRET;

    if (!clientId) {
        clientId = await promptInput('Masukkan GOOGLE_OAUTH_CLIENT_ID   : ');
    }
    if (!clientSecret) {
        clientSecret = await promptInput('Masukkan GOOGLE_OAUTH_CLIENT_SECRET: ');
    }

    if (!clientId || !clientSecret) {
        console.error('\n❌  Client ID atau Client Secret kosong. Batalkan.');
        process.exit(1);
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent',   // pastikan selalu dapat refresh_token
    });

    console.log('\n============================================================');
    console.log('1. Browser akan terbuka untuk proses otorisasi.');
    console.log('   Jika browser tidak terbuka, buka URL berikut secara manual:\n');
    console.log('   ' + authUrl);
    console.log('============================================================\n');

    // Coba buka browser (opsional - tidak error jika package 'open' tidak terinstall)
    try {
        let openFn;
        try { openFn = require('open'); } catch (_) { }
        if (openFn) {
            const fn = openFn.default || openFn;
            await Promise.resolve(fn(authUrl));
        }
    } catch (_) {
        // Abaikan – user buka URL secara manual
    }

    // Jalankan web server lokal untuk menangkap callback
    let refreshToken = '';
    await new Promise((resolve) => {
        const server = http.createServer(async (req, res) => {
            const parsedUrl = url.parse(req.url, true);
            if (!parsedUrl.pathname.includes('oauth2callback')) {
                res.end('Not found');
                return;
            }

            const code = parsedUrl.query.code;
            if (!code) {
                res.end('<h2>Authorization failed. Tutup tab ini.</h2>');
                server.close();
                resolve();
                return;
            }

            try {
                const { tokens } = await oauth2Client.getToken(code);
                refreshToken = tokens.refresh_token || '';

                res.end('<h2>✅ Berhasil! Tutup tab ini dan kembali ke terminal.</h2>');
                console.log('\n✅  Otorisasi berhasil!\n');
                console.log('════════════════════════════════════════════════════════════');
                console.log('Tambahkan baris berikut ke file .env Anda:\n');
                console.log(`GOOGLE_OAUTH_CLIENT_ID=${clientId}`);
                console.log(`GOOGLE_OAUTH_CLIENT_SECRET=${clientSecret}`);
                console.log(`GOOGLE_OAUTH_REFRESH_TOKEN=${refreshToken}`);
                console.log('════════════════════════════════════════════════════════════\n');

                // Otomatis tulis ke .env jika belum ada
                const envPath = path.join(__dirname, '..', '.env');
                if (fs.existsSync(envPath)) {
                    let envContent = fs.readFileSync(envPath, 'utf-8');
                    const upsert = (key, value) => {
                        if (envContent.includes(key + '=')) {
                            envContent = envContent.replace(new RegExp(`${key}=.*`), `${key}=${value}`);
                        } else {
                            envContent += `\n${key}=${value}`;
                        }
                    };
                    upsert('GOOGLE_OAUTH_CLIENT_ID', clientId);
                    upsert('GOOGLE_OAUTH_CLIENT_SECRET', clientSecret);
                    upsert('GOOGLE_OAUTH_REFRESH_TOKEN', refreshToken);
                    fs.writeFileSync(envPath, envContent, 'utf-8');
                    console.log('✅  .env telah diperbarui secara otomatis!\n');
                }
            } catch (err) {
                console.error('❌  Gagal menukar authorization code:', err.message);
                res.end('<h2>❌ Gagal. Cek terminal untuk detail.</h2>');
            }

            server.close();
            resolve();
        });

        server.listen(3333, () => {
            console.log('⏳  Menunggu otorisasi di http://localhost:3333 ...');
        });
    });

    if (!refreshToken) {
        console.error('❌  Refresh token tidak diterima. Pastikan akun sudah memberikan izin.');
        process.exit(1);
    }
}

main().catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
});
