import { supabase, handleSupabaseError, handleSupabaseSuccess } from '../lib/supabaseClient';

/**
 * User Management Service
 * Handles user profile, password, and admin operations
 */

// Upload profile image to Supabase Storage
export const uploadProfileImage = async (userId: string, file: File) => {
    try {
        // Validasi ukuran file (max 2MB)
        const maxSize = 2 * 1024 * 1024; // 2MB
        if (file.size > maxSize) {
            return handleSupabaseError({ message: 'Ukuran file terlalu besar. Maksimal 2MB' });
        }

        // Validasi tipe file
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return handleSupabaseError({ message: 'Tipe file tidak didukung. Gunakan JPG, PNG, GIF, atau WebP' });
        }

        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;
        const filePath = `profile-images/${fileName}`;

        // Upload file ke Supabase Storage bucket 'avatars'
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            console.error('Upload error:', uploadError);
            return handleSupabaseError(uploadError);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

        // Update profile dengan URL gambar
        const { data, error } = await supabase
            .from('profiles')
            .update({
                profile_image: publicUrl,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select();

        if (error) {
            console.error('Database update error:', error);
            return handleSupabaseError(error);
        }

        return handleSupabaseSuccess({ url: publicUrl }, 'Foto profil berhasil diupload!');
    } catch (error) {
        console.error('Upload profile image error:', error);
        return handleSupabaseError(error);
    }
};

// Delete old profile image from storage
export const deleteProfileImage = async (imageUrl: string) => {
    try {
        if (!imageUrl) return { success: true };

        // Extract file path from URL
        const urlParts = imageUrl.split('/avatars/');
        if (urlParts.length < 2) return { success: true };

        const filePath = urlParts[1];

        const { error } = await supabase.storage
            .from('avatars')
            .remove([filePath]);

        if (error) {
            console.warn('Failed to delete old image:', error);
            // Don't fail the whole operation if delete fails
        }

        return { success: true };
    } catch (error) {
        console.warn('Delete image error:', error);
        return { success: true };
    }
};

// Update user profile
export const updateProfile = async (userId: string, profileData: any) => {
    try {
        if (!userId || userId.trim() === '') {
            console.error('Update profile failed: Missing User ID');
            return handleSupabaseError({ message: 'User ID tidak valid (kosong). Silakan refresh halaman.' });
        }
        // First, update email if changed (requires auth update)
        if (profileData.email) {
            const { error: emailError } = await supabase.auth.updateUser({
                email: profileData.email
            });

            if (emailError) {
                console.warn('Email update error:', emailError);
                // Continue even if email update fails
            }
        }

        // Update profile data in profiles table
        // Use upsert to avoid RLS policy recursion issues
        const updateData: any = {
            full_name: profileData.namaLengkap,
            phone: profileData.telepon,
            address: profileData.alamat,
            updated_at: new Date().toISOString()
        };

        // Include profile_image if provided
        if (profileData.profile_image !== undefined) {
            updateData.profile_image = profileData.profile_image;
        }

        const { data, error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', userId)
            .select();

        if (error) {
            console.error('Profile update error details:', JSON.stringify(error, null, 2));
            console.error('Failed to update user:', userId);
            return handleSupabaseError(error);
        }

        if (!data || data.length === 0) {
            console.error('Update returned 0 rows. RLS blocking or ID mismatch. UserID:', userId);
            return handleSupabaseError({ message: 'Gagal update: Data tidak ditemukan atau akses ditolak.' });
        }

        return handleSupabaseSuccess(data[0], 'Profil berhasil diperbarui!');
    } catch (error) {
        console.error('Update profile catch error:', error);
        return handleSupabaseError(error);
    }
};

// Change password
export const changePassword = async (oldPassword: string, newPassword: string) => {
    try {
        // Verify old password by attempting to sign in
        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.email) {
            return { success: false, error: 'User not authenticated' };
        }

        // Re-authenticate with old password
        const { error: signInError } = await supabase.auth.signInWithPassword({
            email: user.email,
            password: oldPassword
        });

        if (signInError) {
            return handleSupabaseError({ message: 'Password lama tidak sesuai' });
        }

        // Update to new password
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) return handleSupabaseError(error);

        return handleSupabaseSuccess(null, 'Password berhasil diubah!');
    } catch (error) {
        return handleSupabaseError(error);
    }
};

