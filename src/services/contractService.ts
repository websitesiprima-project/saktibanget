import { supabase, handleSupabaseError, handleSupabaseSuccess } from '@/lib/supabaseClient';

export const contractService = {
    // Get all contracts (for analytics/list)
    getAllContracts: async () => {
        try {
            const { data, error } = await supabase
                .from('contracts')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return handleSupabaseSuccess(data);
        } catch (error) {
            return handleSupabaseError(error);
        }
    },

    // Get contract by ID
    getContractById: async (id) => {
        try {
            const { data, error } = await supabase
                .from('contracts')
                .select(`
          *,
          vendors (
            id,
            nama,
            email,
            telepon
          )
        `)
                .eq('id', id)
                .single();

            if (error) throw error;
            return handleSupabaseSuccess(data);
        } catch (error) {
            return handleSupabaseError(error);
        }
    },

    // Create new contract submission
    createContract: async (contractData) => {
        try {
            const { data, error } = await supabase
                .from('contracts')
                .insert([contractData])
                .select()
                .single();

            if (error) throw error;
            return handleSupabaseSuccess(data);
        } catch (error) {
            return handleSupabaseError(error);
        }
    },

    // Update contract status
    updateStatus: async (id, status) => {
        try {
            const { data, error } = await supabase
                .from('contracts')
                .update({ status })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return handleSupabaseSuccess(data);
        } catch (error) {
            return handleSupabaseError(error);
        }
    }
};
