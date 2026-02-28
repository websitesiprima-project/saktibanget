import { supabase } from '@/lib/supabaseClient';

export interface FileUploadResult {
    success: boolean;
    fileUrl?: string;
    fileName?: string;
    error?: string;
}

/**
 * Upload file PDF ke Supabase Storage
 * @param file - File PDF yang akan diupload
 * @param folderPath - Path folder di storage (default: 'surat-pengajuan')
 * @returns Promise dengan hasil upload
 */
export const uploadPDFToSupabase = async (
    file: File,
    folderPath: string = 'surat-pengajuan'
): Promise<FileUploadResult> => {
    try {
        // Validasi file
        if (!file) {
            return {
                success: false,
                error: 'File tidak ditemukan'
            };
        }

        // Validasi tipe file
        if (file.type !== 'application/pdf') {
            return {
                success: false,
                error: 'File harus berformat PDF'
            };
        }

        // Validasi ukuran file (max 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            return {
                success: false,
                error: 'Ukuran file maksimal 5MB'
            };
        }

        // Generate unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 8);
        const fileExt = file.name.split('.').pop();
        const fileName = `${timestamp}_${randomString}.${fileExt}`;
        const filePath = `${folderPath}/${fileName}`;

        // Upload file ke Supabase Storage
        const { data, error } = await supabase.storage
            .from('documents') // nama bucket di Supabase
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error('Supabase upload error:', error);
            return {
                success: false,
                error: `Upload gagal: ${error.message}. Pastikan bucket 'documents' sudah dibuat di Supabase Storage.`
            };
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('documents')
            .getPublicUrl(filePath);

        return {
            success: true,
            fileUrl: publicUrl,
            fileName: file.name
        };

    } catch (error: any) {
        console.error('Upload exception:', error);
        return {
            success: false,
            error: error.message || 'Terjadi kesalahan saat upload file'
        };
    }
};

/**
 * Download file dari Supabase Storage
 * @param fileUrl - URL file di Supabase
 * @param fileName - Nama file untuk disimpan
 */
export const downloadFileFromSupabase = async (
    fileUrl: string,
    fileName: string
): Promise<void> => {
    try {
        const response = await fetch(fileUrl);
        const blob = await response.blob();

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();

        // Cleanup
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Download error:', error);
        throw new Error('Gagal mendownload file');
    }
};

/**
 * Delete file dari Supabase Storage
 * @param fileUrl - URL file yang akan dihapus
 */
export const deleteFileFromSupabase = async (
    fileUrl: string
): Promise<{ success: boolean; error?: string }> => {
    try {
        // Extract file path from URL
        const urlParts = fileUrl.split('/');
        const bucketIndex = urlParts.findIndex(part => part === 'documents');
        if (bucketIndex === -1) {
            return {
                success: false,
                error: 'URL file tidak valid'
            };
        }

        const filePath = urlParts.slice(bucketIndex + 1).join('/');

        const { error } = await supabase.storage
            .from('documents')
            .remove([filePath]);

        if (error) {
            return {
                success: false,
                error: error.message
            };
        }

        return { success: true };

    } catch (error: any) {
        return {
            success: false,
            error: error.message || 'Gagal menghapus file'
        };
    }
};
