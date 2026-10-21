'use client'

// Checkout modal (PJP-177). Launched from a plan's Buy button. Collects an
// optional GSTIN + place-of-supply state, creates a Razorpay order via
// subscriptionAPI.checkout, opens the Razorpay checkout, and confirms the
// captured payment via subscriptionAPI.verifyPayment (which grants credits,
// idempotent with the webhook). On success it shows a confirmation and lets the
// buyer jump to the dashboard (where the wallet re-fetches fresh balances).
//
// Price honesty: the breakdown shown before paying comes from the plan (list
// price, offer discount, GST, total). Razorpay charges the ORDER's amount, so if
// the order's pre-GST price differs from the one we showed (an offer ended a
// minute ago, say), Razorpay is NOT opened — the buyer first sees the earlier
// total, the new total and the difference, with the server's own invoice preview
// and a fresh "Pay ₹X" button for that same order. Every amount is the server's;
// this file only formats them (and subtracts the two totals for the difference).
//
// Back on that screen returns to the form with every field still filled in and
// creates no order. `priceShown` then holds the new price the buyer has seen: the
// form displays it, and the next order is compared with it rather than with the
// stale plan, so the same new price does not bring the repriced screen back.
//
// One checkout at a time: `inFlightRef` is a synchronous lock (state alone would
// let two quick clicks both pass). It is taken before /billing/checkout and held
// until the Razorpay sheet is dismissed, or the attempt fails before the sheet
// opens. It is NOT released on `payment.failed` (the sheet is still open for its
// own retry) and never once a payment is captured. Each attempt holds a token, so
// a late callback from an earlier attempt cannot unlock a newer one.

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  ApiError,
  employerAPI,
  fieldErrorsByPath,
  subscriptionAPI,
  type CheckoutOrder,
  type Plan,
} from '@/lib/api'
import { GSTIN_REGEX, INDIAN_STATES } from '@/lib/gst'
import { loadRazorpay } from '@/lib/razorpay'
import { formatInr, listPrice, planName } from '@/lib/pricing'

// What the price breakdown shows, in one shape for both moments:
//   • before checkout, from the plan — one GST line (the state split is not
//     known until the order exists)
//   • after checkout, from the order's invoice preview — CGST + SGST or IGST
// Every figure is the server's.
interface Breakdown {
  listInr: number
  discountInr: number
  offerLabel: string | null
  offerPercent: number | null
  baseInr: number
  gst:
    | { split: false; gstInr: number }
    | { split: true; isIntraState: boolean; cgstInr: number; sgstInr: number; igstInr: number }
  totalInr: number
}

function breakdownFromPlan(plan: Plan): Breakdown {
  return {
    listInr: listPrice(plan),
    discountInr: plan.discountInr ?? 0,
    offerLabel: plan.offer?.label ?? null,
    offerPercent: plan.offer?.percentOff ?? null,
    baseInr: plan.baseInr,
    // The plan sends no GST figure, so the line is its total less its taxable
    // price (both the server's), rounded to paise.
    gst: { split: false, gstInr: Math.round((plan.totalInr - plan.baseInr) * 100) / 100 },
    totalInr: plan.totalInr,
  }
}

function breakdownFromOrder(preview: CheckoutOrder['invoicePreview']): Breakdown {
  return {
    listInr: preview.listInr ?? preview.baseInr,
    discountInr: preview.discountInr ?? 0,
    offerLabel: preview.offerLabel ?? null,
    offerPercent: preview.offerPercent ?? null,
    baseInr: preview.baseInr,
    gst: {
      split: true,
      isIntraState: preview.isIntraState,
      cgstInr: preview.cgstInr,
      sgstInr: preview.sgstInr,
      igstInr: preview.igstInr,
    },
    totalInr: preview.totalInr,
  }
}

