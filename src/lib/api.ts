import type { SupportedLanguage } from '@/i18n/languages'
import { parseRetryAfter, readAttemptsLeft, type OtpSendMeta } from '@/lib/otpSend'
import { prepareUpload } from '@/lib/uploadFile'

// API Configuration
//
// Talks to the ProSiddhi backend (prosiddhi-backend). Every backend endpoint
// wraps its payload in a standard envelope `{ success, message, data }` (see BE
// utils/response.ts). `apiRequest` UNWRAPS `.data` and returns the typed
// payload, so callers consume the real object directly.
//
// Auth: when an auth token is present in localStorage, `apiRequest` attaches
// `Authorization: Bearer <token>`. On a 401 it clears auth storage and
// dispatches a `auth:unauthorized` window event — AuthContext listens for this
// and performs logout + redirect, keeping this module framework-free. The event
// carries the response's `code` in `detail` so the listener can tell a suspended
// or rejected account from an ordinary expired session. Two per-call options opt
// a 401 out of all of this: `preserveSessionOnCode` (a re-auth proof failed) and
// `isCredentialCheck` (a sign-in attempt failed).
//
// Refresh: the access token is short-lived (BE default 1h). A `401 TOKEN_EXPIRED`
// on an authenticated call is therefore traded, once, for a new token through
// `POST /auth/refresh` (the HttpOnly refresh cookie is the credential), and the
// call is replayed once. See `recoverExpiredToken`.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1'

// localStorage keys — single source of truth, shared with AuthContext.
export const AUTH_TOKEN_KEY = 'auth_token'
export const AUTH_USER_KEY = 'auth_user'

// The two 401 codes the BE sends when an admin suspends or rejects an account
// that is already signed in. Value = the `?reason=` the login page accepts.
// One map, imported by AuthContext (to build the redirect) and the login page
// (to validate the query), so the allowlist cannot drift.
export const ACCOUNT_ENDED_REASONS = {
  ACCOUNT_SUSPENDED: 'suspended',
  ACCOUNT_REJECTED: 'rejected',
} as const
export type AccountEndedReason = (typeof ACCOUNT_ENDED_REASONS)[keyof typeof ACCOUNT_ENDED_REASONS]

/** The login-page reason for a BE error code, or undefined for any other code. */
export function accountEndedReason(code: string | undefined): AccountEndedReason | undefined {
  return Object.entries(ACCOUNT_ENDED_REASONS).find(([endedCode]) => endedCode === code)?.[1]
}

// Tracks whether the last request failed at the network level, so we only
// dispatch the paired `api:network-error` / `api:network-recovered` events on a
// real transition (not on every successful call). The global OfflineBanner uses
// the pair to show AND auto-clear the "can't reach the server" state.
let hadNetworkError = false

/** Window-guarded read of the stored auth token (null on server / when absent). */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(AUTH_TOKEN_KEY)
}

// The bare origin behind API_BASE_URL (protocol+host+port, no path) — computed
// once at module load, the same way next.config.js derives `apiOrigin` from
// this same env var, rather than re-parsing an unchanging constant on every
// resolveMediaUrl() call (some pages call it once per document/photo in a
// render loop).
//
// A scheme-less value (`localhost:5000/api/v1`, missing the `http://`) does
// NOT throw here — the WHATWG URL parser treats it as an opaque URL and
// `.origin` comes back as the literal string "null", which would otherwise
// silently become the media prefix for every profile photo and document.
// Guarded explicitly below, alongside the genuinely-throwing case (no scheme
// at all, e.g. `api.prosiddhi.com/api/v1`), so a misconfigured
// NEXT_PUBLIC_API_URL fails loudly in the console instead of quietly
// rendering broken images with no pointer back to the cause.
const MEDIA_ORIGIN = (() => {
  try {
    const origin = new URL(API_BASE_URL).origin
    if (origin === 'null') throw new Error('no scheme')
    return origin
  } catch {
    console.error(
      `[resolveMediaUrl] NEXT_PUBLIC_API_URL ("${API_BASE_URL}") is missing its ` +
        `http:// or https:// scheme, so no media origin could be determined. ` +
        `Falling back to http://localhost:5000 — profile photos and documents ` +
        `will not load until this is fixed.`
    )
    return 'http://localhost:5000'
  }
})()

/**
 * Resolve a BE-relative upload path (e.g. `/uploads/applications/x.webm`) to an
 * absolute URL. Static uploads are served off the server ORIGIN — not under
 * `/api` or `/api/v1` — so we take the origin straight from API_BASE_URL via
 * the URL API rather than pattern-matching its path. That way this keeps
 * working the next time the API path changes (v2, a different mount, …) with
 * no edit needed here. Absolute URLs (http...) and empty values pass through
 * unchanged.
 */
export function resolveMediaUrl(path?: string | null): string {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return `${MEDIA_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`
}

/** Why a signed-file download failed — lets the caller choose the message. */
export class SignedFileError extends Error {
  // `network`: the request never produced a response (offline, or blocked by CORS).
  // `failed`: a response arrived but was unusable (5xx, other status, unreadable body).
  constructor(public readonly reason: 'expired' | 'failed' | 'missing' | 'network') {
    super(`Signed file request failed: ${reason}`)
    this.name = 'SignedFileError'
  }
}

/**
 * Download a private file from its signed link (`UserDocument.fileUrl`) as a Blob.
 *
 * Deliberately NOT `apiRequest`: the link is already authorised by its signature, and
 * on GCS it redirects to storage.googleapis.com. A plain GET with no custom headers and
 * no credentials stays a CORS "simple" request (no preflight), and an Authorization or
 * JSON Content-Type header would only break it.
 *
 * ⚠️ CORS, to verify with DevOps: on GCS the API answers with a cross-origin 302 to
 * storage.googleapis.com. Per the Fetch spec a browser follows a cross-origin redirect
 * with `Origin: null`, so a bucket rule listing only the portal origin may NOT match
 * the second hop; it may need to allow `*` (or `null`) for GET. Not yet confirmed
 * against a real bucket. Until the rule is right, the browser blocks the response and
 * this surfaces as `network`.
 */
export async function fetchSignedFile(url: string, signal?: AbortSignal): Promise<Blob> {
  let response: Response
  try {
    response = await fetch(resolveMediaUrl(url), { signal, credentials: 'omit' })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new SignedFileError('network')
  }
  // The BE answers an expired or tampered link with 403 (GCS: 403 too); 404 is a file
  // that is no longer in storage. Anything else (5xx, a bad request) is a plain failure.
  if (response.status === 401 || response.status === 403) throw new SignedFileError('expired')
  if (response.status === 404) throw new SignedFileError('missing')
  if (!response.ok) throw new SignedFileError('failed')
  try {
    return await response.blob()
  } catch (err) {
    // The connection dropped part-way through the body.
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new SignedFileError('failed')
  }
}

/** Standard backend response envelope. */
interface ApiEnvelope<T> {
  success: boolean
  message: string
  data: T
}

/**
 * An HTTP error response from the backend, carrying the bits a caller needs to
 * branch on instead of string-matching `.message`.
 *
 * ⚠️ `reason` IS NOT ALWAYS PRESENT. The BE's `sendError()` puts the payload in
 * `error` but gates it on `NODE_ENV === 'development'`, so in production the
 * response is `{ success, message, error: undefined }` and `reason` is stripped.
 * Callers must therefore branch on `status` first and treat `reason` as a
 * refinement, never as the sole discriminator — see `messageForInviteError()`
 * in the invite landing page.
 *
 * Extends Error, so every existing `err instanceof Error ? err.message` catch
 * block keeps working unchanged.
 */
export class ApiError extends Error {
  readonly status: number
  readonly reason?: string
  /**
   * Field-level validation errors, from the BE's top-level `errors` array.
   *
   * Unlike `reason`, this DOES survive production: `sendError()` routes the
   * pre-mapped `[{path, message}]` shape that `middleware/validate.ts` produces
   * into `errors` rather than the dev-gated `error` slot. It is therefore the
   * only machine-readable discriminator registration can rely on in prod — see
   * the spec's §3.6. Business-rule errors carry no `errors` array at all; those
   * must be branched on status + message instead.
   */
  readonly errors?: ApiFieldError[]
  /**
   * The BE's stable machine-readable discriminator, from the top-level `code`.
   *
   * Like `errors` and UNLIKE `reason`, this survives production: `sendError()`
   * assigns `code` unconditionally. Prefer it over matching on `status` alone
   * when a status can mean more than one thing — `ROLE_MISMATCH` is the first
   * user, because a bare 403 on the login routes cannot tell a wrong-tab login
   * apart from an nginx refusal.
   */
  readonly code?: string
  /**
   * The BE's `error` object when it is plain data rather than a thrown Error —
   * `sendError()` serialises that shape in production too. Carries whatever
   * metadata goes with `code` (e.g. `actualRole` for `ROLE_MISMATCH`).
   */
  readonly details?: Record<string, unknown>
  /**
   * OTP_INVALID only: how many tries are left on the code, from the BE's top-level
   * `attemptsLeft`. Kept only when it is a whole number of zero or more.
   */
  readonly attemptsLeft?: number
  /**
   * Seconds from the `Retry-After` header, when the response had a usable one.
   * Usually absent in a browser: the header is readable cross-origin only if the
   * API exposes it (see parseRetryAfter). Never required.
   */
  readonly retryAfterSeconds?: number

  constructor(
    message: string,
    status: number,
    reason?: string,
    errors?: ApiFieldError[],
    code?: string,
    details?: Record<string, unknown>,
    attemptsLeft?: number,
    retryAfterSeconds?: number
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.reason = reason
    this.errors = errors
    this.code = code
    this.details = details
    this.attemptsLeft = attemptsLeft
    this.retryAfterSeconds = retryAfterSeconds
  }
}

/** One entry of the BE's `errors` array — `path` is a dotted field name. */
export interface ApiFieldError {
  path: string
  message: string
}

/**
 * Group an error's field-level messages by field name.
 *
 * A single field can fail more than one rule at once — a weak password returns
 * BOTH "at least 8 characters" AND the upper/lower/number rule — so the value is
 * an array and a form must render all of them. Returns `{}` for anything that
 * is not a field-validation failure, which lets a caller fall back to the
 * message-level mapping without a second type check.
 */
export function fieldErrorsByPath(err: unknown): Record<string, string[]> {
  if (!(err instanceof ApiError) || !err.errors?.length) return {}
  return err.errors.reduce<Record<string, string[]>>((acc, e) => {
    ;(acc[e.path] ||= []).push(e.message)
    return acc
  }, {})
}

/** The two business identifiers the BE keeps unique across employers. */
export type BusinessIdentifierField = 'gstNumber' | 'registrationNumber'

/**
 * Which identifier a 409 `DUPLICATE_BUSINESS_IDENTIFIER` is about, or null if
 * `err` is anything else. The register and the profile update both return it.
 * The BE names the field in the error data (`{ reason, field, value }`) and does
 * not say whose it is, so read `field` rather than guessing from the message.
 * Kept out of `classifyRegisterError`: other register screens share that and
 * cannot receive this error.
 */
export function duplicateIdentifierField(err: unknown): BusinessIdentifierField | null {
  if (!(err instanceof ApiError) || err.status !== 409 || err.code !== 'DUPLICATE_BUSINESS_IDENTIFIER') return null
  const field = err.details?.field
  return field === 'gstNumber' || field === 'registrationNumber' ? field : null
}

/**
 * Thrown when a request given a `timeoutMs` (see `apiRequest`) is still running
 * when the time is up. Not an `ApiError`: no HTTP response arrived, so there is
 * no status to branch on. Like a deliberate abort, it does not raise the app-wide
 * offline banner.
 */
export class RequestTimeoutError extends Error {
  constructor() {
    super('The request took too long.')
    this.name = 'RequestTimeoutError'
  }
}

// ---------------------------------------------------------------------------
// Session refresh
// ---------------------------------------------------------------------------

/** Fired on `window` after a refresh stored a new access token; AuthContext listens. */
export const AUTH_TOKEN_REFRESHED_EVENT = 'auth:token-refreshed'
/** Fired on `window` when the session has ended and must be dropped; AuthContext listens. */
export const AUTH_UNAUTHORIZED_EVENT = 'auth:unauthorized'

// The BE's 401 code for an access token that is expired (or unreadable).
const TOKEN_EXPIRED_CODE = 'TOKEN_EXPIRED'

// Every endpoint that sets the refresh cookie on a browser login/registration.
// Only these (plus refresh/logout below) send `credentials: 'include'` — without
// it a cross-origin browser discards the Set-Cookie, and the session could never
// be refreshed. All other requests keep the fetch default.
const SESSION_COOKIE_ENDPOINTS = new Set([
  '/auth/login',
  '/auth/google/login',
  '/jobseekers/login',
  '/employers/login',
  '/jobseekers/register',
  '/employers/register/individual',
  '/employers/register/business',
])

// Longest we wait on the refresh call. Requests parked behind it wait this long
// at most, and then fail without ending the session.
const REFRESH_TIMEOUT_MS = 15000
// Longest the sign-out call may run. The UI never waits on it at all.
const LOGOUT_TIMEOUT_MS = 5000

type RefreshOutcome =
  | { kind: 'ok' }
  // The BE refused the session (401). `code` is SESSION_REVOKED / ACCOUNT_SUSPENDED / ...
  | { kind: 'ended'; code?: string }
  // 5xx, 429, network failure, timeout, odd body: nothing is known about the session.
  | { kind: 'unavailable' }
  // Another tab signed out while the refresh was in flight.
  | { kind: 'signed-out' }
  // The BE issued a token for a different user than the one that asked (see runRefresh),
  // or storage now holds a different user's session. Nothing is replayed, stored or cleared.
  | { kind: 'identity-changed' }
  // 403: the BE refused this site (origin not allowed). A configuration fault, not a
  // verdict on the session, so the session is kept.
  | { kind: 'refused' }

// One refresh at a time per tab. Concurrent expired requests all await this.
let refreshInFlight: Promise<RefreshOutcome> | null = null

/** Never rejects. `staleToken` is the expired token the caller sent. */
async function runRefresh(staleToken: string): Promise<RefreshOutcome> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS)
  try {
    // Raw fetch on purpose: no Bearer header, no 401 handling, no recursion.
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      signal: controller.signal,
    })
    const body: unknown = await res.json().catch(() => null)
    if (res.status === 401) {
      const code = (body as { code?: unknown } | null)?.code
      return { kind: 'ended', code: typeof code === 'string' ? code : undefined }
    }
    if (res.status === 403) return { kind: 'refused' }
    if (!res.ok) return { kind: 'unavailable' }

    const token = (body as { data?: { token?: unknown } } | null)?.data?.token
    // Shape check only: a JWT has three dot-separated parts. The signature is the
    // server's to check. The `userId` claim is decoded just below for identity matching
    // only (see tokenUserId); that is not signature verification.
    if (typeof token !== 'string' || token.split('.').length !== 3) return { kind: 'unavailable' }

    // The refresh cookie is shared by every tab, so the BE may answer for a different
    // user than the one whose token expired (another tab signed in as someone else and
    // this response's Set-Cookie landed after it). Never store or use such a token.
    // The new token must name the same user as the one it replaces; one we cannot read
    // is refused too. This cannot undo the cookie itself: the browser has already
    // accepted that response's Set-Cookie.
    const expectedUserId = tokenUserId(staleToken)
    if (expectedUserId === null || tokenUserId(token) !== expectedUserId) return { kind: 'identity-changed' }

    // Write only if storage still holds the token we replaced. A different value
    // means another tab got there first (a newer refresh, or a new sign-in) and
    // must not be overwritten by this response; null means a sign-out.
    const current = getAuthToken()
    if (current === null) return { kind: 'signed-out' }
    if (current === staleToken) {
      window.localStorage.setItem(AUTH_TOKEN_KEY, token)
      window.dispatchEvent(new CustomEvent(AUTH_TOKEN_REFRESHED_EVENT, { detail: { token } }))
    }
    return { kind: 'ok' }
  } catch {
    // Network error, abort/timeout, or storage refused the write.
    return { kind: 'unavailable' }
  } finally {
    clearTimeout(timer)
  }
}

function refreshAccessToken(staleToken: string): Promise<RefreshOutcome> {
  if (refreshInFlight) return refreshInFlight
  const flight = runRefresh(staleToken).finally(() => {
    if (refreshInFlight === flight) refreshInFlight = null
  })
  refreshInFlight = flight
  return flight
}

