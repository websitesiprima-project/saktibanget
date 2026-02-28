import { supabase, handleSupabaseError, handleSupabaseSuccess } from '../lib/supabaseClient';

/**
 * Authentication Service
 * Handles login, logout, and session management
 */

// Login dengan email dan password
export const login = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) return handleSupabaseError(error);

    // Simpan session ke localStorage
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userEmail', email);
    
    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Logout
export const logout = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) return handleSupabaseError(error);

    // Clear localStorage
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('devMode');
    
    return handleSupabaseSuccess({ message: 'Logout berhasil' });
  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Get current user
export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) return handleSupabaseError(error);
    
    return handleSupabaseSuccess(user);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Check if user is authenticated
export const isAuthenticated = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  } catch (error) {
    return false;
  }
};

// Reset password
export const resetPassword = async (email) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    
    if (error) return handleSupabaseError(error);
    
    return handleSupabaseSuccess({ message: 'Email reset password telah dikirim' });
  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Update password
export const updatePassword = async (newPassword) => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) return handleSupabaseError(error);
    
    return handleSupabaseSuccess({ message: 'Password berhasil diubah' });
  } catch (error) {
    return handleSupabaseError(error);
  }
};
