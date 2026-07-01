'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { TOAST_EVENT, type ToastDetail, type ToastVariant } from '@/lib/toast'

/**
 * ToastViewport — global toast region mounted once in the root layout.
 *
 * Listens for the `app:toast` window event (see lib/toast.ts `showToast`) and
 * renders a stack of auto-dismissing toasts. Decoupled by design so the
 * framework-free API client and any component can surface a toast without React
 * context plumbing.
 */
interface ToastItem extends ToastDetail {
  id: number
}

const AUTO_DISMISS_MS = 5000

const VARIANT_STYLES: Record<ToastVariant, string> = {
  error: 'bg-error-500 text-white',
  success: 'bg-success-500 text-white',
  info: 'bg-gray-900 text-white',
}

const VARIANT_ICONS: Record<ToastVariant, typeof Info> = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
}

export function ToastViewport() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  // Monotonic id source + a registry of pending dismiss timers to clear on unmount.
  const nextId = useRef(0)
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  useEffect(() => {
    const onToast = (e: Event) => {
      const detail = (e as CustomEvent<ToastDetail>).detail
      if (!detail?.message) return
      const id = nextId.current++
      setToasts((list) => [...list, { ...detail, id }])
      const timer = setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
      timers.current.set(id, timer)
    }
    window.addEventListener(TOAST_EVENT, onToast)
    const pending = timers.current
    return () => {
      window.removeEventListener(TOAST_EVENT, onToast)
      pending.forEach(clearTimeout)
      pending.clear()
    }
  }, [dismiss])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 inset-x-0 z-[1080] flex flex-col items-center gap-2 px-4 pointer-events-none">
      {toasts.map((t) => {
        const Icon = VARIANT_ICONS[t.variant]
        return (
          <div
            key={t.id}
            role="alert"
            className={`pointer-events-auto w-full max-w-md flex items-center gap-3 rounded-lg shadow-lg px-4 py-3 ${VARIANT_STYLES[t.variant]}`}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm sm:text-base flex-1">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
              className="flex items-center justify-center w-8 h-8 rounded hover:bg-white/20 active:bg-white/30 transition-colors flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default ToastViewport
