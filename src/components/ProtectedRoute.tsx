'use client'
import React, { FC, ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface ProtectedRouteProps {
    children: ReactNode
}

const ProtectedRoute: FC<ProtectedRouteProps> = ({ children }) => {
    const router = useRouter()
    const [authorized, setAuthorized] = useState<boolean>(false)
    const [checked, setChecked] = useState<boolean>(false)

    useEffect(() => {
        const isLoggedIn = localStorage.getItem('isLoggedIn')
        const devMode = localStorage.getItem('devMode') === 'true'

        if (isLoggedIn || devMode) {
            setAuthorized(true)
        } else {
            router.push('/')
        }
        setChecked(true)
    }, [router])

    if (!checked) return null

    return authorized ? <>{children}</> : null
}

export default ProtectedRoute
