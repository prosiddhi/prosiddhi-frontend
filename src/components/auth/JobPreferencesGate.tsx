'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { preferencesGate } from '@/lib/jobPreferences'
import { JOB_PREFERENCES_ROUTE } from '@/lib/routes'

/**
 * Holds a seeker on the job-preferences page until they have given a home city, sector and job
 * title (`needsJobPreferences`). Mounted once, in AuthProvider, beside ConsentGate.
 *
 * What it does on a seeker page is decided by `preferencesGate` (lib/jobPreferences.ts), which
 * never reads an unknown flag as "no":
 * - still loading: a loading screen over the page, no redirect.
 * - flag true (confirmed, or the last known answer when the read failed): redirect, with the
 *   page they wanted as `returnUrl` so they land back on it afterwards.
 * - flag unknown and unconfirmable: a screen with Try again and Log out. Nothing retries by
 *   itself: Try again is one request, on the user's tap.
 * - last known answer "nothing missing" but the read failed: the seeker is let in, with a small
 *   note and a Try again button over the page (it does not block it).
 * - still PENDING_OTP_VERIFICATION (a Google sign-up with no phone bound yet): sent to /login to
 *   finish the phone step, on the guarded pages AND on the preferences page. Phone, then
 *   preferences, then Home.
 *
 * The forced password change comes first (see preferencesGate).
 *
 * Consent: the dialog (ConsentGate) is `fixed … z-[60]`; everything here is z-40 or lower, so the
 * dialog paints above it whatever the mount order, and /complete-profile is not one of the
 * paths it hides on. A seeker with consent pending is therefore sent to the preferences page
 * UNDER the dialog and cannot use either until they accept. verify-job-preferences.mjs pins the
 * z-index relation: raise a z-index here past 60 and that check fails.
 */
export function JobPreferencesGate() {
  const { t } = useTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const { user, token, isLoading, profileSync, retryProfileSync, logout } = useAuth()
  const decision = preferencesGate({ isLoading, hasToken: !!token, user, profileSync, pathname })

  useEffect(() => {
    if (decision === 'phone') {
      // Phone first: /login resumes the bind step for a signed-in seeker who is still pending.
      // /login is never gated, so this cannot loop.
      router.replace('/login')
      return
    }
    if (decision !== 'redirect') return
    const returnUrl = pathname + window.location.search
    router.replace(`${JOB_PREFERENCES_ROUTE}?returnUrl=${encodeURIComponent(returnUrl)}`)
  }, [decision, pathname, router])

  if (decision === 'none') return null

  if (decision === 'notice') {
    // Not a cover: the page underneath stays usable. Try again is one request, on this tap.
    return (
      <div
        role="status"
        className="fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-[480px] items-center justify-between gap-3 rounded-[10px] border border-[#dedede] bg-white px-4 py-3 shadow-xl"
      >
        <p className="text-sm text-[#4d4d4d]">{t('auth:completeProfile.recoverTitle')}</p>
        <button
          type="button"
          onClick={retryProfileSync}
          className="min-h-[44px] shrink-0 rounded-lg bg-primary-50 px-4 text-sm text-primary-100 hover:bg-primary-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-50"
        >
          {t('buttons.tryAgain')}
        </button>
      </div>
    )
  }

  if (decision === 'recover') {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-white p-4">
        <div role="alert" className="w-full max-w-[480px] rounded-[10px] border border-[#dedede] bg-white px-6 py-8 shadow-xl">
          <h1 className="mb-2 text-2xl font-semibold leading-tight text-black">{t('auth:completeProfile.recoverTitle')}</h1>
          <p className="mb-6 text-base text-[#777776]">{t('auth:completeProfile.recoverBody')}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={retryProfileSync}
              className="min-h-[48px] flex-1 rounded-lg bg-primary-50 px-6 py-3 text-base text-primary-100 hover:bg-primary-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-50"
            >
              {t('buttons.tryAgain')}
            </button>
            <button
              type="button"
              // Wrapped, not passed by reference: logout() takes an optional redirect path.
              onClick={() => logout()}
              className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-lg border border-[#b5b5b5] px-6 py-3 text-base text-gray-700 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-50"
            >
              <LogOut className="h-4 w-4" />
              {t('nav.logout')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 'wait', 'redirect' and 'phone': cover the page so a seeker who must finish first never sees it.
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-white">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-primary-50"
        role="status"
        aria-label={t('auth:completeProfile.checking')}
      />
      <p className="text-base text-[#777776]">{t('auth:completeProfile.checking')}</p>
    </div>
  )
}
