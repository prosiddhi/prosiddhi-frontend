'use client'

import { useEffect } from 'react'

/**
 * Root error boundary — the last line of defence. Catches crashes in the root
 * layout itself (where app/error.tsx cannot reach), so it must render its own
 * <html>/<body>. The root layout's CSS may not be applied here, so styles are
 * inline to guarantee a usable recover screen.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
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
          Something went wrong
        </h1>
        <p style={{ fontSize: '16px', color: '#6B7280', maxWidth: '420px', marginBottom: '24px' }}>
          We hit an unexpected problem. Please try again.
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
          Try again
        </button>
      </body>
    </html>
  )
}
