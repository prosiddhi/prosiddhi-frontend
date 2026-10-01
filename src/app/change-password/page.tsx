'use client'

import { Suspense, useEffect } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { LogOut } from 'lucide-react'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { ChangePasswordForm } from '@/components/auth/ChangePasswordForm'
import { useAuth } from '@/contexts/AuthContext'
import { employerAPI, jobSeekerAPI } from '@/lib/api'
import { destinationAfterAuth } from '@/lib/routes'

/**
 * The forced "set a new password" screen — for BOTH roles (the route and the API
 * are role-neutral).
 *
 * An admin reset leaves the account with a temporary password and
 * `mustChangePassword: true`; the BE refuses every other route until it changes.
 * AuthProvider is what sends people here — this page only shows the form and
 * leaves once the flag is clear. It deliberately has no app header: that would
 * poll notifications and the like, all of which answer 403 in this state.
 */
function ChangePasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnUrl = searchParams.get('returnUrl')
  const { t } = useTranslation()
  const { user, isLoading, updateUser, logout } = useAuth()

  const mustChangePassword = !!user?.mustChangePassword
  const role = user?.role

  // The one way out: the flag is clear — the password was just changed, or someone
  // who never needed this opened it. Navigates to the role's home (or a
  // role-valid, validated returnUrl).
  useEffect(() => {
    if (isLoading || !user || mustChangePassword) return
    router.replace(destinationAfterAuth(user.role, returnUrl))
  }, [isLoading, user, mustChangePassword, returnUrl, router])

  // The stored flag can be stale: the password may have been changed from another
  // device or tab since this session saved it, and the temporary password would
  // then no longer work here. Ask the server once. (GET profile is one of the two
  // reads the BE still answers while the flag is set.) A failed read just leaves
  // the form up.
  useEffect(() => {
    if (!mustChangePassword) return
    let ignore = false
    const request: Promise<{ mustChangePassword?: boolean }> =
      role === 'JOB_SEEKER' ? jobSeekerAPI.getProfile() : employerAPI.getProfile()
    request
      .then((profile) => {
        if (!ignore && profile.mustChangePassword === false) updateUser({ mustChangePassword: false })
      })
      .catch(() => {})
    return () => {
      ignore = true
    }
  }, [mustChangePassword, role, updateUser])

  if (!mustChangePassword) return null

  return (
    <div className="min-h-dvh flex flex-col bg-gradient-to-br from-blue-50 to-white">
      <header className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3">
        <div className="relative w-[150px] sm:w-[180px] h-[44px]">
          <Image
            src="/assets/prosiddhi-logo-horizontal.png"
            alt={t('app.name')}
            fill
            className="object-contain object-left"
            priority
          />
        </div>
        <button
          type="button"
          // Wrapped, not passed by reference: logout() takes an optional redirect
          // path, and React would hand it the click's MouseEvent.
          onClick={() => logout()}
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-50"
        >
          <LogOut className="w-4 h-4" />
          {t('nav.logout')}
        </button>
      </header>

      <main className="flex-1 flex items-start justify-center p-4">
        <div className="my-auto w-full max-w-[520px] bg-white border border-[#dedede] rounded-[10px] px-6 sm:px-8 py-6 sm:py-8 shadow-xl">
          <h1 className="text-2xl font-semibold text-black mb-2 leading-tight">
            {t('passwordChangeRequired.title')}
          </h1>
          <p className="text-base text-[#777776] mb-6">{t('passwordChangeRequired.description')}</p>
          <ChangePasswordForm onSuccess={() => updateUser({ mustChangePassword: false })} />
        </div>
      </main>
    </div>
  )
}

export default function ChangePasswordPage() {
  // `useSearchParams` (for returnUrl) needs a Suspense boundary or the static
  // prerender of this route fails at build time — same as /login.
  return (
    <Suspense fallback={null}>
      <ProtectedRoute allowPasswordChange>
        <ChangePasswordContent />
      </ProtectedRoute>
    </Suspense>
  )
}
