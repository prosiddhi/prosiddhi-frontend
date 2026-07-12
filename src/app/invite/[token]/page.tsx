'use client'

// PUBLIC team-invite landing page (MONETIZATION §6.3). Deliberately NOT wrapped in
// ProtectedRoute: the whole point is that an invitee with no account can open it.
// Holding the token is the authorization, and the BE's public peek endpoint returns
// nothing beyond the address the invite was already sent to plus the company name.
//
// The link is clicked ONCE. Whatever state the invitee arrives in, they end up on
// the team:
//
//   signed in, email matches   → Accept
//   signed in, wrong account   → say so, offer to switch account (the invite is
//                                EMAIL-BOUND; the BE 403s a mismatch — our check is
//                                only UX, never the enforcement)
//   signed in as a job seeker  → say so; seats are employer-only
//   signed out, has an account → sign in, carrying the token → auto-accept on return
//   signed out, no account yet → register, carrying the token → auto-accept on return
//
// The token is never logged and never leaves the same-origin path we build for it.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import Image from 'next/image'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { formatShortDate } from '@/lib/jobFormat'
import { teamAPI, ApiError, type InvitePeek } from '@/lib/api'
import {
  clearInviteToken,
  invitePath,
  isValidInviteToken,
  readInviteToken,
  stashInviteToken,
} from '@/lib/inviteToken'
import { Users, Loader2, AlertCircle, CheckCircle2, Building2, Mail } from 'lucide-react'

type TFunc = ReturnType<typeof useTranslation>['t']

/**
 * Map a failed accept to a human, actionable message.
 *
 * Branch on STATUS first. The BE's `reason` is only sent when it runs with
 * NODE_ENV=development (sendError gates the payload), so in production it is
 * absent — a `reason`-only map would silently degrade to "something went wrong"
 * on the exact surface where the user most needs to be told what to do. `reason`
 * refines the 400 case, which is the one status carrying two distinct meanings.
 */
function messageForInviteError(err: unknown, t: TFunc): string {
  if (!(err instanceof ApiError)) {
    return err instanceof Error ? err.message : t('employer:invite.errors.generic')
  }
  switch (err.status) {
    case 402: // NO_SEAT_AVAILABLE — the plan shrank between invite and accept.
      return t('employer:invite.errors.noSeat')
    case 403: // INVITE_EMAIL_MISMATCH (or a non-employer JWT, which we pre-empt).
      return t('employer:invite.errors.emailMismatch')
    case 409: // WORKSPACE_CONFLICT — they already run a real workspace of their own.
      return t('employer:invite.errors.workspaceConflict')
    case 404: // Unknown / spent / expired token.
      return t('employer:invite.errors.invalid')
    case 400:
      // INVITE_INVALID = dead token. INVITE_REJECTED = a real token this account
      // may not use (seeker email, already a teammate, self-invite). Without a
      // reason (production) we must cover both without lying about either.
      if (err.reason === 'INVITE_INVALID') return t('employer:invite.errors.invalid')
      if (err.reason === 'INVITE_REJECTED') return t('employer:invite.errors.rejected')
      return t('employer:invite.errors.badRequest')
    case 429:
      return t('employer:invite.errors.rateLimited')
    default:
      return t('employer:invite.errors.generic')
  }
}

