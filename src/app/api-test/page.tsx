// src/app/api-test/page.tsx
'use client'

import { useEffect, useState } from 'react'

export default function APITest() {
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const testAPI = async () => {
            try {
                const response = await fetch('/api/contracts?page=1')
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`)
                }
                const json = await response.json()
                setData(json)
                setError(null)
            } catch (err: any) {
                setError(err.message)
                setData(null)
            } finally {
                setLoading(false)
            }
        }

        testAPI()
    }, [])

    return (
        <div style={{ padding: '20px', fontFamily: 'monospace' }}>
            <h1>API /contracts Test</h1>

            {loading && <p>Loading...</p>}

            {error && (
                <div style={{ color: 'red', padding: '10px', backgroundColor: '#fee', borderRadius: '4px' }}>
                    Error: {error}
                </div>
            )}

            {data && (
                <>
                    <div style={{ marginBottom: '20px' }}>
                        <h2>✅ API Working!</h2>
                        <p>Items: {data.data?.length || 0}</p>
                        <p>Total: {data.pagination?.total || 0}</p>
                    </div>

                    <details>
                        <summary>Full Response:</summary>
                        <pre style={{ backgroundColor: '#f0f0f0', padding: '10px', overflow: 'auto', maxHeight: '400px' }}>
                            {JSON.stringify(data, null, 2)}
                        </pre>
                    </details>
                </>
            )}

            <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#eef', borderRadius: '4px' }}>
                <p>💡 Tip: Cek browser DevTools → Network tab untuk lihat response details</p>
            </div>
        </div>
    )
}
