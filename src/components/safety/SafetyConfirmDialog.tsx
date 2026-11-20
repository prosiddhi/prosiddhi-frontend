'use client'

import { useEffect } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'

// A small confirm dialog for block and unblock (R1-10). The app has no shared
// confirm component, so this one is kept to exactly what these two need: a title,
// plain-words body, Cancel, and a confirm button with a busy state and an inline error.
// Mount it only while it is open.

interface SafetyConfirmDialogProps {
  title: string
  body: string
  confirmLabel: string
  busyLabel: string
  cancelLabel: string
  busy: boolean
  /** Already translated. */
  error?: string
  /** 'danger' for block (red), 'neutral' for unblock. */
  tone?: 'danger' | 'neutral'
  onConfirm: () => void
  onCancel: () => void
}

export function SafetyConfirmDialog({
  title,
  body,
  confirmLabel,
  busyLabel,
  cancelLabel,
  busy,
  error,
  tone = 'danger',
  onConfirm,
  onCancel,
}: SafetyConfirmDialogProps) {
  // Lock the page behind the dialog while it is mounted, and put the old value back
  // on close so another open dialog keeps its own lock. Separate from the Escape
  // listener below, which re-attaches whenever `busy` or `onCancel` changes.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onCancel])

  const confirmCls =
    tone === 'danger' ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-primary-50 text-primary-100 hover:bg-primary-60'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={busy ? undefined : onCancel} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="safety-confirm-title"
        aria-describedby="safety-confirm-body"
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[460px] p-6 sm:p-8"
      >
        <h2 id="safety-confirm-title" className="text-xl font-bold text-black mb-2 break-words">
          {title}
        </h2>
        <p id="safety-confirm-body" className="text-sm sm:text-base text-gray-600 mb-6">
          {body}
        </p>

        {error && (
          <div role="alert" className="mb-4 flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onCancel}
            disabled={busy}
            className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-base font-medium text-black hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={`flex-1 px-6 py-3 rounded-lg text-base font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${confirmCls}`}
          >
            {busy && <Loader2 className="w-5 h-5 animate-spin" />}
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
