import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hashPassword } from '../../../lib/passwordUtils'

export const dynamic = 'force-dynamic';

// Create a separate Supabase client with service role for admin operations
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
)


export async function POST(request: NextRequest) {
    try {
        const { token, password } = await request.json()

        if (!token || !password) {
            return NextResponse.json(
                { success: false, error: 'Token dan password harus diisi' },
                { status: 400 }
            )
        }

        // Validate password
        if (password.length < 8) {
            return NextResponse.json(
                { success: false, error: 'Password minimal 8 karakter' },
                { status: 400 }
            )
        }

        // Find vendor with this activation token
        const { data: vendor, error: fetchError } = await supabaseAdmin
            .from('vendor_users')
            .select('*')
            .eq('activation_token', token)
            .single()

        console.log('🔍 Token lookup result:', {
            token: token.substring(0, 10) + '...',
            found: !!vendor,
            error: fetchError?.message
        })

        if (fetchError || !vendor) {
            console.error('❌ Vendor not found with token:', fetchError)
            return NextResponse.json(
                { success: false, error: 'Link aktivasi tidak valid atau sudah tidak berlaku' },
                { status: 400 }
            )
        }

        console.log('✅ Vendor found:', {
            email: vendor.email,
            isActivated: vendor.is_activated,
            tokenExpires: vendor.activation_token_expires
        })

        // Check if already activated
        if (vendor.is_activated) {
            return NextResponse.json(
                { success: false, error: 'Akun sudah diaktifkan sebelumnya' },
                { status: 400 }
            )
        }

        // Check if token expired
        const tokenExpires = new Date(vendor.activation_token_expires)
        if (tokenExpires < new Date()) {
            return NextResponse.json(
                { success: false, error: 'Link aktivasi sudah kadaluarsa' },
                { status: 400 }
            )
        }

        // Hash the password
        const hashedPassword = hashPassword(password)

        // Update vendor: set password, mark as activated, clear token
        const { error: updateError } = await supabaseAdmin
            .from('vendor_users')
            .update({
                password: hashedPassword,
                is_activated: true,
                activated_at: new Date().toISOString(),
                activation_token: null, // Clear token after use
                activation_token_expires: null,
                status: 'Aktif' // Change status from 'Menunggu Aktivasi' to 'Aktif'
            })
            .eq('id', vendor.id)

        if (updateError) {
            console.error('Error updating vendor:', updateError)
            return NextResponse.json(
                { success: false, error: 'Gagal mengaktifkan akun' },
                { status: 500 }
            )
        }

        // Also update the vendors table to mark as claimed
        const { error: vendorsUpdateError } = await supabaseAdmin
            .from('vendors')
            .update({
                is_claimed: true,
                claimed_at: new Date().toISOString(),
                claimed_by_user_id: vendor.id,
                status: 'Aktif'
            })
            .eq('email', vendor.email)

        if (vendorsUpdateError) {
            console.error('Error updating vendors table:', vendorsUpdateError)
            // Don't fail the activation, just log it
        }

        console.log('✅ Vendor account activated:', vendor.email)

        return NextResponse.json({
            success: true,
            message: 'Akun berhasil diaktifkan',
            data: {
                email: vendor.email,
                companyName: vendor.company_name
            }
        })
    } catch (error) {
        console.error('❌ Error activating vendor account:', error)
        return NextResponse.json({
            success: false,
            error: 'Terjadi kesalahan saat mengaktifkan akun'
        }, { status: 500 })
    }
}
