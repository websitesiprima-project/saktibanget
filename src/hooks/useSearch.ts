import useSWR from 'swr';
import { useCallback } from 'react';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface UseSearchOptions {
    debounceMs?: number;
}

export function useSearch(options: UseSearchOptions = {}) {
    const { debounceMs = 300 } = options;

    const searchContracts = useCallback(
        async (query: string, page: number = 1, status: string = 'all') => {
            if (!query || query.length < 2) {
                return { data: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };
            }

            const params = new URLSearchParams({
                page: page.toString(),
                search: query,
                status,
                sortBy: 'updated_at',
                sortOrder: 'desc',
            });

            try {
                const response = await fetch(`/api/contracts?${params}`);
                if (!response.ok) throw new Error('Search failed');
                const result = await response.json();
                return result;
            } catch (error) {
                console.error('Search error:', error);
                return { data: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };
            }
        },
        []
    );

    return { searchContracts };
}