// What a caller does next: replay with exactly this token, or one of the refresh outcomes.
type ExpiryRecovery = Exclude<RefreshOutcome, { kind: 'ok' }> | { kind: 'retry'; token: string }

/**
 * The `userId` claim of a JWT, or null if the token is missing or unreadable.
 *
 * Identity matching ONLY. The payload is decoded without verifying the signature, so
 * it proves nothing about the token; the server still authorises every request. It is
 * used to keep a request, its refreshed token and its replay on one user, reading the
 * identity from the token itself rather than from a second storage key that another
 * tab may be mid-way through writing.
 */
function tokenUserId(token: string | null): string | null {
  if (!token) return null
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const id: unknown = (JSON.parse(window.atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))) as {
      userId?: unknown
    }).userId
    return typeof id === 'string' && id ? id : null
  } catch {
    return null
  }
}

/**
 * A request sent with `sentToken` came back `401 TOKEN_EXPIRED`. Get a usable token
 * into storage if one can be had, and say which exact token to replay with. Does not
 * touch the session itself: the caller decides what `ended` means.
 */
async function recoverExpiredToken(sentToken: string): Promise<ExpiryRecovery> {
  const sentUserId = tokenUserId(sentToken)
  // Storage may have moved on since the request left (this or another tab already
  // refreshed, or signed in again). Then there is nothing to refresh.
  //
  // A different token is replayed only for the SAME user. Another tab can sign in as
  // someone else while this request is in flight; replaying it with that token would
  // run the first user's action under the second user's account. A token whose user
  // cannot be read is treated as a change too.
  const settled = (): ExpiryRecovery | null => {
    const latest = getAuthToken()
    if (latest === null) return { kind: 'signed-out' }
    if (latest === sentToken) return null
    return sentUserId !== null && tokenUserId(latest) === sentUserId
      ? { kind: 'retry', token: latest }
      : { kind: 'identity-changed' }
  }
  const before = settled()
  if (before) return before

  const outcome = await refreshAccessToken(sentToken)
  // Re-check storage: a failed refresh must not end a session another tab has renewed,
  // and after a success storage holds the new token (ours, or a same-user one from
  // another tab). Still holding the old token after a success means nothing was stored.
  const after = settled()
  if (after) return after
  if (outcome.kind === 'ok') return { kind: 'unavailable' }
  return outcome
}

/**
 * Drop the local session and tell AuthContext (which redirects) — but only if storage
 * still holds `sentToken`, the token the failed request carried. Anything else is a
 * newer session from another tab, which must survive. Returns whether it ended.
 */
function endSessionLocally(code: string | undefined, sentToken: string | null): boolean {
  if (getAuthToken() !== sentToken) return false
  window.localStorage.removeItem(AUTH_TOKEN_KEY)
  window.localStorage.removeItem(AUTH_USER_KEY)
  window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT, { detail: { code } }))
  return true
}

/**
 * Tell the server to end this browser's session (`POST /auth/logout`). Best effort:
 * never throws, gives up after LOGOUT_TIMEOUT_MS, and the caller must not wait on
 * it. Local state is cleared by the caller whatever happens here.
 */
export async function endServerSession(): Promise<void> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), LOGOUT_TIMEOUT_MS)
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      signal: controller.signal,
      // Survives the navigation that follows a sign-out.
      keepalive: true,
    })
  } catch {
    // Offline, refused (403/429 come back as responses, not here), or timed out.
  } finally {
    clearTimeout(timer)
  }
}

// The request itself: auth header, error classification, central 401 handling.
// Returns the unwrapped `.data` payload. Callers use `apiRequest` below.
// `replayToken` is internal: set only on the single replay after a token refresh, to
// the exact token that replay was approved to use (it is not read from storage again).
async function performRequest<T>(
  endpoint: string,
  {
    preserveSessionOnCode,
    isCredentialCheck,
    asBlob,
    ...options
  }: RequestInit & {
    /**
     * A 401 whose body `code` equals this keeps the session (no clear-storage,
     * no logout). Any OTHER 401 from the call — an expired or invalid token —
     * still logs out. For a 401 that means "wrong re-auth proof", not "session
     * expired": REAUTH_FAILED on self-delete and on set-first-password.
     */
    preserveSessionOnCode?: string
    /**
     * A sign-in attempt: its 401 means "wrong credentials", not "session expired",
     * so it never clears storage or fires `auth:unauthorized` (which would drop the
     * login page's `?returnUrl=`).
     */
    isCredentialCheck?: boolean
    /**
     * A file download (invoice PDF, "Download my data"): a success answers the body
     * as a Blob instead of unwrapping JSON. Errors are handled exactly as for any
     * other call — session end, consent, password change, offline banner, refresh.
     */
    asBlob?: boolean
  } = {},
  replayToken?: string
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  // FormData requests must NOT carry a JSON Content-Type — the browser sets the
  // multipart boundary itself. Detect and preserve that.
  const isFormData =
    typeof FormData !== 'undefined' && options.body instanceof FormData

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...((options.headers as Record<string, string>) || {}),
  }

  // Attach Bearer token when present (works for JSON and FormData calls alike).
  const token = replayToken ?? getAuthToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const config: RequestInit = {
    ...options,
    headers,
  }
  // Only the calls that set the refresh cookie send credentials (see the list above).
  if (SESSION_COOKIE_ENDPOINTS.has(endpoint.split('?')[0])) config.credentials = 'include'

  // A network-level failure (offline, DNS, the dev tunnel being down) makes
  // fetch REJECT — distinct from an HTTP error response. Surface it app-wide via
  // the `api:network-error` event (the global OfflineBanner listens) and re-throw
  // a friendly Error so existing callers' catch blocks still receive a readable
  // `.message` — no caller signature changes.
  let response: Response
  try {
    response = await fetch(url, config)
  } catch (err) {
    // A deliberately aborted request (AbortController) is NOT a connectivity
    // failure — let it propagate untouched without flagging the app offline.
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw err
    }
    if (typeof window !== 'undefined') {
      hadNetworkError = true
      window.dispatchEvent(new CustomEvent('api:network-error'))
    }
    throw new Error("Can't reach the server. Check your connection and try again.")
  }

  // The request reached the server (any HTTP status counts as connectivity
  // restored). Clear a prior network-error state exactly once on recovery.
  if (hadNetworkError && typeof window !== 'undefined') {
    hadNetworkError = false
    window.dispatchEvent(new CustomEvent('api:network-recovered'))
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({
      message: response.statusText,
    }))
    // `error.reason` is the BE's machine-readable discriminator — present only in
    // development (sendError gates the payload on NODE_ENV). See ApiError.
    const reason =
      body?.error && typeof body.error === 'object' && typeof body.error.reason === 'string'
        ? (body.error.reason as string)
        : undefined
    // Field errors live in a SEPARATE top-level key and are not dev-gated.
    const errors: ApiFieldError[] | undefined = Array.isArray(body?.errors)
      ? (body.errors as unknown[]).filter(
          (e): e is ApiFieldError =>
            !!e &&
            typeof e === 'object' &&
            typeof (e as ApiFieldError).path === 'string' &&
            typeof (e as ApiFieldError).message === 'string'
        )
      : undefined
    // `code` is top-level and never dev-gated; `error` is forwarded whole when
    // it is plain data (not a serialised Error), which is what carries the
    // metadata belonging to `code`.
    const code = typeof body?.code === 'string' ? body.code : undefined
    // Centralized auth-expiry handling. Clear storage and let AuthContext react.
    const keepSession = preserveSessionOnCode !== undefined && code === preserveSessionOnCode
    // The code AuthContext is told about. Normally this response's; after a refused
    // refresh it is the refresh's, which is what says "suspended" or "rejected".
    let unauthorizedCode = code
    let endSession = response.status === 401 && !keepSession && !isCredentialCheck && typeof window !== 'undefined'

    // An expired access token on a signed-in call: refresh once and replay once.
    // Never for a sign-in attempt (no token sent, and `isCredentialCheck`), never on
    // a replay (`replayToken`), and never for a body that cannot be sent twice.
    if (
      endSession &&
      code === TOKEN_EXPIRED_CODE &&
      token &&
      replayToken === undefined &&
      !(typeof ReadableStream !== 'undefined' && options.body instanceof ReadableStream)
    ) {
      const recovery = await recoverExpiredToken(token)
      if (recovery.kind === 'retry') {
        return performRequest<T>(endpoint, { preserveSessionOnCode, isCredentialCheck, asBlob, ...options }, recovery.token)
      }
      if (recovery.kind === 'ended') {
        unauthorizedCode = recovery.code ?? code
      } else {
        // Refresh failed without the server ending the session (outage, network, 429),
        // or another tab signed out and owns the redirect. Keep what is stored.
        endSession = false
        if (recovery.kind === 'unavailable') {
          throw new Error("Couldn't refresh your session. Check your connection and try again.")
        }
        if (recovery.kind === 'refused') {
          throw new Error("The server didn't accept a session refresh from this site. Please contact support.")
        }
        if (recovery.kind === 'identity-changed') {
          throw new Error('Your session changed. Please sign in again.')
        }
      }
    }
    if (endSession) endSessionLocally(unauthorizedCode, token)
    // An admin reset the password mid-session, so the stored flag is stale. Unlike
    // a 401 the session is still valid — AuthContext flags it (idempotently) and
    // routes to the change screen.
    if (response.status === 403 && code === 'PASSWORD_CHANGE_REQUIRED' && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:password-change-required'))
    }
    // The person has not accepted the current Terms / Privacy Policy and the BE is
    // enforcing it (LEGAL_CONSENT_ENFORCED). The session is fine — ConsentGate in
    // AuthContext asks them to accept and then lets them carry on.
    if (response.status === 403 && code === 'CONSENT_REQUIRED' && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(CONSENT_REQUIRED_EVENT))
    }
    const details =
      body?.error && typeof body.error === 'object' && !Array.isArray(body.error)
        ? (body.error as Record<string, unknown>)
        : undefined
    throw new ApiError(
      body?.message || `HTTP error! status: ${response.status}`,
      response.status,
      reason,
      errors?.length ? errors : undefined,
      code,
      details,
      readAttemptsLeft(body?.attemptsLeft),
      parseRetryAfter(response.headers.get('Retry-After'))
    )
  }

  if (asBlob) {
    return (await response.blob()) as T
  }

  // 204 / empty bodies: nothing to unwrap.
  if (response.status === 204) {
    return undefined as T
  }

  const json = (await response.json()) as ApiEnvelope<T> | T
  // Unwrap the standard envelope when present; tolerate raw payloads.
  if (json && typeof json === 'object' && 'data' in (json as ApiEnvelope<T>)) {
    return (json as ApiEnvelope<T>).data
  }
  return json as T
}

/**
 * `performRequest` plus an OPT-IN time limit. Without `timeoutMs` this is a
 * straight pass-through, so every existing call behaves exactly as before: uploads
 * and slow reports must not inherit a default limit.
 *
 * With `timeoutMs` the whole request (headers AND body) is aborted when the time
 * is up and the caller gets a `RequestTimeoutError`. A caller's own `signal` still
 * works and is forwarded. There is deliberately no retry here: a timeout can fire
 * after the server has already acted, so only a caller that knows its request is a
 * harmless read may decide to try again.
 */
async function apiRequest<T>(
  endpoint: string,
  { timeoutMs, ...options }: Parameters<typeof performRequest>[1] & { timeoutMs?: number } = {}
): Promise<T> {
  if (timeoutMs === undefined) return performRequest<T>(endpoint, options)

  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
  const callerSignal = options.signal
  const forwardAbort = () => controller.abort()
  if (callerSignal?.aborted) controller.abort()
  else callerSignal?.addEventListener('abort', forwardAbort, { once: true })

  try {
    return await performRequest<T>(endpoint, { ...options, signal: controller.signal })
  } catch (err) {
    // Only our own abort becomes a timeout. A real HTTP error that was already
    // classified (an ApiError, with its status and code) must keep its identity.
    if (timedOut && err instanceof DOMException && err.name === 'AbortError') {
      throw new RequestTimeoutError()
    }
    throw err
  } finally {
    clearTimeout(timer)
    callerSignal?.removeEventListener('abort', forwardAbort)
  }
}

// ==========================================
// SHARED TYPES
// ==========================================

export type UserRole = 'JOB_SEEKER' | 'EMPLOYER_INDIVIDUAL' | 'EMPLOYER_BUSINESS'

/**
 * The role profile the BE nests inside the login payload (`user.jobSeeker ||
 * user.employer`). Only the fields the shared chrome needs are named; the rest
 * of each profile is fetched from its own endpoint when a screen needs it.
 * - Seeker → `fullName` (required in the DB) + `profilePhoto`.
 * - Employer → `companyName` (business) or `fullName` (individual); both optional.
 */
export interface AuthUserProfile {
  fullName?: string | null
  companyName?: string | null
  profilePhoto?: string | null
  [key: string]: unknown
}

export interface AuthUser {
  id: string
  /**
   * NULL for a phone-only job seeker. Email is optional at seeker registration
   * (many blue-collar workers have none), so the BE stores `null` and puts
   * `null` in the JWT payload too. Every surface that renders this must handle
   * the absence — do not widen it back to `string`.
   */
  email: string | null
  role: UserRole
  accountStatus?: string
  phoneNumber?: string | null
  profile?: AuthUserProfile | null
  /**
   * True while an admin-set temporary password is in force. The BE answers every
   * route but change-password with 403 PASSWORD_CHANGE_REQUIRED until it is
   * changed. Absent on a session stored before this field existed — read as false.
   */
  mustChangePassword?: boolean
}

export interface LoginResult {
  token: string
  user: AuthUser
}

// Google login returns the standard login payload plus two routing flags:
// `isNewUser` (first sign-up) and `needsPhoneVerification` (account is in
// PENDING_OTP_VERIFICATION — the FE must run the phone-bind flow before the
// dashboard). See BE auth.service.googleLoginOrSignup.
export interface GoogleLoginResult extends LoginResult {
  isNewUser: boolean
  needsPhoneVerification: boolean
}

// Loosely aligned to real BE fields; consume-flow tickets tighten these later.
export interface Job {
  id: string
  title: string
  description?: string
  companyName?: string | null
  location?: string
  salaryMin?: number | null
  salaryMax?: number | null
  paymentType?: string
  jobType?: string
  status?: string
  // Where the post sits in admin review. PENDING_REVIEW = offline, waiting for an
  // admin (every new post, and an approved post after a material edit). Only
  // APPROVED can be activated. Present on the employer's own job reads.
  moderationStatus?: string
  // The admin's reason when moderationStatus is REJECTED. The same column holds an
  // optional note on an approval, so read it only for a rejected job.
  moderationNotes?: string | null
  // BR-3 — 3-level taxonomy. `subcategory` is retired (the BE Job model has no
  // such column); jobs now carry category → sector → jobTitle names.
  category?: string
  sector?: string | null
  jobTitle?: string | null
  skillsRequired?: string[]
  requirements?: string | null
  urgencyLevel?: string
  numberOfPositions?: number | null
  latitude?: number | null
  longitude?: number | null
  /**
   * The cities the job is posted in, alphabetical (BE `cities: CITY_LIST`). Empty
   * for a job posted before cities existed — its `location` text is all it has.
   * Not on every job payload: only the lists and the detail read carry it.
   * `location` above is the same cities as text, written by the BE.
   */
  cities?: { city: LocationCitySummary }[]
  radius?: number | null
  viewCount?: number
  applicationCount?: number
  // The job's actual life is `liveUntil` (30 days per POST credit), never a date
  // the employer picked — shown on Job Details as the "apply by" date.
  liveUntil?: string
  // Distinct from `createdAt` when a job is renewed/reposted; Job Details prefers
  // this for "posted X ago" and falls back to `createdAt` for older responses.
  postedAt?: string
  employerId?: string
  employer?: {
    id?: string
    employerType?: string
    companyName?: string | null
    fullName?: string | null
    companyEmail?: string | null
    companySize?: CompanySize | null
    [key: string]: unknown
  } | null
  createdAt?: string
  // Whether the CURRENT seeker has already reported this job — Job Details
  // hides "Report this job" once true so a seeker can't file duplicate reports.
  hasReported?: boolean
  // GET /jobs/:id only: true for the owning employer and their team members.
  isOwner?: boolean
  // True once the job holds the maximum applications that were not withdrawn;
  // apply then answers 409 JOB_APPLICATIONS_FULL. Sent on the job lists and the
  // detail read. An older backend omits it — treat `undefined` as "open".
  applicationsClosed?: boolean
  [key: string]: unknown
}

