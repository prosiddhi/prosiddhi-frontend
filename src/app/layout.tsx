import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import '@/styles/globals.css'

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
        {children}
      </body>
    </html>
  )
}
