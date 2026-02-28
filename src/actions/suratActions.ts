'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { deleteFileFromSupabase } from '@/services/fileUploadService'

export async function deleteSuratAction(id: string, fileUrl?: string) {
    try {
        console.log(`Starting deleteSuratAction for id: ${id}`)

        // 1. Delete file from storage if exists (using Admin Client)
        // Note: deleteFileFromSupabase traditionally uses client-side supabase. 
        // If that fails due to RLS, we might need a server-side version.
        // For now, let's try standard delete, but if it fails we proceed.
        // Actually, let's just use supabaseAdmin for storage too to be safe.

        if (fileUrl && fileUrl !== 'EXPIRED' && fileUrl.includes('supabase')) {
            // Extract path from URL roughly or just pass full path if bucket is known
            // Usually fileUrl is full public URL. We need relative path.
            // Example: .../storage/v1/object/public/documents/filename.pdf
            const path = fileUrl.split('/storage/v1/object/public/documents/')[1];
            if (path) {
                const { error: storageError } = await supabaseAdmin
                    .storage
                    .from('documents')
                    .remove([decodeURIComponent(path)]);

                if (storageError) {
                    console.warn('Storage delete warning:', storageError);
                }
            }
        }

        // 2. Delete record from database using Admin Client
        const { error } = await supabaseAdmin
            .from('surat_pengajuan')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Delete database error:', error);
            return { success: false, error: error.message };
        }

        return { success: true, message: 'Surat berhasil dihapus' };

    } catch (error: any) {
        console.error('Unexpected error in deleteSuratAction:', error);
        return { success: false, error: error.message || 'Internal Server Error' };
    }
}