/** The five My Jobs tabs the BE serves via `?tab=`. `cancelled` is shown to employers as "Rejected". */
export const EMPLOYER_JOB_TABS = ['pending', 'active', 'inactive', 'expired', 'cancelled'] as const
export type EmployerJobTab = (typeof EMPLOYER_JOB_TABS)[number]

export interface JobsPagination {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface JobsPage {
  jobs: Job[]
  pagination: JobsPagination
  /**
   * Near By only. `true` means the SEEKER has no saved coordinate, so the
   * backend returned early without ever running the distance filter
   * (`job.service.ts`, `getNearbyForSeeker`). Absent on every other feed.
   *
   * The distinction is the whole point: "you have not told us where you are"
   * is fixable by the seeker and deserves an action, while "nothing within
   * 50 km of where you are" is not — offering "Add your location" to someone
   * who already has one is what makes the tab read as broken.
   *
   * ⚠️ **That same early return also sends `message` — do not render it.** It
   * is a hardcoded English string ("Add your location to see nearby jobs.")
   * and it looks exactly like a ready-made empty state, which is the trap. We
   * ship ten languages; printing it puts English on a Tamil seeker's screen,
   * and nothing would catch it — no locale file is involved, so type-check,
   * lint and `verify-locales.mjs` all stay green. It is left untyped on
   * purpose so reaching for it does not compile.
   *
   * ⚠️ One endpoint-specific flag on this shared type is fine. A SECOND is the
   * signal to split into discriminated variants instead — five endpoints
   * return `JobsPage`, and each optional flag is one more field an employer
   * screen can read and get `undefined` from forever.
   */
  noLocation?: boolean
}

// A saved-jobs row: the BE wraps the job in a SavedJob record (GET /api/saved-jobs).
export interface SavedJobItem {
  id: string
  jobId: string
  savedAt?: string
  job: Job
}

export interface SavedJobsPage {
  savedJobs: SavedJobItem[]
  pagination: JobsPagination
}

// Mirrors getJobsQuerySchema on the BE (GET /api/jobs).
export interface JobFeedFilters {
  search?: string
  // BR-3 — 3-level taxonomy filters (names). The old `?subcategory=` is dropped;
  // clients send `?category=&sector=&jobTitle=`.
  category?: string
  sector?: string
  jobTitle?: string
  jobType?: string // comma-separated, e.g. "FULL_TIME,PART_TIME"
  paymentType?: string
  minSalary?: number
  maxSalary?: number
  latitude?: number
  longitude?: number
  maxDistance?: number
  // Jobs posted in this city / in any city of this state (ids from GET /locations/*;
  // job.validator.ts: cityId is a uuid, stateCode a 1–3 digit number). A city wins
  // over a state, so send one of the two — see lib/jobLocationParams.ts.
  cityId?: string
  stateCode?: number
  skills?: string // comma-separated
  urgencyLevel?: string
  sortBy?: 'postedAt' | 'salaryMin' | 'salaryMax' | 'urgencyLevel' | 'title'
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

// Interview scheduled by an employer on Accept (M7). 1-1 with an application.
// NOTE: seeker reads only expose this once BR-4 lands (docs/be-requests.md#br-4).
export interface Interview {
  id?: string
  date?: string // ISO datetime
  time?: string // free-text slot, e.g. "10:00 AM"
  interviewerTime?: string | null
  notes?: string | null
}

export interface Application {
  id: string
  jobId?: string
  status?: string
  message?: string | null
  appliedAt?: string
  updatedAt?: string
  job?: Job
  interview?: Interview | null
  [key: string]: unknown
}

export interface ApplicationsPage {
  applications: Application[]
  pagination: JobsPagination
}

// ==========================================
// PROFILE / DOCUMENTS / SKILLS (PJP-112)
// ==========================================

// Mirrors the BE Prisma DocumentType enum. Seeker docs use the first four + OTHER;
// employer docs use GST_CERTIFICATE / COMPANY_REGISTRATION / OTHER.
export type DocumentType =
  | 'IDENTITY_PROOF'
  | 'ADDRESS_PROOF'
  | 'EDUCATION_CERTIFICATE'
  | 'SKILL_CERTIFICATE'
  | 'GST_CERTIFICATE'
  | 'COMPANY_REGISTRATION'
  | 'OTHER'

// A Document row (seeker or employer). BE field is `type` (NOT `documentType`).
export interface UserDocument {
  id: string
  type: DocumentType
  fileName: string
  fileUrl: string
  fileSize: number
  mimeType: string
  verified: boolean
  verificationStatus?: string
  /** Set by admin only when verificationStatus is REJECTED. */
  rejectionReason?: string | null
  createdAt?: string
}

export interface SkillCatalogItem {
  id: string
  name: string
  category: string
  description?: string | null
  active?: boolean
}

export interface SkillsCatalogPage {
  skills: SkillCatalogItem[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

// A seeker's own skill — a JobSeekerSkill link row joined to the catalog skill.
// `id` is the LINK id (used for DELETE /me/skills/:linkId), not the skill id.
export interface JobSeekerSkillLink {
  id: string
  skillId: string
  jobSeekerId?: string
  verified?: boolean
  createdAt?: string
  skill?: SkillCatalogItem
}

// Work-experience row in the PUT shape (BE: position/companyName/startDate/...).
export interface ProfileWorkExperience {
  id?: string
  position: string
  companyName?: string | null
  startDate?: string
  endDate?: string | null
  currentlyWorking?: boolean
  description?: string | null
}

// The two derived booleans every profile response carries in place of the
// password hash and googleSub, which the BE never returns (BR-8) — from
// auth.service.ts's signInMethods().
interface SignInMethodFlags {
  /** Email + password sign-in is set up. */
  hasPassword?: boolean
  /** A Google account is linked. */
  hasGoogleLogin?: boolean
}

// GET /jobseekers/profile — full user + nested jobSeeker.
export interface SeekerProfile extends SignInMethodFlags {
  id: string
  /** NULL for a phone-only seeker — email is optional at registration. */
  email: string | null
  phoneNumber?: string | null
  role: UserRole
  accountStatus?: string
  /** Same flag as `AuthUser.mustChangePassword`, read fresh from the server. */
  mustChangePassword?: boolean
  emailVerified?: boolean
  /** Phone is mandatory at registration, so this is true for every self-registered seeker. */
  phoneVerified?: boolean
  preferredLanguage?: string
  jobSeeker?: {
    id: string
    fullName?: string | null
    profilePhoto?: string | null
    bio?: string | null
    location?: string | null
    latitude?: number | null
    longitude?: number | null
    /**
     * Home city, as GET /jobseekers/profile embeds it. null for a seeker who never picked one:
     * their `location` text (if any) is all there is.
     */
    city?: LocationCitySummary | null
    /** Preferred work cities (up to 3). Empty for a seeker who has not set any. */
    preferredCities?: PreferredCity[]
    /** BR-1 — captured at registration; not editable from the profile form. */
    dateOfBirth?: string | null
    gender?: 'MALE' | 'FEMALE' | 'OTHER' | null
    preferredCategory?: string | null
    preferredSector?: string | null
    preferredJobTitle?: string | null
    /** Seeker-set "actively looking for work" badge. Absent on an older backend, so read it as `?? false`. */
    isActivelyLooking?: boolean
    /** Admin-reviewed rollup across the seeker's uploaded documents (not per-document). */
    documentVerificationStatus?: 'NOT_SUBMITTED' | 'PENDING' | 'VERIFIED' | 'REJECTED' | null
    skills?: JobSeekerSkillLink[]
    workExperience?: ProfileWorkExperience[]
    documents?: UserDocument[]
    updatedAt?: string
  } | null
}

// GET /employers/profile — full user + nested employer.
export interface EmployerProfile extends SignInMethodFlags {
  id: string
  email: string
  phoneNumber?: string | null
  role: UserRole
  accountStatus?: string
  /** Same flag as `AuthUser.mustChangePassword`, read fresh from the server. */
  mustChangePassword?: boolean
  emailVerified?: boolean
  phoneVerified?: boolean
  preferredLanguage?: string
  createdAt?: string
  updatedAt?: string
  employer?: {
    id: string
    employerType?: string
    profilePhoto?: string | null
    fullName?: string | null
    designation?: string | null
    companyName?: string | null
    companyEmail?: string | null
    companyAddress?: string | null
    companyFoundedDate?: string | null
    companySize?: CompanySize | null
    gstNumber?: string | null
    registrationNumber?: string | null
    verificationStatus?: string
    documents?: UserDocument[]
  } | null
}

// PUT /jobseekers/profile body. NEVER include email/phoneNumber/password — the BE
// Zod schema rejects them (each has a dedicated endpoint). `workExperiences`, when
// present, FULL-REPLACES the seeker's work history server-side.
export interface SeekerProfileUpdate {
  fullName?: string
  bio?: string
  location?: string
  latitude?: number
  longitude?: number
  /**
   * Home city id from GET /locations/cities. When sent, the BE overwrites `location`, `latitude`
   * and `longitude` from the city, so send it ALONE. `null` drops the link and keeps the text.
   * Omit it to leave the city as it is.
   */
  cityId?: string | null
  /**
   * Preferred work cities (at most 3). REPLACES the whole list when present, so omit it unless the
   * seeker changed it; `[]` deliberately empties the list.
   */
  preferredCityIds?: string[]
  // BR-3 — 3-level taxonomy. All optional; validateTriple checks the path when
  // any are provided.
  preferredCategory?: string
  preferredSector?: string
  preferredJobTitle?: string
  preferredLanguage?: string
  profilePhoto?: string
  // BR-1 — also editable post-registration via PUT /profile (updateJobSeekerProfileSchema).
  // dateOfBirth must be a YYYY-MM-DD date string; the BE rejects anything under 18.
  dateOfBirth?: string
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  workExperiences?: ProfileWorkExperience[]
  /** The "actively looking for work" badge. A real boolean only: `false` is a valid value. */
  isActivelyLooking?: boolean
}

// PUT /employers/profile body. Changing gstNumber/registrationNumber resets the
// employer's verificationStatus to PENDING server-side (T2 #20).
export interface EmployerProfileUpdate {
  fullName?: string
  designation?: string
  profilePhoto?: string
  companyName?: string
  companyEmail?: string
  companyAddress?: string
  companyFoundedDate?: string
  companySize?: CompanySize
  gstNumber?: string
  registrationNumber?: string
}

// ==========================================
// AUTH APIs (login — role-split + phone-OTP)
// ==========================================
//
// Email/password and phone-OTP both POST to the role-specific login endpoint
// (`/jobseekers/login` | `/employers/login`), which is role-gated server-side
// (a seeker hitting the employer URL gets 403). The FE role toggle picks the
// endpoint. Body is `{ identifier, password }` OR `{ identifier, otp }`.

export type LoginRole = 'seeker' | 'employer'

interface LoginCredentials {
  identifier: string // email or E.164 phone
  password?: string
  otp?: string
}

function loginEndpoint(role: LoginRole): string {
  return role === 'employer' ? '/employers/login' : '/jobseekers/login'
}

// `otp` is echoed in non-production only; absent in production. Never make a
// flow depend on it.
export interface ForgotPasswordResult extends OtpSendMeta {
  identifier: string
  otp?: string
}

export const authAPI = {
  // Email+password OR phone+otp login. Role selects the endpoint.
  login: async (role: LoginRole, credentials: LoginCredentials) => {
    return apiRequest<LoginResult>(loginEndpoint(role), {
      method: 'POST',
      body: JSON.stringify(credentials),
      isCredentialCheck: true,
    })
  },

  /**
   * Log in WITHOUT the caller knowing which role the account is (TD-37/TD-43).
   *
   * `POST /api/auth/login` decides the role server-side: `authService.login`
   * detects the identifier type, finds the user and verifies the credential
   * role-blind, and the controller refuses only ADMIN. That is what lets the
   * login screen drop its seeker/employer toggle — the thing that made
   * right-credentials-wrong-tab the commonest way to fail to log in.
   *
   * Takes EITHER credential. `loginSchema` is a three-arm union
   * (email+password, phone+otp, phone+password) and this endpoint accepts all
   * three, so the OTP arm belongs here too.
   *
   * ⚠️ The OTP arm must never reach `loginByGuessingRole` below. `authService`
   * verifies AND CONSUMES the code before the old role gate runs
   * (`auth.service.ts:544-546`, a hard delete), so a retry would fail on a
   * correct code. A password survives being offered twice; a one-time code does
   * not. That is why the 404 fallback splits on which credential it was given
   * rather than retrying blindly — and it is a fallback for one deploy window,
   * not a path anything should rely on.
   *
   * An earlier version of this docblock said "the backend splits login by role
   * on purpose — there is no role-agnostic endpoint". That was true when
   * written and false by the time TD-43 landed underneath it; the mobile
   * session caught it.
   */
  loginAnyRole: async (
    credentials: { identifier: string; password: string } | { identifier: string; otp: string },
    /**
     * Which gate to try FIRST. Purely a latency hint — a wrong guess still
     * succeeds, it just costs a second round trip.
     *
     * Worth passing because the wasted request is not a cheap 403: the gate can
     * only know the role is wrong AFTER verifying the password, so a miss costs
     * an RTT plus a discarded bcrypt. The login page already computes a good
     * guess from the returnUrl — an employer bounced off `/employer/*` by
     * ProtectedRoute is the commonest employer arrival by far.
     *
     * Default 'seeker' because seekers vastly outnumber employers, so a blind
     * call should put the cost on the smaller, better-connected population.
     * Deliberately NOT a remembered "last role" in storage: handsets get shared
     * in this audience, and a stale hint would move the penalty onto exactly the
     * users the default protects.
     */
    preferred: LoginRole = 'seeker'
  ) => {
    // TD-43 — one role-agnostic endpoint, so there is nothing to guess. The
    // backend does not gate on role here; we read the real one off the user it
    // returns.
    try {
      return await apiRequest<LoginResult>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
        isCredentialCheck: true,
      })
    } catch (err) {
      // ⚠️ TRANSITIONAL, and delete it once the backend carrying TD-43 is live.
      //
      // Only a 404 falls through: that is "this server predates the endpoint",
      // not "these credentials are wrong". Without it, a frontend deployed ahead
      // of its backend does not degrade — NOBODY can log in at all. The deploy
      // checklist already says backend first, but the cost of getting that wrong
      // went from a confusing message to a dead product, which is worth ten
      // lines of belt and braces.
      if (!(err instanceof ApiError) || err.status !== 404) throw err
    }
    // A one-time code cannot be offered to a second gate — see the warning
    // above — so on the 404 window an OTP gets ONE attempt at the likelier role
    // rather than the guess-and-retry a password can afford.
    if ('otp' in credentials) return authAPI.login(preferred, credentials)
    return authAPI.loginByGuessingRole(credentials, preferred)
  },

  /**
   * The pre-TD-43 way in: try one role gate, and when the backend answers
   * `ROLE_MISMATCH` with the account's real role, use it.
   *
   * Kept ONLY as the fallback above, for the window where a frontend is newer
   * than its backend. Delete both once TD-43 is deployed — this is exactly the
   * client-side copy of backend internals that TD-43 exists to remove.
   */
  loginByGuessingRole: async (
    credentials: { identifier: string; password: string },
    preferred: LoginRole = 'seeker'
  ) => {
    const fallback: LoginRole = preferred === 'seeker' ? 'employer' : 'seeker'
    try {
      return await authAPI.login(preferred, credentials)
    } catch (err) {
      if (!(err instanceof ApiError) || err.code !== 'ROLE_MISMATCH') throw err
      // Only retry for a role we recognise, and only for the one we did NOT just
      // try. An ADMIN fails BOTH gates — the console is a separate app — so
      // retrying would 403 twice and report the second failure, hiding what the
      // account actually is. Let the caller's error handling say so instead.
      const actual = err.details?.actualRole
      const actualRole: LoginRole | null =
        actual === 'JOB_SEEKER' ? 'seeker'
        : actual === 'EMPLOYER_INDIVIDUAL' || actual === 'EMPLOYER_BUSINESS' ? 'employer'
        : null
      if (actualRole !== fallback) throw err
      return await authAPI.login(fallback, credentials)
    }
  },

