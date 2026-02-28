// src/components/ErrorBoundary.tsx
'use client'

import React from 'react'

interface Props {
    children: React.ReactNode
}

interface State {
    hasError: boolean
    error: Error | null
}

export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught error:', error)
        console.error('Error Info:', errorInfo)
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: '20px',
                    backgroundColor: '#fee',
                    border: '1px solid #f88',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    color: '#c00'
                }}>
                    <h2>Something went wrong!</h2>
                    <details style={{ whiteSpace: 'pre-wrap', marginTop: '10px' }}>
                        <summary>Error Details:</summary>
                        {this.state.error?.toString()}
                        <br />
                        {this.state.error?.stack}
                    </details>
                </div>
            )
        }

        return this.props.children
    }
}
