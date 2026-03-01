import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';
import { Readable } from 'stream';

export const dynamic = 'force-dynamic';


const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const TOKEN_PATH = path.join(process.cwd(), 'token.json');

// Google Drive Folder ID untuk menyimpan file PDF kontrak
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '14gA6lGqE0vmZ2vAxruZjmKu7mSHqw6jx';

function getDriveService() {
    let credentials;
    let token;

    // 1. Try Environment Variables
    if (process.env.GOOGLE_CREDENTIALS && process.env.GOOGLE_TOKEN) {
        try {
            credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
            token = JSON.parse(process.env.GOOGLE_TOKEN);
        } catch (e) {
            console.error('Error parsing credentials from environment variables:', e);
        }
    }

    // 2. Try Local Files if Env Vars failed or missing
    if (!credentials || !token) {
        if (fs.existsSync(CREDENTIALS_PATH) && fs.existsSync(TOKEN_PATH)) {
            credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf-8'));
            token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
        } else {
            throw new Error('Google Drive credentials/token not found in environment variables or local files.');
        }
    }

    // Check structure: keys might be in 'installed' or 'web'
    const keys = credentials.installed || credentials.web;
    if (!keys) throw new Error('Invalid credentials format');

    const { client_secret, client_id, redirect_uris } = keys;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    oAuth2Client.setCredentials(token);

    // Auto-refresh token mechanism
    // Event listener ini akan dipanggil otomatis oleh googleapis saat token expired
    oAuth2Client.on('tokens', (tokens) => {
        console.log('🔄 Token refreshed automatically');

        // Update token object dengan token baru
        if (tokens.refresh_token) {
            token.refresh_token = tokens.refresh_token;
        }

        if (tokens.access_token) {
            token.access_token = tokens.access_token;
        }

        if (tokens.expiry_date) {
            token.expiry_date = tokens.expiry_date;
        }

        // Simpan ke file jika menggunakan local file storage
        if (fs.existsSync(TOKEN_PATH)) {
            try {
                fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
                console.log('✅ New token saved to token.json');
            } catch (error) {
                console.error('❌ Failed to save refreshed token:', error);
            }
        }

        // Jika menggunakan environment variables, log untuk manual update
        if (process.env.GOOGLE_TOKEN) {
            console.log('⚠️ Using env vars - please update GOOGLE_TOKEN with new token:');
            console.log(JSON.stringify(token));
        }
    });

    return google.drive({ version: 'v3', auth: oAuth2Client });
}

export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file');

        if (!file) {
            throw new Error('No file uploaded.');
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const stream = Readable.from(buffer);

        const drive = getDriveService();

        // Metadata file dengan folder parent
        const fileMetadata = {
            name: file.name,
            parents: [DRIVE_FOLDER_ID], // Upload ke folder spesifik
        };

        const media = {
            mimeType: file.type,
            body: stream,
        };

        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, name, webViewLink, webContentLink',
        });

        // Set permission agar file bisa diakses dengan link
        await drive.permissions.create({
            fileId: response.data.id,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });

        console.log('File uploaded:', response.data.name, '| ID:', response.data.id);

        return NextResponse.json({ success: true, file: response.data });
    } catch (err) {
        console.error('UPLOAD ERROR:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
