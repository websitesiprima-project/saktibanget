/**
 * Test Script: Verify Password Hash
 * Quick test untuk verifikasi hash password vendor
 */

const CryptoJS = require('crypto-js');

const SALT = process.env.NEXT_PUBLIC_PASSWORD_SALT || 'sakti_pln_salt';
const testPassword = 'AA9usskAmwlv'; // Password dari email vendor

console.log('='.repeat(70));
console.log('TESTING PASSWORD HASH - FIX VENDOR LOGIN');
console.log('='.repeat(70));
console.log();

console.log('Password dari email:', testPassword);
console.log('Salt yang digunakan:', SALT);
console.log();

const hash = CryptoJS.SHA256(testPassword + SALT).toString(CryptoJS.enc.Hex);

console.log('Hash yang dihasilkan (crypto-js):');
console.log(hash);
console.log();
console.log('Panjang hash:', hash.length, 'karakter');
console.log();

console.log('='.repeat(70));
console.log('SQL QUERY untuk Update Database:');
console.log('='.repeat(70));
console.log();
console.log('UPDATE vendor_users');
console.log(`SET password = '${hash}'`);
console.log(`WHERE email = 'edwardbene07@gmail.com';`);
console.log();

console.log('='.repeat(70));
console.log('SETELAH UPDATE:');
console.log('='.repeat(70));
console.log('✅ Vendor bisa login dengan password: AA9usskAmwlv');
console.log();
