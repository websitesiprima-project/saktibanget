'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Define types locally if not available globally yet
interface CreateAdminParams {
    email: string
    password?: string
    namaLengkap: string
    role: string
}

export async function createAdminUserAction(params: CreateAdminParams) {
    try {
        console.log(' Starting createAdminUserAction for:', params.email)

        // 1. Verify Authentication & Authorization
        // TODO: Implement proper session validation.

        const { email, password, namaLengkap, role } = params

        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return { success: false, error: 'Server misconfiguration: Service Role Key missing' }
        }

        // 2. Create User using Admin Client
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto confirm email
            user_metadata: {
                full_name: namaLengkap,
                role: role
            }
        })

        if (authError) {
            console.error(' Failed to create user in Auth:', authError)
            return { success: false, error: authError.message }
        }

        if (!authData.user) {
            return { success: false, error: 'Failed to create user (No data returned)' }
        }

        const newUserId = authData.user.id
        console.log(' User created in Auth:', newUserId)

        // 3. Create Profile in 'profiles' table
        // The trigger might auto-create it, but we should ensure data is correct.
        // Let's update/upsert it.
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: newUserId,
                email,
                full_name: namaLengkap,
                role,
                status: 'Aktif',
                updated_at: new Date().toISOString()
            })

        if (profileError) {
            console.error(' Failed to create profile:', profileError)
            // If profile creation fails, we might want to delete the auth user to keep consistency?
            // Or just return error.
            return { success: false, error: 'User created but failed to save profile: ' + profileError.message }
        }

        console.log(' Profile created successfully')

        // 4. Log to Audit Logs
        // We can log this as 'System' or try to get the real actor if we could.
        await supabaseAdmin.from('audit_logs').insert({
            action: `Menambah user baru (via Admin): ${namaLengkap} - Role: ${role}`,
            details: { email, role, created_by_server_action: true },
            created_at: new Date().toISOString()
        })

        return {
            success: true,
            message: 'User berhasil dibuat dengan password yang ditentukan!',
            data: { id: newUserId, ...params }
        }

    } catch (error: any) {
        console.error('Unexpected error in createAdminUserAction:', error)
        return { success: false, error: error.message || 'Internal Server Error' }
    }
}