  // Phone-OTP login step 1: request the login OTP. Step 2 is authAPI.login
  // with { identifier: <phone>, otp }.
  //
  // This is the ONLY source of a LOGIN-purpose code — POST /otp/send issues a
  // REGISTRATION-purpose one that login will not accept. Its response carries the
  // same OtpSendMeta as every other send (`expiresIn` in minutes,
  // `resendCooldownSeconds` in seconds); read it with readOtpSendTiming.
  loginPhoneSend: async (phoneNumber: string) => {
    return apiRequest<PhoneLoginSendResult>('/auth/login-phone-send', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    })
  },

  // Google OAuth login / sign-up. The FE forwards Google's `id_token`; the BE
  // verifies it (audience + signature + expiry) and returns OUR JWT. `role` is
  // the full UserRole enum (the employer subtype is chosen in the UI), NOT the
  // seeker/employer toggle. POST /api/auth/google/login { idToken, role }.
  googleLogin: async (role: UserRole, idToken: string) => {
    return apiRequest<GoogleLoginResult>('/auth/google/login', {
      method: 'POST',
      body: JSON.stringify({ idToken, role }),
      isCredentialCheck: true,
    })
  },

  // Bind / change the phone on the logged-in account (used by the post-Google
  // phone-verification step). Authenticated — relies on the JWT already stored
  // by login(). Verify+update: BE checks `otp` against `newPhoneNumber` and
  // flips PENDING_OTP_VERIFICATION → ACTIVE. POST /api/auth/change-phone.
  changePhone: async (newPhoneNumber: string, otp: string) => {
    return apiRequest<{ phoneNumber: string }>('/auth/change-phone', {
      method: 'POST',
      body: JSON.stringify({ newPhoneNumber, otp }),
    })
  },

  // Change / add the email on the logged-in account. POST /api/auth/change-email.
  // Authenticated. Pair with emailOtpAPI.send(newEmail, 'CHANGE_EMAIL') first —
  // the BE checks `otp` against `newEmail` under that purpose. This is how a
  // phone-only seeker gains an email after registering; the existing password
  // keeps working and the new address becomes a valid login identifier.
  changeEmail: async (newEmail: string, otp: string) => {
    return apiRequest('/auth/change-email', {
      method: 'POST',
      body: JSON.stringify({ newEmail, otp }),
    })
  },

  // Email verification (6-digit OTP). POST /api/auth/verify-email-otp.
  //
  // ⚠️ NOT part of registration any more. Both contacts are verified BEFORE the
  // account exists (register consumes the marks), so a registration screen must
  // call emailOtpAPI.verify(email, otp, 'REGISTRATION') instead. This endpoint
  // remains only for admin-added accounts, which are created already-registered
  // with an unverified email.
  verifyEmailOtp: async (email: string, otp: string) => {
    return apiRequest('/auth/verify-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    })
  },

  // Unified forgot-password (email OR phone). POST /api/auth/forgot-password
  // { identifier }. The BE picks the channel by shape — a verified email sends
  // an email-OTP (FORGOT_PASSWORD), a verified phone sends an SMS-OTP — and
  // always returns the same generic response so the reply cannot be used to
  // enumerate which identifiers have accounts.
  forgotPassword: async (identifier: string) => {
    return apiRequest<ForgotPasswordResult>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    })
  },

  // Step 2 of the reset: check the FORGOT_PASSWORD code and mark it verified.
  // POST /api/auth/verify-reset-otp { identifier, otp }. Grants nothing by
  // itself; resetPassword below accepts only a code verified here, sent again
  // unchanged. A second call for the same code answers OTP_ALREADY_VERIFIED.
  // Same `identifier` rule as resetPassword.
  verifyResetOtp: async (identifier: string, otp: string) => {
    return apiRequest<{ identifier: string }>('/auth/verify-reset-otp', {
      method: 'POST',
      body: JSON.stringify({ identifier, otp }),
    })
  },

  // Step 3: set the new password with the code verifyResetOtp verified (email
  // or phone — same dispatch as forgotPassword above). POST /api/auth/reset-password.
  // A code that skipped verification answers 400 OTP_NOT_VERIFIED.
  // `identifier` MUST be the exact value forgotPassword was called with: the
  // code is stored against it, so asking by phone and resetting by email
  // looks up a row that was never written.
  resetPassword: async (identifier: string, otp: string, newPassword: string) => {
    return apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ identifier, otp, newPassword }),
    })
  },

  // Change the password of the signed-in user. POST /api/auth/change-password
  // (authenticated). BE re-checks `currentPassword` and enforces the same
  // 8-char upper/lower/number rule as registration.
  changePassword: async (currentPassword: string, newPassword: string) => {
    return apiRequest('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    })
  },
}

// DELETE /me body — exactly one of password/idToken proves it is the account
// holder (me.validator.ts's deleteAccountSchema `.refine`); never both.
// `confirmDeleteOrganisation` is only sent on the retry after a 409
// ORG_DELETE_CONFIRM_REQUIRED (an org OWNER with live teammates).
export interface DeleteAccountInput {
  password?: string
  idToken?: string
  confirmDeleteOrganisation?: boolean
}

export interface DeleteAccountResult {
  deletedAt: string
  /** Teammates whose access ended with this delete. 0 for everyone but an org OWNER. */
  teammatesRemoved: number
  /** Days the account stays restorable before it is erased (30 by default). Null for staff. */
  retentionDays: number | null
}

// POST /me/password body — a Google-only account's FIRST password. The Google
// idToken is the proof, not the session (me.validator.ts's setPasswordSchema).
export interface SetPasswordInput {
  idToken: string
  newPassword: string
}

/**
 * R1-BE-03 — the five switchable notification categories. Keep in step with the
 * BE `NotificationCategory` enum. OTP / sign-in codes are not a category and are
 * never switched off.
 */
export type NotificationCategory = 'APPLICATIONS' | 'VERIFICATION' | 'JOB_POSTS' | 'BILLING' | 'MESSAGES'

/** `true` = on. The BE always answers with every category and the WhatsApp consent. */
export interface NotificationPrefs {
  categories: Record<NotificationCategory, boolean>
  whatsappConsent: boolean
}

/** A PUT merges, so send only what changed (the BE needs at least one field). */
export interface NotificationPrefsUpdate {
  categories?: Partial<Record<NotificationCategory, boolean>>
  whatsappConsent?: boolean
}

// Current-user (role-agnostic) endpoints — /api/me/*
// Imported from i18n/languages (plain data, no side effects) rather than i18n/config,
// which would boot react-i18next just by being imported here.
/** Fired when the API answers 403 CONSENT_REQUIRED; ConsentGate listens. */
export const CONSENT_REQUIRED_EVENT = 'auth:consent-required'

/** Effective dates of the Terms of Use and the Privacy Policy, e.g. "2026-10-08". */
export interface LegalVersions {
  TERMS: string
  PRIVACY: string
}

/** GET/POST /api/v1/me/consents. `accepted` values are null when never accepted. */
export interface LegalConsentStatus {
  current: LegalVersions
  accepted: { TERMS: string | null; PRIVACY: string | null }
  outdated: Array<keyof LegalVersions>
  needsAcceptance: boolean
}

export const meAPI = {
  // PATCH /api/me/language — persist the preferred language for ANY role (BR-9).
  //
  // Keep in step with `updateLanguageSchema` in prosiddhi-backend
  // (src/validators/me.validator.ts), which allow-lists the same 10 codes. It was
  // `['en','hi']` until 2026-08-18 — correct while the other eight had no translations,
  // and a silent bug once they shipped: the caller below treats a failed save as
  // non-fatal, so the UI switched while the account kept its old `preferredLanguage`
  // (the field that shows an employer which language a candidate speaks).
  //
  // Adding a language to i18n/languages.ts means adding it there too.
  updateLanguage: async (language: SupportedLanguage) => {
    return apiRequest('/me/language', {
      method: 'PATCH',
      body: JSON.stringify({ language }),
    })
  },

  // GET /api/v1/me/notification-prefs — role-agnostic.
  getNotificationPrefs: async () => {
    return apiRequest<NotificationPrefs>('/me/notification-prefs')
  },

  // PUT /api/v1/me/notification-prefs — merges; answers with the full state.
  updateNotificationPrefs: async (patch: NotificationPrefsUpdate) => {
    return apiRequest<NotificationPrefs>('/me/notification-prefs', {
      method: 'PUT',
      body: JSON.stringify(patch),
    })
  },

  // GET /api/v1/me/consents — which Terms / Privacy versions are current, which this
  // person accepted, and whether they must accept again. Any role.
  getConsents: async () => {
    return apiRequest<LegalConsentStatus>('/me/consents')
  },

  // POST /api/v1/me/consents — accept. `versions` must be the ones the screen showed
  // (as getConsents returned them); 409 LEGAL_VERSION_MISMATCH if a newer one was
  // published meanwhile — reload and show it again.
  acceptConsents: async (versions: LegalVersions) => {
    return apiRequest<LegalConsentStatus>('/me/consents', {
      method: 'POST',
      body: JSON.stringify({ versions }),
    })
  },

  // GET /api/v1/me/export — "Download my data" (DPDP right of access). A JSON file of
  // this person's own data and who it was shared with. Any role; 5 per window.
  downloadMyData: async (): Promise<Blob> => {
    return apiRequest<Blob>('/me/export', { asBlob: true })
  },

  // DELETE /api/me — self-service account deletion (BE-A08, Google Play
  // requirement). Role-agnostic. See `preserveSessionOnCode` on apiRequest.
  deleteAccount: async (input: DeleteAccountInput) => {
    return apiRequest<DeleteAccountResult>('/me', {
      method: 'DELETE',
      body: JSON.stringify(input),
      preserveSessionOnCode: 'REAUTH_FAILED',
    })
  },

  // POST /api/me/password — first password for a Google-only account (hasGoogleLogin
  // && !hasPassword). REAUTH_FAILED (401) keeps the session; PASSWORD_ALREADY_SET
  // (409) means use authAPI.changePassword.
  setPassword: async (input: SetPasswordInput) => {
    return apiRequest<{ hasPassword: true }>('/me/password', {
      method: 'POST',
      body: JSON.stringify(input),
      preserveSessionOnCode: 'REAUTH_FAILED',
    })
  },
}

// Phone OTP (registration / generic) — POST /api/otp/{send,verify}

// In NON-PRODUCTION the BE echoes the OTP in the send response so QA can complete
// a flow without a real SMS gateway (MSG91 is not wired yet). It is absent in prod.
export interface OtpSendResult extends OtpSendMeta {
  phoneNumber: string
  otp?: string
}

/**
 * POST /auth/login-phone-send. Carries the same OtpSendMeta as every other send.
 * An older backend sent `expiresIn` as a number here and as the string
 * "10 minutes" everywhere else; `readOtpSendTiming` tolerates both.
 */
export interface PhoneLoginSendResult extends OtpSendMeta {
  otp?: string
}

export const otpAPI = {
  send: async (phoneNumber: string) => {
    return apiRequest<OtpSendResult>('/otp/send', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    })
  },
  verify: async (phoneNumber: string, otp: string) => {
    return apiRequest('/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, otp }),
    })
  },
}

// Generic Email OTP — POST /api/email-otp/{send,verify}. The BE keys OTPs by
// (email, purpose), so `purpose` is required on both calls.
//
// REGISTRATION is now the registration path too: verifying under this purpose
// leaves a server-side "verified" mark that the register call consumes. The
// mark does NOT expire (only the 6-digit code does, after 10 minutes), so a
// long form between verifying and registering is safe — but it IS single-use,
// so a replayed register finds it already burned.
//
// The public /email-otp/* routes accept only these two purposes. A password-reset
// code (FORGOT_PASSWORD) is issued and checked by authAPI.forgotPassword /
// authAPI.resetPassword; sending it here returns 400.
export type EmailOtpPurpose = 'REGISTRATION' | 'CHANGE_EMAIL'

// `otp` is echoed in non-production only; absent in production. Never make a
// flow depend on it.
export interface EmailOtpSendResult extends OtpSendMeta {
  otp?: string
}

export const emailOtpAPI = {
  send: async (email: string, purpose: EmailOtpPurpose) => {
    return apiRequest<EmailOtpSendResult>('/email-otp/send', {
      method: 'POST',
      body: JSON.stringify({ email, purpose }),
    })
  },
  verify: async (email: string, otp: string, purpose: EmailOtpPurpose) => {
    return apiRequest('/email-otp/verify', {
      method: 'POST',
      body: JSON.stringify({ email, otp, purpose }),
    })
  },
}

/**
 * What went wrong on a register call, in terms a screen can act on.
 *
 * Order: field errors (`errors[].path`), then the BE's machine-readable `code`
 * (always serialised, in every environment), then a legacy message match, then
 * `unknown`. The message match is TEMPORARY: it only exists in case a backend
 * that predates the registration codes is still running. Remove it once the
 * deployed BE is confirmed to send them.
 *
 * `INVALID_JOB_PREFERENCE` has no kind of its own; it falls to `unknown` and the
 * BE message is shown.
 */
export type RegisterFailure =
  /**
   * `PHONE_NOT_VERIFIED` — "Phone number must be verified before registration."
   *
   * The phone was never verified, or its verification was already consumed by an
   * earlier register (marks are single-use). The two are indistinguishable, so
   * send the user back to re-verify. Never auto-retry the register call. (A phone
   * that already belongs to an account arrives as `PHONE_ALREADY_REGISTERED`
   * instead — see `phoneTaken`.)
   */
  | { kind: 'phoneUnverified' }
  /** Email was supplied but not verified under purpose REGISTRATION. */
  | { kind: 'emailUnverified' }
  /** Another account already owns this email — a clear, actionable message. */
  | { kind: 'emailTaken' }
  /**
   * `PHONE_ALREADY_REGISTERED` — another account already owns this phone. The BE
   * sends it both for a plain duplicate and for the "must be verified" message
   * when a verified account holds the number; the code is authoritative.
   */
  | { kind: 'phoneTaken' }
  /** Zod field failures, keyed by field name; one field may carry several. */
  | { kind: 'fields'; fields: Record<string, string[]> }
  | { kind: 'unknown'; message: string }

export function classifyRegisterError(err: unknown): RegisterFailure {
  const fields = fieldErrorsByPath(err)
  if (Object.keys(fields).length) return { kind: 'fields', fields }

  switch (err instanceof ApiError ? err.code : undefined) {
    case 'PHONE_NOT_VERIFIED':
      return { kind: 'phoneUnverified' }
    case 'PHONE_ALREADY_REGISTERED':
      return { kind: 'phoneTaken' }
    case 'EMAIL_NOT_VERIFIED':
      return { kind: 'emailUnverified' }
    case 'EMAIL_ALREADY_REGISTERED':
      return { kind: 'emailTaken' }
  }

  // TEMPORARY legacy fallback for a BE without registration codes.
  const message = err instanceof Error ? err.message : ''
  if (message.includes('Phone number must be verified')) return { kind: 'phoneUnverified' }
  if (message.includes('Email must be verified')) return { kind: 'emailUnverified' }
  if (message.includes('User with this email already exists')) return { kind: 'emailTaken' }
  if (message.includes('User with this phone number already exists')) return { kind: 'phoneTaken' }
  return { kind: 'unknown', message }
}

// ==========================================
// JOB SEEKER APIs
// ==========================================

export interface RegisterPhoneData {
  phoneNumber: string
}

export interface VerifyOTPData {
  phoneNumber: string
  otp: string
}

export interface SeekerWorkExperience {
  designation: string
  fromYear: string
  toYear: string
}

// Matches BE jobSeekerRegisterSchema (auth.validator.ts).
export interface SeekerRegisterData {
  fullName: string
  /**
   * OPTIONAL — the seeker is often an unskilled worker with no email, so phone
   * is the primary identity. Omit the key entirely (or pass ''; the BE
   * normalises '' → absent). When supplied it must ALREADY be verified under
   * purpose REGISTRATION or the register call 400s.
   */
  email?: string
  /**
   * Required. The account is created WITH its password — there is no follow-up
   * /set-password call any more (that route is deleted; it was unauthenticated
   * and let anyone claim an unfinished signup).
   */
  password: string
  phoneNumber: string // E.164, must already be verified
  // BR-3 — 3-level taxonomy. preferredCategory optional on the BE; sector +
  // jobTitle required. The FE sends the full triple (validateTriple checks path).
  preferredCategory?: string
  preferredSector: string
  preferredJobTitle: string
  preferredLanguage?: string
  latitude?: number
  longitude?: number
  location?: string
  /**
   * BR-1. `YYYY-MM-DD` — the value a native `<input type="date">` produces.
   *
   * Optional on the BE schema, but that is the ONLY place a minimum age is
   * enforced: `dateOfBirthSchema` rejects a future date and anything under 18.
   * Omit it and that check simply never runs. The UI requires it, so always
   * send it.
   */
  dateOfBirth?: string
  /** BR-1. Must match the BE `Gender` enum exactly: MALE | FEMALE | OTHER. */
  gender?: 'MALE' | 'FEMALE' | 'OTHER'
  /**
   * R1-BE-03 — WhatsApp opt-in. Required, no default: the BE's `booleanField()`
   * treats a missing value as a gap, not a decline, so this must always be sent
   * explicitly — checked = true, unchecked = false.
   */
  whatsappConsent: boolean
  /**
   * Ticked "I agree to the Terms of Use and the Privacy Policy". The form cannot be
   * submitted without it; the BE records the acceptance with the account
   * (prosiddhi-backend src/services/legal-consent.service.ts). `false` is refused (400).
   */
  acceptTerms: true
  workExperiences?: SeekerWorkExperience[]
  profilePic?: File
  document?: File
}

