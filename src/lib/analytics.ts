// Google Analytics 4 — the one place the portal talks to it.
//
// Off unless NEXT_PUBLIC_GA_MEASUREMENT_ID is set at build time (production only).
// Unset, every function here returns at once: no script, no cookie, no request.
//
// Privacy (docs/analytics-plan.md §2): no user id, no user properties, Google
// signals and ad personalisation off, and page addresses cleaned before they leave
// (lib/analyticsPath.ts). Event params are typed below — a param that is not in
// that list does not compile. Never add one that carries typed text, a name, a
// phone, an email, a city, a date of birth or any id.

import i18n from '@/i18n/config'
import { toSupportedLanguage, type SupportedLanguage } from '@/i18n/languages'
import { AUTH_USER_KEY, type UserRole } from '@/lib/api'
import { cleanPath, cleanReferrer } from '@/lib/analyticsPath'

// A malformed value is treated as unset: it ends up in a script URL.
const RAW_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? ''
export const GA_MEASUREMENT_ID = /^G-[A-Z0-9]+$/.test(RAW_ID) ? RAW_ID : ''

type Role = 'seeker' | 'employer'

/** Every event and its params. The same names as the mobile app's. */
interface EventParams {
  role_selected: { role: Role }
  language_selected: { language: SupportedLanguage }
  sign_up_started: { role: Role }
  sign_up_step: { role: Role; step: 'phone_verified' | 'email_verified' | 'details' }
  sign_up: { role: Role; method: 'phone' | 'google' }
  login: { method: 'password' | 'otp' | 'google' }
  use_my_location: { result: 'ok' | 'denied' | 'no_city' }
  job_search: { category: string; has_city: boolean }
  job_viewed: { category: string }
  job_saved: { category: string }
  apply_started: { category: string }
  apply_done: { category: string }
  job_post_started: { category: string }
  job_post_done: { category: string }
  candidate_search: { has_category: boolean; has_city: boolean }
  candidate_unlocked: Record<string, never>
  plans_viewed: Record<string, never>
  begin_checkout: { plan_code: string; value: number; currency: 'INR' }
  purchase: { plan_code: string; value: number; currency: 'INR' }
}

export type AnalyticsEvent = keyof EventParams

type Gtag = (...args: unknown[]) => void

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: Gtag
  }
}

/**
 * The taxonomy category NAME (the English canonical value the API returns, never
 * the translated label), or 'none'. A category name is a public label.
 */
export function categoryParam(category: string | null | undefined): string {
  return category?.trim() || 'none'
}

/** The role-specific BE value → the analytics role. */
export function analyticsRole(role: UserRole): Role {
  return role === 'JOB_SEEKER' ? 'seeker' : 'employer'
}

// Read from storage, not React state: AuthContext.login() writes storage before it
// returns, so an event fired right after a sign-up already counts the new role.
function currentRole(): Role | 'guest' {
  try {
    const stored = window.localStorage.getItem(AUTH_USER_KEY)
    const role = stored ? (JSON.parse(stored) as { role?: UserRole }).role : undefined
    return role ? analyticsRole(role) : 'guest'
  } catch {
    return 'guest'
  }
}

let configured = false
// The cleaned address of the last page view, sent as the next one's referrer.
let lastLocation: string | null = null

// Defines the standard gtag queue (gtag.js reads it once it loads, so events sent
// before that are kept) and configures the tag once. Null when analytics is off.
function gtag(): Gtag | null {
  if (!GA_MEASUREMENT_ID || typeof window === 'undefined') return null
  if (!configured) {
    configured = true
    window.dataLayer = window.dataLayer || []
    // gtag.js only accepts the `arguments` object, not an array — Google's snippet.
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer?.push(arguments)
    }
    window.gtag('js', new Date())
    window.gtag('config', GA_MEASUREMENT_ID, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      // Set here too, so not even the first hit can carry the raw address.
      page_location: window.location.origin + cleanPath(window.location.pathname),
      page_referrer: cleanReferrer(document.referrer, window.location.origin),
    })
  }
  return window.gtag ?? null
}

function send(name: string, params: object): void {
  try {
    gtag()?.('event', name, {
      // The cleaned address of the page the event happens on, read now. Event-level
      // values beat everything else in gtag, and a page's own mount effects run
      // before the layout's page-view effect, so nothing set earlier can be trusted.
      page_location: window.location.origin + cleanPath(window.location.pathname),
      ...params,
      platform: 'web',
      app_language: toSupportedLanguage(i18n.language),
      user_role: currentRole(),
    })
  } catch {
    // Analytics must never break the page.
  }
}

/** Send one event. Does nothing when analytics is off; never throws. */
export function track<E extends AnalyticsEvent>(event: E, params: EventParams[E]): void {
  send(event, params)
}

/**
 * A page view for a route change. Sent by hand (send_page_view is off) so the
 * address is always the cleaned one. Re-running `config` (not `set`, which config
 * values override) moves the address gtag's own automatic events use.
 */
export function trackPageView(pathname: string): void {
  try {
    const tag = gtag()
    if (!tag) return
    const pageLocation = window.location.origin + cleanPath(pathname)
    const pageReferrer = lastLocation ?? cleanReferrer(document.referrer, window.location.origin)
    lastLocation = pageLocation
    tag('config', GA_MEASUREMENT_ID, {
      send_page_view: false,
      page_location: pageLocation,
      page_referrer: pageReferrer,
    })
    send('page_view', { page_location: pageLocation, page_referrer: pageReferrer })
  } catch {
    // Analytics must never break the page.
  }
}
