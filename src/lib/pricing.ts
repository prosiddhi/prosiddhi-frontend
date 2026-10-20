import type { TFunction } from 'i18next'

// Display helpers for the employer plans, checkout and invoices. They only
// FORMAT what the backend sent — every price, discount and tax amount comes from
// the server, so nothing here works one out.

/** Rupees in Indian grouping, no sign: 1349 → "1,349". For a ₹ printed in its own span. */
export function inrDigits(n: number): string {
  return n.toLocaleString('en-IN')
}

/**
 * "₹1,349". With `paise`, always two decimals ("₹1,591.82"), as on an invoice.
 */
export function formatInr(n: number, paise = false): string {
  if (paise) {
    return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }
  return `₹${inrDigits(n)}`
}

/**
 * A plan's normal (pre-offer) price. An older backend sends no `listInr`; then
 * the price it charges is the only price there is.
 */
export function listPrice(plan: { listInr?: number; baseInr: number }): number {
  return plan.listInr ?? plan.baseInr
}

/**
 * A plan's name in the reader's language. The backend sends English only; the
 * labels live in `employer:plans.names.<code>`. A plan with no key yet falls back
 * to the backend's name rather than showing a raw key.
 */
export function planName(t: TFunction, plan: { code: string; name: string }): string {
  return t(`employer:plans.names.${plan.code}`, { defaultValue: plan.name })
}