// Send password reset email
export const sendPasswordResetEmail = async (email: string) => {
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`
        });

        if (error) return handleSupabaseError(error);

        return handleSupabaseSuccess(null, 'Email reset password telah dikirim!');
    } catch (error) {
        return handleSupabaseError(error);
    }
};

// Get user profile
export const getUserProfile = async (userId: string) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) return handleSupabaseError(error);

        return handleSupabaseSuccess(data);
    } catch (error) {
        return handleSupabaseError(error);
    }
};

// Get all admin users (Super Admin only)
export const getAllAdminUsers = async () => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, email, role, status, last_login, created_at')
            .in('role', ['Super Admin', 'Verifikator', 'Admin'])
            .order('created_at', { ascending: false });

        if (error) {
            console.warn('Error getting admin users - table may not exist');
            return handleSupabaseSuccess([], 'Tabel profiles belum dikonfigurasi');
        }

        return handleSupabaseSuccess(data || []);
    } catch (error) {
        console.warn('Error in getAllAdminUsers - using empty array fallback');
        return handleSupabaseSuccess([], 'Error loading users');
    }
};

// Create new admin user
export const createAdminUser = async (userData: any) => {
    try {
        // Note: admin.createUser requires service_role key, not anon key
        // For now, use regular signup and handle in backend
        const tempPassword = generateRandomPassword();

        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: userData.email,
            password: tempPassword,
            options: {
                data: {
                    full_name: userData.namaLengkap,
                    role: userData.role
                }
            }
        });

        if (authError) return handleSupabaseError(authError);

        if (!authData.user) {
            return handleSupabaseError('Failed to create user');
        }

        // Create profile (might be auto-created by trigger)
        const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .upsert([{
                id: authData.user.id,
                email: userData.email,
                full_name: userData.namaLengkap,
                role: userData.role,
                status: 'Aktif'
            }])
            .select()
            .single();

        if (profileError) {
            console.warn('Profile insert warning:', profileError);
        }

        if (profileError) return handleSupabaseError(profileError);

        // Send invitation email with password
        await sendPasswordResetEmail(userData.email);

        return handleSupabaseSuccess(profileData, 'User berhasil ditambahkan! Email undangan telah dikirim.');
    } catch (error) {
        return handleSupabaseError(error);
    }
};

// Deactivate user
export const deactivateUser = async (userId: string) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .update({ status: 'Nonaktif', updated_at: new Date().toISOString() })
            .eq('id', userId)
            .select()
            .single();

        if (error) return handleSupabaseError(error);

        return handleSupabaseSuccess(data, 'User berhasil dinonaktifkan!');
    } catch (error) {
        return handleSupabaseError(error);
    }
};

// Activate user
export const activateUser = async (userId: string) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .update({ status: 'Aktif', updated_at: new Date().toISOString() })
            .eq('id', userId)
            .select()
            .single();

        if (error) return handleSupabaseError(error);

        return handleSupabaseSuccess(data, 'User berhasil diaktifkan!');
    } catch (error) {
        return handleSupabaseError(error);
    }
};

// Get audit logs
export const getAuditLogs = async (filters?: any) => {
    try {
        // Check if table exists first
        const { data: tableCheck, error: tableError } = await supabase
            .from('audit_logs')
            .select('id')
            .limit(1);

        // If table doesn't exist, return empty array
        if (tableError) {
            console.log('Audit logs table not found, returning empty array');
            return handleSupabaseSuccess([], 'Tabel audit log belum dibuat');
        }

        // 1. Fetch Audit Logs without access foreign join
        let query = supabase
            .from('audit_logs')
            .select('*') // Removed profiles(full_name) join
            .order('created_at', { ascending: false })
            .limit(100);

        // Apply filters if provided
        if (filters?.startDate) {
            query = query.gte('created_at', filters.startDate);
        }
        if (filters?.endDate) {
            query = query.lte('created_at', filters.endDate);
        }
        if (filters?.search) {
            query = query.ilike('action', `%${filters.search}%`);
        }

        const { data: logs, error } = await query;

        if (error) return handleSupabaseError(error);

        if (!logs || logs.length === 0) return handleSupabaseSuccess([]);

        // 2. Extract unique User IDs
        const userIds = [...new Set(logs.map(log => log.user_id).filter(id => id))];

        // 3. Fetch User Profiles manually
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', userIds);

        // 4. Map profiles to logs
        const enrichedLogs = logs.map(log => {
            const profile = profiles?.find(p => p.id === log.user_id);
            return {
                ...log,
                profiles: {
                    full_name: profile?.full_name || 'Unknown User'
                }
            };
        });

        return handleSupabaseSuccess(enrichedLogs);
    } catch (error) {
        console.warn('Error in getAuditLogs - using empty array fallback');
        return handleSupabaseSuccess([], 'Error loading audit logs');
    }
};

// Create audit log entry
export const createAuditLog = async (action: string, details?: any) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('audit_logs')
            .insert([{
                user_id: user.id,
                action,
                details,
                ip_address: await getClientIP(),
                created_at: new Date().toISOString()
            }]);

        if (error) {
            console.warn('Audit log insert failed (table might not exist):', error);
        }
    } catch (error) {
        console.warn('Audit log error:', error);
    }
};

// Save system configuration
export const saveSystemConfig = async (config: any) => {
    try {
        const { data, error } = await supabase
            .from('system_config')
            .upsert([{
                id: 1,
                retention_enabled: config.retentionEnabled,
                retention_months: config.retentionMonths,
                email_notif_enabled: config.emailNotifEnabled,
                approved_template: config.approvedTemplate,
                rejected_template: config.rejectedTemplate,
                updated_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) {
            console.warn('Error saving system config - table may not exist');
            return handleSupabaseError('Tabel system_config belum dibuat. Konfigurasi tidak tersimpan.');
        }

        await createAuditLog('Mengubah konfigurasi sistem', config);

        return handleSupabaseSuccess(data, 'Konfigurasi sistem berhasil disimpan!');
    } catch (error) {
        return handleSupabaseError('Error saving config');
    }
};

// Get system configuration
export const getSystemConfig = async () => {
    try {
        const { data, error } = await supabase
            .from('system_config')
            .select('*')
            .eq('id', 1)
            .single();

        // Return default config if table doesn't exist or no data
        if (error) {
            console.log('System config not found, using defaults');
            const defaultConfig = {
                retention_enabled: true,
                retention_months: 12,
                email_notif_enabled: true,
                approved_template: 'Dokumen Anda telah disetujui dan siap diproses lebih lanjut.',
                rejected_template: 'Dokumen Anda ditolak. Silakan perbaiki dan ajukan kembali.'
            };
            return handleSupabaseSuccess(defaultConfig);
        }

        // Return default config if none exists
        const defaultConfig = {
            retention_enabled: true,
            retention_months: 12,
            email_notif_enabled: true,
            approved_template: 'Dokumen Anda telah disetujui...',
            rejected_template: 'Dokumen Anda ditolak karena...'
        };

        return handleSupabaseSuccess(data || defaultConfig);
    } catch (error) {
        return handleSupabaseError(error);
    }
};

// Helper functions
function generateRandomPassword(): string {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
}

async function getClientIP(): Promise<string> {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch {
        return 'Unknown';
    }
}
