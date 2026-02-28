import { supabase, handleSupabaseError, handleSupabaseSuccess } from '../lib/supabaseClient';

/**
 * Asset Service
 * CRUD operations untuk data aset
 */

interface FetchOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Fetch contracts dengan pagination (dari API)
export const getContracts = async (options: FetchOptions = {}) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      search = '',
      status = 'all',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = options;

    const params = new URLSearchParams({
      page: page.toString(),
      search,
      status,
      sortBy,
      sortOrder
    });

    const response = await fetch(`/api/contracts?${params}`);

    if (!response.ok) {
      throw new Error('Failed to fetch contracts');
    }

    return handleSupabaseSuccess(await response.json());
  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Get contract detail (dari API)
export const getContractDetail = async (id: string) => {
  try {
    const response = await fetch(`/api/contracts/detail?id=${id}`);

    if (!response.ok) {
      throw new Error('Failed to fetch contract details');
    }

    return handleSupabaseSuccess(await response.json());
  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Get all assets (deprecated - gunakan getContracts instead)
export const getAllAssets = async () => {
  try {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return handleSupabaseError(error);

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Get asset by ID
export const getAssetById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return handleSupabaseError(error);

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Create new asset
export const createAsset = async (assetData) => {
  try {
    const { data, error } = await supabase
      .from('assets')
      .insert([assetData])
      .select()
      .single();

    if (error) return handleSupabaseError(error);

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Update asset
export const updateAsset = async (id, assetData) => {
  try {
    const { data, error } = await supabase
      .from('assets')
      .update(assetData)
      .eq('id', id)
      .select()
      .single();

    if (error) return handleSupabaseError(error);

    return handleSupabaseSuccess(data);
  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Delete asset
export const deleteAsset = async (id) => {
  try {
    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('id', id);

    if (error) return handleSupabaseError(error);

    return handleSupabaseSuccess({ message: 'Aset berhasil dihapus' });
  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Search assets (optimized server-side)
export const searchAssets = async (searchTerm: string, page: number = 1) => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      search: searchTerm,
      sortBy: 'created_at',
      sortOrder: 'desc'
    });

    const response = await fetch(`/api/contracts?${params}`);

    if (!response.ok) {
      throw new Error('Search failed');
    }

    return handleSupabaseSuccess(await response.json());
  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Filter assets by status (optimized server-side)
export const filterAssetsByStatus = async (status: string, page: number = 1) => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      status,
      sortBy: 'created_at',
      sortOrder: 'desc'
    });

    const response = await fetch(`/api/contracts?${params}`);

    if (!response.ok) {
      throw new Error('Filter failed');
    }

    return handleSupabaseSuccess(await response.json());
  } catch (error) {
    return handleSupabaseError(error);
  }
};

// Get asset statistics
export const getAssetStatistics = async () => {
  try {
    const { data, error } = await supabase
      .from('assets')
      .select('status');

    if (error) return handleSupabaseError(error);

    // Count by status
    const stats = {
      total: data.length,
      aktif: data.filter(a => a.status === 'Aktif').length,
      perbaikan: data.filter(a => a.status === 'Perbaikan').length,
      tidakAktif: data.filter(a => a.status === 'Tidak Aktif').length
    };

    return handleSupabaseSuccess(stats);
  } catch (error) {
    return handleSupabaseError(error);
  }
};
