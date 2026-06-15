'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { WifiOff, RefreshCw } from 'lucide-react'

/**
 * OfflineBanner — global connectivity banner mounted once at the top of the body.
 *
 * Shows when the device is offline (navigator.onLine + `online`/`offline`
 * events) OR when an API call failed at the network level (the
 * `api:network-error` event from lib/api.ts — e.g. the dev tunnel is down while
 * the device itself is online). It clears automatically on `online` or on
 * `api:network-recovered` (the next request that reaches the server). Retry
 * reloads so every screen re-runs its data fetch.
 *
 * Rendered in normal flow (NOT position:fixed) so it pushes page content down
 * instead of overlapping the sticky page headers and blocking their tap targets
 * — important since the target users are on flaky 2G/3G and see this often.
 */
type Mode = 'online' | 'offline' | 'unreachable'

export function OfflineBanner() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<Mode>('online')

  useEffect(() => {
    // Initial read (navigator is unavailable during SSR).
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setMode('offline')
    }

    const goOffline = () => setMode('offline')
    const goOnline = () => setMode('online')
    const onNetworkError = () =>
      setMode(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'unreachable')
    const onRecovered = () => setMode('online')

    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    window.addEventListener('api:network-error', onNetworkError)
    window.addEventListener('api:network-recovered', onRecovered)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
      window.removeEventListener('api:network-error', onNetworkError)
      window.removeEventListener('api:network-recovered', onRecovered)
    }
  }, [])

  if (mode === 'online') return null

  const message =
    mode === 'offline' ? t('feedback.offline') : t('feedback.unreachable')

  return (
    <div role="alert" className="bg-error-500 text-white shadow-md">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px] py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <WifiOff className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm sm:text-base truncate">{message}</span>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 active:bg-white/40 rounded-lg px-4 min-h-[44px] text-sm sm:text-base font-medium transition-colors flex-shrink-0"
        >
          <RefreshCw className="w-4 h-4" />
          {t('buttons.retry')}
        </button>
      </div>
    </div>
  )
}

export default OfflineBanner
