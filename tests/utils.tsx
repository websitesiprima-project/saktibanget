/**
 * Test Utilities
 * Helper functions untuk mempermudah testing
 */

import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'

// Custom render dengan providers jika diperlukan
export function renderWithProviders(
    ui: ReactElement,
    options?: Omit<RenderOptions, 'wrapper'>
) {
    return render(ui, { ...options })
}

// Mock data generators
export const generateMockContract = (overrides = {}) => ({
    id: 'CTR001',
    name: 'Mock Contract',
    status: 'dalam proses',
    start_date: '2025-12-01',
    end_date: '2026-02-01',
    created_at: '2025-12-01',
    vendor_name: 'Mock Vendor',
    ...overrides
})

export const generateMockVendor = (overrides = {}) => ({
    id: 'VND001',
    nama: 'Mock Vendor',
    email: 'mock@vendor.com',
    kategori: 'Elektrik',
    status: 'Aktif',
    telepon: '021-1234567',
    alamat: 'Jakarta',
    kontak_person: 'John Doe',
    tanggal_registrasi: '2025-12-01',
    ...overrides
})

// Wait for async updates
export const waitForAsync = () =>
    new Promise(resolve => setTimeout(resolve, 0))

// Mock router helper
export const createMockRouter = (overrides = {}) => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    ...overrides
})

// Mock Supabase helper
export const createMockSupabase = () => {
    const mockChain = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        filter: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
    }

    return {
        from: jest.fn(() => mockChain),
        channel: jest.fn(() => ({
            on: jest.fn().mockReturnThis(),
            subscribe: jest.fn()
        }))
    }
}

// Assertion helpers
export const expectElementToHaveHoverEffect = (element: HTMLElement) => {
    expect(element).toHaveStyle({ cursor: 'pointer' })
    expect(element).toHaveStyle({ transition: expect.stringContaining('transform') })
}

export const expectModalToBeOpen = (screen: any, title: string) => {
    expect(screen.getByText(new RegExp(title, 'i'))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /✕/i })).toBeInTheDocument()
}

export const expectModalToBeClosed = (screen: any, title: string) => {
    expect(screen.queryByText(new RegExp(title, 'i'))).not.toBeInTheDocument()
}

// Date helpers for testing
export const getDateString = (daysFromNow: number) => {
    const date = new Date()
    date.setDate(date.getDate() + daysFromNow)
    return date.toISOString().split('T')[0]
}

export const getPastDate = (days: number) => getDateString(-days)
export const getFutureDate = (days: number) => getDateString(days)

// Test data sets
export const TEST_CONTRACTS = {
    late: generateMockContract({
        id: 'CTR_LATE',
        name: 'Late Contract',
        status: 'dalam proses',
        end_date: getPastDate(5)
    }),
    onTime: generateMockContract({
        id: 'CTR_ONTIME',
        name: 'On Time Contract',
        status: 'dalam proses',
        end_date: getFutureDate(30)
    }),
    completed: generateMockContract({
        id: 'CTR_COMPLETED',
        name: 'Completed Contract',
        status: 'selesai',
        end_date: getPastDate(10)
    })
}

export const TEST_VENDORS = {
    active: generateMockVendor({
        id: 'VND_ACTIVE',
        nama: 'Active Vendor',
        status: 'Aktif'
    }),
    inactive: generateMockVendor({
        id: 'VND_INACTIVE',
        nama: 'Inactive Vendor',
        status: 'Tidak Aktif'
    })
}

// Re-export everything from testing library
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
