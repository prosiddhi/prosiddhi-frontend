'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Trans, useTranslation } from 'react-i18next'
import { ShieldCheck } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  ApiError,
  CONSENT_REQUIRED_EVENT,
  meAPI,
  type LegalConsentStatus,
  type UserRole,
} from '@/lib/api'
import { AcceptTermsCheckbox } from './AcceptTermsCheckbox'

/** Seekers and employers accept the Terms. Staff never see the portal's documents. */
const PORTAL_ROLES: ReadonlySet<UserRole> = new Set<UserRole>([
  'JOB_SEEKER',
  'EMPLOYER_INDIVIDUAL',
  'EMPLOYER_BUSINESS',
])

/** Where each role deletes its account (SettingsView → DeleteAccountModal). */
const SETTINGS_ROUTE = { seeker: '/settings', employer: '/employer/settings' } as const

/**
 * Pages that stay usable while the screen is waiting: the documents themselves, how
 * to get help, and the two Settings pages — someone who does not agree must be able
 * to reach "Delete account" (the backend keeps DELETE /me open for exactly this).
 * The "Read …" links open in a new tab, a fresh copy of the app; without this the
 * screen would cover the very text it asks them to read.
 */
const OPEN_WHILE_PENDING = new Set<string>([
  '/terms',
  '/privacy',
  '/refund-policy',
  '/delivery-policy',
  '/about',
  '/contact',
  '/help',
  '/delete-account',
  SETTINGS_ROUTE.seeker,
  SETTINGS_ROUTE.employer,
])

/**
 * Asks a signed-in seeker or employer to accept the current Terms of Use and Privacy
 * Policy when they have not — everyone who registered before acceptance was recorded,
 * anyone created by Google sign-up or by an admin, and everyone again after a new
 * version is published (prosiddhi-backend src/config/legal.ts).
 *
 * Checked once per signed-in person (GET /me/consents), and again whenever the API
 * answers 403 CONSENT_REQUIRED. Waits for the forced password change to finish first,
 * so the two screens never stack.
 *
 * Not dismissable: Escape and the backdrop do nothing. The ways out are to agree or to
 * log out, and the screen says that deleting the account is the way to leave for good.
 *
 * If the first check cannot reach the server it does not block the app — a network
 * blip must not lock everyone out. The backend is the real lock (LEGAL_CONSENT_ENFORCED):
 * its 403 brings this screen back.
 */
export function ConsentGate() {
  const { user, token, isLoading, logout } = useAuth()
  const pathname = usePathname()
  const eligible =
    !isLoading && !!token && !!user && PORTAL_ROLES.has(user.role) && !user.mustChangePassword
  if (!eligible) return null
  // Keyed by the person: someone else signing in on this browser gets a fresh check,
  // never the previous person's answer.
  return (
    <ConsentCheck
      key={user.id}
      hidden={OPEN_WHILE_PENDING.has(pathname)}
      settingsRoute={user.role === 'JOB_SEEKER' ? SETTINGS_ROUTE.seeker : SETTINGS_ROUTE.employer}
      onLogout={() => logout()}
    />
  )
}

type CheckState = {
  phase: 'loading' | 'ready' | 'error'
  status: LegalConsentStatus | null
  // Set when the server itself said acceptance is required; a failed status load is
  // then shown as an error to retry, not silently skipped.
  required: boolean
}

