'use client'

import { supabase } from './supabaseClient'

/**
 * Global Data Store untuk cache data antar halaman
 * Semua halaman share cache ini, jadi navigasi terasa instant
 */

interface CacheItem<T> {
    data: T
    timestamp: number
    isLoading: boolean
}

interface DataStore {
    contracts: CacheItem<any[]> | null
    contractHistory: CacheItem<any[]> | null
    vendors: CacheItem<any[]> | null
    paymentStages: CacheItem<any[]> | null
    suratPengajuan: CacheItem<any[]> | null
}

// Cache TTL: 2 menit (data still fresh for 2 min)
const CACHE_TTL = 2 * 60 * 1000

// In-memory store
const store: DataStore = {
    contracts: null,
    contractHistory: null,
    vendors: null,
    paymentStages: null,
    suratPengajuan: null
}

// Loading flags to prevent duplicate fetches
const loading: Record<string, boolean> = {}

// Subscribers for reactive updates
const subscribers: Record<string, Set<(data: any) => void>> = {}

/**
 * Check if cache is still valid
 */
function isCacheValid(item: CacheItem<any> | null): boolean {
    if (!item) return false
    return Date.now() - item.timestamp < CACHE_TTL
}

/**
 * Subscribe to data changes
 */
export function subscribe(key: keyof DataStore, callback: (data: any) => void) {
    if (!subscribers[key]) {
        subscribers[key] = new Set()
    }
    subscribers[key].add(callback)

    // Return unsubscribe function
    return () => {
        subscribers[key]?.delete(callback)
    }
}

/**
 * Notify subscribers of data changes
 */
function notifySubscribers(key: keyof DataStore, data: any) {
    subscribers[key]?.forEach(callback => callback(data))
}

/**
 * Get cached data or fetch if not available
 */
export async function getContracts(forceRefresh = false): Promise<any[]> {
    if (!forceRefresh && isCacheValid(store.contracts)) {
        return store.contracts!.data
    }

    if (loading.contracts) {
        // Wait for existing fetch to complete
        return new Promise((resolve) => {
            const check = setInterval(() => {
                if (!loading.contracts && store.contracts) {
                    clearInterval(check)
                    resolve(store.contracts.data)
                }
            }, 100)
        })
    }

    loading.contracts = true

    try {
        const { data, error } = await supabase
            .from('contracts')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error

        store.contracts = {
            data: data || [],
            timestamp: Date.now(),
            isLoading: false
        }

        notifySubscribers('contracts', store.contracts.data)
        return store.contracts.data
    } finally {
        loading.contracts = false
    }
}

export async function getContractHistory(forceRefresh = false): Promise<any[]> {
    if (!forceRefresh && isCacheValid(store.contractHistory)) {
        return store.contractHistory!.data
    }

    if (loading.contractHistory) {
        return new Promise((resolve) => {
            const check = setInterval(() => {
                if (!loading.contractHistory && store.contractHistory) {
                    clearInterval(check)
                    resolve(store.contractHistory.data)
                }
            }, 100)
        })
    }

    loading.contractHistory = true

    try {
        const { data, error } = await supabase
            .from('contract_history')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error

        store.contractHistory = {
            data: data || [],
            timestamp: Date.now(),
            isLoading: false
        }

        notifySubscribers('contractHistory', store.contractHistory.data)
        return store.contractHistory.data
    } finally {
        loading.contractHistory = false
    }
}

export async function getVendors(forceRefresh = false): Promise<any[]> {
    if (!forceRefresh && isCacheValid(store.vendors)) {
        return store.vendors!.data
    }

    if (loading.vendors) {
        return new Promise((resolve) => {
            const check = setInterval(() => {
                if (!loading.vendors && store.vendors) {
                    clearInterval(check)
                    resolve(store.vendors.data)
                }
            }, 100)
        })
    }

    loading.vendors = true

    try {
        const { data, error } = await supabase
            .from('vendors')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error

        store.vendors = {
            data: data || [],
            timestamp: Date.now(),
            isLoading: false
        }

        notifySubscribers('vendors', store.vendors.data)
        return store.vendors.data
    } finally {
        loading.vendors = false
    }
}

export async function getSuratPengajuan(forceRefresh = false): Promise<any[]> {
    if (!forceRefresh && isCacheValid(store.suratPengajuan)) {
        return store.suratPengajuan!.data
    }

    if (loading.suratPengajuan) {
        return new Promise((resolve) => {
            const check = setInterval(() => {
                if (!loading.suratPengajuan && store.suratPengajuan) {
                    clearInterval(check)
                    resolve(store.suratPengajuan.data)
                }
            }, 100)
        })
    }

    loading.suratPengajuan = true

    try {
        const { data, error } = await supabase
            .from('surat_pengajuan')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error

        store.suratPengajuan = {
            data: data || [],
            timestamp: Date.now(),
            isLoading: false
        }

        notifySubscribers('suratPengajuan', store.suratPengajuan.data)
        return store.suratPengajuan.data
    } finally {
        loading.suratPengajuan = false
    }
}

/**
 * 🚀 PREFETCH ALL DATA - Panggil ini saat user pertama kali masuk
 * Data akan di-load di background, jadi halaman terasa instant
 */
export async function prefetchAllData() {
    console.log('🚀 Prefetching all data in background...')
    const startTime = performance.now()

    try {
        // Parallel fetch all data
        await Promise.all([
            getContracts(),
            getContractHistory(),
            getVendors(),
            getSuratPengajuan()
        ])

        const endTime = performance.now()
        console.log(`✅ All data prefetched in ${(endTime - startTime).toFixed(0)}ms`)
    } catch (error) {
        console.error('❌ Error prefetching data:', error)
    }
}

/**
 * Invalidate specific cache (setelah insert/update/delete)
 */
export function invalidateCache(key: keyof DataStore) {
    store[key] = null
    console.log(`🔄 Cache invalidated: ${key}`)
}

/**
 * Invalidate all cache
 */
export function invalidateAllCache() {
    store.contracts = null
    store.contractHistory = null
    store.vendors = null
    store.suratPengajuan = null
    store.paymentStages = null
    console.log('🔄 All cache invalidated')
}

/**
 * Get current cache status (for debugging)
 */
export function getCacheStatus() {
    return {
        contracts: store.contracts ? { valid: isCacheValid(store.contracts), age: Date.now() - store.contracts.timestamp } : null,
        contractHistory: store.contractHistory ? { valid: isCacheValid(store.contractHistory), age: Date.now() - store.contractHistory.timestamp } : null,
        vendors: store.vendors ? { valid: isCacheValid(store.vendors), age: Date.now() - store.vendors.timestamp } : null,
        suratPengajuan: store.suratPengajuan ? { valid: isCacheValid(store.suratPengajuan), age: Date.now() - store.suratPengajuan.timestamp } : null
    }
}
