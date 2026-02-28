import { renderHook, act, waitFor } from '@testing-library/react';
import { useFetch } from '@/hooks/useOptimizedFetch';

// Mock performance lib
jest.mock('@/lib/performance', () => ({
    getCachedData: jest.fn(),
    setCachedData: jest.fn(),
}));

import { getCachedData, setCachedData } from '@/lib/performance';

describe('useFetch', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should fetch data successfully', async () => {
        const mockData = { id: 1, name: 'Test' };
        const mockFetch = jest.fn().mockResolvedValue(mockData);

        const { result } = renderHook(() => useFetch(mockFetch));

        expect(result.current.loading).toBe(true);

        await waitFor(() => {
            expect(result.current.data).toEqual(mockData);
        });

        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBe(null);
    });

    it('should use cached data if available', async () => {
        const cachedData = { id: 2, name: 'Cached' };
        (getCachedData as jest.Mock).mockReturnValue(cachedData);

        const mockFetch = jest.fn();

        const { result } = renderHook(() => useFetch(mockFetch, [], { cacheKey: 'test-key' }));

        // Should return cached data immediately
        expect(result.current.data).toEqual(cachedData);
        // Loading might still flip briefly or stay false depending on implementation, 
        // but based on code it sets data and loading=false if cache hits.
        expect(result.current.loading).toBe(false);
        expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
        const mockError = new Error('Fetch failed');
        const mockFetch = jest.fn().mockRejectedValue(mockError);

        const { result } = renderHook(() => useFetch(mockFetch));

        await waitFor(() => {
            expect(result.current.error).toEqual(mockError);
        });

        expect(result.current.loading).toBe(false);
        expect(result.current.data).toBe(null);
    });

    it('should refetch manually', async () => {
        const mockData1 = { id: 1 };
        const mockData2 = { id: 2 };
        const mockFetch = jest.fn()
            .mockResolvedValueOnce(mockData1)
            .mockResolvedValueOnce(mockData2);

        const { result } = renderHook(() => useFetch(mockFetch));

        await waitFor(() => {
            expect(result.current.data).toEqual(mockData1);
        });

        await act(async () => {
            await result.current.refetch();
        });

        await waitFor(() => {
            expect(result.current.data).toEqual(mockData2);
        });
    });
});