function ConsentCheck({
  hidden,
  settingsRoute,
  onLogout,
}: {
  hidden: boolean
  settingsRoute: string
  onLogout: () => void
}) {
  const [state, setState] = useState<CheckState>({ phase: 'loading', status: null, required: false })

  // State is only set when the request settles, never synchronously here.
  const fetchStatus = useCallback(async () => {
    try {
      const status = await meAPI.getConsents()
      setState((s) => ({ ...s, phase: 'ready', status }))
    } catch {
      setState((s) => ({ ...s, phase: 'error' }))
    }
  }, [])

  const reload = useCallback(async () => {
    setState((s) => ({ ...s, phase: 'loading' }))
    await fetchStatus()
  }, [fetchStatus])

  // The first check. Written out rather than calling fetchStatus so that a response
  // arriving after this person signed out is dropped instead of applied.
  useEffect(() => {
    let active = true
    meAPI
      .getConsents()
      .then((status) => {
        if (active) setState((s) => ({ ...s, phase: 'ready', status }))
      })
      .catch(() => {
        if (active) setState((s) => ({ ...s, phase: 'error' }))
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const onRequired = () => {
      setState((s) => ({ ...s, required: true, phase: 'loading' }))
      void fetchStatus()
    }
    window.addEventListener(CONSENT_REQUIRED_EVENT, onRequired)
    return () => window.removeEventListener(CONSENT_REQUIRED_EVENT, onRequired)
  }, [fetchStatus])

  const { phase, status, required } = state
  const pending = phase === 'ready' ? !!status?.needsAcceptance : phase === 'error' && required
  if (hidden || !pending) return null

  return (
    <ConsentDialog
      status={phase === 'ready' ? status : null}
      onRetry={reload}
      onAccepted={(next) => setState({ phase: 'ready', status: next, required: false })}
      onReload={reload}
      onLogout={onLogout}
      settingsRoute={settingsRoute}
    />
  )
}

function ConsentDialog({
  status,
  onRetry,
  onAccepted,
  onReload,
  onLogout,
  settingsRoute,
}: {
  /** null while the status could not be loaded. */
  status: LegalConsentStatus | null
  onRetry: () => void
  onAccepted: (next: LegalConsentStatus) => void
  onReload: () => Promise<void>
  onLogout: () => void
  settingsRoute: string
}) {
  const { t } = useTranslation('legal')
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const [checked, setChecked] = useState(false)
  const [missing, setMissing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  // Lock page scroll; keep Tab inside the card. Escape deliberately does nothing.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.querySelector<HTMLElement>('a, button, input')?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])'),
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (!active || !dialogRef.current.contains(active)) {
        e.preventDefault()
        first.focus()
      } else if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const accept = async () => {
    if (!status) return
    if (!checked) {
      setMissing(true)
      return
    }
    setSaving(true)
    setMessage('')
    try {
      onAccepted(await meAPI.acceptConsents(status.current))
    } catch (err) {
      if (err instanceof ApiError && err.code === 'LEGAL_VERSION_MISMATCH') {
        // A newer version went live while this was open: they agreed to text that is
        // no longer current. Show the new one and ask again.
        setChecked(false)
        setMessage(t('consent.gate.versionChanged'))
        await onReload()
      } else {
        setMessage(t('consent.gate.saveFailed'))
      }
    } finally {
      setSaving(false)
    }
  }

  const previouslyAccepted = !!status && (status.accepted.TERMS !== null || status.accepted.PRIVACY !== null)
  const link = 'text-primary-90 underline font-medium'

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[520px] max-h-[90vh] overflow-y-auto p-6 lg:p-8"
      >
        <ShieldCheck className="w-10 h-10 text-primary-50 mb-4" aria-hidden="true" />
        <h2 id={titleId} className="text-xl lg:text-2xl font-bold text-black mb-3">
          {previouslyAccepted ? t('consent.gate.titleUpdated') : t('consent.gate.title')}
        </h2>

        {status ? (
          <>
            <p className="text-base text-[#4d4d4d] mb-4">{t('consent.gate.intro')}</p>
            <ul className="mb-5 space-y-1 text-base">
              <li>
                <a href="/terms" target="_blank" rel="noopener noreferrer" className={link}>
                  {t('consent.gate.readTerms')}
                </a>
              </li>
              <li>
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className={link}>
                  {t('consent.gate.readPrivacy')}
                </a>
              </li>
            </ul>
            <AcceptTermsCheckbox
              checked={checked}
              onChange={(next) => {
                setChecked(next)
                setMessage('')
              }}
              showRequired={missing}
            />
          </>
        ) : (
          <p className="text-base text-[#4d4d4d] mb-4">{t('consent.gate.loadFailed')}</p>
        )}

        {message && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            {message}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3">
          {status ? (
            <button
              type="button"
              onClick={accept}
              disabled={saving}
              className="w-full min-h-[48px] bg-primary-50 text-primary-100 px-6 py-3 rounded-lg text-base font-medium hover:bg-primary-60 transition-colors disabled:opacity-50"
            >
              {saving ? t('consent.gate.accepting') : t('consent.gate.accept')}
            </button>
          ) : (
            <button
              type="button"
              onClick={onRetry}
              className="w-full min-h-[48px] bg-primary-50 text-primary-100 px-6 py-3 rounded-lg text-base font-medium hover:bg-primary-60 transition-colors"
            >
              {t('consent.gate.retry')}
            </button>
          )}
          <button
            type="button"
            onClick={onLogout}
            className="w-full min-h-[48px] px-6 py-3 border border-gray-300 rounded-lg text-base font-medium text-black hover:bg-gray-50 transition-colors"
          >
            {t('consent.gate.logout')}
          </button>
        </div>

        <p className="mt-4 text-sm text-[#767676]">
          <Trans
            i18nKey="legal:consent.gate.deleteHint"
            components={{ settings: <Link href={settingsRoute} className="underline" /> }}
          />
        </p>
      </div>
    </div>
  )
}
