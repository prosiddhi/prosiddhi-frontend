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
import { ApiError, employerAPI, fieldErrorsByPath, subscriptionAPI, type Plan } from '@/lib/api'
import { GSTIN_REGEX, INDIAN_STATES } from '@/lib/gst'
import { loadRazorpay } from '@/lib/razorpay'

function formatInr(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`
}

// The BE's rule for the invoice address, checked on the trimmed value.
const BILLING_ADDRESS_MIN = 5
const BILLING_ADDRESS_MAX = 500

// The message key for a bad billing address, or null when it is fine.
function billingAddressProblem(value: string): string | null {
  if (!value) return 'employer:checkout.billingAddressRequired'
  if (value.length < BILLING_ADDRESS_MIN || value.length > BILLING_ADDRESS_MAX) {
    return 'employer:checkout.billingAddressLength'
  }
  return null
}

// Cap how long we wait on the post-capture verify call. If the response is lost
// (dropped connection, sleeping tab, server blip) the promise would otherwise
// hang forever and the modal would spin on "Processing…". After this we fall
// through to the terminal "payment received — confirming" state; the webhook is
// the backstop that still grants the credits.
const VERIFY_TIMEOUT_MS = 15000

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
  const [billingAddress, setBillingAddress] = useState('')
  const [billingError, setBillingError] = useState('')
  const billingRef = useRef<HTMLTextAreaElement>(null)
  // Set on the first keystroke in the box, so a late prefill never overwrites it.
  const billingEditedRef = useRef(false)
  const prefillTriedRef = useRef(false)
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

  // Prefill from the fresh profile (the session copy can be stale, and this prints
  // on a tax invoice). Single attempt; a failure leaves the box empty, and so does
  // an invalid address (the pay-time check will ask for one).
  // Skipped when signed out: a 401 here would log them out.
  useEffect(() => {
    if (!hasGstin || !isAuthenticated || prefillTriedRef.current) return
    prefillTriedRef.current = true
    employerAPI
      .getProfile()
      .then((profile) => {
        const address = profile.employer?.companyAddress?.trim()
        if (address && !billingAddressProblem(address) && !billingEditedRef.current) {
          setBillingAddress(address)
        }
      })
      .catch(() => {})
  }, [hasGstin, isAuthenticated])

  const gstBase = plan.baseInr
  const gstAmount = Math.round((plan.totalInr - plan.baseInr) * 100) / 100

  const handlePay = async () => {
    setError('')
    setBillingError('')

    if (!isAuthenticated) {
      // Buy from a logged-out marketing visit → send them to sign in first.
      router.push('/login')
      return
    }
    if (hasGstin && !GSTIN_REGEX.test(gstinNorm)) {
      setError(t('employer:checkout.gstinInvalid'))
      return
    }
    // Required with a GSTIN here, though the BE only insists when no company
    // address is on file.
    const billing = billingAddress.trim()
    const billingProblem = hasGstin ? billingAddressProblem(billing) : null
    if (billingProblem) {
      setBillingError(t(billingProblem))
      billingRef.current?.focus()
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
        billingAddress: hasGstin ? billing : undefined,
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
          let timer: ReturnType<typeof setTimeout> | undefined
          try {
            // Race the verify against a timeout so a lost response can't hang the
            // modal on "Processing…" forever.
            const result = await Promise.race([
              subscriptionAPI.verifyPayment({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
              new Promise<never>((_, reject) => {
                timer = setTimeout(() => reject(new Error('verify-timeout')), VERIFY_TIMEOUT_MS)
              }),
            ])
            const g = result.granted ?? { post: plan.postCredits, download: plan.downloadCredits }
            if (mountedRef.current) setGranted(g)
            onSuccess?.(g)
          } catch {
            // Money was taken but confirmation failed OR timed out — the webhook
            // is the backstop, so credits still land. Show a terminal "received"
            // state, NOT the form, so the buyer can't be charged a second time.
            if (mountedRef.current) setCapturedPending(true)
          } finally {
            if (timer) clearTimeout(timer)
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
      setSubmitting(false)
      // The BE refuses a bad address before any order exists, so nothing was
      // charged and the buyer can fix it and pay again. Shown on the field.
      const required = e instanceof ApiError && e.code === 'BILLING_ADDRESS_REQUIRED'
      if (required || fieldErrorsByPath(e).billingAddress) {
        setBillingError(
          t(required ? 'employer:checkout.billingAddressRequired' : 'employer:checkout.billingAddressLength'),
        )
        billingRef.current?.focus()
      } else {
        setError(e instanceof Error ? e.message : t('employer:checkout.checkoutFailed'))
      }
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
              className="w-full py-2.5 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors text-sm font-medium"
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
              className="w-full py-2.5 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors text-sm font-medium"
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

            {/* Billing address — printed on the GST invoice, so required with a GSTIN */}
            {hasGstin && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-black mb-1" htmlFor="checkout-billing-address">
                  {t('employer:checkout.billingAddressLabel')}
                  <span className="text-red-500"> *</span>
                </label>
                <textarea
                  id="checkout-billing-address"
                  ref={billingRef}
                  value={billingAddress}
                  onChange={(e) => {
                    billingEditedRef.current = true
                    setBillingAddress(e.target.value)
                    setBillingError('')
                  }}
                  rows={3}
                  placeholder={t('employer:checkout.billingAddressPlaceholder')}
                  aria-required="true"
                  aria-invalid={!!billingError}
                  aria-describedby="checkout-billing-address-error checkout-billing-address-hint"
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-50 ${
                    billingError ? 'border-red-400' : 'border-gray-300'
                  }`}
                />
                <p id="checkout-billing-address-hint" className="mt-1 text-xs text-[#717182]">
                  {t('employer:checkout.billingAddressHint')}
                </p>
                {billingError && (
                  <p id="checkout-billing-address-error" role="alert" className="mt-1.5 text-sm text-red-600">
                    {billingError}
                  </p>
                )}
              </div>
            )}

            {/* Place of supply (required unless GSTIN given) */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-black mb-1" htmlFor="checkout-place-of-supply">
                {t('employer:checkout.stateLabel')}
                {stateRequired && <span className="text-red-500"> *</span>}
              </label>
              <select
                id="checkout-place-of-supply"
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
              className="w-full py-2.5 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
