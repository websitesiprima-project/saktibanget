import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface UseContractsOptions {
    page?: number;
    search?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export function useContracts(options: UseContractsOptions = {}) {
    const {
        page = 1,
        search = '',
        status = 'all',
        sortBy = 'created_at',
        sortOrder = 'desc',
    } = options;

    const params = new URLSearchParams({
        page: page.toString(),
        search,
        status,
        sortBy,
        sortOrder,
    });

    const { data, error, isLoading, mutate } = useSWR(
        `/api/contracts?${params}`,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 60000, // 1 minute
            focusThrottleInterval: 300000, // 5 minutes
            errorRetryCount: 3,
            errorRetryInterval: 5000,
        }
    );

    return {
        data: data?.data || [],
        pagination: data?.pagination || { page: 1, pageSize: 20, total: 0, totalPages: 0 },
        isLoading,
        error,
        mutate,
    };
}

export function useContractDetail(contractId: string | null) {
    const { data, error, isLoading, mutate } = useSWR(
        contractId ? `/api/contracts/detail?id=${contractId}` : null,
        fetcher,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 60000,
        }
    );

    return {
        data: data?.data || null,
        isLoading,
        error,
        mutate,
    };
}
