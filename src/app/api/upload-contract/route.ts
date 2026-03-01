import { NextRequest, NextResponse } from 'next/server';
import { uploadContractPDF } from '@/services/googleDriveService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';


// Konfigurasi untuk mengizinkan upload file besar
export const config = {
    api: {
        bodyParser: false,
    },
};

export async function POST(request: NextRequest) {
    try {
        // Ambil FormData dari request
        const formData = await request.formData();

        // Ambil file dari FormData
        const file = formData.get('file') as File | null;
        const tipeAnggaran = formData.get('tipeAnggaran') as string;
        const namaKontrak = formData.get('namaKontrak') as string;
        const nomorKontrak = formData.get('nomorKontrak') as string;
        const contractId = formData.get('contractId') as string;
        const subFolder = (formData.get('subFolder') as string) || undefined;

        // Validasi input
        if (!file) {
            return NextResponse.json(
                { success: false, error: 'File tidak ditemukan' },
                { status: 400 }
            );
        }

        if (!tipeAnggaran) {
            return NextResponse.json(
                { success: false, error: 'Tipe anggaran tidak boleh kosong' },
                { status: 400 }
            );
        }

        if (!namaKontrak) {
            return NextResponse.json(
                { success: false, error: 'Nama kontrak tidak boleh kosong' },
                { status: 400 }
            );
        }

        // Validasi file type — izinkan PDF, Word, Excel, gambar, dan ZIP
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/jpeg',
            'image/png',
            'image/jpg',
            'application/zip',
            'application/x-zip-compressed',
        ];
        // Jika tipe tidak dikenali (empty string terjadi di beberapa browser), lanjutkan saja
        if (file.type && !allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { success: false, error: `Tipe file tidak diizinkan: ${file.type}. Gunakan PDF, Word, Excel, atau gambar.` },
                { status: 400 }
            );
        }

        // Validasi ukuran file (maksimal 50MB)
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
            return NextResponse.json(
                { success: false, error: 'Ukuran file maksimal 50MB' },
                { status: 400 }
            );
        }

        console.log('Upload request received:', {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            tipeAnggaran,
            namaKontrak,
            nomorKontrak,
            contractId,
        });

        // Konversi File ke Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Generate nama file unik, pertahankan ekstensi asli
        const timestamp = Date.now();
        const originalExt = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : 'pdf';
        const sanitizedNomorKontrak = nomorKontrak?.replace(/[^a-zA-Z0-9-_]/g, '_') || 'kontrak';
        const fileName = `${sanitizedNomorKontrak}_${timestamp}.${originalExt}`;
        const mimeType = file.type || 'application/octet-stream';

        // Upload ke Google Drive
        const uploadResult = await uploadContractPDF(
            buffer,
            fileName,
            tipeAnggaran,
            namaKontrak,
            subFolder,
            mimeType
        );

        console.log('Upload successful:', uploadResult);

        // Return response dengan detail upload
        return NextResponse.json({
            success: true,
            message: 'File berhasil diupload ke Google Drive',
            data: {
                fileId: uploadResult.fileId,
                webViewLink: uploadResult.webViewLink,
                folderPath: uploadResult.folderPath,
                fileName: fileName,
                contractId: contractId,
            },
        });

    } catch (error: any) {
        console.error('Error uploading contract:', error);

        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Terjadi kesalahan saat upload file',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            },
            { status: 500 }
        );
    }
}

// Optional: Endpoint untuk mendapatkan info upload
export async function GET(request: NextRequest) {
    return NextResponse.json({
        message: 'Upload Contract API',
        endpoints: {
            POST: {
                description: 'Upload PDF kontrak ke Google Drive',
                parameters: {
                    file: 'File PDF yang akan diupload',
                    tipeAnggaran: 'Tipe anggaran (AI atau AO)',
                    namaKontrak: 'Nama kontrak untuk folder',
                    nomorKontrak: 'Nomor kontrak (opsional, untuk nama file)',
                    contractId: 'ID kontrak di database (opsional)',
                },
            },
        },
        folderStructure: 'Berkas Kontrak > [AI/AO] > [Nama Kontrak] > [File PDF]',
    });
}
