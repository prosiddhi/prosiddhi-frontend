import type { SupportedLanguage } from '@/i18n/languages'

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
// and performs logout + redirect, keeping this module framework-free.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

// localStorage keys — single source of truth, shared with AuthContext.
export const AUTH_TOKEN_KEY = 'auth_token'
export const AUTH_USER_KEY = 'auth_user'

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

/**
 * Resolve a BE-relative upload path (e.g. `/uploads/applications/x.webm`) to an
 * absolute URL. Static uploads are served off the server ORIGIN, not under the
 * `/api` base, so we strip a trailing `/api` from API_BASE_URL. Absolute URLs
 * (http...) and empty values pass through unchanged.
 */
export function resolveMediaUrl(path?: string | null): string {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  const origin = API_BASE_URL.replace(/\/api\/?$/, '')
  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`
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

  constructor(
    message: string,
    status: number,
    reason?: string,
    errors?: ApiFieldError[],
    code?: string,
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.reason = reason
    this.errors = errors
    this.code = code
    this.details = details
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

// Helper function for API requests. Returns the unwrapped `.data` payload.
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
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
  const token = getAuthToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const config: RequestInit = {
    ...options,
    headers,
  }

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

  if (response.status === 401) {
    // Centralized auth-expiry handling. Clear storage and let AuthContext react.
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(AUTH_TOKEN_KEY)
      window.localStorage.removeItem(AUTH_USER_KEY)
      window.dispatchEvent(new CustomEvent('auth:unauthorized'))
    }
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
      details
    )
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
  [key: string]: unknown
}

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

// GET /jobseekers/profile — full user + nested jobSeeker. NOTE: the BE also
// returns `user.password` (the hash — filed as BR-8) — intentionally omitted
// here so it can never be read/stored on the FE.
export interface SeekerProfile {
  id: string
  /** NULL for a phone-only seeker — email is optional at registration. */
  email: string | null
  phoneNumber?: string | null
  role: UserRole
  accountStatus?: string
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
    /** BR-1 — captured at registration; not editable from the profile form. */
    dateOfBirth?: string | null
    gender?: 'MALE' | 'FEMALE' | 'OTHER' | null
    preferredCategory?: string | null
    preferredSector?: string | null
    preferredJobTitle?: string | null
    /** Admin-reviewed rollup across the seeker's uploaded documents (not per-document). */
    documentVerificationStatus?: 'NOT_SUBMITTED' | 'PENDING' | 'VERIFIED' | 'REJECTED' | null
    skills?: JobSeekerSkillLink[]
    workExperience?: ProfileWorkExperience[]
    documents?: UserDocument[]
    updatedAt?: string
  } | null
}

// GET /employers/profile — full user + nested employer.
export interface EmployerProfile {
  id: string
  email: string
  phoneNumber?: string | null
  role: UserRole
  accountStatus?: string
  emailVerified?: boolean
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

export const authAPI = {
  // Email+password OR phone+otp login. Role selects the endpoint.
  login: async (role: LoginRole, credentials: LoginCredentials) => {
    return apiRequest<LoginResult>(loginEndpoint(role), {
      method: 'POST',
      body: JSON.stringify(credentials),
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
  // REGISTRATION-purpose one that login will not accept. The response shape is
  // deliberately NOT shared with OtpSendResult: `expiresIn` is a number here
  // (10) and a string there ("10 minutes").
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
    })
  },

  // Bind / change the phone on the logged-in account (used by the post-Google
  // phone-verification step). Authenticated — relies on the JWT already stored
  // by login(). One-shot verify+update: BE checks `otp` against `newPhoneNumber`
  // and flips PENDING_OTP_VERIFICATION → ACTIVE. POST /api/auth/change-phone.
  changePhone: async (newPhoneNumber: string, otp: string) => {
    return apiRequest('/auth/change-phone', {
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

  // Reset password with the FORGOT_PASSWORD email OTP. POST /api/auth/reset-password.
  // Pair with emailOtpAPI.send(email, 'FORGOT_PASSWORD') then verify.
  resetPassword: async (email: string, otp: string, newPassword: string) => {
    return apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, newPassword }),
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

// Current-user (role-agnostic) endpoints — /api/me/*
// Imported from i18n/languages (plain data, no side effects) rather than i18n/config,
// which would boot react-i18next just by being imported here.
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
}

// Phone OTP (registration / generic) — POST /api/otp/{send,verify}

// In NON-PRODUCTION the BE echoes the OTP in the send response so QA can complete
// a flow without a real SMS gateway (MSG91 is not wired yet). It is absent in prod.
export interface OtpSendResult {
  phoneNumber: string
  otp?: string
  expiresIn?: string
}

/**
 * POST /auth/login-phone-send. Same idea, DIFFERENT shape — `expiresIn` is the
 * number 10, not the string "10 minutes". Kept separate on purpose so nothing
 * grows a shared parser that silently mis-renders one of them.
 */
export interface PhoneLoginSendResult {
  otp?: string
  expiresIn?: number
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
export type EmailOtpPurpose = 'REGISTRATION' | 'CHANGE_EMAIL' | 'FORGOT_PASSWORD'

// `otp` is echoed in non-production only; absent in production. Never make a
// flow depend on it.
export interface EmailOtpSendResult {
  otp?: string
  expiresIn?: number | string
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
 * ⚠️ Registration business errors carry NO machine-readable discriminator in
 * production — `sendError()` omits the `error` field entirely there and these
 * paths pass no `code`. All we get is the HTTP status plus `message`, so this
 * matches on the known message set. That is fragile by construction: if the BE
 * rewords one of these strings, the branch degrades to `unknown` and the raw
 * message is shown. Recorded as a known limitation; a `code` on these responses
 * is a future BE ticket, not something to paper over here.
 *
 * Field-level errors are the exception — `errors[].path` DOES survive prod, so
 * they are checked first and are reliable.
 */
export type RegisterFailure =
  /**
   * "Phone number must be verified before registration."
   *
   * THREE different causes collapse into this one message: the phone was never
   * verified, the verification was already consumed by an earlier register
   * (marks are single-use), or the phone belongs to an existing account whose
   * mark is gone. They are indistinguishable to us — so the only safe response
   * is to send the user back to re-verify their phone. Never auto-retry the
   * register call, and never claim "phone already in use": two of the three
   * causes would make that a lie.
   */
  | { kind: 'phoneUnverified' }
  /** Email was supplied but not verified under purpose REGISTRATION. */
  | { kind: 'emailUnverified' }
  /** Another account already owns this email — a clear, actionable message. */
  | { kind: 'emailTaken' }
  /**
   * Another account already owns this phone. Only reachable when the phone
   * verification succeeded, which is why it is distinguishable from the
   * collapsed case above — when it does surface it is unambiguous.
   */
  | { kind: 'phoneTaken' }
  /** Zod field failures, keyed by field name; one field may carry several. */
  | { kind: 'fields'; fields: Record<string, string[]> }
  | { kind: 'unknown'; message: string }

export function classifyRegisterError(err: unknown): RegisterFailure {
  const fields = fieldErrorsByPath(err)
  if (Object.keys(fields).length) return { kind: 'fields', fields }

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
    if (data.profilePic) fd.append('profilePic', data.profilePic)
    if (data.document) fd.append('document', data.document)
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
    return apiRequest<{ hasApplied: boolean; jobId: string }>(`/applications/check/${jobId}`)
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
    fd.append('profilePic', file)
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
    fd.append('file', file)
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
// category/location/jobType` are required server-side; the rest are optional.
export interface PostJobData {
  title: string
  description: string
  // BR-3 — 3-level taxonomy. `category` required (BE), `sector`/`jobTitle`
  // optional; when sent they must form a valid path (BE validateTriple).
  category: string
  sector?: string
  jobTitle?: string
  requirements?: string
  skillsRequired?: string[]
  location: string
  /**
   * `null` CLEARS a stored coordinate; omitting the field leaves it alone.
   *
   * The distinction only became expressible with TD-42 — these were
   * `.optional()` and not `.nullable()` on the backend, so a pin could be set
   * and never removed, and a job edited away from its city kept showing to the
   * old city's seekers. Only the UPDATE schemas accept null; on create there is
   * nothing to clear.
   */
  latitude?: number | null
  longitude?: number | null
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

export interface JobApplication {
  id: string
  applicantName?: string
  status?: string
  appliedAt?: string
  [key: string]: unknown
}

// Employer dashboard shapes (GET /api/employers/dashboard/*).
export interface EmployerDashboardStats {
  totalJobPosts: number
  totalApplications: number
  acceptedApplications: number
  rejectedApplications: number
  pendingApplications: number
  shortlistedApplications: number
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
  postedAt?: string
  expiresAt?: string | null
  viewCount?: number
  applicationCount?: number
  acceptedCount: number
  rejectedCount: number
  pendingCount: number
  shortlistedCount: number
  reviewedCount: number
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
  company?: string | null
  startDate?: string
  endDate?: string | null
}
export interface CandidateDocument {
  id?: string
  documentType?: string | null
  fileUrl?: string
  verified?: boolean
}
export interface EmployerApplicationItem {
  id: string
  status: string
  appliedAt?: string
  message?: string | null
  jobSeeker?: {
    id: string
    fullName?: string | null
    location?: string | null
    profilePhoto?: string | null
    bio?: string | null
    user?: { email?: string; phoneNumber?: string }
    skills?: CandidateSkill[]
    workExperience?: CandidateWorkExperience[]
    documents?: CandidateDocument[]
    [key: string]: unknown
  } | null
  job?: { id: string; title: string; category?: string; subcategory?: string | null; jobType?: string; location?: string; status?: string }
  interview?: Interview | null
  [key: string]: unknown
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
  user?: { id: string; email?: string }
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
  getDashboardStats: async () => {
    return apiRequest<EmployerDashboardStats>('/employers/dashboard/stats')
  },
  getDashboardJobs: async (page = 1, limit = 10) => {
    return apiRequest<EmployerDashboardJobsPage>(
      `/employers/dashboard/jobs?page=${page}&limit=${limit}`
    )
  },
  getRecentApplications: async (limit = 10) => {
    return apiRequest<{ applications: RecentApplication[]; count: number }>(
      `/employers/dashboard/recent-applications?limit=${limit}`
    )
  },

  // Post a new job. POST /api/jobs → created Job.
  postJob: async (jobData: PostJobData) => {
    return apiRequest<Job>('/jobs', {
      method: 'POST',
      body: JSON.stringify(jobData),
    })
  },

  // Get employer's posted jobs. GET /api/jobs/employer/me/jobs → { jobs, pagination }
  getMyJobs: async (page = 1, limit = 10) => {
    return apiRequest<JobsPage>(`/jobs/employer/me/jobs?page=${page}&limit=${limit}`)
  },

  // Get employer's expired/fulfilled jobs. GET /api/jobs/employer/me/expired → { jobs, pagination }
  getMyExpiredJobs: async (page = 1, limit = 10) => {
    return apiRequest<JobsPage>(`/jobs/employer/me/expired?page=${page}&limit=${limit}`)
  },

  // Update / delete job. PUT|DELETE /api/jobs/:id
  updateJob: async (jobId: string, jobData: Partial<PostJobData>) => {
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
  getEmployerAllApplications: async (
    params: { page?: number; limit?: number; jobId?: string; status?: string; search?: string } = {}
  ) => {
    const qs = new URLSearchParams()
    qs.set('page', String(params.page ?? 1))
    qs.set('limit', String(params.limit ?? 20))
    if (params.jobId) qs.set('jobId', params.jobId)
    if (params.status) qs.set('status', params.status)
    if (params.search) qs.set('search', params.search)
    return apiRequest<EmployerApplicationsPage>(`/applications/employer/all?${qs.toString()}`)
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
    fd.append('profilePic', file)
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
    fd.append('file', file)
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

// One row from GET /api/plans. Prices are BASE (GST-exclusive); `gstPct` is 18
// and `totalInr` is the BE-computed base+GST. `durationDays: null` means a
// one-shot pack whose credits never expire. `features` is a BE-authored English
// string[] (data, not UI chrome) — the pricing page renders the structured
// numeric fields instead so the card is fully translatable.
export interface Plan {
  code: string
  name: string
  group: PlanGroup
  baseInr: number
  gstPct: number
  totalInr: number
  postCredits: number
  downloadCredits: number
  seats: number
  durationDays: number | null
  features?: string[]
}

// Employer credit wallet (GET /api/employers/me/credits). `expiresAt` is the
// wallet's single expiry = latest active subscription/trial lot's date (null
// when the balance is zero or only non-expiring pack credits remain).
// NOTE: the BE wallet summary intentionally has NO `seats` field.
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
}

// POST /api/billing/checkout response — a created Razorpay order plus the GST
// breakdown to show the buyer. The FE opens Razorpay checkout with
// razorpayOrderId + keyId, then confirms via verify-payment.
export interface CheckoutOrder {
  razorpayOrderId: string
  keyId: string
  amountInr: number // total incl. GST
  currency: 'INR'
  invoicePreview: {
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
}

export interface VerifyPaymentInput {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

export const subscriptionAPI = {
  // Public plan catalog. GET /api/plans → Plan[] (no auth required).
  getPlans: async () => {
    return apiRequest<Plan[]>('/plans')
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

  // Fetch an invoice PDF as a Blob. The endpoint streams binary (not the JSON
  // envelope) and needs the Bearer header, so it bypasses apiRequest.
  // GET /api/employers/me/invoices/:id/pdf.
  fetchInvoicePdf: async (id: string): Promise<Blob> => {
    const token = getAuthToken()
    const res = await fetch(`${API_BASE_URL}/employers/me/invoices/${id}/pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      throw new Error(`Failed to download invoice (status ${res.status})`)
    }
    return res.blob()
  },
}

// GST invoice (list row). Amounts are floats; cgst+sgst (intra-state) OR igst
// (inter-state) is populated, not both. `number` is "INV/YY-YY/NNNNNN".
export interface Invoice {
  id: string
  number: string
  description: string
  gstin: string | null
  placeOfSupply: string
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
  companyName: string
  startDate: string
  endDate: string | null
  currentlyWorking: boolean
}

// A search-result snippet — NEVER includes contact (email/phone).
export interface WorkerSnippet {
  id: string
  fullName: string
  profilePhoto: string | null
  location: string
  bio: string
  preferredSector: string | null
  preferredJobTitle: string | null
  createdAt: string
  relevanceScore: number
  skills: CandidateSkillLink[]
  workExperience: CandidateExperience[]
}
export interface WorkerSearchPage {
  jobSeekers: WorkerSnippet[]
  pagination: JobsPagination
}

// Full candidate profile. Contact + PII fields (email … unlockedAt) are present
// ONLY when `unlocked` is true (i.e. this employer has spent a DOWNLOAD credit).
export interface CandidateProfile {
  id: string
  fullName: string
  profilePhoto: string | null
  location: string
  bio: string
  preferredCategory: string | null
  preferredSector: string | null
  preferredJobTitle: string | null
  createdAt: string
  skills: CandidateSkillLink[]
  workExperience: CandidateExperience[]
  // unlocked-only:
  email?: string
  phoneNumber?: string
  dateOfBirth?: string | null
  gender?: string | null
  latitude?: number | null
  longitude?: number | null
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

// A candidate the employer has already unlocked (paid for). Contact is always
// present here — the DOWNLOAD credit was spent, so re-viewing is free.
export interface UnlockedCandidate {
  id: string
  fullName: string
  profilePhoto: string | null
  location: string
  bio: string
  preferredCategory: string | null
  preferredSector: string | null
  preferredJobTitle: string | null
  createdAt: string
  skills: CandidateSkillLink[]
  workExperience: CandidateExperience[]
  // NULLABLE — `User.email` is `String?` in Prisma and candidate.service passes
  // it straight through, so a phone-only seeker unlocks with no email at all.
  // The phone is the guaranteed contact, which is what the employer paid for.
  email: string | null
  phoneNumber: string
  unlockedAt: string
}
export interface UnlockedCandidatesPage {
  unlockedCandidates: UnlockedCandidate[]
  pagination: JobsPagination
}

export interface WorkerSearchParams {
  search: string // required, 2–200 chars
  preferredSector?: string
  location?: string
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
  getUnlockedCandidates: async (params?: { page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    qs.set('page', String(params?.page ?? 1))
    qs.set('limit', String(params?.limit ?? 12))
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
  | 'INTERVIEW_SCHEDULED'
  | 'DOCUMENT_VERIFIED'
  | 'DOCUMENT_REJECTED'
  | 'PROFILE_APPROVED'
  | 'PROFILE_REJECTED'
  | 'ADMIN_WARNING'
  | 'ADMIN_PAYMENT_REMINDER'
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
export default {
  authAPI,
  meAPI,
  otpAPI,
  emailOtpAPI,
  jobSeekerAPI,
  employerAPI,
  subscriptionAPI,
  taxonomyAPI,
  candidateAPI,
  teamAPI,
  chatAPI,
  notificationAPI,
}
