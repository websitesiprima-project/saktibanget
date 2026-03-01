import { google } from 'googleapis';
import { Readable } from 'stream';
import path from 'path';
import fs from 'fs';

// Path ke Service Account credentials
const SERVICE_ACCOUNT_PATH = path.join(
    process.cwd(),
    'src',
    'services',
    'server',
    'service-account.json'
);

// Konstanta nama folder
const ROOT_FOLDER_NAME = 'Berkas Kontrak';
// ID folder Google Drive yang sudah di-share atau Shared Drive
const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || '';
const SCOPES = ['https://www.googleapis.com/auth/drive'];

/**
 * Inisialisasi Google Drive client.
 *
 * Strategi autentikasi (dipilih otomatis):
 *  1. OAuth2 Refresh Token  → prioritas utama, file tersimpan di Drive pengguna asli
 *     Butuh: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN
 *  2. Service Account JWT   → fallback, hanya cocok jika SA punya storage (mis. Workspace)
 *     Butuh: service-account.json, opsional GOOGLE_DRIVE_IMPERSONATE_EMAIL
 *
 * Kenapa OAuth2 lebih diutamakan?
 *   Service account GCP tidak memiliki storage Drive sendiri.
 *   Pembuatan folder berhasil (tidak pakai kuota) tetapi upload file gagal 403
 *   karena SA tidak punya kuota storage.
 *   OAuth2 dengan refresh token memakai storage akun Gmail/Workspace asli.
 */
export function getDriveClient() {
    try {
        // ── Pilihan 1: OAuth2 dengan Refresh Token ──────────────────────────
        const oauthClientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
        const oauthClientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
        const oauthRefreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;

        if (oauthClientId && oauthClientSecret && oauthRefreshToken) {
            console.log('Using OAuth2 credentials (refresh token) for Google Drive');

            const oauth2Client = new google.auth.OAuth2(
                oauthClientId,
                oauthClientSecret,
                'urn:ietf:wg:oauth:2.0:oob' // redirect URI untuk token offline
            );

            oauth2Client.setCredentials({
                refresh_token: oauthRefreshToken,
            });

            return google.drive({ version: 'v3', auth: oauth2Client });
        }

        // ── Pilihan 2: Service Account JWT ────────────────────────────────
        console.warn(
            '⚠️  OAuth2 credentials NOT configured. Falling back to Service Account.\n' +
            '    Service accounts have no Drive storage quota → upload will likely fail (403).\n' +
            '    Run: node scripts/get-google-refresh-token.js  to generate OAuth2 credentials.'
        );

        if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
            throw new Error(
                'service-account.json not found at: ' + SERVICE_ACCOUNT_PATH + '\n' +
                'Configure GOOGLE_OAUTH_CLIENT_ID / SECRET / REFRESH_TOKEN in .env, OR\n' +
                'download the Service Account JSON and save it to src/services/server/service-account.json'
            );
        }

        const serviceAccountKey = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8'));

        const authConfig: any = {
            email: serviceAccountKey.client_email,
            key: serviceAccountKey.private_key,
            scopes: SCOPES,
        };

        const impersonateEmail = process.env.GOOGLE_DRIVE_IMPERSONATE_EMAIL || '';
        if (impersonateEmail) {
            authConfig.subject = impersonateEmail;
            console.log(`Service Account impersonating: ${impersonateEmail}`);
        }

        const auth = new google.auth.JWT(authConfig);
        return google.drive({ version: 'v3', auth });

    } catch (error: any) {
        console.error('Error initializing Google Drive client:', error);
        throw new Error('Failed to initialize Google Drive client: ' + error.message);
    }
}

/**
 * Mencari folder berdasarkan nama dan parent folder ID
 */
export async function findFolderByName(
    folderName: string,
    parentFolderId?: string
): Promise<string | null> {
    const drive = getDriveClient();

    try {
        let query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;

        if (parentFolderId) {
            query += ` and '${parentFolderId}' in parents`;
        }

        const response = await drive.files.list({
            q: query,
            fields: 'files(id, name)',
            spaces: 'drive',
            includeItemsFromAllDrives: true,
            supportsAllDrives: true,
        });

        const folders = response.data.files;

        if (folders && folders.length > 0) {
            return folders[0].id || null;
        }

        return null;
    } catch (error) {
        console.error('Error finding folder:', error);
        throw new Error(`Failed to find folder: ${folderName}`);
    }
}

