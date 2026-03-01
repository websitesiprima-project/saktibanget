'use client'
import React, { FC, useState, useEffect, FormEvent, ChangeEvent } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { login as loginService } from '../services/authService'
import {
  requestPasswordReset,
  resetPassword,
  registerVendor,
  requestEmailVerification,
  verifyEmailCode
} from '../services/vendorAuthService'
import {
  sendReactivationCode,
  verifyReactivationCode
} from '../services/vendorAccountService'
import { supabase } from '../lib/supabaseClient'
import NotificationModal from './NotificationModal'
import styled from 'styled-components'
import { hashPassword } from '../lib/passwordUtils'

interface Platform {
  logo: string
  name: string
  description: string
}

const LoginContainer = styled.div`
  display: flex;
  height: 100vh;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;

  /* Left Section - Platform Information */
  .left-section {
    flex: 0 0 45%;
    background: linear-gradient(135deg, #b8e6f5 0%, #d4f1f9 100%);
    padding: 60px 50px;
    overflow-y: auto;
  }

  .sso-header {
    margin-bottom: 40px;
  }

  .sso-title {
    font-size: 42px;
    font-weight: bold;
    color: #1e3c72;
    margin-bottom: 20px;
  }

  .sso-subtitle {
    font-size: 15px;
    color: #555;
    line-height: 1.6;
  }

  .platforms-list {
    display: flex;
    flex-direction: column;
    gap: 25px;
  }

  .platform-item {
    display: flex;
    align-items: flex-start;
    gap: 20px;
    padding: 20px;
    background: rgba(255, 255, 255, 0.7);
    border-radius: 12px;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .platform-item:hover {
    transform: translateX(5px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .platform-icon {
    font-size: 42px;
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    border-radius: 12px;
    flex-shrink: 0;
  }

  .platform-info {
    flex: 1;
  }

  .platform-name {
    font-size: 18px;
    font-weight: bold;
    color: #1e3c72;
    margin-bottom: 5px;
  }

  .platform-desc {
    font-size: 13px;
    color: #666;
    line-height: 1.4;
  }

  /* Right Section - Login Form */
  .right-section {
    flex: 0 0 55%;
    background: white;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 60px 80px;
    position: relative;
  }

  .back-button {
    position: absolute;
    top: 40px;
    left: 80px;
  }

  .back-button button {
    background: none;
    border: none;
    color: #1e88e5;
    font-size: 15px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 5px;
    transition: color 0.2s;
  }

  .back-button button:hover {
    color: #1565c0;
  }

  .login-form-wrapper {
    width: 100%;
    max-width: 480px;
    margin: 0 auto;
  }

  .login-logo {
    display: flex;
    justify-content: center;
    margin-bottom: 35px;
  }

  .sakti-logo {
    height: 70px;
    width: auto;
    object-fit: contain;
  }

  .login-form {
    width: 100%;
  }

  .form-title {
    font-size: 32px;
    font-weight: bold;
    color: #333;
    margin-bottom: 10px;
  }

  .form-greeting {
    color: #666;
    margin-bottom: 35px;
    font-size: 15px;
  }

  .highlight {
    color: #1e88e5;
    font-weight: 600;
  }

  .input-group {
    margin-bottom: 25px;
  }

  .input-label {
    display: block;
    font-size: 14px;
    color: #333;
    margin-bottom: 8px;
    font-weight: 500;
  }

  .required {
    color: #e53935;
  }

  .input-field {
    width: 100%;
    padding: 14px 16px;
    border: 1px solid #d0d0d0;
    border-radius: 6px;
    font-size: 15px;
    transition: all 0.2s;
    box-sizing: border-box;
    background: #f8f9fa;
  }

  .input-field:focus {
    outline: none;
    border-color: #1e88e5;
    background: white;
  }

  .password-wrapper {
    position: relative;
  }

  .toggle-password {
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    font-size: 20px;
    padding: 0;
    display: flex;
    align-items: center;
  }

  .form-options {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
  }

  .remember-me {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    font-size: 14px;
    color: #666;
  }

  .remember-me input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }

  .forgot-password {
    color: #1e88e5;
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;
  }

  .forgot-password:hover {
    text-decoration: underline;
  }

  .login-button {
    width: 100%;
    padding: 16px;
    background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
    letter-spacing: 1px;
  }

  .login-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(30, 136, 229, 0.3);
  }

  .login-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .submit-btn {
    min-width: 180px;
    width: auto;
    padding: 14px 32px;
    background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    letter-spacing: 0.5px;
    margin-right: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    vertical-align: middle;
    text-align: center;
    box-shadow: 0 2px 8px rgba(30, 136, 229, 0.2);
  }
  .submit-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(30, 136, 229, 0.35);
    background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
  }
  .submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
  .back-btn {
    min-width: 180px;
    width: auto;
    padding: 14px 32px;
    background: #fff;
    color: #1e88e5;
    border: 2px solid #e3f2fd;
    border-radius: 8px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    letter-spacing: 0.5px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    vertical-align: middle;
    margin-left: 0;
    text-align: center;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  }
  .back-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    background: #e3f2fd;
    color: #1565c0;
    border-color: #1e88e5;
    box-shadow: 0 4px 12px rgba(30, 136, 229, 0.2);
  }

  /* Error Message */
  .error-message {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px 20px;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 8px;
    color: #991b1b;
    font-size: 14px;
    margin-bottom: 20px;
    line-height: 1.6;
  }

  .error-icon {
    font-size: 18px;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .register-text {
    text-align: center;
    margin-top: 25px;
    color: #666;
    font-size: 14px;
  }

  .register-link {
    color: #1e88e5;
    text-decoration: none;
    font-weight: 600;
  }

  .register-link:hover {
    text-decoration: underline;
  }

  .footer {
    position: absolute;
    bottom: 40px;
    left: 50%;
    transform: translateX(-50%);
    text-align: center;
  }

  .footer-logo {
    font-size: 40px;
    margin-bottom: 8px;
  }

  .footer-text {
    font-size: 13px;
    color: #999;
  }

  /* Developer Mode */
  .dev-mode-container {
    position: fixed;
    bottom: 24px;
    right: 75px;
    z-index: 1000;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .dev-mode-toggle {
    display: block;
    cursor: pointer;
    -webkit-user-select: none;
    user-select: none;
    min-height: 32px;
  }

  .toggle-label {
    font-size: 14px;
    color: #333;
    font-weight: 600;
    font-family: 'Inter', sans-serif;
    white-space: nowrap;
    order: 2;
    line-height: 32px;
  }

  .dev-mode-toggle input[type="checkbox"] {
    display: none;
  }

  .toggle-slider {
    position: relative;
    width: 60px;
    height: 32px;
    background: #e0e0e0;
    border-radius: 32px;
    transition: all 0.3s ease;
    flex-shrink: 0;
    order: 1;
    box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.1);
  }

  .toggle-slider::before {
    content: '';
    position: absolute;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: white;
    top: 3px;
    left: 3px;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }

  .dev-mode-toggle input[type="checkbox"]:checked + .toggle-slider {
    background: #4cd964;
  }

  .dev-mode-toggle input[type="checkbox"]:checked + .toggle-slider::before {
    transform: translateX(28px);
  }

  .dev-mode-info {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid rgba(30, 136, 229, 0.15);
    font-size: 12px;
    color: #1e88e5;
    font-weight: 600;
    font-family: 'Inter', sans-serif;
    text-align: center;
    line-height: 1.5;
  }

  /* Responsive */
  @media (max-width: 1024px) {
    .left-section {
      flex: 0 0 40%;
      padding: 40px 30px;
    }
    
    .right-section {
      flex: 0 0 60%;
      padding: 40px 50px;
    }
  }

  @media (max-width: 768px) {
    flex-direction: column;
    
    .left-section {
      flex: none;
      height: auto;
      padding: 30px 20px;
    }
    
    .right-section {
      flex: 1;
      padding: 30px 20px;
    }
    
    .back-button {
      left: 20px;
      top: 20px;
    }
    
    .sso-title {
      font-size: 32px;
    }
    
    .form-title {
      font-size: 26px;
    }
  }

  /* Register Modal Styles */
  .register-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 20px;
    overflow-y: auto;
  }

  .register-modal-card {
    background: white;
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    width: 100%;
    max-width: 900px;
    max-height: 90vh;
    overflow-y: auto;
    position: relative;
    animation: slideUp 0.3s ease-out;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(30px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .register-modal-header {
    padding: 30px 30px 20px;
    border-bottom: 1px solid #e0e0e0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    background: white;
    z-index: 10;
    border-radius: 16px 16px 0 0;
  }

  .register-modal-title {
    font-size: 28px;
    font-weight: bold;
    color: #1e3c72;
    margin: 0;
  }

  .register-modal-close {
    background: none;
    border: none;
    font-size: 28px;
    color: #999;
    cursor: pointer;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: all 0.2s;
  }

  .register-modal-close:hover {
    background: #f5f5f5;
    color: #333;
  }

  .register-modal-body {
    padding: 30px;
    max-height: calc(90vh - 80px);
    overflow-y: auto;
  }

  .register-modal-subtitle {
    text-align: center;
    color: #666;
    margin-bottom: 25px;
    font-size: 14px;
  }

  /* Step Indicator for Email Verification */
  .step-indicator {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 30px 0 40px;
    padding: 0 50px;
    position: relative;
  }

  .step-indicator::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 15%;
    right: 15%;
    height: 2px;
    background: #e0e0e0;
    transform: translateY(-50%);
    z-index: 0;
  }

  .step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    flex: 1;
    position: relative;
    z-index: 1;
  }

  .step-number {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #e0e0e0;
    color: #999;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 16px;
    transition: all 0.3s ease;
  }

  .step.active .step-number {
    background: linear-gradient(135deg, #1e88e5 0%, #1565c0 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(30, 136, 229, 0.3);
  }

  .step-label {
    font-size: 12px;
    color: #999;
    font-weight: 600;
    text-align: center;
    transition: color 0.3s ease;
  }

  .step.active .step-label {
    color: #1e88e5;
  }

  /* Verification UI Elements */
  .verification-intro {
    background: #fef9e7;
    border: 1px solid #fde68a;
    padding: 12px 16px;
    margin: 16px 0;
    border-radius: 6px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }

  .verification-intro .warning-icon {
    color: #f59e0b;
    font-size: 16px;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .verification-intro .warning-content {
    flex: 1;
  }

  .verification-intro .warning-title {
    margin: 0;
    color: #78350f;
    font-size: 13px;
    font-weight: 500;
  }

  .verification-intro .warning-text {
    margin: 0;
    color: #78350f;
    font-size: 13px;
    line-height: 1.5;
  }

  .verification-intro strong {
    color: #1565c0;
    font-weight: 600;
  }

  /* Step Progress for Modal */
  .step-progress-container {
    margin: 25px 0 30px;
  }

  .step-progress {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    gap: 100px;
    position: relative;
  }

  .step-progress .step-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    z-index: 2;
  }

  .step-progress .step-circle {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: #e8e8e8;
    color: #999;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 18px;
    margin-bottom: 12px;
    transition: all 0.3s;
    border: 3px solid #fff;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }

  .step-progress .step-item.active .step-circle {
    background: #1e88e5;
    color: white;
    box-shadow: 0 3px 12px rgba(30, 136, 229, 0.4);
  }

  .step-progress .step-item span {
    font-size: 13px;
    color: #666;
    font-weight: 500;
    text-align: center;
    letter-spacing: 0.3px;
  }

  .step-progress .step-item.active span {
    color: #1e3c72;
    font-weight: 600;
  }

  .step-progress .step-line {
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    width: 200px;
    height: 2px;
    background: #e0e0e0;
    z-index: 1;
  }

  .verification-success {
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    padding: 12px 16px;
    margin: 16px 0;
    border-radius: 6px;
  }

  .verification-success p {
    margin: 0;
    color: #0c4a6e;
    font-size: 13px;
    line-height: 1.5;
  }

  .email-display {
    font-size: 16px !important;
    color: #1565c0 !important;
    font-weight: bold !important;
    font-family: 'Courier New', monospace;
  }

  .verification-code-input {
    text-align: center !important;
    font-size: 24px !important;
    letter-spacing: 8px !important;
    font-family: 'Courier New', monospace !important;
    font-weight: bold !important;
    padding: 15px !important;
  }

  .resend-code {
    text-align: center;
    margin: 15px 0;
  }

  .link-button {
    background: none;
    border: none;
    color: #1e88e5;
    text-decoration: underline;
    cursor: pointer;
    font-size: 14px;
    padding: 5px 10px;
    transition: color 0.2s;
  }

  .link-button:hover {
    color: #1565c0;
  }

  .verified-email {
    background: #e8f5e9 !important;
    border-color: #4caf50 !important;
    color: #2e7d32 !important;
    font-weight: 600 !important;
  }

  .verified-email:disabled {
    opacity: 1 !important;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    .step-indicator {
      padding: 0 20px;
    }

    .step-label {
      font-size: 10px;
    }

    .step-number {
      width: 32px;
      height: 32px;
      font-size: 14px;
    }

    .verification-code-input {
      font-size: 20px !important;
      letter-spacing: 4px !important;
    }
  }

  @media (max-width: 640px) {
    .register-modal-card {
      max-width: 100%;
      max-height: 100vh;
      border-radius: 0;
    }

    .register-modal-header {
      padding: 20px;
      border-radius: 0;
    }

    .register-modal-title {
      font-size: 22px;
    }

    .register-modal-body {
      padding: 20px;
    }
  }
`;