/**
 * The register response. `emailVerification` is GONE — the account is created
 * already-verified, so there is no OTP to hand back and nothing left to verify.
 */
export interface SeekerRegisterResult {
  userId: string
  /** NULL when the seeker registered without an email. */
  email: string | null
  phoneNumber: string
  accountStatus: string
  emailVerified: boolean
  phoneVerified: boolean
  filesUploaded?: { profilePic: boolean; document: boolean }
  workExperiencesAdded?: number
  /**
   * The session, issued with the account — see `EmployerRegisterResult.token`
   * for why. Optional so the portal can deploy ahead of the backend; callers
   * fall back to the explicit login when it is absent.
   */
  token?: string
  user?: AuthUser
}

export const jobSeekerAPI = {
  // Registration — phone verification reuses the generic OTP endpoints.
  // Step 1: send phone OTP (POST /api/otp/send).
  registerPhone: async (data: RegisterPhoneData) => {
    return otpAPI.send(data.phoneNumber)
  },

  // Step 2: verify phone OTP (POST /api/otp/verify).
  verifyOTP: async (data: VerifyOTPData) => {
    return otpAPI.verify(data.phoneNumber, data.otp)
  },

  // Step 3: register the seeker (POST /api/jobseekers/register). Always sent as
  // multipart (the BE route uses multer; files are optional, workExperiences is
  // a JSON string the controller JSON.parses).
  //
  // PRECONDITION: the phone is already verified, and the email too if one is
  // given — the BE reads both marks here and 400s otherwise. It also CONSUMES
  // them, so this call is not safely repeatable: a retry gets the "phone must be
  // verified" message, which is indistinguishable from never having verified.
  // The account comes out ACTIVE with its password set; the caller logs in next.
  register: async (data: SeekerRegisterData) => {
    const fd = new FormData()
    fd.append('fullName', data.fullName)
    // Only send `email` when there is one. The BE tolerates '' but omitting the
    // key is the honest signal for a phone-only seeker.
    if (data.email?.trim()) fd.append('email', data.email.trim())
    fd.append('password', data.password)
    fd.append('phoneNumber', data.phoneNumber)
    if (data.preferredCategory) fd.append('preferredCategory', data.preferredCategory)
    fd.append('preferredSector', data.preferredSector)
    fd.append('preferredJobTitle', data.preferredJobTitle)
    fd.append('preferredLanguage', data.preferredLanguage ?? 'en')
    if (data.latitude != null) fd.append('latitude', String(data.latitude))
    if (data.longitude != null) fd.append('longitude', String(data.longitude))
    if (data.location) fd.append('location', data.location)
    // BR-1 — these were collected as REQUIRED by the profile step and then
    // never sent, so the backend's age >= 18 refinement never ran and nothing
    // enforced a minimum age at registration. Both fields have been accepted by
    // jobSeekerRegisterSchema since BR-3; only this client was still behind.
    if (data.dateOfBirth) fd.append('dateOfBirth', data.dateOfBirth)
    if (data.gender) fd.append('gender', data.gender)
    // Map the UI shape (designation/fromYear/toYear) to the BE WorkExperience
    // shape (position/startDate/endDate). The BE requires position + a parseable
    // startDate, so only rows with both a designation AND a fromYear are sent.
    if (data.workExperiences?.length) {
      const mapped = data.workExperiences
        .filter((e) => e.designation.trim() && e.fromYear.trim())
        .map((e) => ({
          position: e.designation.trim(),
          startDate: e.fromYear.trim(),
          endDate: e.toYear.trim() || undefined,
          currentlyWorking: !e.toYear.trim(),
        }))
      if (mapped.length) fd.append('workExperiences', JSON.stringify(mapped))
    }
    // Each file is size-checked and, if it is a big image, shrunk first (lib/uploadFile).
    if (data.profilePic) fd.append('profilePic', await prepareUpload(data.profilePic, 'profilePhoto'))
    if (data.document) fd.append('document', await prepareUpload(data.document, 'document'))
    // Always sent, never gated on truthiness like the optional fields above —
    // the BE's booleanField() treats a missing key as a gap, not a decline.
    fd.append('whatsappConsent', String(data.whatsappConsent))
    fd.append('acceptTerms', String(data.acceptTerms))
    return apiRequest<SeekerRegisterResult>('/jobseekers/register', {
      method: 'POST',
      body: fd,
    })
  },

  // setPassword REMOVED — POST /jobseekers/set-password is deleted on the BE
  // (404). It was unauthenticated, guarded only by "does a password already
  // exist", so anyone who knew an email could claim an unfinished signup.
  // `password` now ships with register() above.

  // Login (email/password). Prefer authAPI.login for the new /login page.
  login: async (credentials: { identifier: string; password: string }) => {
    return authAPI.login('seeker', credentials)
  },

  // Get job feed (public). GET /api/jobs → { jobs, pagination }.
  // Only defined filter values are sent (undefined keys are skipped).
  getJobFeed: async (filters: JobFeedFilters = {}) => {
    const qs = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        qs.set(key, String(value))
      }
    })
    const query = qs.toString()
    return apiRequest<JobsPage>(`/jobs${query ? `?${query}` : ''}`)
  },

  // Get job details (public). GET /api/jobs/:id (BE increments viewCount).
  getJobDetails: async (jobId: string) => {
    return apiRequest<Job>(`/jobs/${jobId}`)
  },

  // Related jobs (public). GET /api/jobs/:id/related → { jobId, relatedJobs, count }.
  getRelatedJobs: async (jobId: string, limit = 6) => {
    return apiRequest<{ jobId: string; relatedJobs: Job[]; count: number }>(
      `/jobs/${jobId}/related?limit=${limit}`
    )
  },

  // Recommended feed (seeker-only, JWT). GET /api/jobs/recommended → { jobs, pagination }.
  getRecommendedJobs: async (page = 1, limit = 10) => {
    return apiRequest<JobsPage>(`/jobs/recommended?page=${page}&limit=${limit}`)
  },

  // Near By feed (seeker-only, JWT — uses the seeker's profile location).
  // GET /api/jobs/nearby → { jobs, pagination }.
  getNearbyJobs: async (params: { radius?: number; page?: number; limit?: number } = {}) => {
    // 50 km, not 5. Until TD-02 no seeker had a coordinate, so Near By always
    // short-circuited on `noLocation` and this radius was never reached; 5 km
    // was untested rather than chosen. It also disagreed with the city filter on
    // the same screen (`maxDistance: 50`) and with the backend service default,
    // both 50.
    //
    // ⚠️ This does NOT make Near By return jobs on its own. `getNearbyForSeeker`
    // drops every job with a null coordinate, and JobForm still posts none — so
    // the feed stays empty at any radius until TD-03 lands. What 5 km would do
    // once TD-03 ships is make the PRECISE tier worse than the coarse one: a
    // seeker whose GPS puts them in Whitefield sits ~18 km from the Bangalore
    // centroid a typed-city job would carry.
    //
    // TD-06 gave the All-jobs city filter a per-city radius, but this tab has no
    // city to read one from — it is keyed to the seeker's own coordinate, not to
    // a dropdown choice. 50 km stays the "near me" default.
    const { radius = 50, page = 1, limit = 10 } = params
    return apiRequest<JobsPage>(`/jobs/nearby?radius=${radius}&page=${page}&limit=${limit}`)
  },

  // Apply for job. POST /api/applications — jobId (required) + message? (≤1000).
  // Still multipart: the BE route is mounted behind multer and expects a
  // multipart body. (Audio was removed from the product — the BE tolerates
  // clients that omit it, which is exactly what we now do.)
  applyForJob: async (jobId: string, applicationData: { message?: string }) => {
    const formData = new FormData()
    formData.append('jobId', jobId)
    if (applicationData.message) {
      formData.append('message', applicationData.message)
    }
    return apiRequest<Application>('/applications', {
      method: 'POST',
      body: formData,
    })
  },

  // Check if the seeker has already applied. GET /api/applications/check/:jobId
  checkIfApplied: async (jobId: string) => {
    // `status` is the seeker's own application status, null when never applied.
    return apiRequest<{ hasApplied: boolean; jobId: string; status?: string | null }>(`/applications/check/${jobId}`)
  },

  // Gated recruiter-contact reveal (NC-5/Q51). GET /api/jobs/:id/recruiter-contact
  // Returns only the fields the employer toggled on; {} when both are off.
  getRecruiterContact: async (jobId: string) => {
    return apiRequest<{ email?: string; phoneNumber?: string }>(`/jobs/${jobId}/recruiter-contact`)
  },

  // Report a job (T2 #12). POST /api/jobs/:id/report — reason 5–1000 chars.
  // BE returns 429 (rate-limited: 5/day per seeker, 1/hr per seeker per job) — message surfaced to the user.
  reportJob: async (jobId: string, reason: string) => {
    return apiRequest(`/jobs/${jobId}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  },

  // Get my applications. GET /api/applications/my → { applications, pagination }.
  getMyApplications: async (page = 1, limit = 10, status?: string) => {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (status) qs.set('status', status)
    return apiRequest<ApplicationsPage>(`/applications/my?${qs.toString()}`)
  },

  // Get a single application (owner-gated). GET /api/applications/:id
  getApplicationById: async (applicationId: string) => {
    return apiRequest<Application>(`/applications/${applicationId}`)
  },

  // Withdraw an application. PUT /api/applications/:id/withdraw
  // BE rejects withdraw of an ACCEPTED or already-WITHDRAWN application.
  withdrawApplication: async (applicationId: string) => {
    return apiRequest(`/applications/${applicationId}/withdraw`, {
      method: 'PUT',
    })
  },

  // Saved jobs. GET/POST /api/saved-jobs, DELETE /api/saved-jobs/:jobId
  // BE returns { savedJobs, pagination } — each item wraps the job (see SavedJobItem).
  getSavedJobs: async (page = 1, limit = 10) => {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
    return apiRequest<SavedJobsPage>(`/saved-jobs?${qs.toString()}`)
  },
  saveJob: async (jobId: string) => {
    return apiRequest('/saved-jobs', {
      method: 'POST',
      body: JSON.stringify({ jobId }),
    })
  },
  unsaveJob: async (jobId: string) => {
    return apiRequest(`/saved-jobs/${jobId}`, {
      method: 'DELETE',
    })
  },
  isJobSaved: async (jobId: string) => {
    // BE returns { isSaved, jobId }.
    return apiRequest<{ isSaved: boolean; jobId: string }>(`/saved-jobs/check/${jobId}`)
  },

  // Profile (PJP-112). GET /api/jobseekers/profile → full user + nested jobSeeker.
  getProfile: async () => {
    return apiRequest<SeekerProfile>('/jobseekers/profile')
  },

  // Update profile. PUT /api/jobseekers/profile (JSON). Do NOT send email/phone/
  // password — the BE rejects them. workExperiences (when present) FULL-REPLACES.
  // NOTE: the BE returns the BARE updated JobSeeker record (not the wrapped user
  // shape that GET returns), so callers should re-fetch getProfile() to refresh.
  updateProfile: async (data: SeekerProfileUpdate) => {
    return apiRequest<unknown>('/jobseekers/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // Profile photo. POST /api/jobseekers/me/profile-photo (multipart field `profilePic`).
  updateProfilePhoto: async (file: File) => {
    const fd = new FormData()
    fd.append('profilePic', await prepareUpload(file, 'profilePhoto'))
    return apiRequest<{ profilePhoto: string }>('/jobseekers/me/profile-photo', {
      method: 'POST',
      body: fd,
    })
  },

  // Documents. GET/POST/DELETE /api/jobseekers/me/documents[/:documentId].
  // Upload is multipart: `file` + optional `type` (seeker DocumentType).
  listDocuments: async () => {
    return apiRequest<UserDocument[]>('/jobseekers/me/documents')
  },
  uploadDocument: async (file: File, type?: DocumentType) => {
    const fd = new FormData()
    fd.append('file', await prepareUpload(file, 'document'))
    if (type) fd.append('type', type)
    return apiRequest<UserDocument>('/jobseekers/me/documents', { method: 'POST', body: fd })
  },
  deleteDocument: async (documentId: string) => {
    return apiRequest(`/jobseekers/me/documents/${documentId}`, { method: 'DELETE' })
  },

  // Skills (self-declared). GET/POST/DELETE /api/jobseekers/me/skills[/:linkId].
  // getMySkills returns link rows (each with the joined catalog `skill`); the row
  // `id` is the LINK id used for removeSkill.
  getMySkills: async () => {
    return apiRequest<JobSeekerSkillLink[]>('/jobseekers/me/skills')
  },
  addSkill: async (skillId: string) => {
    return apiRequest<JobSeekerSkillLink>('/jobseekers/me/skills', {
      method: 'POST',
      body: JSON.stringify({ skillId }),
    })
  },
  removeSkill: async (linkId: string) => {
    return apiRequest(`/jobseekers/me/skills/${linkId}`, { method: 'DELETE' })
  },

  // Public skills catalog (for the picker). GET /api/skills → { skills, pagination }.
  getSkillsCatalog: async (
    params: { category?: string; search?: string; page?: number; limit?: number } = {}
  ) => {
    const qs = new URLSearchParams()
    if (params.category) qs.set('category', params.category)
    if (params.search) qs.set('search', params.search)
    qs.set('page', String(params.page ?? 1))
    qs.set('limit', String(params.limit ?? 100))
    return apiRequest<SkillsCatalogPage>(`/skills?${qs.toString()}`)
  },
}

// ==========================================
// EMPLOYER APIs
// ==========================================

export type JobTypeValue = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'TEMPORARY' | 'INTERNSHIP'
export type PaymentTypeValue = 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'FIXED'
export type UrgencyLevelValue = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

// Mirrors the BE createJobSchema (POST /api/jobs). Only `title/description/
// category/cityIds/jobType` are required server-side; the rest are optional.
export interface JobFields {
  title: string
  description: string
  // BR-3 — 3-level taxonomy. `category` required (BE), `sector`/`jobTitle`
  // optional; when sent they must form a valid path (BE validateTriple).
  category: string
  sector?: string
  jobTitle?: string
  requirements?: string
  skillsRequired?: string[]
  // NO `radius` field, deliberately (TD-03). The backend accepts one, stores it,
  // and never reads it — `getNearbyForSeeker` filters on the SEEKER's radius —
  // so a wrong value here is invisible until someone wires it up, by which time
  // it is wrong across the whole job table. It also invites `radius: city.radius`
  // from `@/lib/cities`, which measures the city's extent rather than the
  // employer's hiring reach. A type that cannot express the mistake beats a
  // comment asking people not to make it. Add it back with a reader and a UI
  // control that names it, or not at all.
  salaryMin?: number
  salaryMax?: number
  paymentType?: PaymentTypeValue
  jobType: JobTypeValue
  urgencyLevel?: UrgencyLevelValue
  numberOfPositions?: number
  companyName?: string
  // No duration / expiresAt / showEmailToSeekers / showPhoneToSeekers — the BE
  // dropped those Job columns (fe246f1). createJobSchema is not .strict(), so Zod
  // silently STRIPPED them rather than erroring, which is exactly why the portal
  // went on sending them unnoticed.
}

/**
 * A new post (POST /api/jobs). `cityIds` is the cities the job is posted in: 1–5 ids
 * from GET /locations/cities. The BE writes the job's `location` text and its
 * coordinates from them and silently drops `location` / `latitude` / `longitude`
 * if sent, so this type has none of those.
 */
export type PostJobData = JobFields & { cityIds: string[] }

/**
 * An edit (PUT /api/jobs/:id). `cityIds` is optional: leaving it out keeps the
 * job's cities as they are (job.service.ts updateJob only touches them when the field
 * is present), which is how a job posted before cities existed is edited without
 * picking one. When present it replaces the job's cities and holds 1–5 ids.
 *
 * ⚠️ Never `[]`: the BE refuses an empty list with a 400 (job.validator.ts
 * `cityIds.min(1)`); it does not clear anything.
 */
export type UpdateJobData = JobFields & { cityIds?: string[] }

export interface JobApplication {
  id: string
  applicantName?: string
  status?: string
  appliedAt?: string
  [key: string]: unknown
}

// How long a dashboard panel waits before giving up. Generous on purpose: the portal
// is used on slow mobile networks, and a proxy usually answers sooner with its own 504.
const DASHBOARD_TIMEOUT_MS = 20_000

// Employer dashboard shapes (GET /api/employers/dashboard/*).
export interface EmployerDashboardStats {
  totalJobPosts: number
  totalApplications: number
  acceptedApplications: number
  rejectedApplications: number
  pendingApplications: number
  shortlistedApplications: number
  // Absent on a backend older than df96861; the dashboard hides the tile then.
  withdrawnApplications?: number
  activeJobs: number
  reviewedApplications: number
}

export interface EmployerDashboardJob {
  id: string
  title: string
  description?: string
  category?: string
  subcategory?: string | null
  location?: string
  status?: string
  // Independent of `status`: a post in review and a rejected one are both INACTIVE.
  moderationStatus?: string
  postedAt?: string
  expiresAt?: string | null
  viewCount?: number
  applicationCount?: number
  acceptedCount: number
  rejectedCount: number
  pendingCount: number
  shortlistedCount: number
  // Absent on a backend older than df96861; the card hides the count then.
  withdrawnCount?: number
}

export interface EmployerDashboardJobsPage {
  jobs: EmployerDashboardJob[]
  pagination: JobsPagination
}

export interface RecentApplication {
  id: string
  applicant: {
    id: string
    name?: string | null
    email?: string
    phone?: string
    profilePhoto?: string | null
    location?: string | null
  }
  job: { id: string; title: string; category?: string; subcategory?: string | null }
  status: string
  message?: string | null
  appliedAt?: string
  reviewedAt?: string | null
}

// Candidate management (GET /api/applications/employer/all + /candidate/:id).
export interface CandidateSkill {
  id?: string
  skill?: { id?: string; name?: string }
}
export interface CandidateWorkExperience {
  id?: string
  position?: string
  // The BE column is `companyName` (and nullable); this was read as `company`, which never came.
  companyName?: string | null
  startDate?: string
  endDate?: string | null
}
// What an employer gets for an applicant: verified qualifications only — the BE never
// sends identity or address proof to employers (seeker-exposure.ts). The field is
// `type`, like every Document row (it was read as `documentType`, which never came).
export interface CandidateDocument {
  id?: string
  type?: 'EDUCATION_CERTIFICATE' | 'SKILL_CERTIFICATE'
  fileName?: string
  fileUrl?: string
  verified?: boolean
}
export interface EmployerApplicationItem {
  id: string
  status: string
  // The employer's private bookmark flag, independent of `status`. Toggled by
  // PUT /applications/:id/bookmark; the seeker-facing reads omit it.
  isBookmarked?: boolean
  appliedAt?: string
  message?: string | null
  jobSeeker?: {
    id: string
    fullName?: string | null
    location?: string | null
    profilePhoto?: string | null
    bio?: string | null
    /** Seeker-set badge. Absent on an older backend, so only a literal `true` counts. */
    isActivelyLooking?: boolean | null
    // Contact for the employer the seeker applied to; either can be null (phone-only or email-only seekers).
    user?: { email?: string | null; phoneNumber?: string | null }
    skills?: CandidateSkill[]
    workExperience?: CandidateWorkExperience[]
    documents?: CandidateDocument[]
    [key: string]: unknown
  } | null
  job?: { id: string; title: string; category?: string; subcategory?: string | null; jobType?: string; location?: string; status?: string }
  interview?: Interview | null
  [key: string]: unknown
}
// One row of GET /api/applications/employer/jobs: every job of the signed-in employer's
// organisation, whatever its status. The BE does not declare this shape (openapi says
// "not declared in code"), so it is read from the controller and checked on arrival.
export interface EmployerJobListItem {
  id: string
  title: string
  status?: string
  _count?: { applications?: number }
}

export interface EmployerApplicationsPage {
  applications: EmployerApplicationItem[]
  pagination: JobsPagination
}

// Chat / messaging (M8). senderId + readBy entries are User.id values.
// Chat is TEXT-only; SYSTEM messages are BE-generated (e.g. "interview scheduled").
// The BE enum still carries AUDIO/IMAGE for rows written before audio was removed
// from the product — the UI renders neither.
export type MessageType = 'TEXT' | 'AUDIO' | 'IMAGE' | 'SYSTEM'
export interface ChatMessage {
  id: string
  conversationId: string
  senderId: string
  type: MessageType
  content: string
  readBy?: string[]
  createdAt: string
}
export interface ConversationParty {
  id: string
  fullName?: string | null
  companyName?: string | null
  employerType?: string
  profilePhoto?: string | null
  // No email: the BE chat list stopped sending either party's email (data-minimisation, 16 Oct 2026).
  user?: { id: string }
}
export interface Conversation {
  id: string
  employer?: ConversationParty | null
  jobSeeker?: ConversationParty | null
  job?: { id: string; title: string; companyName?: string | null } | null
  lastMessage?: ChatMessage | null
  unreadCount?: number
  lastMessageAt?: string | null
  otherPartyLastSeenAt?: string | null
}
export interface MessagesPayload {
  conversationId: string
  job?: { id: string; title: string; companyName?: string | null } | null
  otherParty: { userId: string | null; lastSeenAt: string | null }
  messages: ChatMessage[]
}

// Employer registration is JSON-only for both types (docs are uploaded
// separately after approval per the 2026-05-13 split).
//
// Both register calls now require BOTH contacts to be verified up front and
// carry the password themselves; they create the account already-verified and
// return no token, so the caller logs in immediately afterwards. Email is
// mandatory for employers (unlike seekers).
export type CompanySize =
  | 'SIZE_1_10'
  | 'SIZE_11_50'
  | 'SIZE_51_200'
  | 'SIZE_201_500'
  | 'SIZE_501_1000'
  | 'SIZE_1000_PLUS'

export interface EmployerIndividualData {
  email: string // required + must already be verified
  password: string
  fullName: string
  phoneNumber: string // E.164, must already be verified
  designation?: string
  // R1-BE-03 — WhatsApp opt-in. Required, no default — see SeekerRegisterData.
  whatsappConsent: boolean
  // Terms of Use + Privacy Policy — see SeekerRegisterData.
  acceptTerms: true
}

export interface EmployerBusinessData {
  email: string // required + must already be verified
  password: string
  phoneNumber: string // E.164, must already be verified
  companyName: string
  companyEmail: string
  companyAddress: string
  companyFoundedDate: string // ISO date
  companySize: CompanySize
  gstNumber: string // exactly 15 chars
  registrationNumber: string
  // R1-BE-03 — WhatsApp opt-in. Required, no default — see SeekerRegisterData.
  whatsappConsent: boolean
  // Terms of Use + Privacy Policy — see SeekerRegisterData.
  acceptTerms: true
}

/**
 * `emailVerification` is GONE (the account is created already-verified).
 *
 * `accountStatus` is the branch point: individual → ACTIVE (trial credits are
 * granted here — 1 post / 3 downloads, 14 days); business → PENDING_DOCUMENTS
 * with no credits until an admin approves the uploaded documents.
 */
export interface EmployerRegisterResult {
  userId: string
  email: string
  phoneNumber?: string
  accountStatus: string
  emailVerified: boolean
  phoneVerified: boolean
  /**
   * The session, issued with the account.
   *
   * Registration used to end here and the client called login as a second step.
   * If that call failed — a network blip, a 500, or the login route's own rate
   * limiter — the account existed but the user was told registration had failed,
   * and the retry reported their own email as already taken.
   *
   * Optional so the portal can deploy ahead of the backend that serves it;
   * callers fall back to the explicit login when it is absent.
   */
  token?: string
  user?: AuthUser
}

export const employerAPI = {
  // Register an individual employer (JSON). POST /api/employers/register/individual.
  registerIndividual: async (data: EmployerIndividualData) => {
    return apiRequest<EmployerRegisterResult>('/employers/register/individual', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Register a business employer (JSON). POST /api/employers/register/business.
  registerBusiness: async (data: EmployerBusinessData) => {
    return apiRequest<EmployerRegisterResult>('/employers/register/business', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // setPassword REMOVED — POST /employers/set-password is deleted on the BE
  // (404), same reason as the seeker one. `password` ships with both register
  // calls above.

  // Login (email/password). Prefer authAPI.login for the new /login page.
  login: async (credentials: { identifier: string; password: string }) => {
    return authAPI.login('employer', credentials)
  },

  // Dashboard. GET /api/employers/dashboard/{stats,jobs,recent-applications}
  // All three are harmless reads, so they carry a time limit; `signal` lets the page
  // cancel one on unmount or when a retry replaces it.
  getDashboardStats: async (opts?: { signal?: AbortSignal }) => {
    return apiRequest<EmployerDashboardStats>('/employers/dashboard/stats', {
      signal: opts?.signal,
      timeoutMs: DASHBOARD_TIMEOUT_MS,
    })
  },
  getDashboardJobs: async (page = 1, limit = 10, opts?: { signal?: AbortSignal }) => {
    return apiRequest<EmployerDashboardJobsPage>(
      `/employers/dashboard/jobs?page=${page}&limit=${limit}`,
      { signal: opts?.signal, timeoutMs: DASHBOARD_TIMEOUT_MS }
    )
  },
  getRecentApplications: async (limit = 10, opts?: { signal?: AbortSignal }) => {
    return apiRequest<{ applications: RecentApplication[]; count: number }>(
      `/employers/dashboard/recent-applications?limit=${limit}`,
      { signal: opts?.signal, timeoutMs: DASHBOARD_TIMEOUT_MS }
    )
  },

  // Post a new job. POST /api/jobs → created Job.
  postJob: async (jobData: PostJobData) => {
    return apiRequest<Job>('/jobs', {
      method: 'POST',
      body: JSON.stringify(jobData),
    })
  },

  // Get employer's posted jobs. GET /api/jobs/employer/me/jobs?tab= → { jobs, pagination }
  // The BE splits jobs into five exclusive tabs (see EMPLOYER_JOB_TABS) — pending
  // review, active (live), inactive (paused), expired (paid window over; re-listing
  // costs 1 POST credit) and cancelled (rejected by an admin) — so the client does no
  // filtering. `tab` defaults to active, which is also what the BE serves when it is
  // omitted. An UNKNOWN tab is also served as active, so a client that sends a tab an
  // older BE does not know would show the Active list under the wrong heading.
  // `opts.search` is a title search done by the BE (case-insensitive, partial). It is
  // trimmed and left off the URL when blank, so clearing it serves the whole tab.
  // A harmless read, so it carries a time limit; `signal` lets the page cancel it.
  getMyJobs: async (page = 1, limit = 10, tab: EmployerJobTab = 'active', opts?: { signal?: AbortSignal; search?: string }) => {
    const qs = new URLSearchParams({ page: String(page), limit: String(limit), tab })
    const search = opts?.search?.trim()
    if (search) qs.set('search', search)
    return apiRequest<JobsPage>(`/jobs/employer/me/jobs?${qs}`, {
      signal: opts?.signal,
      timeoutMs: DASHBOARD_TIMEOUT_MS,
    })
  },

  // Update / delete job. PUT|DELETE /api/jobs/:id
  updateJob: async (jobId: string, jobData: Partial<UpdateJobData>) => {
    return apiRequest<Job>(`/jobs/${jobId}`, {
      method: 'PUT',
      body: JSON.stringify(jobData),
    })
  },
  // DELETE /api/jobs/:id → { refunded }. The BE refunds 1 POST credit iff the
  // job is <24h old with 0 applications (Phase I), so the FE can confirm it.
  deleteJob: async (jobId: string) => {
    return apiRequest<{ refunded: boolean }>(`/jobs/${jobId}`, {
      method: 'DELETE',
    })
  },

  // Activate / deactivate job. POST /api/jobs/:id/{activate,deactivate}
  activateJob: async (jobId: string) => {
    return apiRequest(`/jobs/${jobId}/activate`, { method: 'POST' })
  },
  deactivateJob: async (jobId: string) => {
    return apiRequest(`/jobs/${jobId}/deactivate`, { method: 'POST' })
  },

  // Applications for a specific job. GET /api/applications/job/:jobId
  getJobApplications: async (jobId: string) => {
    return apiRequest<JobApplication[]>(`/applications/job/${jobId}`)
  },

  // Candidate management — all applications across the employer's jobs.
  // GET /api/applications/employer/all → { applications, pagination }
  // `isBookmarked: true` filters to bookmarked only. The BE also accepts false,
  // but the portal has no use for it, so false here means "no filter".
  // The organisation's jobs, for a "which job is this filter?" lookup.
  // GET /api/applications/employer/jobs → { jobs }. Org-scoped on the BE (teammates see
  // the same list), unpaginated. A harmless read: time limit, and `signal` to cancel it.
  getEmployerJobsList: async (opts?: { signal?: AbortSignal }) => {
    return apiRequest<{ jobs: EmployerJobListItem[] }>('/applications/employer/jobs', {
      signal: opts?.signal,
      timeoutMs: DASHBOARD_TIMEOUT_MS,
    })
  },

  // A harmless read, so it carries a time limit; `signal` lets the page cancel it.
  getEmployerAllApplications: async (
    params: { page?: number; limit?: number; jobId?: string; status?: string; isBookmarked?: boolean; search?: string } = {},
    opts?: { signal?: AbortSignal }
  ) => {
    const qs = new URLSearchParams()
    qs.set('page', String(params.page ?? 1))
    qs.set('limit', String(params.limit ?? 20))
    if (params.jobId) qs.set('jobId', params.jobId)
    if (params.status) qs.set('status', params.status)
    if (params.isBookmarked) qs.set('isBookmarked', 'true')
    if (params.search) qs.set('search', params.search)
    return apiRequest<EmployerApplicationsPage>(`/applications/employer/all?${qs.toString()}`, {
      signal: opts?.signal,
      timeoutMs: DASHBOARD_TIMEOUT_MS,
    })
  },

  // Full candidate detail (employer-gated). GET /api/applications/candidate/:applicationId
  getCandidateDetails: async (applicationId: string) => {
    return apiRequest<EmployerApplicationItem>(`/applications/candidate/${applicationId}`)
  },

  // Update application status / accept / reject / bookmark.
  // PUT /api/applications/:id/{status,accept,reject,bookmark}
  updateApplicationStatus: async (applicationId: string, status: string) => {
    return apiRequest(`/applications/${applicationId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    })
  },
  acceptApplication: async (applicationId: string, body?: unknown) => {
    return apiRequest(`/applications/${applicationId}/accept`, {
      method: 'PUT',
      body: JSON.stringify(body ?? {}),
    })
  },
  rejectApplication: async (applicationId: string, body?: unknown) => {
    return apiRequest(`/applications/${applicationId}/reject`, {
      method: 'PUT',
      body: JSON.stringify(body ?? {}),
    })
  },
  toggleBookmark: async (applicationId: string) => {
    return apiRequest(`/applications/${applicationId}/bookmark`, {
      method: 'PUT',
    })
  },

  // Profile (PJP-112). GET /api/employers/profile → full user + nested employer.
  getProfile: async () => {
    return apiRequest<EmployerProfile>('/employers/profile')
  },

  // Update company profile. PUT /api/employers/profile (JSON). Changing
  // gstNumber/registrationNumber resets verificationStatus to PENDING on the BE.
  // NOTE: the BE returns the BARE updated Employer record (not the wrapped user
  // shape that GET returns), so callers should re-fetch getProfile() to refresh.
  updateProfile: async (data: EmployerProfileUpdate) => {
    return apiRequest<unknown>('/employers/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // Profile photo. POST /api/employers/me/profile-photo (multipart field `profilePic`).
  updateProfilePhoto: async (file: File) => {
    const fd = new FormData()
    fd.append('profilePic', await prepareUpload(file, 'profilePhoto'))
    return apiRequest<{ profilePhoto: string }>('/employers/me/profile-photo', {
      method: 'POST',
      body: fd,
    })
  },

  // Documents. GET/POST/DELETE /api/employers/me/documents[/:documentId].
  // DELETE enforces a min-1 invariant server-side (400 when removing the last doc).
  listDocuments: async () => {
    return apiRequest<UserDocument[]>('/employers/me/documents')
  },
  uploadDocument: async (file: File, type?: DocumentType) => {
    const fd = new FormData()
    fd.append('file', await prepareUpload(file, 'document'))
    if (type) fd.append('type', type)
    return apiRequest<UserDocument>('/employers/me/documents', { method: 'POST', body: fd })
  },
  deleteDocument: async (documentId: string) => {
    return apiRequest(`/employers/me/documents/${documentId}`, { method: 'DELETE' })
  },
}

// ==========================================
// SUBSCRIPTION / BILLING APIs (monetization Phase 1)
// ==========================================
//
// The employer credits model (functional-spec §2). Phase 1 surfaces:
//   • GET /api/plans                    — public plan catalog (pricing page)
//   • GET /api/employers/me/credits     — the wallet (PJP-178)
//   • POST /api/billing/checkout        — create Razorpay order (PJP-177)
//   • POST /api/billing/verify-payment  — client-side capture confirm (PJP-177)

export type PlanGroup = 'PACK' | 'STARTER' | 'PRO'

// A running price offer on a plan (e.g. the "Launch Offer", 10% off).
// `endsAt: null` = no end date.
export interface PlanOffer {
  id: string
  label: string
  percentOff: number
  endsAt: string | null
}

// One row from GET /api/plans. Prices are BASE (GST-exclusive); `gstPct` is 18
// and `totalInr` is the BE-computed base+GST. `listInr` is the normal price and
// `baseInr` what is actually charged before GST — the offer price when `offer`
// is set, else equal to `listInr`; `discountInr` = listInr - baseInr (0 = no
// offer). `durationDays: null` means a pack whose job posts never expire;
// `jobLiveDays` is how long each posted job stays live. `features` is a
// BE-authored English string[] (data, not UI chrome) — the pricing page renders
// the structured numeric fields instead so the card is fully translatable.
// The offer fields are optional because the portal may deploy ahead of the
// backend that sends them: treat `undefined` as "no offer" / "not known".
export interface Plan {
  code: string
  name: string
  group: PlanGroup
  listInr?: number
  baseInr: number
  discountInr?: number
  gstPct: number
  totalInr: number
  postCredits: number
  downloadCredits: number
  seats: number
  durationDays: number | null
  jobLiveDays?: number
  features?: string[]
  offer?: PlanOffer | null
}

// Employer credit wallet (GET /api/employers/me/credits). `expiresAt` is the
// wallet's single expiry = latest active subscription/trial lot's date (null
// when the balance is zero or only non-expiring pack credits remain).
// The route also carries the org's seat counts (`seatCap`, `seatsUsed`), the
// plan window, and the plans/products it holds (see HeldPlan / HeldProduct).
export interface Wallet {
  post: { balance: number; expiresAt: string | null }
  download: { balance: number; expiresAt: string | null }
  packNeverExpires: boolean
  /**
   * Live free-trial credits, per kind, with the TRIAL expiry — null when none
   * remain. Optional because the portal may deploy ahead of the backend that
   * serves these fields; every consumer must treat `undefined` as "no trial"
   * rather than render a half-true banner.
   */
  trial?: { postRemaining: number; downloadRemaining: number; expiresAt: string | null } | null
  /** A trial was granted at some point — spent or lapsed. True forever after. */
  trialGranted?: boolean
  /** The employer has ever bought a pack or subscription. */
  hasPurchased?: boolean
  /** Org-wide seat cap = MAX(seats) over the plans, NOT their sum. */
  seatCap: number
  /** Live members plus pending invites. */
  seatsUsed: number
  /** Latest expiry across the plans; null when none is running. */
  planExpiresAt: string | null
  /** Within the grace window after the last plan lapsed. */
  inGracePeriod: boolean
  /** Optional: the route is validated loosely, so a portal ahead of the BE reads `undefined` as none. */
  plans?: HeldPlan[]
  products?: HeldProduct[]
  role: 'OWNER' | 'MEMBER'
  seatStatus: 'ACTIVE' | 'SUSPENDED' | 'REMOVED'
}

// One subscription the employer holds, with its own dates. The route only lists
// unexpired, non-PACK subscriptions, newest expiry first. `postCredits` and
// `downloadCredits` are what the plan GRANTED, not what is left. Price is
// deliberately not sent (every seat reads this route).
export interface HeldPlan {
  subscriptionId: string
  name: string
  code: string
  group: PlanGroup
  billingPeriod: 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY' | 'LIFETIME'
  seats: number
  postCredits: number
  downloadCredits: number
  startedAt: string
  expiresAt: string
}

// A credit pack or the live free trial. `expiresAt: null` = never expires (a
// pack). A trial has `group: 'TRIAL'` and `code: null`.
export interface HeldProduct {
  name: string
  code: string | null
  group: PlanGroup | 'TRIAL'
  expiresAt: string | null
}

// POST /api/billing/checkout response — a created Razorpay order plus the GST
// breakdown to show the buyer. The FE opens Razorpay checkout with
// razorpayOrderId + keyId, then confirms via verify-payment. The offer is fixed
// when the order is created; `invoicePreview.baseInr` is the taxable value
// (listInr - discountInr). The four offer fields are optional for the same
// reason as on `Plan` — an older backend does not send them.
export interface CheckoutOrder {
  razorpayOrderId: string
  keyId: string
  amountInr: number // total incl. GST — what Razorpay charges
  currency: 'INR'
  invoicePreview: {
    listInr?: number
    discountInr?: number
    offerLabel?: string | null
    offerPercent?: number | null
    baseInr: number
    cgstInr: number
    sgstInr: number
    igstInr: number
    totalInr: number
    placeOfSupply: string
    isIntraState: boolean
    gstin: string | null
  }
  paymentHistoryId: string
}

// POST /api/billing/verify-payment result. `status:'ok'` granted credits now;
// `status:'skipped'` means the webhook already processed this payment (also
// success from the user's view — credits are in the wallet either way).
export interface VerifyPaymentResult {
  status: 'ok' | 'skipped'
  reason?: string
  granted?: { post: number; download: number }
  subscriptionId?: string | null
  paymentHistoryId?: string
}

export interface CheckoutInput {
  planCode: string
  gstin?: string
  placeOfSupply?: string
  // Buyer address printed on the GST invoice. Sent only with a gstin; trimmed, 5-500 chars.
  billingAddress?: string
}

export interface VerifyPaymentInput {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

export const subscriptionAPI = {
  // Public plan catalog. GET /api/plans → Plan[] (no auth required).
  // `fresh` bypasses and replaces the browser's cached copy (the BE sends
  // max-age=60); 'reload', not 'no-store', so later cached reads see the new prices.
  // Only for re-reading prices after checkout found a change.
  getPlans: async ({ fresh = false }: { fresh?: boolean } = {}) => {
    return apiRequest<Plan[]>('/plans', fresh ? { cache: 'reload' } : {})
  },

  // Employer credit wallet. GET /api/employers/me/credits (auth: employer).
  getCredits: async () => {
    return apiRequest<Wallet>('/employers/me/credits')
  },

  // Create a Razorpay order for a plan. POST /api/billing/checkout (auth: employer).
  checkout: async (input: CheckoutInput) => {
    return apiRequest<CheckoutOrder>('/billing/checkout', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  // Confirm a captured payment (client-side path). POST /api/billing/verify-payment.
  // Verifies the Razorpay signature server-side, then grants credits (idempotent
  // with the webhook). Called from Razorpay checkout's handler(response).
  verifyPayment: async (input: VerifyPaymentInput) => {
    return apiRequest<VerifyPaymentResult>('/billing/verify-payment', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  // GST invoice history. GET /api/employers/me/invoices (auth: employer).
  getInvoices: async (page = 1, limit = 20) => {
    return apiRequest<InvoicesPage>(`/employers/me/invoices?page=${page}&limit=${limit}`)
  },

  // Fetch an invoice PDF as a Blob. GET /api/employers/me/invoices/:id/pdf.
  fetchInvoicePdf: async (id: string): Promise<Blob> => {
    return apiRequest<Blob>(`/employers/me/invoices/${id}/pdf`, { asBlob: true })
  },

  // The org's credit statement — every POST/DOWNLOAD movement, newest first.
  // GET /api/employers/me/credits/history (auth: employer, OWNER seat only —
  // a MEMBER seat gets 403 ApiError with code 'NOT_OWNER'; every seat can still
  // see the balance via getCredits above).
  getCreditHistory: async (params: CreditHistoryParams = {}) => {
    const qs = new URLSearchParams()
    qs.set('page', String(params.page ?? 1))
    qs.set('limit', String(params.limit ?? 20))
    if (params.kind) qs.set('kind', params.kind)
    if (params.from) qs.set('from', params.from)
    if (params.to) qs.set('to', params.to)
    return apiRequest<CreditHistoryPage>(`/employers/me/credits/history?${qs.toString()}`)
  },
}

export interface CreditHistoryParams {
  page?: number
  limit?: number
  kind?: 'POST' | 'DOWNLOAD'
  from?: string // yyyy-mm-dd
  to?: string // yyyy-mm-dd
}

// One credit-ledger row. `label` is a server-built, human-readable description
// ("Posted Delivery Executive") — render it, don't try to derive one from
// `reason` yourself. `ref`/`actor` are null wherever the entry has neither (a
// purchase, a trial grant, an expiry all carry no job/candidate and no actor).
export interface CreditHistoryEntry {
  at: string
  kind: 'POST' | 'DOWNLOAD'
  delta: number
  reason: string
  label: string
  ref: { type: 'job' | 'candidate'; id: string; name: string | null } | null
  actor: { userId: string; name: string | null } | null
}
export interface CreditHistoryPage {
  entries: CreditHistoryEntry[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

// GST invoice (list row). Amounts are floats; cgst+sgst (intra-state) OR igst
// (inter-state) is populated, not both. `number` is "INV/YY-YY/NNNNNN".
// `baseInr` is the taxable value. `listInr` is null when the invoice had no
// discount; `discountLabel` reads like "Launch Offer (10% off)". All three are
// optional: an older backend does not send them.
export interface Invoice {
  id: string
  number: string
  description: string
  gstin: string | null
  placeOfSupply: string
  listInr?: number | null
  discountInr?: number
  discountLabel?: string | null
  baseInr: number
  cgstInr: number
  sgstInr: number
  igstInr: number
  totalInr: number
  createdAt: string
}
export interface InvoicesPage {
  items: Invoice[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

// ==========================================
// TAXONOMY APIs (3-level Category → Sector → JobTitle)
// ==========================================
//
// The seeded taxonomy tree from GET /api/categories (public). Every consumer —
// seeker registration (PJP-81), employer JobForm (PJP-106), job-feed filter
// (PJP-138), profile edit (PJP-112) — sends a `{ category, sector, jobTitle }`
// triple of NAMES. The BE `validateTriple` enforces allowlist membership +
// parent-child consistency, so the FE must build the triple from this tree.

export type EmploymentType = 'SKILLED' | 'UNSKILLED' | 'TECHNICAL' | 'NON_TECHNICAL'
export type JobTitleScope = 'SECTOR_LOCKED' | 'PORTABLE'

export interface TaxonomyJobTitle {
  name: string
  employmentType: EmploymentType
  scope: JobTitleScope
}
export interface TaxonomySector {
  name: string
  jobTitles: TaxonomyJobTitle[]
}
export interface TaxonomyCategory {
  name: string
  sectors: TaxonomySector[]
}

// The picked value shared by every taxonomy consumer. Empty levels are
// `undefined` (not '') so callers can spread it straight into a request body.
export interface TaxonomyTriple {
  category?: string
  sector?: string
  jobTitle?: string
}

export const taxonomyAPI = {
  // Public taxonomy tree. GET /api/categories → TaxonomyCategory[].
  getCategories: async () => {
    return apiRequest<TaxonomyCategory[]>('/categories')
  },
}

// ==========================================
// LOCATION APIs (states + cities)
// ==========================================
//
// Public, no JWT. Shapes are the BE's, read from taxonomy.validator.ts at backend
// 34a534a — do not add fields here that the BE does not send (a city carries no
// state code; only the nearest-city lookup carries the state, and only its name).

/** One state or union territory. `code` is the LGD state code. */
export interface LocationState {
  code: number
  name: string
}

/**
 * One selectable city of a state. Towns that belong to a larger city (Whitefield →
 * Bengaluru) are not listed; the BE resolves them to the parent on save.
 */
export interface LocationCity {
  id: string
  name: string
}

/** A city as the BE embeds it elsewhere (nearest lookup, profiles, job `cities`). */
export interface LocationCitySummary {
  id: string
  name: string
  latitude: number
  longitude: number
  state: { name: string }
}

export interface NearestCityResult {
  /** null: the point is outside India, at sea, or `accuracy` was worse than 2000 m. */
  city: LocationCitySummary | null
}

export const locationAPI = {
  // GET /api/locations/states → LocationState[] (36 rows, sorted by name).
  getStates: async (opts: { signal?: AbortSignal } = {}) => {
    return apiRequest<LocationState[]>('/locations/states', { signal: opts.signal })
  },

  // GET /api/locations/cities?state=<code> → LocationCity[] (sorted by name). An
  // unknown code is a 200 with []; Lakshadweep (31) also has none.
  getCities: async (stateCode: number, opts: { signal?: AbortSignal } = {}) => {
    return apiRequest<LocationCity[]>(`/locations/cities?state=${encodeURIComponent(String(stateCode))}`, {
      signal: opts.signal,
    })
  },

  // GET /api/locations/nearest?lat=&lng=[&accuracy=metres] → { city | null }.
  // `accuracy` is the browser's `coords.accuracy`; the BE ignores a reading worse
  // than 2000 m. Omit it when unknown rather than sending 0.
  //
  // The BE takes plain decimals only (taxonomy.validator.ts: lat/lng
  // /^-?\d{1,3}(\.\d+)?$/, |lat| <= 90, |lng| <= 180; accuracy /^\d+(\.\d+)?$/).
  // A NaN, an Infinity or an out-of-range value is refused here instead of costing
  // a 400, and a number JS would print in exponent form ("1e-7") is written out in
  // full. The value itself is sent as given, not rounded.
  getNearestCity: async (
    params: { lat: number; lng: number; accuracy?: number },
    opts: { signal?: AbortSignal } = {}
  ) => {
    const { lat, lng, accuracy } = params
    if (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180) {
      throw new RangeError('getNearestCity needs a latitude within ±90 and a longitude within ±180')
    }
    const plain = (n: number) => (/e/i.test(String(n)) ? n.toFixed(20) : String(n))
    const qs = new URLSearchParams({ lat: plain(lat), lng: plain(lng) })
    if (accuracy !== undefined && Number.isFinite(accuracy) && accuracy >= 0) {
      // Anything past 2000 m is ignored by the BE alike, so the cap only keeps a
      // huge reading out of exponent form.
      qs.set('accuracy', String(Math.min(Math.round(accuracy), 1_000_000)))
    }
    return apiRequest<NearestCityResult>(`/locations/nearest?${qs.toString()}`, { signal: opts.signal })
  },
}

// ==========================================
// CANDIDATE DATABASE APIs (Phase 2 — search + unlock)
// ==========================================
//
// Employers search the seeker pool (FTS), see snippet results (no contact), and
// spend 1 DOWNLOAD credit to unlock a candidate's full profile + contact. Unlock
// is idempotent server-side (re-viewing an unlocked candidate is free).

export interface CandidateSkillLink {
  skill: { id: string; name: string; category: string }
}
export interface CandidateExperience {
  position: string
  companyName: string | null
  startDate: string
  endDate: string | null
  currentlyWorking: boolean
}

/**
 * One of a seeker's preferred work cities, as an EMPLOYER sees it (BE CITY_NAME_LIST): names
 * only, no coordinates, alphabetical, at most 3. The seeker sets them; an employer cannot.
 * These replaced `location` (the seeker's home text, no longer sent to employers) on the
 * search, candidate and unlocked views.
 */
export interface PreferredCity {
  city: { id: string; name: string; state: { name: string } }
}

// A search-result snippet — NEVER includes contact (email/phone).
export interface WorkerSnippet {
  id: string
  fullName: string
  profilePhoto: string | null
  bio: string
  preferredSector: string | null
  preferredJobTitle: string | null
  // Empty for a seeker who has not set any (every existing one, until they do).
  preferredCities: PreferredCity[]
  isActivelyLooking?: boolean
  // Already unlocked by this employer.
  unlocked?: boolean
  // Only with `nearCityId`: km from that city to the seeker's nearest city; null if they have none.
  distanceKm?: number | null
  createdAt: string
  relevanceScore: number
  skills: CandidateSkillLink[]
  workExperience: CandidateExperience[]
}
export interface WorkerSearchPage {
  jobSeekers: WorkerSnippet[]
  pagination: JobsPagination
}

// Full candidate profile. Contact fields (email, phoneNumber, unlockedAt) are present
// ONLY when `unlocked` is true (i.e. this employer has spent a DOWNLOAD credit). Date
// of birth, gender and coordinates are never sent to an employer, unlocked or not.
export interface CandidateProfile {
  id: string
  fullName: string
  profilePhoto: string | null
  bio: string
  preferredCities: PreferredCity[]
  preferredCategory: string | null
  preferredSector: string | null
  preferredJobTitle: string | null
  // Already false for a seeker who is deleted or suspended (the BE folds `available` in).
  isActivelyLooking?: boolean
  createdAt: string
  skills: CandidateSkillLink[]
  workExperience: CandidateExperience[]
  // False once the seeker is deleted or suspended; only an employer who already unlocked them
  // still gets the row. Absent on an older backend, so only a literal `false` counts.
  available?: boolean
  // unlocked-only. Both are null when `available` is false, and either can be null for a
  // phone-only or email-only seeker.
  email?: string | null
  phoneNumber?: string | null
  unlockedAt?: string
}
export interface CandidateProfileResult {
  unlocked: boolean
  profile: CandidateProfile
}
export interface UnlockResult {
  alreadyUnlocked: boolean
  unlockId: string
  profile: CandidateProfile
}

// A candidate the employer has already unlocked (paid for). Re-viewing is free — the
// DOWNLOAD credit was spent. Contact is present unless `available` is false.
export interface UnlockedCandidate {
  id: string
  fullName: string
  profilePhoto: string | null
  bio: string
  preferredCities: PreferredCity[]
  preferredCategory: string | null
  preferredSector: string | null
  preferredJobTitle: string | null
  // Already false for a seeker who is deleted or suspended (the BE folds `available` in).
  isActivelyLooking?: boolean
  createdAt: string
  skills: CandidateSkillLink[]
  workExperience: CandidateExperience[]
  // NULLABLE — `User.email` is `String?` in Prisma and candidate.service passes
  // it straight through, so a phone-only seeker unlocks with no email at all.
  // The phone is the guaranteed contact, which is what the employer paid for.
  // Both are null when `available` is false (the seeker left; the row stays as the receipt).
  email: string | null
  phoneNumber: string | null
  // Only a literal `false` means unavailable (absent on an older backend).
  available?: boolean
  unlockedAt: string
}
export interface UnlockedCandidatesPage {
  unlockedCandidates: UnlockedCandidate[]
  pagination: JobsPagination
}

export interface WorkerSearchParams {
  search: string // required, 2–200 chars
  preferredSector?: string
  // Free text, matched against the seeker's home location text. Independent of the city filters.
  location?: string
  // Seekers whose home city or a preferred city is this city / in this state (BE
  // jobseeker-search.validator.ts). `cityId` wins over `stateCode`, so only one is ever sent.
  cityId?: string
  stateCode?: number
  // List the matches nearest this city first; each row then carries `distanceKm`.
  nearCityId?: string
  page?: number
  limit?: number
}

export const candidateAPI = {
  // FTS worker search (snippets only). GET /api/employers/search/workers.
  searchWorkers: async (params: WorkerSearchParams) => {
    const qs = new URLSearchParams()
    qs.set('search', params.search)
    if (params.preferredSector) qs.set('preferredSector', params.preferredSector)
    if (params.location) qs.set('location', params.location)
    // Never both: the BE ignores `stateCode` when `cityId` is present, so sending both would
    // only describe a filter that is not the one applied.
    if (params.cityId) qs.set('cityId', params.cityId)
    else if (params.stateCode !== undefined) qs.set('stateCode', String(params.stateCode))
    if (params.nearCityId) qs.set('nearCityId', params.nearCityId)
    qs.set('page', String(params.page ?? 1))
    qs.set('limit', String(params.limit ?? 10))
    return apiRequest<WorkerSearchPage>(`/employers/search/workers?${qs.toString()}`)
  },

  // Candidate profile (snippet when locked, full + contact when unlocked).
  // GET /api/employers/candidates/:jobSeekerId.
  getCandidate: async (jobSeekerId: string) => {
    return apiRequest<CandidateProfileResult>(`/employers/candidates/${jobSeekerId}`)
  },

  // Spend 1 DOWNLOAD credit to unlock. POST /api/employers/candidates/:id/unlock.
  // Idempotent: re-unlocking returns alreadyUnlocked with no second charge.
  // 402 { kind: 'DOWNLOAD' } at zero balance.
  unlockCandidate: async (jobSeekerId: string) => {
    return apiRequest<UnlockResult>(`/employers/candidates/${jobSeekerId}/unlock`, {
      method: 'POST',
    })
  },

  // The employer's already-unlocked candidates (paid history, contact shown),
  // newest first. GET /api/employers/me/unlocked-candidates.
  // `search` is one term the BE matches against name, email, phone and job title
  // (max 200 characters, else 400); left out when blank.
  getUnlockedCandidates: async (params?: { page?: number; limit?: number; search?: string }) => {
    const qs = new URLSearchParams()
    qs.set('page', String(params?.page ?? 1))
    qs.set('limit', String(params?.limit ?? 12))
    const search = params?.search?.trim()
    if (search) qs.set('search', search)
    return apiRequest<UnlockedCandidatesPage>(`/employers/me/unlocked-candidates?${qs.toString()}`)
  },
}

// ==========================================
// TEAM SEATS APIs (rewritten 2026-07-12 against the rebuilt BE seat contract —
// MONETIZATION.md §6.2/§6.3)
// ==========================================
//
// A seat is a real ORG MEMBERSHIP, not a roster row: an accepted teammate acts
// FOR the company — same wallet, same jobs, same unlocks. So the roster has two
// distinct populations, and they must not be conflated:
//
//   members[] — people who ALREADY hold a seat (incl. the OWNER). Their id is an
//               EmployerUser (membership) id. Status is ACTIVE | SUSPENDED |
//               REMOVED — never 'PENDING'.
//   invites[] — outstanding PENDING invitations. Nobody is behind them yet;
//               their id is an EmployerInvite id. They still CONSUME a seat.
//
// Removing a member and revoking an invite are different endpoints keyed on
// different ids (see removeMember vs revokeInvite) — crossing them 404s.
//
// SUSPENDED is not an error state: when a bigger plan lapses and the seat cap
// drops, the BE auto-suspends over-cap members newest-invited-first (the OWNER
// is always protected). They keep read access but are blocked from posting or
// unlocking, and auto-restore if the cap rises again.

export type TeamMemberRole = 'OWNER' | 'MEMBER'
export type TeamMemberStatus = 'ACTIVE' | 'SUSPENDED' | 'REMOVED'

/** A held seat. `id` is the MEMBERSHIP id — what DELETE /me/team/:seatId takes. */
export interface TeamMember {
  id: string
  userId: string
  email: string
  name: string | null
  role: TeamMemberRole
  status: TeamMemberStatus
  invitedAt: string
  acceptedAt: string | null
  removedAt: string | null
}

/** An outstanding invitation. `id` is the INVITE id — what DELETE /me/team/invites/:inviteId takes. */
export interface TeamInvite {
  id: string
  email: string
  status: 'PENDING'
  expiresAt: string
  invitedAt: string
}

export interface TeamSummary {
  seatCap: number
  seatsTotal: number // === seatCap; kept because the BE sends both
  seatsUsed: number // members + pending invites
  seatsFree: number
  planExpiresAt: string | null
  owner: { id: string; userId: string; email: string } | null
  /** Includes the OWNER row. Filter on `role`/`status` — do not assume index 0. */
  members: TeamMember[]
  invites: TeamInvite[]
  /** Who is asking — lets the FE render the owner-vs-member view with no second call. */
  me: { userId: string; role: TeamMemberRole; seatStatus: TeamMemberStatus }
}

/**
 * GET /api/employers/me/entitlements — seat cap + plan window, plus who's
 * asking (`role`/`seatStatus`). Any seat may read it (same gating as
 * `/me/team`), but unlike `TeamSummary` it carries no roster — no member
 * names/emails, no invite tokens — so prefer this over `teamAPI.getTeam()`
 * for anything that only needs to know the caller's own role.
 */
export interface EmployerEntitlements {
  employerId: string
  seatCap: number
  seatsUsed: number
  members: number
  pendingInvites: number
  seatsFree: number
  planExpiresAt: string | null
  hasActivePlan: boolean
  inGracePeriod: boolean
  role: TeamMemberRole
  seatStatus: TeamMemberStatus
}

export interface InviteResult {
  inviteId: string
  email: string
  /**
   * The RAW invite token — returned exactly once, at creation. The BE stores only
   * its SHA-256 hash, so it can never be read back: if this value is lost, the
   * only recovery is to re-invite. Never log it.
   */
  token: string
  expiresAt: string
}
export interface AcceptInviteResult {
  membershipId: string
  employerId: string
  role: TeamMemberRole
}

/**
 * The PUBLIC preview of an invite, for the /invite/:token landing page. The
 * invitee has no account (let alone a JWT) when they first click the link, so
 * this is deliberately unauthenticated — holding the token IS the authorization.
 *
 * It exposes nothing beyond the address the invite was already sent to and the
 * company that sent it. `accountExists` only tells the FE whether to route the
 * invitee to sign-in or to registration.
 */
export interface InvitePeek {
  email: string
  companyName: string | null
  expiresAt: string
  accountExists: boolean
}

export const teamAPI = {
  // GET /api/employers/me/team — seat usage + roster. Any seat may read it.
  getTeam: async () => {
    return apiRequest<TeamSummary>('/employers/me/team')
  },

  // GET /api/employers/me/entitlements — seat cap + plan window + the
  // caller's own role/seatStatus, no roster. Any seat may read it (same
  // gating as /me/team). Prefer this over getTeam() when only `role` is
  // needed — it's the lighter call.
  getEntitlements: async () => {
    return apiRequest<EmployerEntitlements>('/employers/me/entitlements')
  },

  // POST /api/employers/me/team/invite — owner only. 201 + the one-shot raw token.
  // 402 when the plan has no free seat; 400 self-invite / seeker email / already
  // on the team; 409 when the invitee already runs a real workspace of their own.
  invite: async (email: string) => {
    return apiRequest<InviteResult>('/employers/me/team/invite', {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  },

  // GET /api/employers/team/invites/:token — PUBLIC (no JWT). Powers the
  // /invite/:token landing page. 404 when the token is unknown, already used or
  // expired; IP-rate-limited by the BE against token guessing.
  peekInvite: async (token: string) => {
    return apiRequest<InvitePeek>(`/employers/team/invites/${encodeURIComponent(token)}`)
  },

  // POST /api/employers/team/accept-invite — the INVITEE's own employer JWT plus
  // the raw token. The invite is email-bound: a different account gets a 403.
  acceptInvite: async (token: string) => {
    return apiRequest<AcceptInviteResult>('/employers/team/accept-invite', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
  },

  // DELETE /api/employers/me/team/:membershipId — owner only. Removes an ACCEPTED
  // teammate. SOFT revoke: their jobs stay live, their unlocks stay unlocked,
  // nothing is refunded. Takes a MEMBERSHIP id (TeamMember.id) — passing an
  // invite id here 404s. To cancel an invitation use revokeInvite.
  removeMember: async (membershipId: string) => {
    return apiRequest<{ membershipId: string; seatId: string }>(
      `/employers/me/team/${membershipId}`,
      { method: 'DELETE' }
    )
  },

  // DELETE /api/employers/me/team/invites/:inviteId — owner only. Cancels a
  // PENDING invitation and frees the seat it was holding, killing its token.
  // Takes an INVITE id (TeamInvite.id) — passing a membership id here 404s.
  revokeInvite: async (inviteId: string) => {
    return apiRequest<{ inviteId: string }>(`/employers/me/team/invites/${inviteId}`, {
      method: 'DELETE',
    })
  },
}

// ==========================================
// CHAT / MESSAGING APIs (M8 — polling-based)
// ==========================================
export const chatAPI = {
  // GET /api/conversations → list (with lastMessage, unreadCount, otherPartyLastSeenAt).
  getConversations: async () => {
    return apiRequest<Conversation[]>('/conversations')
  },

  // GET /api/conversations/unread-count → { count } (the Mail icon badge).
  unreadCount: async () => {
    return apiRequest<{ count: number }>('/conversations/unread-count')
  },

  // POST /api/conversations → start or return the existing conversation.
  startConversation: async (recipientId: string, jobId?: string) => {
    return apiRequest<Conversation>('/conversations', {
      method: 'POST',
      body: JSON.stringify({ recipientId, ...(jobId ? { jobId } : {}) }),
    })
  },

  // GET /api/conversations/:id/messages?after=<msgId> → incremental polling payload.
  getMessages: async (conversationId: string, after?: string) => {
    const qs = after ? `?after=${encodeURIComponent(after)}` : ''
    return apiRequest<MessagesPayload>(`/conversations/${conversationId}/messages${qs}`)
  },

  // POST /api/conversations/:id/messages (TEXT — JSON).
  sendTextMessage: async (conversationId: string, content: string) => {
    return apiRequest<ChatMessage>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ type: 'TEXT', content }),
    })
  },

  // PATCH /api/messages/:id/read — mark one message read by the current user.
  markMessageRead: async (messageId: string) => {
    return apiRequest(`/messages/${messageId}/read`, { method: 'PATCH' })
  },
}

// ==========================================
// NOTIFICATIONS (PJP-111 — in-app bell)
// ==========================================

// Mirrors the BE NotificationType enum. `entityId` points at the row the
// notification is about (application / interview / document) — the type decides
// how to route it.
export type NotificationType =
  | 'APPLICATION_SUBMITTED'
  | 'APPLICATION_ACCEPTED'
  | 'APPLICATION_REJECTED'
  | 'APPLICATION_SHORTLISTED'
  | 'INTERVIEW_SCHEDULED'
  | 'DOCUMENT_VERIFIED'
  | 'DOCUMENT_REJECTED'
  | 'PROFILE_APPROVED'
  | 'PROFILE_REJECTED'
  | 'ADMIN_WARNING'
  | 'ADMIN_PAYMENT_REMINDER'
  | 'JOB_APPROVED'
  | 'JOB_REJECTED'
  | 'JOB_PENDING_REVIEW'
  | 'SYSTEM'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string
  entityId?: string | null
  read: boolean
  createdAt: string
}

export interface NotificationsPayload {
  items: AppNotification[]
  unreadCount: number
}

export const notificationAPI = {
  // GET /api/notifications?limit=&unreadOnly= → { items, unreadCount }.
  // BE caps `limit` at 100 and returns newest-first; there is no pagination.
  list: async (params: { limit?: number; unreadOnly?: boolean } = {}) => {
    const { limit = 20, unreadOnly = false } = params
    return apiRequest<NotificationsPayload>(
      `/notifications?limit=${limit}&unreadOnly=${unreadOnly}`
    )
  },

  // GET /api/notifications/unread-count → { count } (the bell badge).
  unreadCount: async () => {
    return apiRequest<{ count: number }>('/notifications/unread-count')
  },

  // PATCH /api/notifications/:id/read
  markRead: async (id: string) => {
    return apiRequest<AppNotification>(`/notifications/${id}/read`, { method: 'PATCH' })
  },

  // PATCH /api/notifications/read-all → { count }
  markAllRead: async () => {
    return apiRequest<{ count: number }>('/notifications/read-all', { method: 'PATCH' })
  },
}

// TODO(thread-b): admin client (adminAPI) intentionally NOT defined here — the
// admin console is moving to the standalone `prosiddhi-admin` repo (2026-06-08).
// If the admin-removal thread touches this file, this marker is the seam.

// Export everything
const api = {
  authAPI,
  meAPI,
  otpAPI,
  emailOtpAPI,
  jobSeekerAPI,
  employerAPI,
  subscriptionAPI,
  taxonomyAPI,
  locationAPI,
  candidateAPI,
  teamAPI,
  chatAPI,
  notificationAPI,
}

export default api
