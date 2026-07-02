'use client'

// Checkout modal (PJP-177). Launched from a plan's Buy button. Collects an
// optional GSTIN + place-of-supply state, creates a Razorpay order via
// subscriptionAPI.checkout, opens the Razorpay checkout, and confirms the
// captured payment via subscriptionAPI.verifyPayment (which grants credits,
// idempotent with the webhook). On success it shows a confirmation and lets the
// buyer jump to the dashboard (where the wallet re-fetches fresh balances).

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { subscriptionAPI, type Plan } from '@/lib/api'
import { GSTIN_REGEX, INDIAN_STATES } from '@/lib/gst'
import { loadRazorpay } from '@/lib/razorpay'

function formatInr(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`
}

export function CheckoutModal({
  plan,
  onClose,
  onSuccess,
}: {
  plan: Plan
  onClose: () => void
  onSuccess?: (granted: { post: number; download: number }) => void
}) {
  const { t } = useTranslation()
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

  const [gstin, setGstin] = useState('')
  const [placeOfSupply, setPlaceOfSupply] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [granted, setGranted] = useState<{ post: number; download: number } | null>(null)
  // Payment captured but the verify call didn't confirm (network/500/401). The
  // webhook is the backstop, so credits still land — but we must NOT re-offer a
  // Pay button here or the buyer could be charged twice.
  const [capturedPending, setCapturedPending] = useState(false)

  // The Razorpay handler is async and fires from a sync SDK callback, so it can
  // resolve after this modal unmounts. Guard state writes; `settled` also blocks
  // a double-invoke of the handler (failed-then-retry, or Razorpay firing twice).
  const mountedRef = useRef(true)
  const settledRef = useRef(false)
  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  const gstinNorm = gstin.trim().toUpperCase()
  const hasGstin = gstinNorm.length > 0
  // Place of supply is required only when no GSTIN is given (BE derives the
  // state from the GSTIN's first two digits otherwise).
  const stateRequired = !hasGstin

  const gstBase = plan.baseInr
  const gstAmount = Math.round((plan.totalInr - plan.baseInr) * 100) / 100

  const handlePay = async () => {
    setError('')

    if (!isAuthenticated) {
      // Buy from a logged-out marketing visit → send them to sign in first.
      router.push('/login')
      return
    }
    if (hasGstin && !GSTIN_REGEX.test(gstinNorm)) {
      setError(t('employer:checkout.gstinInvalid'))
      return
    }
    if (stateRequired && !placeOfSupply) {
      setError(t('employer:checkout.stateRequired'))
      return
    }

    setSubmitting(true)
    try {
      const order = await subscriptionAPI.checkout({
        planCode: plan.code,
        gstin: hasGstin ? gstinNorm : undefined,
        placeOfSupply: placeOfSupply || undefined,
      })

      const Razorpay = await loadRazorpay()
      const rzp = new Razorpay({
        key: order.keyId,
        order_id: order.razorpayOrderId,
        amount: Math.round(order.amountInr * 100),
        currency: order.currency,
        name: 'ProSiddhi',
        description: plan.name,
        prefill: user?.email ? { email: user.email } : undefined,
        theme: { color: '#1e5166' },
        handler: async (response) => {
          // Payment is captured at this point. Guard against a double-invoke and
          // never route back to a re-payable state from here.
          if (settledRef.current) return
          settledRef.current = true
          try {
            const result = await subscriptionAPI.verifyPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            })
            const g = result.granted ?? { post: plan.postCredits, download: plan.downloadCredits }
            if (mountedRef.current) setGranted(g)
            onSuccess?.(g)
          } catch {
            // Money was taken but confirmation failed — the webhook is the
            // backstop, so credits still land. Show a terminal "received" state,
            // NOT the form, so the buyer can't be charged a second time.
            if (mountedRef.current) setCapturedPending(true)
          } finally {
            if (mountedRef.current) setSubmitting(false)
          }
        },
        modal: {
          // Buyer closed the Razorpay sheet without completing payment. Only
          // resets when nothing was captured (settledRef still false).
          ondismiss: () => {
            if (mountedRef.current && !settledRef.current) setSubmitting(false)
          },
        },
      })
      rzp.on('payment.failed', () => {
        // No capture occurred — safe to let the buyer retry (a fresh order).
        if (mountedRef.current && !settledRef.current) {
          setError(t('employer:checkout.paymentFailed'))
          setSubmitting(false)
        }
      })
      rzp.open()
    } catch (e) {
      setError(e instanceof Error ? e.message : t('employer:checkout.checkoutFailed'))
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={submitting ? undefined : onClose}
    >
      <div
        className="bg-white rounded-[16px] w-full max-w-md p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          aria-label={t('employer:checkout.close')}
          className="absolute right-4 top-4 text-gray-400 hover:text-black disabled:opacity-40"
        >
          <X className="w-5 h-5" />
        </button>

        {granted ? (
          /* Success view */
          <div className="text-center py-4">
            <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">{t('employer:checkout.successTitle')}</h3>
            <p className="text-sm text-[#717182] mb-6">
              {t('employer:checkout.successBody', { post: granted.post, download: granted.download })}
            </p>
            <button
              type="button"
              onClick={() => router.push('/employer')}
              className="w-full py-2.5 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors text-sm font-medium"
            >
              {t('employer:checkout.goToDashboard')}
            </button>
          </div>
        ) : capturedPending ? (
          /* Payment captured but verify didn't confirm — terminal, NO re-pay. */
          <div className="text-center py-4">
            <CheckCircle2 className="w-14 h-14 text-amber-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">{t('employer:checkout.paymentReceivedTitle')}</h3>
            <p className="text-sm text-[#717182] mb-6">{t('employer:checkout.verifyFailed')}</p>
            <button
              type="button"
              onClick={() => router.push('/employer')}
              className="w-full py-2.5 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors text-sm font-medium"
            >
              {t('employer:checkout.goToDashboard')}
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-xl font-semibold mb-1">{t('employer:checkout.title')}</h3>
            <p className="text-sm text-[#717182] mb-4">{plan.name}</p>

            {/* Price breakdown */}
            <div className="bg-neutral-50 rounded-lg p-4 mb-5 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-[#717182]">{t('employer:checkout.base')}</span>
                <span>{formatInr(gstBase)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#717182]">{t('employer:checkout.gst')}</span>
                <span>{formatInr(gstAmount)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t border-[#e5e5e5] pt-1.5 mt-1.5">
                <span>{t('employer:checkout.total')}</span>
                <span>{formatInr(plan.totalInr)}</span>
              </div>
            </div>

            {/* GSTIN (optional) */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-black mb-1">
                {t('employer:checkout.gstinLabel')}{' '}
                <span className="text-[#717182] font-normal">{t('employer:checkout.gstinOptional')}</span>
              </label>
              <input
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder={t('employer:checkout.gstinPlaceholder')}
                maxLength={15}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary-50"
              />
            </div>

            {/* Place of supply (required unless GSTIN given) */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-black mb-1">
                {t('employer:checkout.stateLabel')}
                {stateRequired && <span className="text-red-500"> *</span>}
              </label>
              <select
                value={placeOfSupply}
                onChange={(e) => setPlaceOfSupply(e.target.value)}
                disabled={hasGstin}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-50 disabled:opacity-50"
              >
                <option value="">
                  {hasGstin ? t('employer:checkout.stateFromGstin') : t('employer:checkout.statePlaceholder')}
                </option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-red-600 text-sm mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handlePay}
              disabled={submitting}
              className="w-full py-2.5 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting
                ? t('employer:checkout.processing')
                : t('employer:checkout.pay', { amount: formatInr(plan.totalInr) })}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default CheckoutModal