/**
 * Membuat folder baru di Google Drive
 */
export async function createFolder(
    folderName: string,
    parentFolderId?: string
): Promise<string> {
    const drive = getDriveClient();

    try {
        console.log(`Creating folder: ${folderName}`, { parentFolderId });

        const fileMetadata: any = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
        };

        if (parentFolderId) {
            fileMetadata.parents = [parentFolderId];
        }

        const response = await drive.files.create({
            requestBody: fileMetadata,
            fields: 'id',
            supportsAllDrives: true,
        });

        const folderId = response.data.id;

        if (!folderId) {
            throw new Error('Failed to get folder ID after creation');
        }

        console.log(`Folder created: ${folderName} (ID: ${folderId})`);
        return folderId;
    } catch (error: any) {
        console.error('Error creating folder:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            folderName,
            parentFolderId
        });

        let errorMessage = `Failed to create folder: ${folderName}`;

        if (error.code === 403) {
            errorMessage += '\n\n PERMISSION DENIED!\n\nService account tidak punya akses untuk membuat folder di Google Drive.\n\nSolusi:\n1. Buka Google Drive\n2. Buat folder "Berkas Kontrak" secara manual\n3. Share folder tersebut dengan service account email\n4. Set permission ke "Editor" atau "Content Manager"';
        }

        throw new Error(errorMessage);
    }
}

/**
 * Mendapatkan atau membuat folder (jika belum ada)
 */
export async function getOrCreateFolder(
    folderName: string,
    parentFolderId?: string
): Promise<string> {
    // Cek apakah folder sudah ada
    let folderId = await findFolderByName(folderName, parentFolderId);

    // Jika belum ada, buat folder baru
    if (!folderId) {
        folderId = await createFolder(folderName, parentFolderId);
    }

    return folderId;
}

/**
 * Setup struktur folder untuk kontrak
 * Struktur: Berkas Kontrak > [AI/AO] > [Nama Kontrak]
 */
export async function setupContractFolderStructure(
    tipeAnggaran: string,
    namaKontrak: string
): Promise<string> {
    try {
        // 1. Gunakan folder root yang sudah di-share (tidak perlu cari/buat baru)
        const rootFolderId = ROOT_FOLDER_ID;
        console.log(`Root folder ID: ${rootFolderId}`);

        // 2. Cari/buat folder tipe anggaran (AI/AO)
        const budgetFolderId = await getOrCreateFolder(tipeAnggaran, rootFolderId);
        console.log(`Budget folder (${tipeAnggaran}) ID: ${budgetFolderId}`);

        // 3. Cari/buat folder nama kontrak
        const contractFolderId = await getOrCreateFolder(namaKontrak, budgetFolderId);
        console.log(`Contract folder (${namaKontrak}) ID: ${contractFolderId}`);

        return contractFolderId;
    } catch (error: any) {
        console.error('Error setting up folder structure:', error);

        const actualMessage = error?.message || String(error);

        if (actualMessage.includes('PERMISSION DENIED') || error?.code === 403) {
            throw new Error(
                'Permission denied! Folder Google Drive belum di-share ke service account.\n' +
                'Solusi: Share folder Drive ke email: sakti-pln-uploader@sakti-488613.iam.gserviceaccount.com dengan akses Editor.'
            );
        }

        throw new Error('Failed to setup contract folder structure: ' + actualMessage);
    }
}

/**
 * Upload file ke Google Drive
 */