// The form's figures after the buyer has gone Back from the repriced screen: the
// server's new prices, with GST back on one line because the state split can
// change if they edit the state (the next order will show the real split).
function breakdownAfterReprice(preview: CheckoutOrder['invoicePreview']): Breakdown {
  const b = breakdownFromOrder(preview)
  return { ...b, gst: { split: false, gstInr: Math.round((b.totalInr - b.baseInr) * 100) / 100 } }
}

// One line of a price breakdown. `total` is the bold last line.
function PriceRow({ label, value, total = false, saving = false }: {
  label: string
  value: string
  total?: boolean
  saving?: boolean
}) {
  return (
    <div className={`flex justify-between gap-3 ${total ? 'font-semibold border-t border-[#e5e5e5] pt-1.5 mt-1.5' : ''}`}>
      <span className={total ? '' : 'text-[#717182]'}>{label}</span>
      <span className={saving ? 'text-green-700' : ''}>{value}</span>
    </div>
  )
}

// The price breakdown, line by line: normal price, offer discount and taxable
// value (only when there is a discount), GST — one line, or CGST + SGST (same
// state) or IGST — and the total. Always two decimals, as on the tax invoice.
function PriceBreakdown({ b }: { b: Breakdown }) {
  const { t } = useTranslation()
  const discountLabel =
    b.offerLabel && b.offerPercent
      ? t('employer:checkout.discount', { label: b.offerLabel, percent: b.offerPercent })
      : t('employer:checkout.discountPlain')
  return (
    <div className="bg-neutral-50 rounded-lg p-4 mb-5 space-y-1.5 text-sm">
      <PriceRow label={t('employer:checkout.price')} value={formatInr(b.listInr, true)} />
      {b.discountInr > 0 && (
        <>
          <PriceRow label={discountLabel} value={`−${formatInr(b.discountInr, true)}`} saving />
          <PriceRow label={t('employer:checkout.taxable')} value={formatInr(b.baseInr, true)} />
        </>
      )}
      {!b.gst.split ? (
        <PriceRow label={t('employer:checkout.gst')} value={formatInr(b.gst.gstInr, true)} />
      ) : b.gst.isIntraState ? (
        <>
          <PriceRow label={t('employer:checkout.cgst')} value={formatInr(b.gst.cgstInr, true)} />
          <PriceRow label={t('employer:checkout.sgst')} value={formatInr(b.gst.sgstInr, true)} />
        </>
      ) : (
        <PriceRow label={t('employer:checkout.igst')} value={formatInr(b.gst.igstInr, true)} />
      )}
      <PriceRow label={t('employer:checkout.total')} value={formatInr(b.totalInr, true)} total />
    </div>
  )
}

