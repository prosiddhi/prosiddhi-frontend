'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { JobForm } from '@/components/job/JobForm'
import { OutOfCreditsUpsell } from '@/components/employer/OutOfCreditsUpsell'
import { useCredits } from '@/hooks/useCredits'
import { employerAPI, fieldErrorsByPath, teamAPI, type PostJobData } from '@/lib/api'
import { isJobAwaitingReview, isJobUnderReview } from '@/lib/applicationStatus'
import { myJobsUrl } from '@/lib/myJobsNav'
import { showToast } from '@/lib/toast'
import { categoryParam, track } from '@/lib/analytics'
import { ChevronLeft, Clock, Loader2 } from 'lucide-react'
import { EmployerHeader } from '@/components/employer/EmployerHeader'

// The BE 402 message when a publish is attempted at zero POST credits
// (job.controller). Used as the reactive-gate signal (the {kind:'POST'} payload
// is dev-only, so we match the stable server message).
const NO_CREDITS_RE = /insufficient\s+post\s+credit/i
// The BE 400 when the organisation's account is not ACTIVE (job.service createJob):
// waiting for admin approval, or suspended.
const NOT_ACTIVE_RE = /account is not active/i

function NewJobContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  // The BE's per-field validation errors from the last failed save, shown at the fields.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>()
  // Reactive gate: flipped if a publish attempt is rejected for 0 credits
  // (covers the race where the balance hit 0 after this page loaded).
  const [blockedNoCredits, setBlockedNoCredits] = useState(false)
  // The organisation's account status, when the logged-in user's own record IS
  // the organisation (see the effect below). A pending account reads 0 credits
  // and cannot buy a plan either, so without this it would be offered the
  // upsell. null = unknown: the form shows and the server still refuses.
  const [orgStatus, setOrgStatus] = useState<string | null>(null)
  const [blockedNotActive, setBlockedNotActive] = useState(false)

  const { wallet, loading: walletLoading, reload: reloadWallet } = useCredits()

  useEffect(() => {
    track('job_post_started', { category: 'none' })
  }, [])

  // After a top-up, drop the reactive block and re-read the wallet. The spinner
  // shows while it loads, and the fresh balance decides what appears: the form
  // with a POST credit, the upsell again if it is still 0 (webhook not landed).
  const handlePurchased = () => {
    setBlockedNoCredits(false)
    reloadWallet()
  }

  // The employer's saved company name, offered to the optional Company Name box.
  // One attempt (the ref also stops Strict Mode's second effect run from refetching),
  // and a failure just leaves the box empty. No `fullName` fallback: an individual's
  // personal name is not a company. Setting state after unmount is a no-op.
  //
  // The profile is the LOGGED-IN user's own employer record, but the job is posted
  // under the organisation. An invited teammate keeps their own record (accepting an
  // invite leaves it untouched), and it can hold a different company name. So the name
  // is offered only when that record IS the organisation's (same id as the seat's
  // employerId). Fail closed: if either call fails, or the ids differ, nothing is offered.
  const [companyNameSuggestion, setCompanyNameSuggestion] = useState<string>()
  const suggestionTriedRef = useRef(false)
  useEffect(() => {
    if (suggestionTriedRef.current) return
    suggestionTriedRef.current = true
    Promise.all([employerAPI.getProfile(), teamAPI.getEntitlements()])
      .then(([profile, entitlements]) => {
        if (profile.employer?.id !== entitlements.employerId) return
        setOrgStatus(profile.accountStatus ?? null)
        setCompanyNameSuggestion(profile.employer?.companyName?.trim() || undefined)
      })
      .catch(() => {})
  }, [])

  // Proactive gate: block the form when the wallet loaded and POST balance is 0.
  // Fail-open if the wallet couldn't load (wallet === null) — the BE 402 is the
  // real enforcement, so we don't wrongly lock a paying employer out on a fetch
  // blip.
  const outOfCredits = blockedNoCredits || (wallet !== null && wallet.post.balance === 0)
  const notActive = blockedNotActive || (orgStatus !== null && orgStatus !== 'ACTIVE')

  const handleSubmit = async (data: PostJobData) => {
    setSubmitting(true)
    setError('')
    setFieldErrors(undefined)
    try {
      const job = await employerAPI.postJob(data)
      track('job_post_done', { category: categoryParam(data.category) })
      // Pre-moderation: a new post is offline until an admin approves it. Say so,
      // or the employer wonders why it is not live. My Jobs keeps the row's
      // "Under Review" pill after this toast is gone. It lands on the Pending Review
      // tab: the default Active tab only lists live posts, so the new one would not be
      // there.
      if (isJobAwaitingReview(job)) showToast(t('employer:jobs.noticePosted'), 'info')
      router.push(myJobsUrl(isJobUnderReview(job) ? 'pending' : 'active'))
    } catch (err) {
      const message = err instanceof Error ? err.message : t('employer:jobNew.publishFailed')
      if (err instanceof Error && NOT_ACTIVE_RE.test(err.message)) {
        setBlockedNotActive(true) // swap the form for the not-active notice
      } else if (err instanceof Error && NO_CREDITS_RE.test(err.message)) {
        setBlockedNoCredits(true) // swap the form for the upsell
        // The wallet in hand is the pre-publish snapshot, so it still shows the
        // credits the server has just refused. The upsell reads it to decide
        // between "your free trial has ended" and the generic wording — without
        // this refetch it always picks the generic one, in exactly the case the
        // trial copy exists for.
        void reloadWallet()
      } else {
        setError(message)
        setFieldErrors(fieldErrorsByPath(err))
      }
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7fbfd] flex flex-col">
      <EmployerHeader />

      <main className="flex-1 py-8 sm:py-10 lg:py-12">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px]">
          <Link href="/employer/jobs" className="inline-flex items-center gap-2 text-black hover:text-primary-50 transition-colors mb-6">
            <ChevronLeft className="w-5 h-5" />
            <span>{t('employer:jobNew.backToMyJobs')}</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-bold text-black mb-6 sm:mb-8">{t('employer:jobNew.title')}</h1>
          {notActive ? (
            <div role="status" className="max-w-2xl bg-white border border-[#dddddd] rounded-[10px] p-5 sm:p-6 flex items-start gap-3">
              <Clock className="w-5 h-5 text-secondary-70 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-black">{t('employer:jobNew.notActiveTitle')}</p>
                <p className="text-sm text-[#717182] mt-1">{t('employer:jobNew.notActiveBody')}</p>
                <Link href="/employer" className="inline-block mt-4 text-sm font-medium text-primary-50 hover:text-primary-60 transition-colors">
                  {t('employer:jobNew.backToDashboard')}
                </Link>
              </div>
            </div>
          ) : walletLoading ? (
            <div className="flex items-center gap-2 py-10 text-[#717182]">
              <Loader2 className="w-5 h-5 animate-spin text-primary-50" />
              <span className="text-sm">{t('employer:jobNew.checkingCredits')}</span>
            </div>
          ) : outOfCredits ? (
            <OutOfCreditsUpsell wallet={wallet} onPurchased={handlePurchased} />
          ) : (
            <>
              {/* Publishing silently spends a credit. When that credit is the free
                  trial, say so here — otherwise the employer only discovers the
                  trial existed once it is gone.

                  The condition is "EVERY post credit I hold is a trial credit",
                  not merely "I hold one". The server spends the soonest-expiring
                  lot first, so an employer holding a subscription that lapses
                  before their 14-day trial would spend the PAID credit under a
                  banner promising it was free. Comparing the totals is the only
                  claim we can prove from the wallet alone; it under-claims (stays
                  silent for mixed wallets) rather than lying. */}
              {wallet != null &&
                wallet.post.balance > 0 &&
                wallet.post.balance === (wallet.trial?.postRemaining ?? 0) && (
                <p className="mb-5 px-3 py-2 rounded-lg bg-[#e3f5ff] text-[#236987] text-sm">
                  {t('employer:jobNew.trialNote')}
                </p>
              )}
              <JobForm submitLabel={t('employer:jobNew.submitLabel')} submitting={submitting} error={error} serverFieldErrors={fieldErrors} companyNameSuggestion={companyNameSuggestion} onSubmit={handleSubmit} />
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default function NewJobPage() {
  return (
    <ProtectedRoute requiredRole="employer">
      <NewJobContent />
    </ProtectedRoute>
  )
}
