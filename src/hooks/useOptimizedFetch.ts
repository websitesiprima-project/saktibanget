import { useState, useEffect, useCallback, useRef } from 'react'
import { getCachedData, setCachedData } from '../lib/performance'

interface UseFetchOptions {
    cache?: boolean
    cacheKey?: string
    refetchInterval?: number
    onSuccess?: (data: any) => void
    onError?: (error: any) => void
}

export function useFetch<T = any>(
    fetchFn: () => Promise<T>,
    deps: any[] = [],
    options: UseFetchOptions = {}
) {
    const {
        cache = true,
        cacheKey = '',
        refetchInterval = 0,
        onSuccess,
        onError
    } = options

    const [data, setData] = useState<T | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)
    const isMountedRef = useRef(true)
    const intervalRef = useRef<NodeJS.Timeout | null>(null)

    const fetchData = useCallback(async () => {
        try {
            // Check cache first
            if (cache && cacheKey) {
                const cached = getCachedData(cacheKey)
                if (cached) {
                    setData(cached)
                    setLoading(false)
                    return
                }
            }

            setLoading(true)
            setError(null)

            const result = await fetchFn()

            if (!isMountedRef.current) return

            setData(result)

            // Cache the result
            if (cache && cacheKey) {
                setCachedData(cacheKey, result)
            }

            onSuccess?.(result)
        } catch (err) {
            if (!isMountedRef.current) return

            const error = err instanceof Error ? err : new Error('Unknown error')
            setError(error)
            onError?.(error)
        } finally {
            if (isMountedRef.current) {
                setLoading(false)
            }
        }
    }, [fetchFn, cache, cacheKey, onSuccess, onError])

    useEffect(() => {
        isMountedRef.current = true
        fetchData()

        // Setup refetch interval if specified
        if (refetchInterval > 0) {
            intervalRef.current = setInterval(fetchData, refetchInterval)
        }

        return () => {
            isMountedRef.current = false
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
            }
        }
    }, deps)

    const refetch = useCallback(() => {
        return fetchData()
    }, [fetchData])

    return { data, loading, error, refetch }
}

// Hook untuk debounced value
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value)
        }, delay)

        return () => {
            clearTimeout(handler)
        }
    }, [value, delay])

    return debouncedValue
}

// Hook untuk detect page visibility
export function usePageVisibility() {
    const [isVisible, setIsVisible] = useState(true)

    useEffect(() => {
        const handleVisibilityChange = () => {
            setIsVisible(!document.hidden)
        }

        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
        }
    }, [])

    return isVisible
}
