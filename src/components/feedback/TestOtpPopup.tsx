'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, X } from 'lucide-react'
import { SHOW_TEST_OTP } from '@/lib/features'
import { SERVER_OTP_EVENT } from '@/lib/serverOtp'

/**
 * Shows a code the backend returned in its reply (staging only — see
 * lib/serverOtp.ts for the two locks).
 *
 * English on purpose: this is a tool for the testing team, not product copy,
 * and must stay out of the translation batches.
 */
export function TestOtpPopup() {
  return SHOW_TEST_OTP ? <TestOtpPopupInner /> : null
}

function TestOtpPopupInner() {
  const [code, setCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const onCode = (e: Event) => {
      setCode((e as CustomEvent<string>).detail)
      setCopied(false)
    }
    window.addEventListener(SERVER_OTP_EVENT, onCode)
    return () => window.removeEventListener(SERVER_OTP_EVENT, onCode)
  }, [])

  if (!code) return null

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
    } catch {
      // Clipboard blocked (insecure origin or permission): the code is on screen anyway.
    }
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed z-[100] bottom-[calc(1rem+var(--bottom-nav-h,0px))] left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-sm rounded-xl border-2 border-amber-400 bg-amber-50 shadow-xl p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Test mode — no SMS sent</p>
          <p className="mt-1 text-sm text-amber-900">Your code is</p>
          <p className="font-mono text-3xl font-bold tracking-[0.3em] text-amber-950">{code}</p>
        </div>
        <button
          type="button"
          onClick={() => setCode(null)}
          aria-label="Close"
          className="shrink-0 rounded-md p-1 text-amber-800 hover:bg-amber-100"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <button
        type="button"
        onClick={copy}
        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copied ? 'Copied' : 'Copy code'}
      </button>
    </div>
  )
}
