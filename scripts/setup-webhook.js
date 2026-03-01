/**
 * Script untuk setup Telegram Webhook
 * 
 * Cara pakai:
 *   node scripts/setup-webhook.js set https://URL-NGROK-ATAU-DOMAIN.com
 *   node scripts/setup-webhook.js info
 *   node scripts/setup-webhook.js delete
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// Baca .env.development secara manual
function loadEnv(filePath) {
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf-8');
    content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex === -1) return;
        const key = trimmed.substring(0, eqIndex).trim();
        const val = trimmed.substring(eqIndex + 1).trim();
        if (!process.env[key]) process.env[key] = val;
    });
}

loadEnv(path.join(__dirname, '..', '.env.development'));
loadEnv(path.join(__dirname, '..', '.env'));

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

if (!BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN tidak ditemukan di .env.development');
    process.exit(1);
}

const BASE_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const [, , action, url] = process.argv;

async function apiFetch(endpoint, body) {
    const fullUrl = `${BASE_API}/${endpoint}`;
    const isHttps = fullUrl.startsWith('https');
    const lib = isHttps ? https : http;
    const urlObj = new URL(fullUrl);

    const postData = body ? JSON.stringify(body) : null;

    return new Promise((resolve, reject) => {
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname,
            method: body ? 'POST' : 'GET',
            headers: body ? {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            } : {}
        };

        const req = lib.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });

        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
    });
}

async function setWebhook(webhookUrl) {
    const fullUrl = `${webhookUrl}/api/telegram/webhook`;
    console.log(`\n⏳ Mendaftarkan webhook ke: ${fullUrl}`);

    const data = await apiFetch('setWebhook', { url: fullUrl });
    if (data.ok) {
        console.log(`✅ Webhook berhasil didaftarkan!`);
        console.log(`   URL: ${fullUrl}`);
    } else {
        console.error(`❌ Gagal:`, data.description);
    }
}

async function getWebhookInfo() {
    console.log('\n⏳ Mengecek status webhook...');
    const data = await apiFetch('getWebhookInfo');

    if (data.ok) {
        const info = data.result;
        console.log('\n📡 Webhook Info:');
        console.log(`   URL         : ${info.url || '(kosong - belum didaftarkan)'}`);
        console.log(`   Pending     : ${info.pending_update_count}`);
        console.log(`   Last Error  : ${info.last_error_message || 'tidak ada'}`);
        console.log(`   Max Conn    : ${info.max_connections}`);
    } else {
        console.error('❌ Gagal cek webhook:', data.description);
    }
}

async function deleteWebhook() {
    console.log('\n⏳ Menghapus webhook...');
    const data = await apiFetch('deleteWebhook', {});
    if (data.ok) {
        console.log('✅ Webhook berhasil dihapus!');
    } else {
        console.error('❌ Gagal hapus webhook:', data.description);
    }
}

(async () => {
    if (action === 'set') {
        if (!url) {
            console.error('❌ Masukkan URL! Contoh:\n   node scripts/setup-webhook.js set https://abc123.ngrok-free.app');
            process.exit(1);
        }
        await setWebhook(url.replace(/\/$/, ''));
    } else if (action === 'info') {
        await getWebhookInfo();
    } else if (action === 'delete') {
        await deleteWebhook();
    } else {
        console.log(`
📖 Cara pakai:

  Set webhook (ngrok/domain):
    node scripts/setup-webhook.js set https://abc123.ngrok-free.app

  Set webhook (Hostinger/production):
    node scripts/setup-webhook.js set https://namadomain.com

  Cek status webhook:
    node scripts/setup-webhook.js info

  Hapus webhook:
    node scripts/setup-webhook.js delete
        `);
    }
})();
