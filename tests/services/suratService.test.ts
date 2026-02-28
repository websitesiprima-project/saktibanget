import { suratService } from '@/services/suratService';
import { supabase } from '@/lib/supabaseClient';

// Mock Supabase client
jest.mock('@/lib/supabaseClient', () => ({
    supabase: {
        from: jest.fn(),
        rpc: jest.fn()
    },
    handleSupabaseSuccess: jest.fn((data) => ({ success: true, data })),
    handleSupabaseError: jest.fn((error) => ({ success: false, error: error.message || 'DB Error' }))
}));

describe('suratService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    xdescribe('getAllSurat', () => {
        it('should fetch all surat', async () => {
            const mockData = [{ id: 1, judul: 'Surat 1' }];
            const mockOrder = jest.fn().mockResolvedValue({ data: mockData, error: null });
            const mockSelect = jest.fn().mockReturnValue({ order: mockOrder });

            (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

            const result = await suratService.getAllSurat();

            expect(supabase.from).toHaveBeenCalledWith('surat_pengajuan');
            expect(mockSelect).toHaveBeenCalledWith('*');
            expect(result.data).toEqual(mockData);
        });

        it('should handle errors', async () => {
            const mockError = { message: 'DB Error' };
            const mockOrder = jest.fn().mockResolvedValue({ data: null, error: mockError });
            const mockSelect = jest.fn().mockReturnValue({ order: mockOrder });

            (supabase.from as jest.Mock).mockReturnValue({ select: mockSelect });

            const result = await suratService.getAllSurat();
            expect(result.success).toBe(false);
            expect(result.error).toBe('DB Error');
        });
    });

    // Add more tests based on actual methods in suratService.ts
});
