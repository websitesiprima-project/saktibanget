import { NextRequest, NextResponse } from 'next/server';
import { uploadContractPDF } from '@/services/googleDriveService';

export const runtime = 'nodejs';

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

        // Validasi input
        if (!file) {
            return NextResponse.json(
                { success: false, error: 'File tidak ditemukan' },
                { status: 400 }
            );
        }

        if (!tipeAnggaran || (tipeAnggaran !== 'AI' && tipeAnggaran !== 'AO')) {
            return NextResponse.json(
                { success: false, error: 'Tipe anggaran harus AI atau AO' },
                { status: 400 }
            );
        }

        if (!namaKontrak) {
            return NextResponse.json(
                { success: false, error: 'Nama kontrak tidak boleh kosong' },
                { status: 400 }
            );
        }

        // Validasi file type (hanya PDF)
        if (file.type !== 'application/pdf') {
            return NextResponse.json(
                { success: false, error: 'Hanya file PDF yang diperbolehkan' },
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
            tipeAnggaran,
            namaKontrak,
            nomorKontrak,
            contractId,
        });

        // Konversi File ke Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Generate nama file yang unik
        // Format: [NomorKontrak]_[timestamp].pdf
        const timestamp = Date.now();
        const sanitizedNomorKontrak = nomorKontrak?.replace(/[^a-zA-Z0-9-_]/g, '_') || 'kontrak';
        const fileName = `${sanitizedNomorKontrak}_${timestamp}.pdf`;

        // Upload ke Google Drive
        const uploadResult = await uploadContractPDF(
            buffer,
            fileName,
            tipeAnggaran as 'AI' | 'AO',
            namaKontrak
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
