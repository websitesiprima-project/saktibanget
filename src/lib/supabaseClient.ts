import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Validasi environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables!');
  console.log('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env file');
}

// Create Supabase client with proper validation
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);

// Response Types
export type SupabaseResponse<T = any> =
  | { success: true; data: T; message: string }
  | { success: false; error: string };

// Helper function untuk error handling
export const handleSupabaseError = (error: any): SupabaseResponse => {
  // Handle berbagai format error
  let errorMessage = 'Terjadi kesalahan pada server';

  if (typeof error === 'string') {
    errorMessage = error;
  } else if (error?.message) {
    errorMessage = error.message;
  } else if (error?.error_description) {
    errorMessage = error.error_description;
  } else if (error?.error) {
    errorMessage = error.error;
  } else if (typeof error === 'object' && error !== null) {
    // Try to extract meaningful error info
    const errorKeys = Object.keys(error);
    if (errorKeys.length > 0) {
      errorMessage = JSON.stringify(error);
    }
  }

  // Only log if there's actual error content to avoid empty error logs
  if (error && (typeof error !== 'object' || Object.keys(error).length > 0)) {
    console.warn('Supabase Error:', errorMessage);
  }

  return {
    success: false,
    error: errorMessage
  };
};

// Helper function untuk success response
export const handleSupabaseSuccess = (data: any, message?: string): SupabaseResponse => {
  return {
    success: true,
    data,
    message: message || 'Operasi berhasil'
  };
};