const Login: FC = () => {
  const router = useRouter()
  const pathname = usePathname()
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [rememberMe, setRememberMe] = useState<boolean>(false)
  const [devMode, setDevMode] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [notification, setNotification] = useState({ show: false, type: 'success' as 'success' | 'error' | 'warning' | 'info', message: '' })
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false)
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState<boolean>(false)
  const [isReactivateMode, setIsReactivateMode] = useState<boolean>(false)
  const [forgotPasswordStep, setForgotPasswordStep] = useState<number>(1)
  const [reactivateStep, setReactivateStep] = useState<number>(1) // 1: Email, 2: Verify Code
  const [forgotPasswordData, setForgotPasswordData] = useState({
    email: '',
    resetToken: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [reactivateData, setReactivateData] = useState({
    email: '',
    code: ''
  })

  // Email verification state for registration
  const [registerStep, setRegisterStep] = useState<number>(1) // 1: Email, 2: Verify, 3: Complete
  const [verificationData, setVerificationData] = useState({
    email: '',
    code: '',
    companyName: ''
  })

  // Register form fields - updated to match vendor profile
  const [registerData, setRegisterData] = useState({
    companyName: '',
    companyType: 'PT',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    bankName: '',
    accountNumber: '',
    accountName: '',
    picName: '',
    picPosition: '',
    picPhone: '',
    picEmail: ''
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDevMode(localStorage.getItem('devMode') === 'true')

      // Load Remember Me data
      const savedRememberMe = localStorage.getItem('rememberMe') === 'true'
      const savedEmail = localStorage.getItem('savedEmail') || ''

      if (savedRememberMe && savedEmail) {
        setRememberMe(true)
        setEmail(savedEmail)
      }
    }
  }, [])

  const isVendorLogin = pathname === '/vendor-login'

  // Email Verification Handlers
  const handleRequestVerificationCode = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await requestEmailVerification(
        verificationData.email,
        verificationData.companyName
      )

      if (result.success) {
        setNotification({ show: true, type: 'success', message: result.message })

        // If email failed, show code in console
        if (result.data?.emailFailed && result.data?.verificationCode) {
          console.log('🔐 Kode Verifikasi (Email gagal):', result.data.verificationCode)
        }

        setRegisterStep(2)
      } else {
        setError(result.error || 'Gagal mengirim kode verifikasi')
      }
    } catch (err) {
      setError('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyCode = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await verifyEmailCode(verificationData.email, verificationData.code)

      if (result.success) {
        setNotification({ show: true, type: 'success', message: result.message })

        // Pre-fill email in registration form
        setRegisterData({
          ...registerData,
          email: verificationData.email,
          companyName: verificationData.companyName || registerData.companyName
        })

        setRegisterStep(3)
      } else {
        setError(result.error || 'Kode verifikasi salah')
      }
    } catch (err) {
      setError('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validasi field wajib
      if (!registerData.companyName || !registerData.email || !registerData.address ||
        !registerData.picName || !registerData.picPhone || !registerData.picEmail) {
        setError('Mohon lengkapi semua field yang wajib diisi')
        setLoading(false)
        return
      }

      // 1. Create user account in vendor_users table with status "Pending"
      const { data: newUser, error: userError } = await supabase
        .from('vendor_users')
        .insert([{
          email: registerData.email,
          password: 'PENDING_APPROVAL', // Password temporary, akan diganti saat approved oleh admin
          company_name: registerData.companyName,
          company_type: registerData.companyType,
          address: registerData.address,
          bank_pembayaran: registerData.bankName || null,
          no_rekening: registerData.accountNumber || null,
          nama_rekening: registerData.accountName || null,
          pic_name: registerData.picName,
          pic_position: registerData.picPosition || null,
          pic_phone: registerData.picPhone,
          pic_email: registerData.picEmail,
          status: 'Pending', // Status pending menunggu approval admin
          certificate_url: null,
          certificate_type: null,
          profile_image: null
        }])
        .select()
        .single()

      if (userError) {
        console.error('User creation error:', userError)

        if (userError.code === '23505') {
          setError('Email sudah terdaftar. Gunakan email lain.')
        } else {
          setError(`Gagal mendaftar: ${userError.message}`)
        }
        setLoading(false)
        return
      }

      // Registrasi berhasil - tampilkan notifikasi
      setNotification({
        show: true,
        type: 'success',
        message: `Pendaftaran berhasil!\n\nData Anda sedang dalam proses verifikasi oleh Admin.\nPassword untuk login akan dikirimkan ke email ${registerData.email} setelah data diverifikasi.`
      })

      // Reset form dan kembali ke login
      setRegisterData({
        companyName: '',
        companyType: 'PT',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        address: '',
        bankName: '',
        accountNumber: '',
        accountName: '',
        picName: '',
        picPosition: '',
        picPhone: '',
        picEmail: ''
      })
      setIsRegisterMode(false)
      setRegisterStep(1)
      setVerificationData({ email: '', companyName: '', code: '' })

    } catch (err) {
      console.error('Register error:', err)
      const errorMessage = err && typeof err === 'object' && 'message' in err
        ? err.message
        : 'Terjadi kesalahan saat registrasi. Silakan coba lagi.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Forgot Password Handlers
  const handleForgotPasswordRequest = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await requestPasswordReset(forgotPasswordData.email)

      if (result.success) {
        // Jika email berhasil dikirim, tidak tampilkan kode di alert
        if (result.data?.resetToken) {
          // Fallback: jika email gagal, kode ditampilkan
          setNotification({ show: true, type: 'warning', message: result.message + '\n\nKode reset: ' + result.data.resetToken + '\n(Email gagal terkirim, gunakan kode ini)' })
        } else {
          // Email berhasil dikirim
          setNotification({ show: true, type: 'success', message: result.message })
        }
        setForgotPasswordStep(2)
      } else {
        setError(result.error || 'Terjadi kesalahan')
      }
    } catch (err) {
      setError('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (forgotPasswordData.newPassword !== forgotPasswordData.confirmPassword) {
        setError('Password tidak cocok')
        setLoading(false)
        return
      }

      const result = await resetPassword(
        forgotPasswordData.email,
        forgotPasswordData.resetToken,
        forgotPasswordData.newPassword
      )

      if (result.success) {
        setNotification({ show: true, type: 'success', message: result.message })
        setIsForgotPasswordMode(false)
        setForgotPasswordStep(1)
        setForgotPasswordData({
          email: '',
          resetToken: '',
          newPassword: '',
          confirmPassword: ''
        })
      } else {
        setError(result.error || 'Terjadi kesalahan')
      }
    } catch (err) {
      setError('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const handleSendReactivationCode = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await sendReactivationCode(reactivateData.email)

      if (result.success) {
        setNotification({ show: true, type: 'success', message: result.message })
        setReactivateStep(2)
      } else {
        setError(result.error || 'Gagal mengirim kode reaktivasi')
      }
    } catch (err) {
      setError('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyReactivationCode = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await verifyReactivationCode(reactivateData.email, reactivateData.code)

      if (result.success) {
        setNotification({ show: true, type: 'success', message: result.message })
        setIsReactivateMode(false)
        setReactivateStep(1)
        setReactivateData({ email: '', code: '' })
        // User can now login
      } else {
        setError(result.error || 'Kode verifikasi salah')
      }
    } catch (err) {
      setError('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (devMode) {
        if (isVendorLogin) {
          // In dev mode, hash password before checking
          const hashedPassword = hashPassword(password)

          // In dev mode, still authenticate properly to get the real user ID
          const { data: user, error: authError } = await supabase
            .from('vendor_users')
            .select('*')
            .eq('email', email)
            .eq('password', hashedPassword)
            .single()

          if (authError || !user) {
            setError('Email atau password salah')
            setLoading(false)
            return
          }

          // Check if account is not activated yet (pending invitation)
          if (user.is_activated === false) {
            setError('Akun Anda belum diaktifkan. Silakan cek email untuk link aktivasi.')
            setLoading(false)
            return
          }

          // Check if account is pending approval
          if (user.status === 'Pending' || user.status === 'Menunggu Aktivasi') {
            setError('Akun Anda masih dalam proses verifikasi oleh Admin. Password login akan dikirimkan ke email Anda setelah akun disetujui.')
            setLoading(false)
            return
          }

          // Check if account is rejected
          if (user.status === 'Ditolak') {
            setError('Maaf, pengajuan akun Anda telah ditolak oleh Admin. Silakan hubungi admin untuk informasi lebih lanjut.')
            setLoading(false)
            return
          }

          // Check if account is deactivated
          if (user.status === 'Tidak Aktif') {
            setError('Akun Anda telah dinonaktifkan.')
            setLoading(false)
            return
          }

          localStorage.setItem('vendorLoggedIn', 'true')
          localStorage.setItem('vendorEmail', email)
          localStorage.setItem('vendorUserId', user.id.toString()) // Use real user ID
          localStorage.setItem('vendorProfile', JSON.stringify({
            userId: user.id,
            email: user.email,
            companyName: user.company_name || '',
            picName: user.pic_name || '',
            profileImage: user.profile_image || ''
          }))
          router.push('/vendor-portal')
        } else {
          localStorage.setItem('adminLoggedIn', 'true')
          localStorage.setItem('adminEmail', email || 'admin@demo.com')
          router.push('/dashboard')
        }
        setLoading(false)
        return
      }

      if (!email || !password) {
        setError('Email dan password harus diisi')
        setLoading(false)
        return
      }

      if (isVendorLogin) {
        // Hash password before checking
        const hashedPassword = hashPassword(password)

        // Authenticate vendor from vendor_users table
        const { data: user, error: authError } = await supabase
          .from('vendor_users')
          .select('*')
          .eq('email', email)
          .eq('password', hashedPassword)
          .single()

        if (authError || !user) {
          setError('Email atau password salah')
          setLoading(false)
          return
        }

        // Check if account is not activated yet (pending invitation)
        if (user.is_activated === false) {
          setError('Akun Anda belum diaktifkan. Silakan cek email untuk link aktivasi atau hubungi admin.')
          setLoading(false)
          return
        }

        // Check if account is pending approval
        if (user.status === 'Pending' || user.status === 'Menunggu Aktivasi') {
          setError('Akun Anda masih dalam proses verifikasi oleh Admin. Password login akan dikirimkan ke email Anda setelah akun disetujui.')
          setLoading(false)
          return
        }

        // Check if account is rejected
        if (user.status === 'Ditolak') {
          setError('Maaf, pengajuan akun Anda telah ditolak oleh Admin. Silakan hubungi admin untuk informasi lebih lanjut.')
          setLoading(false)
          return
        }

        // Check if account is deactivated
        if (user.status === 'Tidak Aktif') {
          setError('Akun Anda telah dinonaktifkan.')
          setLoading(false)
          return
        }

        // Check if account is deactivated
        if (user.status === 'Tidak Aktif') {
          setError('Akun Anda telah dinonaktifkan. Silakan aktifkan kembali akun Anda melalui halaman reaktivasi.')
          setLoading(false)
          return
        }

        // Store login session
        localStorage.setItem('vendorLoggedIn', 'true')
        localStorage.setItem('vendorEmail', email)
        localStorage.setItem('vendorUserId', user.id.toString())

        // Store complete profile data
        localStorage.setItem('vendorProfile', JSON.stringify({
          userId: user.id,
          email: user.email,
          companyName: user.company_name || '',
          picName: user.pic_name || '',
          profileImage: user.profile_image || ''
        }))

        // Handle Remember Me
        if (rememberMe) {
          localStorage.setItem('rememberMe', 'true')
          localStorage.setItem('savedEmail', email)
        } else {
          localStorage.removeItem('rememberMe')
          localStorage.removeItem('savedEmail')
        }

        console.log('Vendor logged in:', user.id, user.email)
        router.push('/vendor-portal')
      } else {
        const result = await loginService(email, password)

        if (result.success) {
          console.log('Login berhasil:', 'data' in result ? result.data : null)

          // Handle Remember Me
          if (rememberMe) {
            localStorage.setItem('rememberMe', 'true')
            localStorage.setItem('savedEmail', email)
          } else {
            localStorage.removeItem('rememberMe')
            localStorage.removeItem('savedEmail')
          }

          router.push('/dashboard')
        } else {
          setError(('error' in result ? result.error : null) || 'Email atau password salah')
        }
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const toggleDevMode = (): void => {
    const newDevMode = !devMode
    setDevMode(newDevMode)
    localStorage.setItem('devMode', newDevMode.toString())

    if (newDevMode) {
      if (isVendorLogin) {
        localStorage.setItem('vendorLoggedIn', 'true')
        localStorage.setItem('vendorEmail', 'vendor@demo.com')
        router.push('/vendor-portal')
      } else {
        localStorage.setItem('adminLoggedIn', 'true')
        localStorage.setItem('adminEmail', 'admin@demo.com')
        router.push('/dashboard')
      }
    }
  }

  const platforms: Platform[] = [
    {
      logo: '/images/Logo SAKTI 3.png',
      name: 'SAKTI',
      description: 'Sistem Arsip & Kontrak Terintegrasi - Platform Digital Terpadu untuk Manajemen Surat Vendor PLN'
    },
    {
      logo: '/images/Logo_PLN.png',
      name: 'PT PLN (Persero)',
      description: 'Perusahaan Listrik Negara - Menerangi Indonesia dengan energi yang andal dan berkelanjutan'
    },
    {
      logo: '/images/Danantara.jpg',
      name: 'Danantara Indonesia',
      description: 'Danantara Indonesia - Mengakselerasi transformasi ekonomi nasional melalui sinergi perusahaan strategis'
    },
    {
      logo: '/images/Logo_UNSRAT.png',
      name: 'Universitas Sam Ratulangi',
      description: 'Program Magang - Kemitraan pendidikan untuk mengembangkan talenta digital Indonesia'
    }
  ]

  return (
    <LoginContainer>
      <div className="left-section">
        <div className="sso-header">
          <h1 className="sso-title">Sistem Manajemen Vendor</h1>
          <p className="sso-subtitle">
            Selamat datang di SAKTI - Platform Digital Terpadu untuk Manajemen Surat dan Aset Vendor PT PLN (Persero).<br />
            Kelola dokumen vendor, aset, dan laporan dengan sistem yang aman, efisien, dan terintegrasi.
          </p>
        </div>

        <div className="platforms-list">
          {platforms.map((platform, index) => (
            <div key={index} className="platform-item">
              <div className="platform-icon">
                <img src={platform.logo} alt={platform.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <div className="platform-info">
                <h3 className="platform-name">{platform.name}</h3>
                <p className="platform-desc">{platform.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="right-section">
        <div className="back-button"></div>

        <div className="login-form-wrapper">
          <div className="login-logo">
            <img src="/images/Logo SAKTI 2.png" alt="SAKTI Logo" className="sakti-logo" />
          </div>

          <form className="login-form" onSubmit={handleLogin}>
            <h1 className="form-title">
              {isVendorLogin ? 'Login Sebagai Vendor' : 'Login Sebagai Admin'}
            </h1>
            <p className="form-greeting">
              Selamat Datang di <span className="highlight">SAKTI</span>
            </p>

            {error && (
              <div className="error-message">
                <span className="error-icon">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <div className="input-group">
              <label className="input-label">
                Email atau No. Handphone <span className="required">*</span>
              </label>
              <input
                type="text"
                placeholder="example@pln.co.id"
                value={email}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                className="input-field"
                required
                disabled={loading}
              />
            </div>

            <div className="input-group">
              <label className="input-label">
                Password <span className="required">*</span>
              </label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••"
                  value={password}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  className="input-field"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                >
                </button>
              </div>
            </div>

            <div className="form-options">
              <label className="remember-me">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setRememberMe(e.target.checked)}
                  disabled={loading}
                />
                <span>Ingat Saya</span>
              </label>
              <a
                href="#"
                className="forgot-password"
                onClick={(e) => {
                  e.preventDefault();
                  setIsForgotPasswordMode(true);
                  setError('');
                }}
              >
                Lupa Password
              </a>
            </div>

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? 'Memproses...' : 'LOGIN'}
            </button>

            {isVendorLogin ? (
              <>
                <p className="register-text">
                  Belum punya akun vendor? <a href="#" className="register-link" onClick={(e) => { e.preventDefault(); setIsRegisterMode(true); setError(''); }}>Daftar Sekarang</a>
                </p>
                <p className="register-text" style={{ marginTop: '10px' }}>
                  Ingin melakukan aktivasi akun? <a href="/vendor-activate" className="register-link">Aktifkan di sini</a>
                </p>
                <p className="register-text" style={{ marginTop: '10px' }}>
                  Akun dinonaktifkan? <a href="#" className="register-link" onClick={(e) => { e.preventDefault(); setIsReactivateMode(true); setError(''); }}>Aktifkan Kembali</a>
                </p>
              </>
            ) : (
              <p className="register-text">
                Login sebagai vendor? <a href="/vendor-login" className="register-link">Klik di sini</a>
              </p>
            )}
          </form>

          <div className="footer">
            <p className="footer-text">Powered by UPT PLN Manado</p>
          </div>
        </div>
      </div>

      {/* Register Modal Popup */}
      {isRegisterMode && (
        <div className="register-modal-overlay" onClick={() => {
          setIsRegisterMode(false);
          setRegisterStep(1);
          setError('');
        }}>
          <div className="register-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="register-modal-header">
              <h2 className="register-modal-title">Daftar Vendor Baru</h2>
              <button className="register-modal-close" onClick={() => {
                setIsRegisterMode(false);
                setRegisterStep(1);
                setError('');
              }}>
                ×
              </button>
            </div>

            <div className="register-modal-body">
              {/* Step Indicator */}
              <div className="step-indicator">
                <div className={`step ${registerStep >= 1 ? 'active' : ''}`}>
                  <div className="step-number">1</div>
                  <div className="step-label">Email</div>
                </div>
                <div className={`step ${registerStep >= 2 ? 'active' : ''}`}>
                  <div className="step-number">2</div>
                  <div className="step-label">Verifikasi</div>
                </div>
                <div className={`step ${registerStep >= 3 ? 'active' : ''}`}>
                  <div className="step-number">3</div>
                  <div className="step-label">Data Lengkap</div>
                </div>
              </div>

              {error && (
                <div className="error-message">
                  <span className="error-icon">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Step 1: Input Email */}
              {registerStep === 1 && (
                <form onSubmit={handleRequestVerificationCode}>
                  <div className="verification-intro">
                    <span className="warning-icon">
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.64537 18.3024 1.55296 18.6453 1.55199 18.9945C1.55101 19.3437 1.64151 19.6871 1.81445 19.9905C1.98738 20.2939 2.23675 20.5467 2.53773 20.7239C2.83871 20.901 3.18082 20.9962 3.53 21H20.47C20.8192 20.9962 21.1613 20.901 21.4623 20.7239C21.7633 20.5467 22.0126 20.2939 22.1856 19.9905C22.3585 19.6871 22.449 19.3437 22.448 18.9945C22.447 18.6453 22.3546 18.3024 22.18 18L13.71 3.86C13.5317 3.56611 13.2807 3.32312 12.9812 3.15448C12.6817 2.98585 12.3437 2.89725 12 2.89725C11.6563 2.89725 11.3183 2.98585 11.0188 3.15448C10.7193 3.32312 10.4683 3.56611 10.29 3.86Z" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <div className="warning-content">
                      <div className="warning-title">Verifikasi Email Diperlukan</div>
                      <div className="warning-text">
                        Masukkan email perusahaan Anda. Kami akan mengirimkan <strong>kode verifikasi 6 digit</strong> ke email tersebut untuk memastikan email valid.
                      </div>
                    </div>
                  </div>

                  <div className="input-group">
                    <label className="input-label">
                      Email Perusahaan <span className="required">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="info@perusahaan.com"
                      value={verificationData.email}
                      onChange={(e) => setVerificationData({ ...verificationData, email: e.target.value })}
                      className="input-field"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">
                      Nama Perusahaan (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="PT Nama Perusahaan"
                      value={verificationData.companyName}
                      onChange={(e) => setVerificationData({ ...verificationData, companyName: e.target.value })}
                      className="input-field"
                      disabled={loading}
                    />
                    <small style={{ display: 'block', marginTop: '6px', fontSize: '12px', color: '#666' }}>
                      Untuk personalisasi email verifikasi
                    </small>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <button type="submit" className="submit-btn" disabled={loading}>
                      {loading ? 'Mengirim...' : 'Kirim Kode Verifikasi'}
                    </button>

                    <button
                      type="button"
                      className="back-btn"
                      onClick={() => {
                        setIsRegisterMode(false);
                        setRegisterStep(1);
                        setError('');
                      }}
                    >
                      Batal
                    </button>
                  </div>
                </form>
              )}

              {/* Step 2: Verify Code */}
              {registerStep === 2 && (
                <form onSubmit={handleVerifyCode}>
                  <div className="verification-success">
                    <div className="warning-content">
                      <p style={{ marginBottom: '4px' }}>Kode verifikasi telah dikirim ke:</p>
                      <p className="email-display" style={{ fontSize: '15px', fontWeight: '600' }}>{verificationData.email}</p>
                    </div>
                  </div>

                  <div className="verification-intro">
                    <div className="warning-icon">⚠</div>
                    <div className="warning-content">
                      <p className="warning-text">Silakan cek <strong>inbox</strong> atau <strong>folder spam</strong> email Anda. Masukkan kode 6 digit yang dikirimkan (berlaku 15 menit).</p>
                    </div>
                  </div>

                  <div className="input-group">
                    <label className="input-label">
                      Kode Verifikasi <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="123456"
                      value={verificationData.code}
                      onChange={(e) => setVerificationData({ ...verificationData, code: e.target.value })}
                      className="input-field verification-code-input"
                      maxLength={6}
                      pattern="[0-9]{6}"
                      required
                      disabled={loading}
                      autoFocus
                    />
                  </div>

                  {/* Button Group - Center aligned */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '24px' }}>
                    <button
                      type="button"
                      className="submit-btn"
                      onClick={() => {
                        setVerificationData({ ...verificationData, code: '' });
                        setRegisterStep(1);
                      }}
                      style={{
                        flex: 1,
                        background: 'linear-gradient(135deg, #1e88e5 0%, #1565c0 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                        <path d="M21 3v5h-5" />
                        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                        <path d="M3 21v-5h5" />
                      </svg>
                      Kirim Ulang Kode
                    </button>

                    <button type="submit" className="submit-btn" disabled={loading} style={{ flex: 1, background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      {loading ? (
                        'Memverifikasi...'
                      ) : (
                        <>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          Verifikasi Email
                        </>
                      )}
                    </button>
                  </div>

                  {/* Cancel Button - Right aligned */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button
                      type="button"
                      className="back-btn"
                      onClick={() => {
                        setIsRegisterMode(false);
                        setRegisterStep(1);
                        setError('');
                      }}
                    >
                      Batal
                    </button>
                  </div>
                </form>
              )}

              {/* Step 3: Complete Registration Form */}
              {registerStep === 3 && (
                <>
                  <div className="verification-success" style={{ marginBottom: '20px' }}>
                    <div className="warning-content">
                      <p style={{ marginBottom: '4px' }}>Email berhasil diverifikasi!</p>
                      <p>Silakan lengkapi data perusahaan Anda.</p>
                    </div>
                  </div>

                  <form onSubmit={handleRegister}>
                    {/* Informasi Perusahaan */}
                    <h3 className="section-title" style={{ fontSize: '16px', fontWeight: '600', color: '#1e3c72', marginTop: '20px', marginBottom: '15px', borderBottom: '2px solid #1e88e5', paddingBottom: '8px' }}>
                      Informasi Perusahaan
                    </h3>

                    <div className="input-group">
                      <label className="input-label">
                        Nama Perusahaan <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="PT Nama Perusahaan"
                        value={registerData.companyName}
                        onChange={(e) => setRegisterData({ ...registerData, companyName: e.target.value })}
                        className="input-field"
                        required
                        disabled={loading}
                      />
                    </div>

                    <div className="input-group">
                      <label className="input-label">
                        Jenis Badan Usaha <span className="required">*</span>
                      </label>
                      <select
                        value={registerData.companyType}
                        onChange={(e) => setRegisterData({ ...registerData, companyType: e.target.value })}
                        className="input-field"
                        required
                        disabled={loading}
                        style={{ cursor: 'pointer' }}
                      >
                        <option value="PT">PT (Perseroan Terbatas)</option>
                        <option value="CV">CV (Commanditaire Vennootschap)</option>
                        <option value="UD">UD (Usaha Dagang)</option>
                        <option value="Koperasi">Koperasi</option>
                        <option value="Yayasan">Yayasan</option>
                      </select>
                    </div>

                    <div className="input-group">
                      <label className="input-label">
                        Alamat Lengkap Perusahaan <span className="required">*</span>
                      </label>
                      <textarea
                        placeholder="Jalan, Nomor, RT/RW, Kelurahan, Kecamatan, Kota, Provinsi, Kode Pos"
                        value={registerData.address}
                        onChange={(e) => setRegisterData({ ...registerData, address: e.target.value })}
                        className="input-field"
                        required
                        disabled={loading}
                        rows={3}
                        style={{ resize: 'vertical', fontFamily: 'inherit' }}
                      />
                    </div>

                    {/* Informasi Bank */}
                    <h3 className="section-title" style={{ fontSize: '16px', fontWeight: '600', color: '#1e3c72', marginTop: '20px', marginBottom: '15px', borderBottom: '2px solid #1e88e5', paddingBottom: '8px' }}>
                      Informasi Bank (Opsional)
                    </h3>

                    <div className="input-group">
                      <label className="input-label">Bank Pembayaran</label>
                      <input
                        type="text"
                        placeholder="Bank Mandiri"
                        value={registerData.bankName}
                        onChange={(e) => setRegisterData({ ...registerData, bankName: e.target.value })}
                        className="input-field"
                        disabled={loading}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <div className="input-group">
                        <label className="input-label">No. Rekening</label>
                        <input
                          type="text"
                          placeholder="1234567890"
                          value={registerData.accountNumber}
                          onChange={(e) => {
                            const numericOnly = e.target.value.replace(/\D/g, '');
                            setRegisterData({ ...registerData, accountNumber: numericOnly })
                          }}
                          className="input-field"
                          disabled={loading}
                          inputMode="numeric"
                        />
                      </div>

                      <div className="input-group">
                        <label className="input-label">Nama Rekening</label>
                        <input
                          type="text"
                          placeholder="PT Nama Perusahaan"
                          value={registerData.accountName}
                          onChange={(e) => setRegisterData({ ...registerData, accountName: e.target.value })}
                          className="input-field"
                          disabled={loading}
                        />
                      </div>
                    </div>

                    {/* Penanggung Jawab */}
                    <h3 className="section-title" style={{ fontSize: '16px', fontWeight: '600', color: '#1e3c72', marginTop: '20px', marginBottom: '15px', borderBottom: '2px solid #1e88e5', paddingBottom: '8px' }}>
                      Penanggung Jawab
                    </h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <div className="input-group">
                        <label className="input-label">
                          Nama Lengkap <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Budi Santoso"
                          value={registerData.picName}
                          onChange={(e) => setRegisterData({ ...registerData, picName: e.target.value })}
                          className="input-field"
                          required
                          disabled={loading}
                        />
                      </div>

                      <div className="input-group">
                        <label className="input-label">
                          No. Telepon <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="08123456789"
                          value={registerData.picPhone}
                          onChange={(e) => {
                            const numericOnly = e.target.value.replace(/\D/g, '');
                            setRegisterData({ ...registerData, picPhone: numericOnly })
                          }}
                          className="input-field"
                          required
                          disabled={loading}
                          inputMode="numeric"
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <div className="input-group">
                        <label className="input-label">Jabatan</label>
                        <input
                          type="text"
                          placeholder="Direktur"
                          value={registerData.picPosition}
                          onChange={(e) => setRegisterData({ ...registerData, picPosition: e.target.value })}
                          className="input-field"
                          disabled={loading}
                        />
                      </div>

                      <div className="input-group">
                        <label className="input-label">
                          Email Perusahaan <span className="required">*</span>
                        </label>
                        <input
                          type="email"
                          placeholder="info@perusahaan.com"
                          value={registerData.picEmail}
                          onChange={(e) => setRegisterData({ ...registerData, picEmail: e.target.value })}
                          className="input-field"
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div style={{
                      background: '#fff3cd',
                      border: '1px solid #ffc107',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      marginTop: '20px',
                      marginBottom: '20px'
                    }}>
                      <p style={{ margin: 0, fontSize: '13px', color: '#856404', lineHeight: '1.5' }}>
                        <strong>⚠️ Penting:</strong><br />
                        Setelah mendaftar, akun Anda akan dalam status <strong>Pending</strong> menunggu verifikasi dari Admin.<br />
                        Password untuk login akan dikirimkan ke email Anda setelah data diverifikasi dan disetujui.
                      </p>
                    </div>

                    <button type="submit" className="login-button" disabled={loading} style={{ marginTop: '20px' }}>
                      {loading ? 'Memproses...' : 'DAFTAR'}
                    </button>

                    <p className="register-text">
                      Sudah punya akun? <a href="#" className="register-link" onClick={(e) => {
                        e.preventDefault();
                        setIsRegisterMode(false);
                        setRegisterStep(1);
                        setError('');
                      }}>Login di sini</a>
                    </p>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {isForgotPasswordMode && (
        <div className="register-modal-overlay" onClick={() => { setIsForgotPasswordMode(false); setError(''); setForgotPasswordStep(1); }}>
          <div className="register-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="register-modal-header">
              <h2 className="register-modal-title">Lupa Password</h2>
              <button className="register-modal-close" onClick={() => { setIsForgotPasswordMode(false); setError(''); setForgotPasswordStep(1); }}>
                ×
              </button>
            </div>

            <div className="register-modal-body">
              {error && (
                <div className="error-message">
                  <span className="error-icon">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {forgotPasswordStep === 1 ? (
                <form onSubmit={handleForgotPasswordRequest}>
                  <p style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>
                    Masukkan email yang terdaftar untuk menerima kode reset password.
                  </p>

                  <div className="input-group">
                    <label className="input-label">
                      Email Terdaftar <span className="required">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="vendor@example.com"
                      value={forgotPasswordData.email}
                      onChange={(e) => setForgotPasswordData({ ...forgotPasswordData, email: e.target.value })}
                      className="input-field"
                      required
                      disabled={loading}
                    />
                  </div>

                  <button type="submit" className="login-button" disabled={loading} style={{ marginTop: '20px', width: '100%' }}>
                    {loading ? 'Mengirim...' : 'Kirim Kode Reset'}
                  </button>

                  <p className="register-text" style={{ marginTop: '15px' }}>
                    Ingat password? <a href="#" className="register-link" onClick={(e) => { e.preventDefault(); setIsForgotPasswordMode(false); setError(''); }}>Login di sini</a>
                  </p>
                </form>
              ) : (
                <form onSubmit={handlePasswordReset}>
                  <p style={{ marginBottom: '20px', color: '#666', fontSize: '14px' }}>
                    Masukkan kode reset yang telah dikirim ke email Anda.
                  </p>

                  <div className="input-group">
                    <label className="input-label">
                      Kode Reset (6 digit) <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="123456"
                      value={forgotPasswordData.resetToken}
                      onChange={(e) => setForgotPasswordData({ ...forgotPasswordData, resetToken: e.target.value })}
                      className="input-field"
                      maxLength={6}
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">
                      Password Baru <span className="required">*</span>
                    </label>
                    <input
                      type="password"
                      placeholder="Minimal 6 karakter"
                      value={forgotPasswordData.newPassword}
                      onChange={(e) => setForgotPasswordData({ ...forgotPasswordData, newPassword: e.target.value })}
                      className="input-field"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="input-group">
                    <label className="input-label">
                      Konfirmasi Password <span className="required">*</span>
                    </label>
                    <input
                      type="password"
                      placeholder="Ulangi password baru"
                      value={forgotPasswordData.confirmPassword}
                      onChange={(e) => setForgotPasswordData({ ...forgotPasswordData, confirmPassword: e.target.value })}
                      className="input-field"
                      required
                      disabled={loading}
                    />
                  </div>

                  <button type="submit" className="login-button" disabled={loading} style={{ marginTop: '20px', width: '100%' }}>
                    {loading ? 'Mengubah Password...' : 'Reset Password'}
                  </button>

                  <p className="register-text" style={{ marginTop: '15px' }}>
                    <a href="#" className="register-link" onClick={(e) => { e.preventDefault(); setForgotPasswordStep(1); setError(''); }}>Kembali</a>
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reactivate Account Modal */}
      {isReactivateMode && (
        <div className="register-modal-overlay" onClick={() => { setIsReactivateMode(false); setError(''); setReactivateStep(1); }}>
          <div className="register-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="register-modal-header">
              <h2 className="register-modal-title">Reaktivasi Akun Vendor</h2>
              <button className="register-modal-close" onClick={() => { setIsReactivateMode(false); setError(''); setReactivateStep(1); }}>
                ×
              </button>
            </div>

            <div className="register-modal-body">
              {error && (
                <div className="error-message">
                  <span className="error-icon">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Step Progress Indicator */}
              <div className="step-progress-container" style={{ marginBottom: '24px' }}>
                <div className="step-progress">
                  <div className={`step-item ${reactivateStep >= 1 ? 'active' : ''}`}>
                    <div className="step-circle">1</div>
                    <span>Email</span>
                  </div>
                  <div className="step-line"></div>
                  <div className={`step-item ${reactivateStep >= 2 ? 'active' : ''}`}>
                    <div className="step-circle">2</div>
                    <span>Verifikasi</span>
                  </div>
                </div>
              </div>

              {/* Step 1: Input Email */}
              {reactivateStep === 1 && (
                <form onSubmit={handleSendReactivationCode}>
                  <div className="verification-intro">
                    <span className="warning-icon">
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.64537 18.3024 1.55296 18.6453 1.55199 18.9945C1.55101 19.3437 1.64151 19.6871 1.81445 19.9905C1.98738 20.2939 2.23675 20.5467 2.53773 20.7239C2.83871 20.901 3.18082 20.9962 3.53 21H20.47C20.8192 20.9962 21.1613 20.901 21.4623 20.7239C21.7633 20.5467 22.0126 20.2939 22.1856 19.9905C22.3585 19.6871 22.449 19.3437 22.448 18.9945C22.447 18.6453 22.3546 18.3024 22.18 18L13.71 3.86C13.5317 3.56611 13.2807 3.32312 12.9812 3.15448C12.6817 2.98585 12.3437 2.89725 12 2.89725C11.6563 2.89725 11.3183 2.98585 11.0188 3.15448C10.7193 3.32312 10.4683 3.56611 10.29 3.86Z" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <div className="warning-content">
                      <strong>Aktifkan Kembali Akun Anda</strong>
                      <p>Masukkan email akun yang dinonaktifkan. Kami akan mengirimkan kode verifikasi 6 digit untuk mengaktifkan kembali akun Anda.</p>
                    </div>
                  </div>

                  <div className="input-group">
                    <label className="input-label">
                      Email Akun yang Dinonaktifkan <span className="required">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="vendor@example.com"
                      value={reactivateData.email}
                      onChange={(e) => setReactivateData({ ...reactivateData, email: e.target.value })}
                      className="input-field"
                      required
                      disabled={loading}
                    />
                  </div>

                  <button type="submit" className="submit-btn" disabled={loading} style={{ marginTop: '20px', width: '100%' }}>
                    {loading ? 'Mengirim...' : 'Kirim Kode Verifikasi'}
                  </button>

                  <p className="register-text" style={{ marginTop: '15px' }}>
                    Sudah punya kode? <a href="#" className="register-link" onClick={(e) => { e.preventDefault(); setReactivateStep(2); setError(''); }}>Masukkan Kode</a>
                  </p>
                </form>
              )}

              {/* Step 2: Verify Code */}
              {reactivateStep === 2 && (
                <form onSubmit={handleVerifyReactivationCode}>
                  <div className="verification-intro">
                    <span className="warning-icon">
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.64537 18.3024 1.55296 18.6453 1.55199 18.9945C1.55101 19.3437 1.64151 19.6871 1.81445 19.9905C1.98738 20.2939 2.23675 20.5467 2.53773 20.7239C2.83871 20.901 3.18082 20.9962 3.53 21H20.47C20.8192 20.9962 21.1613 20.901 21.4623 20.7239C21.7633 20.5467 22.0126 20.2939 22.1856 19.9905C22.3585 19.6871 22.449 19.3437 22.448 18.9945C22.447 18.6453 22.3546 18.3024 22.18 18L13.71 3.86C13.5317 3.56611 13.2807 3.32312 12.9812 3.15448C12.6817 2.98585 12.3437 2.89725 12 2.89725C11.6563 2.89725 11.3183 2.98585 11.0188 3.15448C10.7193 3.32312 10.4683 3.56611 10.29 3.86Z" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    <div className="warning-content">
                      <strong>Kode Verifikasi Telah Dikirim</strong>
                      <p>Masukkan kode verifikasi 6 digit yang telah dikirim ke <strong>{reactivateData.email}</strong></p>
                    </div>
                  </div>

                  <div className="input-group">
                    <label className="input-label">
                      Kode Verifikasi (6 Digit) <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="123456"
                      value={reactivateData.code}
                      onChange={(e) => setReactivateData({ ...reactivateData, code: e.target.value.replace(/\D/g, '') })}
                      maxLength={6}
                      className="input-field"
                      style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '4px' }}
                      required
                      disabled={loading}
                    />
                    <small style={{ display: 'block', marginTop: '6px', color: '#666', fontSize: '12px' }}>
                      Masukkan kode 6 digit yang dikirim ke email Anda
                    </small>
                  </div>

                  <button type="submit" className="submit-btn" disabled={loading || reactivateData.code.length !== 6} style={{ marginTop: '20px', width: '100%' }}>
                    {loading ? 'Memverifikasi...' : 'Aktifkan Akun'}
                  </button>

                  <p className="register-text" style={{ marginTop: '15px' }}>
                    Tidak menerima kode? <a href="#" className="register-link" onClick={(e) => { e.preventDefault(); setReactivateStep(1); setError(''); }}>Kirim Ulang</a>
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Notification Modal */}
      <NotificationModal
        show={notification.show}
        type={notification.type}
        message={notification.message}
        onClose={() => setNotification({ ...notification, show: false })}
      />
    </LoginContainer>
  )
}

export default Login