export async function uploadFileToDrive(
    file: Buffer,
    fileName: string,
    mimeType: string,
    folderId: string
): Promise<{ fileId: string; webViewLink: string }> {
    const drive = getDriveClient();

    try {
        console.log(`Uploading file to Drive:`, {
            fileName,
            mimeType,
            folderId,
            fileSize: file.length
        });

        const fileMetadata = {
            name: fileName,
            parents: [folderId],
        };

        // Konversi Buffer ke Stream
        const bufferStream = new Readable();
        bufferStream.push(file);
        bufferStream.push(null);

        const media = {
            mimeType: mimeType,
            body: bufferStream,
        };

        console.log('Calling Google Drive API...');

        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, webViewLink',
            supportsAllDrives: true,
        });

        console.log('Google Drive API response:', response.data);

        const fileId = response.data.id;

        if (!fileId) {
            throw new Error('Failed to get file ID after upload');
        }

        // Set permission agar file bisa diakses via webViewLink
        try {
            await drive.permissions.create({
                fileId: fileId,
                supportsAllDrives: true,
                requestBody: {
                    role: 'reader',
                    type: 'anyone',
                },
            });
        } catch (permError) {
            console.warn('Could not set file permission:', permError);
        }

        // Ambil webViewLink setelah permission di-set
        let webViewLink = response.data.webViewLink;
        if (!webViewLink) {
            webViewLink = `https://drive.google.com/file/d/${fileId}/view`;
        }

        console.log(`File uploaded: ${fileName} (ID: ${fileId})`);

        return {
            fileId,
            webViewLink,
        };
    } catch (error: any) {
        console.error('Error uploading file:', error);
        console.error('Error details:', {
            message: error.message,
            code: error.code,
            errors: error.errors,
            response: error.response?.data
        });

        // More detailed error message
        let errorMessage = `Failed to upload file: ${fileName}`;

        if (error.code === 403) {
            const errBody = JSON.stringify(error.response?.data || error.errors || {});
            if (errBody.includes('storageQuotaExceeded')) {
                errorMessage +=
                    '\n\n⚠️ STORAGE QUOTA EXCEEDED!\n\n' +
                    'Service Account tidak memiliki kuota penyimpanan Drive.\n\n' +
                    'SOLUSI (pilih salah satu):\n' +
                    '1. [DIREKOMENDASIKAN] Konfigurasi OAuth2 di .env:\n' +
                    '   – Jalankan: node scripts/get-google-refresh-token.js\n' +
                    '   – Isi GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN\n' +
                    '2. Gunakan Shared Drive (Team Drive) dan tambahkan SA sebagai Content Manager.';
            } else {
                errorMessage +=
                    '\n\n⚠️ PERMISSION DENIED!\n\n' +
                    'Service account tidak punya akses ke folder Google Drive.\n\n' +
                    'SOLUSI (pilih salah satu):\n' +
                    '1. [DIREKOMENDASIKAN] Konfigurasi OAuth2 di .env:\n' +
                    '   – Jalankan: node scripts/get-google-refresh-token.js\n' +
                    '   – Isi GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN\n' +
                    '2. Buka Google Drive > klik kanan folder > Share >\n' +
                    '   tambahkan sakti-pln-uploader@sakti-488613.iam.gserviceaccount.com sebagai Editor.';
            }
        } else if (error.code === 404) {
            errorMessage += `\n\n⚠️ Folder tidak ditemukan! Folder ID: ${folderId}`;
        } else if (error.message) {
            errorMessage += `\n\nDetail: ${error.message}`;
        }

        throw new Error(errorMessage);
    }
}

/**
 * Fungsi utama untuk upload kontrak PDF
 */
export async function uploadContractPDF(
    file: Buffer,
    fileName: string,
    tipeAnggaran: string,
    namaKontrak: string
): Promise<{ fileId: string; webViewLink: string; folderPath: string }> {
    try {
        // Setup struktur folder: Berkas Kontrak > AI/AO > Nama Kontrak
        const contractFolderId = await setupContractFolderStructure(tipeAnggaran, namaKontrak);

        // Upload file ke folder yang sesuai
        const uploadResult = await uploadFileToDrive(
            file,
            fileName,
            'application/pdf',
            contractFolderId
        );

        const folderPath = `Berkas Kontrak/${tipeAnggaran}/${namaKontrak}`;

        return {
            ...uploadResult,
            folderPath,
        };
    } catch (error) {
        console.error('Error in uploadContractPDF:', error);
        throw error;
    }
}

/**
 * Menghapus file dari Google Drive
 */
export async function deleteFileFromDrive(fileId: string): Promise<void> {
    const drive = getDriveClient();

    try {
        await drive.files.delete({
            fileId: fileId,
        });

        console.log(`File deleted: ${fileId}`);
    } catch (error) {
        console.error('Error deleting file:', error);
        throw new Error(`Failed to delete file: ${fileId}`);
    }
}

/**
 * Mendapatkan informasi file dari Google Drive
 */
export async function getFileInfo(fileId: string) {
    const drive = getDriveClient();

    try {
        const response = await drive.files.get({
            fileId: fileId,
            fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink',
        });

        return response.data;
    } catch (error) {
        console.error('Error getting file info:', error);
        throw new Error(`Failed to get file info: ${fileId}`);
    }
}
