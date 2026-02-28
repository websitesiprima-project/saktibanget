/**
 * Password Hashing Utility
 * 
 * Menggunakan crypto-js untuk konsistensi hashing antara browser dan server.
 * Menggantikan Node.js crypto yang tidak bekerja di browser.
 */

import CryptoJS from 'crypto-js'

// Salt untuk password hashing
const SALT = process.env.NEXT_PUBLIC_PASSWORD_SALT || 'sakti_pln_salt'

/**
 * Hash password menggunakan SHA-256
 * Function ini bekerja konsisten di browser maupun server
 * 
 * @param password - Password plain text yang akan di-hash
 * @returns Hash password dalam format hex (64 karakter)
 */
export const hashPassword = (password: string): string => {
    return CryptoJS.SHA256(password + SALT).toString(CryptoJS.enc.Hex)
}

/**
 * Verify password dengan membandingkan hash
 * 
 * @param inputPassword - Password yang diinput user
 * @param hashedPassword - Password hash dari database
 * @returns Boolean apakah password cocok
 */
export const verifyPassword = (inputPassword: string, hashedPassword: string): boolean => {
    const inputHash = hashPassword(inputPassword)
    return inputHash === hashedPassword
}

/**
 * Generate random password
 * 
 * @param length - Panjang password (default: 12)
 * @returns Random password string
 */
export const generatePassword = (length: number = 12): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let password = ''
    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
}
