'use client'
import React, { FC, ReactNode, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface VendorProtectedRouteProps {
    children: ReactNode
}

const VendorProtectedRoute: FC<VendorProtectedRouteProps> = ({ children }) => {
    const router = useRouter()
    const [authorized, setAuthorized] = useState<boolean>(false)
    const [checked, setChecked] = useState<boolean>(false)

    useEffect(() => {
        const isVendorLoggedIn = localStorage.getItem('vendorLoggedIn')

        if (isVendorLoggedIn) {
            setAuthorized(true)
        } else {
            router.push('/vendor-login')
        }
        setChecked(true)
    }, [router])

    if (!checked) return null

    return authorized ? <>{children}</> : null
}

export default VendorProtectedRoute
