/**
 * Performance optimization utilities untuk SAKTI
 */

// Debounce function untuk mencegah excessive re-renders
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null

    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            timeout = null
            func(...args)
        }

        if (timeout) clearTimeout(timeout)
        timeout = setTimeout(later, wait)
    }
}

// Throttle function untuk limit fetch frequency
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean = false

    return function executedFunction(...args: Parameters<T>) {
        if (!inThrottle) {
            func(...args)
            inThrottle = true
            setTimeout(() => (inThrottle = false), limit)
        }
    }
}

// Cache management untuk API responses
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 60000 // 1 menit

export function getCachedData(key: string) {
    const cached = cache.get(key)
    if (!cached) return null

    const now = Date.now()
    if (now - cached.timestamp > CACHE_DURATION) {
        cache.delete(key)
        return null
    }

    return cached.data
}

export function setCachedData(key: string, data: any) {
    cache.set(key, { data, timestamp: Date.now() })
}

export function clearCache(key?: string) {
    if (key) {
        cache.delete(key)
    } else {
        cache.clear()
    }
}

// Lazy load images
export function lazyLoadImage(src: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(src)
        img.onerror = reject
        img.src = src
    })
}

// Check if we're in browser
export const isBrowser = typeof window !== 'undefined'

// Prefetch data untuk next navigation
export function prefetchData(url: string) {
    if (!isBrowser) return

    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = url
    document.head.appendChild(link)
}
