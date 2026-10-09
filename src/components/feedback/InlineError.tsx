'use client'

import { useTranslation } from 'react-i18next'
import { AlertCircle, RefreshCw } from 'lucide-react'

/**
 * InlineError — reusable failure + retry state for list/content screens.
 *
 * Extracted from the saved-jobs page so every data screen renders the same
 * friendly retry block instead of a white screen when a fetch fails. Pass the
 * caught error message and an `onRetry` that re-runs the fetch.
 *
 * `compact` is for a block that fills one panel of a page, not the whole screen.
 */
export function InlineError({
  message,
  onRetry,
  className = '',
  compact = false,
  retryDisabled = false,
}: {
  message: string
  onRetry?: () => void
  className?: string
  compact?: boolean
  /** Keep the Retry button visible but not clickable (e.g. during a rate-limit cooldown). */
  retryDisabled?: boolean
}) {
  const { t } = useTranslation()
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'py-20'} ${className}`}>
      <AlertCircle className="w-10 h-10 text-error-500 mb-4" />
      <p className="text-error-600 mb-4 max-w-md">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          disabled={retryDisabled}
          className="flex items-center gap-2 px-6 min-h-[44px] bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-primary-50"
        >
          <RefreshCw className="w-4 h-4" />
          {t('buttons.retry')}
        </button>
      )}
    </div>
  )
}

export default InlineError
