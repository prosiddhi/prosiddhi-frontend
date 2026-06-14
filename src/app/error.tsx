'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

/**
 * Route-segment error boundary (Next.js app-router). Catches render-time crashes
 * anywhere under the root layout and shows a friendly recover screen instead of
 * a white screen. `reset()` re-renders the failed segment.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surface to the console for now; PJP-151 will route this to Sentry.
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-center">
      <div className="w-20 h-20 bg-error-100 rounded-full flex items-center justify-center mb-6">
        <AlertTriangle className="w-10 h-10 text-error-500" />
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold text-black mb-3">Something went wrong</h1>
      <p className="text-sm sm:text-base text-gray-500 mb-8 max-w-md">
        We hit an unexpected problem. Please try again — your information is safe.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={reset}
          className="flex items-center justify-center gap-2 px-6 min-h-[48px] bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors font-medium"
        >
          <RefreshCw className="w-5 h-5" />
          Try again
        </button>
        <Link
          href="/"
          className="flex items-center justify-center gap-2 px-6 min-h-[48px] bg-grey-100 text-black rounded-lg hover:bg-grey-200 transition-colors font-medium"
        >
          <Home className="w-5 h-5" />
          Go home
        </Link>
      </div>
    </div>
  )
}
