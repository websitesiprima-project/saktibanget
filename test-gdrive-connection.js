/**
 * Script untuk test koneksi Google Drive API
 * Jalankan dengan: node test-gdrive-connection.js
 */

const { google } = require('googleapis');
const path = require('path');

// GANTI dengan nama file service account Anda
const SERVICE_ACCOUNT_FILE = 'service-account.json';

// GANTI dengan ID folder Google Drive Anda
const FOLDER_ID = '15qEM_lIuA09Mm63h9kGKG9VzfWyLVcSI';

async function testConnection() {
    try {
        console.log('🔍 Testing Google Drive connection...\n');

        // 1. Load service account
        const SERVICE_ACCOUNT_PATH = path.join(
            __dirname,
            'src',
            'services',
            'server',
            SERVICE_ACCOUNT_FILE
        );

        console.log('📁 Service Account Path:', SERVICE_ACCOUNT_PATH);

        const auth = new google.auth.GoogleAuth({
            keyFile: SERVICE_ACCOUNT_PATH,
            scopes: ['https://www.googleapis.com/auth/drive'],
        });

        const drive = google.drive({ version: 'v3', auth });

        // 2. Test: Get folder info
        console.log('\n🔍 Testing folder access...');
        console.log('Folder ID:', FOLDER_ID);

        const folderInfo = await drive.files.get({
            fileId: FOLDER_ID,
            fields: 'id, name, permissions',
        });

        console.log('✅ SUCCESS! Folder found:');
        console.log('  - Name:', folderInfo.data.name);
        console.log('  - ID:', folderInfo.data.id);

        // 3. Test: List files in folder
        console.log('\n📄 Listing files in folder...');
        const fileList = await drive.files.list({
            q: `'${FOLDER_ID}' in parents and trashed=false`,
            fields: 'files(id, name, mimeType)',
            pageSize: 10,
        });

        if (fileList.data.files && fileList.data.files.length > 0) {
            console.log('✅ Files found:', fileList.data.files.length);
            fileList.data.files.forEach((file, index) => {
                console.log(`  ${index + 1}. ${file.name} (${file.mimeType})`);
            });
        } else {
            console.log('📭 Folder is empty (this is OK)');
        }

        // 4. Test: Create a test file
        console.log('\n📝 Testing file creation...');

        const testFileMetadata = {
            name: 'TEST_CONNECTION_' + Date.now() + '.txt',
            parents: [FOLDER_ID],
            mimeType: 'text/plain',
        };

        const testFileMedia = {
            mimeType: 'text/plain',
            body: 'This is a test file created by PLN SAKTI system.\nIf you see this, the connection works!\n' + new Date().toISOString(),
        };

        const testFile = await drive.files.create({
            requestBody: testFileMetadata,
            media: testFileMedia,
            fields: 'id, name, webViewLink',
        });

        console.log('✅ Test file created successfully!');
        console.log('  - File ID:', testFile.data.id);
        console.log('  - File Name:', testFile.data.name);
        console.log('  - View Link:', testFile.data.webViewLink);

        console.log('\n🎉 ALL TESTS PASSED!');
        console.log('\n✅ Google Drive connection is working correctly!');
        console.log('You can now use the upload feature in your application.');

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);

        if (error.code === 403) {
            console.error('\n⚠️  PERMISSION DENIED!');
            console.error('\nPossible causes:');
            console.error('1. Service account email not added to folder sharing');
            console.error('2. Service account has "Viewer" permission instead of "Editor"');
            console.error('3. Folder ID is incorrect');
            console.error('\nSteps to fix:');
            console.error('1. Open Google Drive: https://drive.google.com/');
            console.error('2. Find folder "Berkas Kontrak"');
            console.error('3. Right-click > Share');
            console.error('4. Add service account email (found in JSON file: client_email)');
            console.error('5. Set permission to "Editor"');
            console.error('6. Uncheck "Notify people"');
            console.error('7. Click Share');
        } else if (error.code === 404) {
            console.error('\n⚠️  FOLDER NOT FOUND!');
            console.error('\nFolder ID:', FOLDER_ID);
            console.error('\nMake sure:');
            console.error('1. The folder exists in your Google Drive');
            console.error('2. The folder ID is correct');
            console.error('3. You\'re using the correct Google account');
        } else {
            console.error('\nFull error:', error);
        }

        process.exit(1);
    }
}

// Run test
testConnection();
