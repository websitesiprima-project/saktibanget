import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const userId = formData.get('userId') as string;

        if (!file || !userId) {
            return NextResponse.json({ success: false, error: 'File dan userId wajib diisi.' }, { status: 400 });
        }

        // Ensure the avatars bucket exists (create if not)
        const { data: buckets } = await supabaseAdmin.storage.listBuckets();
        const bucketExists = buckets?.some((b) => b.id === 'avatars');

        if (!bucketExists) {
            await supabaseAdmin.storage.createBucket('avatars', {
                public: true,
                fileSizeLimit: 2097152,
                allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
            });
        }

        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;
        const filePath = `profile-images/${fileName}`;

        // Convert File to ArrayBuffer for server-side upload
        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        // Upload using supabaseAdmin (bypasses RLS & bucket policies)
        const { error: uploadError } = await supabaseAdmin.storage
            .from('avatars')
            .upload(filePath, buffer, {
                contentType: file.type,
                cacheControl: '3600',
                upsert: false,
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            return NextResponse.json({ success: false, error: uploadError.message }, { status: 500 });
        }

        // Get public URL
        const { data: { publicUrl } } = supabaseAdmin.storage
            .from('avatars')
            .getPublicUrl(filePath);

        // Get user email from auth to satisfy NOT NULL constraint on INSERT
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
        const userEmail = authUser?.user?.email;

        // Build upsert payload
        const profilePayload: any = {
            id: userId,
            profile_image: publicUrl,
            updated_at: new Date().toISOString(),
        };
        if (userEmail) profilePayload.email = userEmail;

        // Upsert profile with new image URL
        const { error: dbError } = await supabaseAdmin
            .from('profiles')
            .upsert(profilePayload, { onConflict: 'id' });

        if (dbError) {
            console.error('DB update error:', dbError);
            return NextResponse.json({ success: false, error: dbError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, url: publicUrl, message: 'Foto profil berhasil diupload!' });
    } catch (error: any) {
        console.error('Profile upload route error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
    }
}
