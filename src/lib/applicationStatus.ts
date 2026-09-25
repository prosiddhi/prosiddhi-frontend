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
import { CheckCircle2, XCircle, Clock, type LucideIcon } from 'lucide-react'

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
 * Offline and not yet approved: a new post, an edited one, or one an admin has
 * scanned but not decided on (PENDING_REVIEW / NO_VIOLATION / VIOLATION_FOUND).
 * A live job never counts — a content scan can re-queue an ACTIVE job without
 * taking it down. A rejected job is its own state, not "awaiting".
 */
export function isJobAwaitingReview(job: { status?: string; moderationStatus?: string }): boolean {
  const m = job.moderationStatus
  return job.status !== 'ACTIVE' && !!m && m !== 'APPROVED' && m !== 'REJECTED'
}

/** Badge for a job on My Jobs: label + pill classes decided together, so they cannot drift. */
export function jobStatusMeta(job: { status?: string; moderationStatus?: string }): StatusMeta {
  if (isJobAwaitingReview(job)) {
    return { label: i18n.t('employer:jobs.awaitingReview'), pill: 'bg-amber-50 text-amber-700' }
  }
  return {
    label: jobStatusLabel(job.status),
    pill: job.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : FALLBACK_PILL,
  }
}

/**
 * The BE only activates an APPROVED job (awaiting review and rejected are
 * refused), so do not offer a button that can only fail. If the field is missing
 * we cannot tell, so we offer it and let the BE decide, as before.
 */
export function canActivateJob(job: { moderationStatus?: string }): boolean {
  return !job.moderationStatus || job.moderationStatus === 'APPROVED'
}

/**
 * Presentation for the BE VerificationStatus enum (employer profile).
 * It used to render as a raw token — "PENDING" / "APPROVED" — sitting next to a
 * translated label, which read as a bug even in English.
 */
const VERIFICATION_STATUS_KNOWN = ['PENDING', 'APPROVED', 'REJECTED']

export function verificationStatusLabel(status?: string): string {
  if (!status || !VERIFICATION_STATUS_KNOWN.includes(status)) return i18n.t('profile:verificationStatus.unknown')
  return i18n.t(`profile:verificationStatus.${status}`)
}

/** Pill colours for the same BE VerificationStatus enum (employer profile + documents). */
const VERIFICATION_PILL: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  APPROVED: 'bg-green-50 text-green-700',
  REJECTED: 'bg-red-50 text-red-700',
}

/** Icon per VerificationStatus, shared by the employer profile badge + document rows. */
const VERIFICATION_ICON: Record<string, LucideIcon> = {
  PENDING: Clock,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
}

/** Badge version of verificationStatusLabel — label + pill classes together. */
export function verificationStatusPill(status?: string): StatusMeta {
  return {
    label: verificationStatusLabel(status),
    pill: VERIFICATION_PILL[status ?? ''] ?? FALLBACK_PILL,
  }
}

export function verificationStatusIcon(status?: string): LucideIcon {
  return VERIFICATION_ICON[status ?? ''] ?? Clock
}
