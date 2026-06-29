import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import { GoogleOAuthProvider } from '@react-oauth/google'
import '@/styles/globals.css'
import { AuthProvider } from '@/contexts/AuthContext'

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
  title: 'Job Portal - Find Jobs Near You',
  description: 'Search and apply for jobs in your language. No degree needed, just your effort.',
  keywords: ['jobs', 'employment', 'workers', 'India', 'job search'],
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
          <AuthProvider>{children}</AuthProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  )
}
