/**
 * Test Script untuk Google Drive Upload API
 * 
 * Cara menjalankan:
 * 1. Pastikan server development berjalan: npm run dev
 * 2. Jalankan script ini: node scripts/test-upload-api.js
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const fetch = require('node-fetch');

// Konfigurasi
const API_URL = 'http://localhost:3000/api/upload-contract';
const TEST_PDF_PATH = path.join(__dirname, 'test-contract.pdf');

/**
 * Create dummy PDF file for testing
 */
function createTestPDF() {
    // Create simple PDF structure
    const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test Contract PDF) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000317 00000 n
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
410
%%EOF`;

    fs.writeFileSync(TEST_PDF_PATH, pdfContent);
    console.log('✅ Test PDF created:', TEST_PDF_PATH);
}

/**
 * Test upload functionality
 */
async function testUpload() {
    try {
        console.log('\n🚀 Starting upload test...\n');

        // Create test PDF if not exists
        if (!fs.existsSync(TEST_PDF_PATH)) {
            createTestPDF();
        }

        // Create FormData
        const formData = new FormData();
        formData.append('file', fs.createReadStream(TEST_PDF_PATH), {
            filename: 'test-contract.pdf',
            contentType: 'application/pdf'
        });
        formData.append('tipeAnggaran', 'AI');
        formData.append('namaKontrak', 'Test Contract Upload');
        formData.append('nomorKontrak', 'TEST-2025-001');
        formData.append('contractId', 'test-contract-id-123');

        console.log('📤 Uploading file to:', API_URL);
        console.log('📋 Upload data:');
        console.log('   - Tipe Anggaran: AI');
        console.log('   - Nama Kontrak: Test Contract Upload');
        console.log('   - Nomor Kontrak: TEST-2025-001');
        console.log('   - File:', path.basename(TEST_PDF_PATH));
        console.log('\n⏳ Uploading...\n');

        // Send request
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData,
            headers: formData.getHeaders()
        });

        const result = await response.json();

        if (response.ok) {
            console.log('✅ Upload successful!\n');
            console.log('📊 Response:');
            console.log(JSON.stringify(result, null, 2));
            console.log('\n🔗 Google Drive Link:', result.data.webViewLink);
            console.log('📁 Folder Path:', result.data.folderPath);
            console.log('📄 File Name:', result.data.fileName);
        } else {
            console.log('❌ Upload failed!\n');
            console.log('Error:', result.error);
            if (result.details) {
                console.log('\nDetails:', result.details);
            }
        }

    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
        console.error('\nStack trace:', error.stack);
    }
}

/**
 * Test API info endpoint
 */
async function testApiInfo() {
    try {
        console.log('\n📡 Testing API info endpoint...\n');

        const response = await fetch(API_URL, {
            method: 'GET'
        });

        const result = await response.json();

        console.log('✅ API Info:');
        console.log(JSON.stringify(result, null, 2));

    } catch (error) {
        console.error('❌ API info test failed:', error.message);
    }
}

/**
 * Run all tests
 */
async function runTests() {
    console.log('╔════════════════════════════════════════════╗');
    console.log('║   Google Drive Upload API Test Script     ║');
    console.log('╚════════════════════════════════════════════╝');

    // Test 1: API Info
    await testApiInfo();

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 2: Upload
    await testUpload();

    console.log('\n' + '='.repeat(50));
    console.log('✨ All tests completed!');
    console.log('='.repeat(50) + '\n');

    // Cleanup
    if (fs.existsSync(TEST_PDF_PATH)) {
        fs.unlinkSync(TEST_PDF_PATH);
        console.log('🧹 Test PDF cleaned up\n');
    }
}

// Run tests
runTests();