export default function InviteLandingPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth()

  const rawToken = useParams().token
  const token = typeof rawToken === 'string' ? decodeURIComponent(rawToken) : ''
  const tokenLooksReal = isValidInviteToken(token)

  const [invite, setInvite] = useState<InvitePeek | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [accepting, setAccepting] = useState(false)
  const [acceptError, setAcceptError] = useState('')
  const [accepted, setAccepted] = useState(false)

  // Look the invite up. Public call — no JWT required, and none is needed to
  // decide what to show. A malformed token never reaches the network.
  useEffect(() => {
    let cancelled = false
    if (!tokenLooksReal) {
      setLoading(false)
      setLoadError(t('employer:invite.errors.invalid'))
      return
    }
    ;(async () => {
      try {
        const peek = await teamAPI.peekInvite(token)
        if (!cancelled) setInvite(peek)
      } catch (err) {
        if (!cancelled) setLoadError(messageForInviteError(err, t))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, tokenLooksReal, t])

  const emailMatches =
    !!invite &&
    !!user?.email &&
    user.email.trim().toLowerCase() === invite.email.trim().toLowerCase()
  const isEmployer = user?.role === 'EMPLOYER_INDIVIDUAL' || user?.role === 'EMPLOYER_BUSINESS'
  const canAccept = isAuthenticated && isEmployer && emailMatches

  const accept = useCallback(async () => {
    setAccepting(true)
    setAcceptError('')
    try {
      await teamAPI.acceptInvite(token)
      clearInviteToken() // single-use — it is spent now
      setAccepted(true)
    } catch (err) {
      clearInviteToken() // don't re-drive a failing auto-accept on the next visit
      setAcceptError(messageForInviteError(err, t))
    } finally {
      setAccepting(false)
    }
  }, [token, t])

  // Auto-accept on RETURN from auth: they clicked once, went through sign-in or
  // registration, and came back. The stash proves it was this same tab's journey,
  // so we finish the job rather than making them press Accept a second time.
  // A first-time visit by an already-signed-in user has no stash and gets the
  // explicit Accept button instead.
  const autoAccepted = useRef(false)
  useEffect(() => {
    if (autoAccepted.current || accepted || accepting) return
    if (authLoading || !canAccept) return
    if (readInviteToken() !== token) return
    autoAccepted.current = true
    void accept()
  }, [authLoading, canAccept, accepted, accepting, token, accept])

  /** Send them to sign-in or registration, carrying the invite through. */
  const goToAuth = (target: 'login' | 'register') => {
    stashInviteToken(token)
    if (target === 'login') {
      // Same-origin path we built ourselves; /login re-validates it against our
      // origin before navigating, so this cannot become an open redirect.
      router.push(`/login?returnUrl=${encodeURIComponent(invitePath(token))}`)
    } else {
      router.push('/employer/register')
    }
  }

  /** Wrong account signed in — drop the session and come straight back here. */
  const switchAccount = () => {
    stashInviteToken(token)
    logout(`/login?returnUrl=${encodeURIComponent(invitePath(token))}`)
  }

  const homeHref = isAuthenticated ? (isEmployer ? '/employer' : '/job-feed') : '/login'

  return (
    <div className="min-h-screen bg-[#f7fbfd] flex flex-col">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[119px] h-[65px] sm:h-[75px] flex items-center">
          <Link href="/" className="flex items-center">
            <div className="relative w-[100px] sm:w-[120px] lg:w-[142px] h-[28px] sm:h-[33px] lg:h-[39px]">
              <Image src="/assets/logo.png" alt={t('employer:team.logoAlt')} fill className="object-contain" priority />
            </div>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center py-10 px-4">
        <div className="bg-white border border-[#dddddd] rounded-[16px] w-full max-w-md p-8">
          {loading || authLoading ? (
            <div className="flex flex-col items-center gap-3 py-8 text-[#717182]">
              <Loader2 className="w-8 h-8 animate-spin text-primary-50" />
              <span className="text-sm">{t('employer:invite.loading')}</span>
            </div>
          ) : accepted ? (
            /* Joined. */
            <div className="text-center">
              <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
              <h1 className="text-xl font-semibold mb-2">{t('employer:invite.successTitle')}</h1>
              <p className="text-sm text-[#717182] mb-6">
                {t('employer:invite.successBody', { company: invite?.companyName ?? '' })}
              </p>
              <button
                type="button"
                onClick={() => router.replace('/employer')}
                className="w-full py-2.5 bg-primary-50 text-white rounded-lg text-sm font-medium hover:bg-primary-60 transition-colors"
              >
                {t('employer:invite.goToDashboard')}
              </button>
            </div>
          ) : loadError || !invite ? (
            /* Dead link — never a dead end: always give them somewhere to go. */
            <div className="text-center">
              <AlertCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />
              <h1 className="text-xl font-semibold mb-2">{t('employer:invite.invalidTitle')}</h1>
              <p className="text-sm text-[#717182] mb-6">{loadError || t('employer:invite.errors.invalid')}</p>
              <Link
                href={homeHref}
                className="inline-flex w-full items-center justify-center py-2.5 border border-primary-50 text-primary-50 rounded-lg text-sm font-medium hover:bg-primary-50/5 transition-colors"
              >
                {isAuthenticated ? t('employer:invite.goToDashboard') : t('employer:invite.goToSignIn')}
              </Link>
            </div>
          ) : (
            <>
              {/* The invitation itself. */}
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-full bg-[#e3f5ff] flex items-center justify-center mx-auto mb-4 text-[#236987]">
                  <Users className="w-7 h-7" />
                </div>
                <h1 className="text-xl font-semibold mb-2">
                  {invite.companyName
                    ? t('employer:invite.titleWithCompany', { company: invite.companyName })
                    : t('employer:invite.title')}
                </h1>
                <p className="text-sm text-[#717182]">{t('employer:invite.body')}</p>
              </div>

              <dl className="bg-[#f5fcff] border border-[#cceeff] rounded-lg p-4 mb-6 space-y-2 text-sm">
                {invite.companyName && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#236987] flex-shrink-0" />
                    <dt className="sr-only">{t('employer:invite.companyLabel')}</dt>
                    <dd className="font-medium text-black truncate">{invite.companyName}</dd>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#236987] flex-shrink-0" />
                  <dt className="sr-only">{t('employer:invite.emailLabel')}</dt>
                  <dd className="text-black truncate">{invite.email}</dd>
                </div>
                <p className="text-xs text-[#717182] pt-1">
                  {t('employer:invite.expires', { date: formatShortDate(invite.expiresAt) })}
                </p>
              </dl>

              {acceptError && (
                <div className="flex items-start gap-2 text-red-600 text-sm mb-4">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{acceptError}</span>
                </div>
              )}

              {/* Signed in as a job seeker — a seeker account can never hold an
                  employer seat (the BE refuses it), so don't offer a dead Accept. */}
              {isAuthenticated && !isEmployer ? (
                <>
                  <p className="text-sm text-[#717182] mb-4">{t('employer:invite.seekerAccount')}</p>
                  <button
                    type="button"
                    onClick={switchAccount}
                    className="w-full py-2.5 border border-primary-50 text-primary-50 rounded-lg text-sm font-medium hover:bg-primary-50/5 transition-colors"
                  >
                    {t('employer:invite.switchAccount')}
                  </button>
                </>
              ) : isAuthenticated && !emailMatches ? (
                /* Right kind of account, wrong person. The invite is email-bound. */
                <>
                  <p className="text-sm text-[#717182] mb-4">
                    {t('employer:invite.wrongAccount', {
                      signedInAs: user?.email ?? '',
                      invitedEmail: invite.email,
                    })}
                  </p>
                  <button
                    type="button"
                    onClick={switchAccount}
                    className="w-full py-2.5 border border-primary-50 text-primary-50 rounded-lg text-sm font-medium hover:bg-primary-50/5 transition-colors"
                  >
                    {t('employer:invite.switchAccount')}
                  </button>
                </>
              ) : canAccept ? (
                /* The invited person, signed in. One click. */
                <button
                  type="button"
                  onClick={() => void accept()}
                  disabled={accepting}
                  className="w-full py-2.5 bg-primary-50 text-white rounded-lg text-sm font-medium hover:bg-primary-60 disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {accepting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('employer:invite.accept')}
                </button>
              ) : (
                /* Signed out. accountExists picks the primary path; the other is
                   still offered, because that flag can be stale (they may have
                   registered in another tab). */
                <div className="space-y-3">
                  {invite.accountExists ? (
                    <>
                      <button
                        type="button"
                        onClick={() => goToAuth('login')}
                        className="w-full py-2.5 bg-primary-50 text-white rounded-lg text-sm font-medium hover:bg-primary-60 transition-colors"
                      >
                        {t('employer:invite.signInToAccept')}
                      </button>
                      <button
                        type="button"
                        onClick={() => goToAuth('register')}
                        className="w-full py-2.5 border border-[#dddddd] text-black rounded-lg text-sm hover:bg-gray-50 transition-colors"
                      >
                        {t('employer:invite.registerInstead')}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => goToAuth('register')}
                        className="w-full py-2.5 bg-primary-50 text-white rounded-lg text-sm font-medium hover:bg-primary-60 transition-colors"
                      >
                        {t('employer:invite.createAccount')}
                      </button>
                      <button
                        type="button"
                        onClick={() => goToAuth('login')}
                        className="w-full py-2.5 border border-[#dddddd] text-black rounded-lg text-sm hover:bg-gray-50 transition-colors"
                      >
                        {t('employer:invite.signInInstead')}
                      </button>
                    </>
                  )}
                  <p className="text-xs text-[#717182] text-center pt-1">
                    {t('employer:invite.mustUseInvitedEmail', { email: invite.email })}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
