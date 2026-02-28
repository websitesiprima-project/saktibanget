// src/app/test-swr/page.tsx
'use client'

import { useContracts } from '@/hooks/useContracts'

export default function TestSWR() {
    const { data, isLoading, error } = useContracts({ page: 1 })

    return (
        <div style={{ padding: '20px', fontFamily: 'monospace' }}>
            <h1>Test SWR Setup</h1>

            <div style={{ marginBottom: '20px' }}>
                <h2>Status:</h2>
                <p>Loading: {isLoading ? 'YES' : 'NO'}</p>
                <p>Error: {error ? error.message : 'NONE'}</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <h2>Data:</h2>
                <p>Items count: {data.length}</p>
                {data.length > 0 && (
                    <pre style={{ backgroundColor: '#f0f0f0', padding: '10px', overflow: 'auto' }}>
                        {JSON.stringify(data[0], null, 2)}
                    </pre>
                )}
            </div>

            <div style={{ marginBottom: '20px' }}>
                <h2>Raw Response:</h2>
                <p>Check browser console (F12) untuk full data</p>
            </div>
        </div>
    )
}
