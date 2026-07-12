// Shared presentation for the BE ApplicationStatus enum
// (PENDING / REVIEWED / SHORTLISTED / REJECTED / ACCEPTED / WITHDRAWN / BOOKMARKED).
// Rendered on the seeker's My Applications list + detail, and on the employer's
// dashboard and candidate screens.
//
// These are plain functions, not components, so they cannot use the useTranslation
// hook. They read the shared i18next instance directly and translate at CALL time.
// Every screen that renders a pill already calls useTranslation(), so it is
// subscribed to `languageChanged` and re-renders — which re-invokes statusMeta()
// and picks up the new language. That keeps all ~5 call sites unchanged instead of
// threading `t` through each of them.

import i18n from '@/i18n/config'

export interface StatusMeta {
  label: string
  /** Tailwind classes for the status pill (bg + text). */
  pill: string
}

/** Pill colours per status. Colour is language-independent, so it stays here. */
const STATUS_PILL: Record<string, string> = {
  PENDING: 'bg-[#eef6ff] text-[#1d6fb8]',
  REVIEWED: 'bg-amber-50 text-amber-700',
  SHORTLISTED: 'bg-indigo-50 text-indigo-700',
  ACCEPTED: 'bg-green-50 text-green-700',
  REJECTED: 'bg-red-50 text-red-700',
  WITHDRAWN: 'bg-gray-100 text-gray-600',
  BOOKMARKED: 'bg-purple-50 text-purple-700',
}

const FALLBACK_PILL = 'bg-gray-100 text-gray-600'

export function statusMeta(status?: string): StatusMeta {
  if (!status || !STATUS_PILL[status]) {
    return { label: i18n.t('applicationStatus.unknown'), pill: FALLBACK_PILL }
  }
  return {
    label: i18n.t(`applicationStatus.${status}`),
    pill: STATUS_PILL[status],
  }
}

// A seeker can withdraw only while the application is still in flight. The BE
// hard-blocks ACCEPTED + already-WITHDRAWN; we also hide it for REJECTED (a
// terminal outcome — there is nothing left to withdraw), matching the
// "in-flight only" intent rather than showing a no-op affordance.
export function canWithdraw(status?: string): boolean {
  return status !== 'ACCEPTED' && status !== 'WITHDRAWN' && status !== 'REJECTED'
}

/** Presentation for the BE JobStatus enum (employer's My Jobs / dashboard). */
export function jobStatusLabel(status?: string): string {
  const KNOWN = ['DRAFT', 'ACTIVE', 'INACTIVE', 'CLOSED', 'FILLED', 'CANCELLED']
  if (!status || !KNOWN.includes(status)) return i18n.t('jobStatus.unknown')
  return i18n.t(`jobStatus.${status}`)
}

/**
 * Presentation for the BE VerificationStatus enum (employer profile).
 * It used to render as a raw token — "PENDING" / "APPROVED" — sitting next to a
 * translated label, which read as a bug even in English.
 */
export function verificationStatusLabel(status?: string): string {
  const KNOWN = ['PENDING', 'APPROVED', 'REJECTED']
  if (!status || !KNOWN.includes(status)) return i18n.t('profile:verificationStatus.unknown')
  return i18n.t(`profile:verificationStatus.${status}`)
}
