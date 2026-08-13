import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import { GoogleOAuthProvider } from '@react-oauth/google'
import '@/styles/globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { I18nProvider } from '@/i18n/I18nProvider'
import { OfflineBanner } from '@/components/feedback/OfflineBanner'
import { ToastViewport } from '@/components/feedback/ToastViewport'

// Public Google OAuth client ID — inlined into the browser bundle (safe to
// expose; it carries no secret). The "Continue with Google" button on /login
// needs this provider in the tree.
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

const dmSans = DM_Sans({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'ProSiddhi - Find Jobs Near You',
  description: 'Search and apply for jobs in your language. No degree needed, just your effort.',
  keywords: ['jobs', 'employment', 'workers', 'India', 'job search'],
  // Icon-only mark — the wordmark is unreadable at 16–32px. The .ico carries
  // 16/32/48 for the tab; the PNGs cover higher-DPI and Android home-screen use.
  icons: {
    icon: [
      { url: '/assets/prosiddhi-favicon.ico', sizes: 'any' },
      { url: '/assets/prosiddhi-icon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/assets/prosiddhi-icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: '/assets/prosiddhi-icon-192.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body className={`${dmSans.className} antialiased`}>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <I18nProvider>
            <AuthProvider>
              <OfflineBanner />
              {children}
              <ToastViewport />
            </AuthProvider>
          </I18nProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  )
}
