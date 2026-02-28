'use client'

import React from 'react'
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react'
import './NotificationModal.css'

export type NotificationType = 'success' | 'error' | 'warning' | 'info'

interface NotificationModalProps {
    show: boolean
    type: NotificationType
    title?: string
    message: string
    onClose: () => void
}

export default function NotificationModal({
    show,
    type,
    title,
    message,
    onClose
}: NotificationModalProps) {
    if (!show) return null

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircle size={48} />
            case 'error':
                return <XCircle size={48} />
            case 'warning':
                return <AlertCircle size={48} />
            case 'info':
                return <Info size={48} />
            default:
                return <CheckCircle size={48} />
        }
    }

    const getTitle = () => {
        if (title) return title
        switch (type) {
            case 'success':
                return 'Berhasil'
            case 'error':
                return 'Gagal'
            case 'warning':
                return 'Peringatan'
            case 'info':
                return 'Informasi'
            default:
                return 'Notifikasi'
        }
    }

    return (
        <div className="notification-modal-overlay" onClick={onClose}>
            <div className="notification-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className={`notification-modal-icon ${type}`}>
                    {getIcon()}
                </div>
                <h2 className="notification-modal-title">{getTitle()}</h2>
                <p className="notification-modal-message">{message}</p>
                <button className={`notification-modal-btn ${type}`} onClick={onClose}>
                    OK
                </button>
            </div>
        </div>
    )
}
