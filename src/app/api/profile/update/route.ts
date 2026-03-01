import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { userId, namaLengkap, email, telepon, alamat, profile_image } = body;

        if (!userId) {
            return NextResponse.json({ success: false, error: 'userId wajib diisi.' }, { status: 400 });
        }

        // Get user email from auth to satisfy NOT NULL constraint on INSERT
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
        const authEmail = authUser?.user?.email;

        // Build update payload — include email from auth or from request body
        const updateData: any = {
            id: userId,
            updated_at: new Date().toISOString(),
        };

        // Always include email to avoid NOT NULL violation on upsert-insert
        if (email) updateData.email = email;
        else if (authEmail) updateData.email = authEmail;

        if (namaLengkap !== undefined) updateData.full_name = namaLengkap;
        if (telepon !== undefined) updateData.phone = telepon;
        if (alamat !== undefined) updateData.address = alamat;
        if (profile_image !== undefined) updateData.profile_image = profile_image;

        // Upsert so it creates the row if it doesn't exist
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .upsert(updateData, { onConflict: 'id' })
            .select();

        if (error) {
            console.error('Profile update error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        // Update email in auth if changed
        if (email && email !== authEmail) {
            const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(userId, { email });
            if (emailError) {
                console.warn('Email update warning:', emailError.message);
                // Non-fatal — continue
            }
        }

        return NextResponse.json({ success: true, data: data?.[0], message: 'Profil berhasil diperbarui!' });
    } catch (error: any) {
        console.error('Profile update route error:', error);
        return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
    }
}
