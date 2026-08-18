'use client'

import { useEffect, useState } from 'react'

import {
  DEFAULT_GLOBAL_ERROR_STRINGS,
  getGlobalErrorStrings,
} from '@/i18n/errorStrings'

/**
 * Root error boundary — the last line of defence. Catches crashes in the root
 * layout itself (where app/error.tsx cannot reach), so it must render its own
 * <html>/<body>. The root layout's CSS may not be applied here, so styles are
 * inline to guarantee a usable recover screen.
 *
 * Copy comes from i18n/errorStrings.ts rather than useTranslation(): I18nProvider
 * lives in the root layout that this component replaces, so react-i18next is not
 * available. Strings are resolved after mount (same approach as I18nProvider) so
 * the server and first client paint agree.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [strings, setStrings] = useState(DEFAULT_GLOBAL_ERROR_STRINGS)

  useEffect(() => {
    console.error(error)
  }, [error])

  useEffect(() => {
    setStrings(getGlobalErrorStrings())
  }, [])

  return (
    <html lang={strings.lang}>
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: '16px',
          fontFamily: 'system-ui, sans-serif',
          background: '#ffffff',
          color: '#222222',
        }}
      >
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px' }}>
          {strings.title}
        </h1>
        <p style={{ fontSize: '16px', color: '#6B7280', maxWidth: '420px', marginBottom: '24px' }}>
          {strings.body}
        </p>
        <button
          onClick={reset}
          style={{
            minHeight: '48px',
            padding: '0 24px',
            background: '#5cc2ed',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          {strings.retry}
        </button>
      </body>
    </html>
  )
}