// BE refusal code -> message. The BE refuses before making a new order, so nothing
// is charged by the refused attempt. Only a pending earlier payment is final: paying
// again could charge twice, so the Pay button is turned off.
const CHECKOUT_REFUSALS = new Map<string, { key: string; final?: boolean }>([
  ['CHECKOUT_PAYMENT_PENDING', { key: 'employer:checkout.paymentPending', final: true }],
  ['CHECKOUT_IN_PROGRESS', { key: 'employer:checkout.inProgress' }],
  ['CHECKOUT_STATUS_UNKNOWN', { key: 'employer:checkout.statusUnknown' }],
  ['PLAN_NOT_FOUND', { key: 'employer:checkout.planNotFound' }],
  ['PLAN_UNAVAILABLE', { key: 'employer:checkout.planUnavailable' }],
])

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
  /** `repriced` = checkout found a price different from the plan's (refresh it). */
  onClose: (repriced: boolean) => void
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
  // The BE says an earlier payment is paid or mid-payment (CHECKOUT_PAYMENT_PENDING).
  // Same rule as above: no Pay button, or the buyer could be charged twice.
  const [paymentPending, setPaymentPending] = useState(false)
  // An order priced differently from the plan we showed. Held so the buyer can
  // see the new breakdown and pay that same order.
  const [repriced, setRepriced] = useState<CheckoutOrder | null>(null)
  // Set when the buyer goes Back from the repriced screen: the price they have now
  // seen. The form shows it, and the next order is compared with it (not with the
  // stale plan), so seeing the same new price again does not bring the screen back.
  const [priceShown, setPriceShown] = useState<Breakdown | null>(null)
  const earlier = priceShown ?? breakdownFromPlan(plan)
  // New total less the earlier one, both the server's; only the subtraction is ours.
  const priceDelta = repriced ? Math.round((repriced.invoicePreview.totalInr - earlier.totalInr) * 100) / 100 : 0

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

  // One checkout attempt at a time. `submitting` is state, so two clicks that land
  // before a re-render would both see it as false; this ref is set synchronously.
  // It holds a token, and only the attempt that took the lock can release it, so a
  // late callback from an earlier attempt cannot unlock a newer one. It is held
  // from before /billing/checkout until the Razorpay sheet is dismissed (or the
  // attempt fails before the sheet opens), and never released once a payment is
  // captured (settledRef).
  const inFlightRef = useRef<symbol | null>(null)
  const acquireLock = () => {
    if (inFlightRef.current) return null
    const token = Symbol('checkout')
    inFlightRef.current = token
    return token
  }
  // True when `token` still held the lock (and now does not).
  const releaseLock = (token: symbol) => {
    if (inFlightRef.current !== token) return false
    inFlightRef.current = null
    return true
  }

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

  // Closing reports whether checkout found a new price, so the caller can refresh.
  const close = () => onClose(repriced !== null || priceShown !== null)

  // Back to the form from the repriced screen. The form fields live in this
  // component's state, so they are still filled in. No order is created; the
  // abandoned one is simply never paid. Not while a payment is in progress.
  const handleBack = () => {
    if (!repriced || inFlightRef.current) return
    setPriceShown(breakdownAfterReprice(repriced.invoicePreview))
    setRepriced(null)
    setError('')
  }

  // Opens the Razorpay sheet for a created order. Throws if the SDK won't load.
  const openRazorpay = async (order: CheckoutOrder, token: symbol) => {
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
          if (settledRef.current) return
          const owned = releaseLock(token)
          if (mountedRef.current && owned) setSubmitting(false)
        },
      },
    })
    rzp.on('payment.failed', () => {
      // No capture occurred, but the sheet is still open (it offers its own retry
      // on this same order). So the lock and `submitting` stay as they are; the
      // buyer can only start a new checkout once the sheet is dismissed. Only the
      // current attempt may show the error.
      if (settledRef.current) return
      if (mountedRef.current && inFlightRef.current === token) {
        setError(t('employer:checkout.paymentFailed'))
      }
    })
    rzp.open()
  }

  // Pay the order that came back with a new price (the buyer has now seen it).
  const handlePayRepriced = async () => {
    if (!repriced) return
    const token = acquireLock()
    if (!token) return
    setError('')
    setSubmitting(true)
    try {
      await openRazorpay(repriced, token)
    } catch (e) {
      releaseLock(token)
      setSubmitting(false)
      setError(e instanceof Error ? e.message : t('employer:checkout.checkoutFailed'))
    }
  }

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

    // Taken before the first await, so a second call stops here.
    const token = acquireLock()
    if (!token) return

    setSubmitting(true)
    try {
      const order = await subscriptionAPI.checkout({
        planCode: plan.code,
        gstin: hasGstin ? gstinNorm : undefined,
        // With a GSTIN the BE reads the state from it; a state picked earlier is stale.
        placeOfSupply: hasGstin ? undefined : placeOfSupply || undefined,
        billingAddress: hasGstin ? billing : undefined,
      })

      // If the order's pre-GST price is not the one we showed (an offer ended a
      // minute ago, say), stop and show the new breakdown first — one more click
      // to pay it. Compared before GST on purpose: the plan list and the order
      // round GST differently, so their totals can differ by a paisa.
      if (order.invoicePreview.baseInr !== earlier.baseInr) {
        releaseLock(token)
        if (mountedRef.current) {
          setRepriced(order)
          setSubmitting(false)
        }
        return
      }
      await openRazorpay(order, token)
    } catch (e) {
      releaseLock(token)
      setSubmitting(false)
      // The BE refuses a bad address before any order exists, so nothing was
      // charged and the buyer can fix it and pay again. Shown on the field.
      const code = e instanceof ApiError ? e.code : undefined
      const required = code === 'BILLING_ADDRESS_REQUIRED'
      const refusal = code ? CHECKOUT_REFUSALS.get(code) : undefined
      if (required || fieldErrorsByPath(e).billingAddress) {
        setBillingError(
          t(required ? 'employer:checkout.billingAddressRequired' : 'employer:checkout.billingAddressLength'),
        )
        billingRef.current?.focus()
      } else if (refusal) {
        setError(t(refusal.key))
        if (refusal.final) setPaymentPending(true)
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
      onClick={submitting ? undefined : close}
    >
      <div
        className="bg-white rounded-[16px] w-full max-w-md p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={close}
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
              {granted.download > 0
                ? t('employer:checkout.successBody', { post: granted.post, download: granted.download })
                : t('employer:checkout.successBodyPosts', { count: granted.post })}
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
        ) : repriced ? (
          /* The order came back at a different price — show the server's own
             breakdown and let the buyer pay that order. */
          <>
            <h3 className="text-xl font-semibold mb-1">{t('employer:checkout.priceChangedTitle')}</h3>
            <p className="text-sm text-[#717182] mb-4">{t('employer:checkout.priceChangedBody')}</p>

            {/* Old against new, both the server's totals. */}
            <div className="bg-neutral-50 rounded-lg p-4 mb-3 space-y-1.5 text-sm">
              <PriceRow label={t('employer:checkout.priceWas')} value={formatInr(earlier.totalInr, true)} />
              <PriceRow label={t('employer:checkout.priceNow')} value={formatInr(repriced.invoicePreview.totalInr, true)} />
              <PriceRow
                label={t('employer:checkout.priceDifference')}
                value={`${priceDelta > 0 ? '+' : priceDelta < 0 ? '−' : ''}${formatInr(Math.abs(priceDelta), true)}`}
                saving={priceDelta < 0}
              />
            </div>

            <PriceBreakdown b={breakdownFromOrder(repriced.invoicePreview)} />

            {error && (
              <div className="flex items-start gap-2 text-red-600 text-sm mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handlePayRepriced}
              disabled={submitting}
              className="w-full py-2.5 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting
                ? t('employer:checkout.processing')
                : t('employer:checkout.pay', { amount: formatInr(repriced.amountInr, true) })}
            </button>
            <button
              type="button"
              onClick={handleBack}
              disabled={submitting}
              className="w-full mt-2 py-2.5 border border-gray-300 text-black rounded-lg hover:bg-neutral-50 transition-colors text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {t('common:buttons.back')}
            </button>
          </>
        ) : (
          <>
            <h3 className="text-xl font-semibold mb-1">{t('employer:checkout.title')}</h3>
            <p className="text-sm text-[#717182] mb-4">{planName(t, plan)}</p>

            {/* Price breakdown — the plan's own figures, or the new price once seen */}
            <PriceBreakdown b={earlier} />

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
                value={hasGstin ? '' : placeOfSupply}
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
              disabled={submitting || paymentPending}
              className="w-full py-2.5 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting
                ? t('employer:checkout.processing')
                : t('employer:checkout.pay', { amount: formatInr(earlier.totalInr, true) })}
            </button>
            {paymentPending && (
              <button
                type="button"
                onClick={() => router.push('/employer')}
                className="w-full mt-2 py-2.5 border border-gray-300 text-black rounded-lg hover:bg-neutral-50 transition-colors text-sm font-medium"
              >
                {t('employer:checkout.goToDashboard')}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default CheckoutModal
