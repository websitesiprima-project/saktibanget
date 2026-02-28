const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');

async function testUpload() {
    try {
        // Load service account
        const saPath = path.join(__dirname, 'src', 'services', 'server', 'service-account.json');
        const sa = JSON.parse(fs.readFileSync(saPath, 'utf-8'));

        console.log('Service Account Email:', sa.client_email);
        console.log('Project ID:', sa.project_id);

        // Create auth
        const auth = new google.auth.JWT({
            email: sa.client_email,
            key: sa.private_key,
            scopes: ['https://www.googleapis.com/auth/drive'],
        });

        const drive = google.drive({ version: 'v3', auth });

        // Test 1: List files to check access
        console.log('\n--- Test 1: List files in root folder ---');
        const folderId = '13Fs3q3cQ30zIWFVzsOzNoCjeSKT5hc3w';
        try {
            const listResult = await drive.files.list({
                q: `'${folderId}' in parents and trashed=false`,
                fields: 'files(id, name, mimeType)',
                supportsAllDrives: true,
                includeItemsFromAllDrives: true,
            });
            console.log('Files found:', listResult.data.files?.length || 0);
            listResult.data.files?.forEach(f => {
                console.log(`  - ${f.name} (${f.mimeType}) [${f.id}]`);
            });
        } catch (err) {
            console.error('List error:', err.message);
            console.error('Error code:', err.code);
            console.error('Error details:', JSON.stringify(err.errors, null, 2));
        }

        // Test 2: Create a test folder
        console.log('\n--- Test 2: Create test folder ---');
        let testFolderId;
        try {
            const folderResult = await drive.files.create({
                requestBody: {
                    name: 'TEST_UPLOAD_DELETE_ME',
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [folderId],
                },
                fields: 'id',
                supportsAllDrives: true,
            });
            testFolderId = folderResult.data.id;
            console.log('Folder created:', testFolderId);
        } catch (err) {
            console.error('Create folder error:', err.message);
            console.error('Error code:', err.code);
            console.error('Error details:', JSON.stringify(err.errors, null, 2));
        }

        // Test 3: Upload a small test file
        console.log('\n--- Test 3: Upload test file ---');
        const targetFolder = testFolderId || folderId;
        try {
            const testContent = Buffer.from('Hello World - Test Upload');
            const stream = new Readable();
            stream.push(testContent);
            stream.push(null);

            const uploadResult = await drive.files.create({
                requestBody: {
                    name: 'test-upload.txt',
                    parents: [targetFolder],
                },
                media: {
                    mimeType: 'text/plain',
                    body: stream,
                },
                fields: 'id, webViewLink',
                supportsAllDrives: true,
            });
            console.log('Upload SUCCESS!');
            console.log('File ID:', uploadResult.data.id);
            console.log('Web Link:', uploadResult.data.webViewLink);

            // Clean up - delete test file
            await drive.files.delete({ fileId: uploadResult.data.id, supportsAllDrives: true });
            console.log('Test file deleted');
        } catch (err) {
            console.error('Upload error:', err.message);
            console.error('Error code:', err.code);
            console.error('Error status:', err.status);
            console.error('Error details:', JSON.stringify(err.errors, null, 2));
            if (err.response) {
                console.error('Response data:', JSON.stringify(err.response.data, null, 2));
            }
        }

        // Clean up test folder
        if (testFolderId) {
            try {
                await drive.files.delete({ fileId: testFolderId, supportsAllDrives: true });
                console.log('\nTest folder deleted');
            } catch (e) {
                console.log('\nCould not delete test folder:', e.message);
            }
        }

    } catch (error) {
        console.error('General error:', error.message);
        console.error('Full error:', error);
    }
}

testUpload();
