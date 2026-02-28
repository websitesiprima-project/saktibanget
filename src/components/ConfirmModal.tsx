'use client'

import React from 'react'
import { AlertTriangle, Trash2, XCircle, HelpCircle } from 'lucide-react'
import './ConfirmModal.css'

export type ConfirmType = 'delete' | 'warning' | 'danger' | 'question'

interface ConfirmModalProps {
    show: boolean
    type?: ConfirmType
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    onConfirm: () => void
    onCancel: () => void
}

export default function ConfirmModal({
    show,
    type = 'warning',
    title,
    message,
    confirmText = 'Ya, Lanjutkan',
    cancelText = 'Batal',
    onConfirm,
    onCancel
}: ConfirmModalProps) {
    if (!show) return null

    const getIcon = () => {
        switch (type) {
            case 'delete':
                return <Trash2 size={48} />
            case 'danger':
                return <XCircle size={48} />
            case 'question':
                return <HelpCircle size={48} />
            case 'warning':
            default:
                return <AlertTriangle size={48} />
        }
    }

    return (
        <div className="confirm-modal-overlay" onClick={onCancel}>
            <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className={`confirm-modal-icon ${type}`}>
                    {getIcon()}
                </div>
                <h2 className="confirm-modal-title">{title}</h2>
                <p className="confirm-modal-message">{message}</p>
                <div className="confirm-modal-buttons">
                    <button className="confirm-modal-btn cancel" onClick={onCancel}>
                        {cancelText}
                    </button>
                    <button className={`confirm-modal-btn confirm ${type}`} onClick={onConfirm}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    )
}
