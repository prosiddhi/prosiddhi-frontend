'use client'

import { AlertCircle, RefreshCw } from 'lucide-react'

/**
 * InlineError — reusable failure + retry state for list/content screens.
 *
 * Extracted from the saved-jobs page so every data screen renders the same
 * friendly retry block instead of a white screen when a fetch fails. Pass the
 * caught error message and an `onRetry` that re-runs the fetch.
 */
export function InlineError({
  message,
  onRetry,
  className = '',
}: {
  message: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-20 text-center ${className}`}>
      <AlertCircle className="w-10 h-10 text-error-500 mb-4" />
      <p className="text-error-600 mb-4 max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-6 min-h-[44px] bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      )}
    </div>
  )
}

export default InlineError
