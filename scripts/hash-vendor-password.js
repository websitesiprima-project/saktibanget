/**
 * Helper Script: Hash Password untuk Vendor
 * 
 * Gunakan script ini untuk meng-hash password vendor secara manual
 * jika perlu update password di database.
 * 
 * CARA PAKAI:
 * 1. npm install crypto-js (jika belum)
 * 2. node scripts/hash-vendor-password.js
 * 3. Masukkan password yang ingin di-hash
 * 4. Copy hash yang dihasilkan
 * 5. Update ke database
 */

const CryptoJS = require('crypto-js');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const SALT = process.env.NEXT_PUBLIC_PASSWORD_SALT || 'sakti_pln_salt';

console.log('='.repeat(60));
console.log('VENDOR PASSWORD HASHER');
console.log('='.repeat(60));
console.log();

rl.question('Masukkan password yang ingin di-hash: ', (password) => {
    if (!password) {
        console.log('❌ Password tidak boleh kosong!');
        rl.close();
        return;
    }

    const hash = CryptoJS.SHA256(password + SALT).toString(CryptoJS.enc.Hex);

    console.log();
    console.log('='.repeat(60));
    console.log('HASIL HASH:');
    console.log('='.repeat(60));
    console.log();
    console.log('Password (plain text):', password);
    console.log('Salt yang digunakan:', SALT);
    console.log();
    console.log('Hash (SHA-256):');
    console.log(hash);
    console.log();
    console.log('Panjang hash:', hash.length, 'karakter (harus 64)');
    console.log();
    console.log('='.repeat(60));
    console.log('SQL QUERY untuk update database:');
    console.log('='.repeat(60));
    console.log();
    console.log(`UPDATE vendor_users`);
    console.log(`SET password = '${hash}'`);
    console.log(`WHERE email = 'GANTI_DENGAN_EMAIL_VENDOR';`);
    console.log();
    console.log('='.repeat(60));
    console.log('⚠️  PENTING:');
    console.log('1. Ganti "GANTI_DENGAN_EMAIL_VENDOR" dengan email vendor yang sebenarnya');
    console.log('2. Jalankan query di Supabase SQL Editor');
    console.log('3. Vendor bisa login dengan password:', password);
    console.log('='.repeat(60));
    console.log();

    rl.close();
});

// Handle Ctrl+C
rl.on('SIGINT', () => {
    console.log();
    console.log('❌ Dibatalkan');
    process.exit(0);
});
