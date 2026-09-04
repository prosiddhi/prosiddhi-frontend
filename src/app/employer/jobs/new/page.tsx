'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { JobForm } from '@/components/job/JobForm'
import { OutOfCreditsUpsell } from '@/components/employer/OutOfCreditsUpsell'
import { useCredits } from '@/hooks/useCredits'
import { employerAPI, type PostJobData } from '@/lib/api'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { EmployerHeader } from '@/components/employer/EmployerHeader'

// The BE 402 message when a publish is attempted at zero POST credits
// (job.controller). Used as the reactive-gate signal (the {kind:'POST'} payload
// is dev-only, so we match the stable server message).
const NO_CREDITS_RE = /insufficient\s+post\s+credit/i

function NewJobContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  // Reactive gate: flipped if a publish attempt is rejected for 0 credits
  // (covers the race where the balance hit 0 after this page loaded).
  const [blockedNoCredits, setBlockedNoCredits] = useState(false)

  const { wallet, loading: walletLoading, reload: reloadWallet } = useCredits()

  // Proactive gate: block the form when the wallet loaded and POST balance is 0.
  // Fail-open if the wallet couldn't load (wallet === null) — the BE 402 is the
  // real enforcement, so we don't wrongly lock a paying employer out on a fetch
  // blip.
  const outOfCredits = blockedNoCredits || (wallet !== null && wallet.post.balance === 0)

  const handleSubmit = async (data: PostJobData) => {
    setSubmitting(true)
    setError('')
    try {
      await employerAPI.postJob(data)
      router.push('/employer/jobs')
    } catch (err) {
      const message = err instanceof Error ? err.message : t('employer:jobNew.publishFailed')
      if (err instanceof Error && NO_CREDITS_RE.test(err.message)) {
        setBlockedNoCredits(true) // swap the form for the upsell
        // The wallet in hand is the pre-publish snapshot, so it still shows the
        // credits the server has just refused. The upsell reads it to decide
        // between "your free trial has ended" and the generic wording — without
        // this refetch it always picks the generic one, in exactly the case the
        // trial copy exists for.
        void reloadWallet()
      } else {
        setError(message)
      }
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7fbfd] flex flex-col">
      <EmployerHeader logoHref="/employer/jobs" />

      <main className="flex-1 py-8 sm:py-10 lg:py-12">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px]">
          <Link href="/employer/jobs" className="inline-flex items-center gap-2 text-black hover:text-primary-50 transition-colors mb-6">
            <ChevronLeft className="w-5 h-5" />
            <span>{t('employer:jobNew.backToMyJobs')}</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-bold text-black mb-6 sm:mb-8">{t('employer:jobNew.title')}</h1>
          {walletLoading ? (
            <div className="flex items-center gap-2 py-10 text-[#717182]">
              <Loader2 className="w-5 h-5 animate-spin text-primary-50" />
              <span className="text-sm">{t('employer:jobNew.checkingCredits')}</span>
            </div>
          ) : outOfCredits ? (
            <OutOfCreditsUpsell wallet={wallet} />
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
              <JobForm submitLabel={t('employer:jobNew.submitLabel')} submitting={submitting} error={error} onSubmit={handleSubmit} />
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
