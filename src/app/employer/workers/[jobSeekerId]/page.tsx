'use client'

// Candidate profile + explicit unlock (Phase 2, EPIC B). Shows the snippet when
// locked; an explicit "use 1 credit to unlock" confirm spends a DOWNLOAD credit
// (POST /candidates/:id/unlock) and reveals contact. Idempotent server-side, so
// re-viewing an already-unlocked candidate is free.
//
// Out of unlocks (402 INSUFFICIENT_DOWNLOAD_CREDITS) → "database access is
// launching soon". Since 20 Oct 2026 the plans sell job posts only, so no plan
// can refill unlocks — this used to open the top-up pop-up, which would have
// sold a pack that adds none. The only unlocks today are the free trial's.

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { PreferredCities } from '@/components/employer/PreferredCities'
import { useCredits } from '@/hooks/useCredits'
import { ApiError, candidateAPI, type CandidateProfile, type Wallet } from '@/lib/api'
import { formatMonthYear } from '@/lib/jobFormat'
import { CandidateAvatar } from '@/components/employer/CandidateAvatar'
import { ActivelyLookingBadge } from '@/components/employer/ActivelyLookingBadge'
import {
  ChevronLeft,
  Briefcase,
  Mail,
  Phone,
  Lock,
  Unlock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react'
import { EmployerHeader } from '@/components/employer/EmployerHeader'
import { PAGE_BOX } from '@/lib/layout'
import { track } from '@/lib/analytics'

function CandidateContent() {
  const { t } = useTranslation()
  const params = useParams<{ jobSeekerId: string }>()
  const jobSeekerId = params.jobSeekerId

  const [profile, setProfile] = useState<CandidateProfile | null>(null)
  const [unlocked, setUnlocked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [unlockError, setUnlockError] = useState('')
  const [noUnlocks, setNoUnlocks] = useState(false)

  const { wallet, reload: reloadWallet } = useCredits()

  // The cached zero a click started a reload from. useCredits only calls setWallet
  // on a successful fetch, so a different wallet object means that reload finished OK;
  // the same object means it is still in flight or failed. Set only by the zero click,
  // never by the 402 path, so a server "no" is not bounced back to the confirm.
  const staleWallet = useRef<Wallet | null>(null)

  useEffect(() => {
    if (!noUnlocks) staleWallet.current = null
    if (!staleWallet.current || wallet === staleWallet.current) return
    staleWallet.current = null
    if ((wallet?.download.balance ?? 0) > 0) {
      setNoUnlocks(false)
      setConfirmOpen(true)
    }
  }, [noUnlocks, wallet])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    candidateAPI
      .getCandidate(jobSeekerId)
      .then((res) => {
        if (!active) return
        setProfile(res.profile)
        setUnlocked(res.unlocked)
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : t('employer:candidate.loadFailed'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [jobSeekerId, t])

  // A known balance of exactly 0 skips the confirm and the call. While the wallet
  // is loading or failed to load it is null, so we let the server decide (402 below).
  const handleUnlockClick = () => {
    setUnlockError('')
    if (wallet?.download.balance === 0) {
      setNoUnlocks(true)
      staleWallet.current = wallet
      reloadWallet() // the 0 may be stale; the effect above swaps dialogs if it was
      return
    }
    setConfirmOpen(true)
  }

  const handleUnlock = async () => {
    setUnlocking(true)
    setUnlockError('')
    try {
      const res = await candidateAPI.unlockCandidate(jobSeekerId)
      setProfile(res.profile)
      setUnlocked(true)
      track('candidate_unlocked', {})
      setConfirmOpen(false)
      reloadWallet() // balance changed
    } catch (err) {
      const message = err instanceof Error ? err.message : t('employer:candidate.unlockFailed')
      // The stable `code`, not the message — MONETIZATION.md §5.1. Matching the
      // English message broke the moment the backend reworded it.
      if (err instanceof ApiError && err.code === 'INSUFFICIENT_DOWNLOAD_CREDITS') {
        setConfirmOpen(false)
        setNoUnlocks(true)
        reloadWallet() // the shown balance was stale — the server says 0

      } else {
        setUnlockError(message)
      }
    } finally {
      setUnlocking(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7fbfd] flex flex-col">
      <EmployerHeader />

      <main className="flex-1 py-8 sm:py-10">
        {/* Same box as EmployerHeader, so the body lines up with the logo and the account menu. */}
        <div className={PAGE_BOX}>
          <Link href="/employer/workers" className="inline-flex items-center gap-2 text-black hover:text-primary-50 transition-colors mb-6">
            <ChevronLeft className="w-5 h-5" />
            <span>{t('employer:candidate.back')}</span>
          </Link>

          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-[#717182]">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary-50" />
              <p>{t('employer:candidate.loading')}</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
              <p className="text-red-600 max-w-md">{error}</p>
            </div>
          )}

          {!loading && !error && profile && (
            <div className="space-y-5">
              {/* Header card */}
              <div className="bg-white border border-[#dddddd] rounded-[12px] p-6">
                <div className="flex items-start gap-4">
                  <CandidateAvatar photo={profile.profilePhoto} name={profile.fullName} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-2xl font-bold text-black">{profile.fullName}</h1>
                      {unlocked && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-medium">
                          <Unlock className="w-3 h-3" /> {t('employer:candidate.unlockedBadge')}
                        </span>
                      )}
                      <ActivelyLookingBadge active={profile.isActivelyLooking} />
                    </div>
                    {profile.preferredJobTitle && <p className="text-[#717182]">{profile.preferredJobTitle}</p>}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-[#717182]">
                      <PreferredCities cities={profile.preferredCities} iconClassName="w-4 h-4" />
                      {profile.preferredSector && (
                        <span className="flex items-center gap-1"><Briefcase className="w-4 h-4" /> {profile.preferredSector}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact — unlocked shows it; locked shows the unlock CTA */}
              <div className="bg-white border border-[#dddddd] rounded-[12px] p-6">
                <h2 className="text-lg font-semibold text-black mb-4">{t('employer:candidate.contact')}</h2>
                {unlocked ? (
                  <div className="space-y-2 text-sm">
                    {profile.available === false && (
                      <p className="text-[#717182]">{t('employer:candidate.unavailableNote')}</p>
                    )}
                    {profile.email && (
                      <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-[#236987]" /> <a href={`mailto:${profile.email}`} className="text-primary-50 hover:underline">{profile.email}</a></p>
                    )}
                    {profile.phoneNumber && (
                      <p className="flex items-center gap-2"><Phone className="w-4 h-4 text-[#236987]" /> <a href={`tel:${profile.phoneNumber}`} className="text-primary-50 hover:underline">{profile.phoneNumber}</a></p>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-2 text-[#717182] text-sm flex-1">
                      <Lock className="w-4 h-4" />
                      <span>{t('employer:candidate.lockedNote')}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleUnlockClick}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors text-sm font-medium whitespace-nowrap"
                    >
                      <Unlock className="w-4 h-4" /> {t('employer:candidate.unlockCta')}
                    </button>
                  </div>
                )}
              </div>

              {/* About */}
              {profile.bio && (
                <div className="bg-white border border-[#dddddd] rounded-[12px] p-6">
                  <h2 className="text-lg font-semibold text-black mb-2">{t('employer:candidate.about')}</h2>
                  <p className="text-sm text-[#444] whitespace-pre-line">{profile.bio}</p>
                </div>
              )}

              {/* Skills */}
              {profile.skills?.length > 0 && (
                <div className="bg-white border border-[#dddddd] rounded-[12px] p-6">
                  <h2 className="text-lg font-semibold text-black mb-3">{t('employer:candidate.skills')}</h2>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map((s) => (
                      <span key={s.skill?.id ?? s.skill?.name} className="bg-[#e3f5ff] text-[#236987] px-3 py-1 rounded-full text-sm">
                        {s.skill?.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience */}
              {profile.workExperience?.length > 0 && (
                <div className="bg-white border border-[#dddddd] rounded-[12px] p-6">
                  <h2 className="text-lg font-semibold text-black mb-3">{t('employer:candidate.experience')}</h2>
                  <div className="space-y-4">
                    {profile.workExperience.map((w, i) => (
                      <div key={`${w.position}-${i}`} className="border-l-2 border-[#e3f5ff] pl-4">
                        <p className="font-medium text-black">{w.position}</p>
                        {w.companyName && <p className="text-sm text-[#717182]">{w.companyName}</p>}
                        <p className="text-xs text-[#717182]">
                          {formatMonthYear(w.startDate)} – {w.currentlyWorking ? t('employer:candidate.present') : formatMonthYear(w.endDate)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Explicit unlock confirm */}
      {confirmOpen && profile && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={unlocking ? undefined : () => setConfirmOpen(false)}>
          <div className="bg-white rounded-[16px] w-full max-w-sm p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setConfirmOpen(false)} disabled={unlocking} aria-label={t('employer:candidate.confirmCancel')} className="absolute right-4 top-4 text-gray-400 hover:text-black disabled:opacity-40">
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-full bg-[#e3f5ff] flex items-center justify-center mb-4 text-[#236987]">
              <Unlock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t('employer:candidate.confirmTitle')}</h3>
            <p className="text-sm text-[#717182] mb-1">{t('employer:candidate.confirmBody', { name: profile.fullName })}</p>
            {wallet && (
              <p className="text-xs text-[#717182] mb-4">{t('employer:candidate.confirmBalance', { count: wallet.download.balance })}</p>
            )}
            {unlockError && (
              <div className="flex items-start gap-2 text-red-600 text-sm mb-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{unlockError}</span>
              </div>
            )}
            <div className="flex gap-3 mt-4">
              <button type="button" onClick={() => setConfirmOpen(false)} disabled={unlocking} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
                {t('employer:candidate.confirmCancel')}
              </button>
              <button type="button" onClick={handleUnlock} disabled={unlocking} className="flex-1 py-2.5 bg-primary-50 text-primary-100 rounded-lg text-sm font-medium hover:bg-primary-60 disabled:opacity-60 flex items-center justify-center gap-2">
                {unlocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {t('employer:candidate.confirmUnlock')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Out of unlocks. Nothing to buy yet: candidate database plans are
          "launching soon" on the plans page too, with the same words. */}
      {noUnlocks && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => setNoUnlocks(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="no-unlocks-title" className="bg-white rounded-[16px] w-full max-w-sm p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setNoUnlocks(false)} aria-label={t('buttons.close')} className="absolute right-4 top-4 text-gray-400 hover:text-black">
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-full bg-[#e3f5ff] flex items-center justify-center mb-4 text-[#236987]">
              <Lock className="w-6 h-6" />
            </div>
            <h3 id="no-unlocks-title" className="text-lg font-semibold mb-2">{t('employer:plans.soon.title')}</h3>
            <p className="text-sm text-[#717182]">{t('employer:plans.soon.databaseBody')}</p>
            <button type="button" onClick={() => setNoUnlocks(false)} className="w-full mt-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">
              {t('buttons.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CandidateProfilePage() {
  return (
    <ProtectedRoute requiredRole="employer">
      <CandidateContent />
    </ProtectedRoute>
  )
}
