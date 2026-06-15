import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import '@/styles/globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { I18nProvider } from '@/i18n/I18nProvider'
import { OfflineBanner } from '@/components/feedback/OfflineBanner'
import { ToastViewport } from '@/components/feedback/ToastViewport'

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
        <I18nProvider>
          <AuthProvider>
            <OfflineBanner />
            {children}
            <ToastViewport />
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
