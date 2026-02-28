import { Plus_Jakarta_Sans, Outfit } from 'next/font/google'
import '../index.css'
import StyledComponentsRegistry from '../lib/registry'

const plusJakarta = Plus_Jakarta_Sans({
    subsets: ['latin'],
    variable: '--font-plus-jakarta',
    display: 'swap',
})

const outfit = Outfit({
    subsets: ['latin'],
    variable: '--font-outfit',
    display: 'swap',
})

export const metadata = {
    title: 'PLN SAKTI - Sistem Arsip & Kontrak Terintegrasi',
    description: 'Platform Digital Terpadu untuk Manajemen Surat Vendor PT. PLN Persero - Sistem Arsip & Kontrak Terintegrasi',
    icons: {
        icon: '/images/Logo SAKTI 3.png',
    },
}

export default function RootLayout({ children }) {
    return (
        <html lang="id">
            <body className={`${plusJakarta.variable} ${outfit.variable}`} suppressHydrationWarning={true}>
                <StyledComponentsRegistry>{children}</StyledComponentsRegistry>
            </body>
        </html>
    )
}
