import { supabase, handleSupabaseError, handleSupabaseSuccess } from '../lib/supabaseClient';

/**
 * Vendor Service
 * CRUD operations untuk data vendor
 */

// Get all vendors
export const getAllVendors = async () => {
  try {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return handleSupabaseError(error);

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Optimized for Dashboard: Get count and recent vendors
export const getDashboardVendorData = async () => {
  try {
    // 1. Get Total Count
    const { count, error: countError } = await supabase
      .from('vendors')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    // 2. Get Recent 5 Vendors (Reduced columns)
    const { data: recent, error: listError } = await supabase
      .from('vendors')
      .select('id, nama, email, kategori, status, tanggal_registrasi')
      .order('tanggal_registrasi', { ascending: false })
      .limit(5);

    if (listError) throw listError;

    // 3. Get All tanggal_registrasi for chart (Lightweight)
    const { data: allVendors, error: chartError } = await supabase
      .from('vendors')
      .select('tanggal_registrasi')
      .order('tanggal_registrasi', { ascending: false });

    if (chartError) throw chartError;

    return handleSupabaseSuccess({ total: count, recent, allVendors });
  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Get vendor by ID
export const getVendorById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return handleSupabaseError(error);

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Create new vendor
export const createVendor = async (vendorData) => {
  try {
    const { data, error } = await supabase
      .from('vendors')
      .insert([vendorData])
      .select()
      .single();

    if (error) return handleSupabaseError(error);

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Update vendor
export const updateVendor = async (id, vendorData) => {
  try {
    const { data, error } = await supabase
      .from('vendors')
      .update(vendorData)
      .eq('id', id)
      .select()
      .single();

    if (error) return handleSupabaseError(error);

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Delete vendor
export const deleteVendor = async (id) => {
  try {
    const { error } = await supabase
      .from('vendors')
      .delete()
      .eq('id', id);

    if (error) return handleSupabaseError(error);

    return handleSupabaseSuccess({ message: 'Vendor berhasil dihapus' });
  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Search vendors
export const searchVendors = async (searchTerm) => {
  try {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .or(`nama.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,kategori.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false });

    if (error) return handleSupabaseError(error);

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Filter vendors by status
export const filterVendorsByStatus = async (status) => {
  try {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) return handleSupabaseError(error);

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Auto-sync vendor: Cek apakah vendor sudah ada, jika belum otomatis create
export const autoSyncVendor = async (vendorName) => {
  try {
    // Skip jika nama vendor kosong
    if (!vendorName || vendorName.trim() === '') {
      return { success: true, data: null, message: 'Vendor name is empty, skipping sync' };
    }

    // 1. Cek apakah vendor sudah ada berdasarkan nama (case-insensitive)
    const { data: existingVendors, error: searchError } = await supabase
      .from('vendors')
      .select('id, nama, status')
      .ilike('nama', vendorName.trim())
      .limit(1);

    if (searchError) {
      console.warn('Error checking vendor - table may not exist');
      return handleSupabaseError(searchError);
    }

    // 2. Jika vendor sudah ada, return success
    if (existingVendors && existingVendors.length > 0) {
      return handleSupabaseSuccess({
        exists: true,
        vendor: existingVendors[0],
        message: `Vendor "${vendorName}" sudah ada di database`
      });
    }

    // 3. Generate unique vendor ID
    const generateVendorId = () => {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      return `VND-${timestamp}-${random}`;
    };

    // 4. Jika vendor belum ada, otomatis create dengan data minimal
    const newVendorData = {
      id: generateVendorId(), // Generate ID unik
      nama: vendorName.trim(),
      alamat: '-', // Alamat placeholder
      telepon: '-', // Telepon placeholder
      email: '-', // Email placeholder, bisa diisi nanti
      nama_pimpinan: '-', // Nama pimpinan placeholder
      status: 'Aktif', // Status default Aktif
      tanggal_registrasi: new Date().toISOString().split('T')[0], // Tanggal hari ini
      created_at: new Date().toISOString()
    };

    const { data: newVendor, error: createError } = await supabase
      .from('vendors')
      .insert([newVendorData])
      .select()
      .single();

    if (createError) {
      console.warn('Error creating vendor - table may not exist or duplicate key');
      return handleSupabaseError(createError);
    }

    return handleSupabaseSuccess({
      exists: false,
      vendor: newVendor,
      message: `Vendor "${vendorName}" berhasil ditambahkan otomatis`
    });

  } catch (error) {
    console.warn('Error in autoSyncVendor - continuing without vendor sync');
    return { success: false, data: null, message: 'Vendor sync failed, but continuing' };
  }
};
