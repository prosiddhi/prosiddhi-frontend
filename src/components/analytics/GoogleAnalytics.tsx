'use client'

import { useEffect } from 'react'
import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { GA_MEASUREMENT_ID, trackPageView } from '@/lib/analytics'

/**
 * Loads gtag.js and sends a page view on every route change (lib/analytics.ts).
 * Renders nothing, and sends nothing, when NEXT_PUBLIC_GA_MEASUREMENT_ID is unset.
 *
 * Only the pathname is watched: the query string is never sent, so a change to it
 * alone is not a new page.
 */
export function GoogleAnalytics() {
  const pathname = usePathname()

  useEffect(() => {
    trackPageView(pathname)
  }, [pathname])

  if (!GA_MEASUREMENT_ID) return null
  return (
    <Script
      src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      strategy="afterInteractive"
    />
  )
}
