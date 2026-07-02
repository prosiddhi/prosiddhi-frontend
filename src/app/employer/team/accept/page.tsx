'use client'

// Accept a team invite (Phase 3, EPIC C). The invitee opens the relayed link
// (/employer/team/accept?token=…) while signed in as an employer and accepts;
// the BE binds the seat to their account. Handles invalid/expired token and the
// seats-full-at-accept-time case (owner's plan shrank since the invite).

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { UserDropdown } from '@/components/navigation/UserDropdown'
import { teamAPI } from '@/lib/api'
import { Users, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'

function AcceptContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const token = useSearchParams().get('token') ?? ''

  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleAccept = async () => {
    if (!token) return
    setAccepting(true)
    setError('')
    try {
      await teamAPI.acceptInvite(token)
      setDone(true)
      // Strip the one-shot token from the URL/history after use (hygiene) — the
      // success view stays because `done` state persists across this same-route
      // replace.
      router.replace('/employer/team/accept')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('employer:team.accept.failed'))
    } finally {
      setAccepting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7fbfd] flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[119px] h-[65px] sm:h-[75px] flex items-center justify-between">
          <Link href="/employer" className="flex items-center">
            <div className="relative w-[100px] sm:w-[120px] lg:w-[142px] h-[28px] sm:h-[33px] lg:h-[39px]">
              <Image src="/assets/logo.png" alt={t('employer:team.logoAlt')} fill className="object-contain" priority />
            </div>
          </Link>
          <UserDropdown />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center py-10 px-4">
        <div className="bg-white border border-[#dddddd] rounded-[16px] w-full max-w-md p-8 text-center">
          {done ? (
            <>
              <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
              <h1 className="text-xl font-semibold mb-2">{t('employer:team.accept.successTitle')}</h1>
              <p className="text-sm text-[#717182] mb-6">{t('employer:team.accept.successBody')}</p>
              <button
                type="button"
                onClick={() => router.push('/employer')}
                className="w-full py-2.5 bg-primary-50 text-white rounded-lg text-sm font-medium hover:bg-primary-60 transition-colors"
              >
                {t('employer:team.accept.goToDashboard')}
              </button>
            </>
          ) : !token ? (
            <>
              <AlertCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />
              <h1 className="text-xl font-semibold mb-2">{t('employer:team.accept.title')}</h1>
              <p className="text-sm text-[#717182]">{t('employer:team.accept.noToken')}</p>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-full bg-[#e3f5ff] flex items-center justify-center mx-auto mb-4 text-[#236987]">
                <Users className="w-7 h-7" />
              </div>
              <h1 className="text-xl font-semibold mb-2">{t('employer:team.accept.title')}</h1>
              <p className="text-sm text-[#717182] mb-6">{t('employer:team.accept.body')}</p>
              {error && (
                <div className="flex items-start gap-2 text-red-600 text-sm mb-4 text-left">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{error}</span>
                </div>
              )}
              <button
                type="button"
                onClick={handleAccept}
                disabled={accepting}
                className="w-full py-2.5 bg-primary-50 text-white rounded-lg text-sm font-medium hover:bg-primary-60 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {accepting && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('employer:team.accept.accept')}
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <ProtectedRoute requiredRole="employer">
      <Suspense fallback={null}>
        <AcceptContent />
      </Suspense>
    </ProtectedRoute>
  )
}
