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
    const error = await response.json().catch(() => ({
      message: response.statusText,
    }))
    throw new Error(error.message || `HTTP error! status: ${response.status}`)
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

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  accountStatus?: string
  // Role profile (jobSeeker | employer) — shape varies; consumed loosely for now.
  profile?: Record<string, unknown> | null
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
  duration?: string | null
  numberOfPositions?: number | null
  expiresAt?: string | null
  latitude?: number | null
  longitude?: number | null
  radius?: number | null
  viewCount?: number
  // Per-job recruiter-contact reveal toggles (NC-5/Q51) — gate the Contact button.
  showEmailToSeekers?: boolean
  showPhoneToSeekers?: boolean
  employerId?: string
  employer?: {
    id?: string
    employerType?: string
    companyName?: string | null
    fullName?: string | null
    companyEmail?: string | null
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
  audioUrl?: string | null
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
  email: string
  phoneNumber?: string | null
  role: UserRole
  accountStatus?: string
  emailVerified?: boolean
  preferredLanguage?: string
  jobSeeker?: {
    id: string
    fullName?: string | null
    profilePhoto?: string | null
    bio?: string | null
    location?: string | null
    latitude?: number | null
    longitude?: number | null
    preferredSector?: string | null
    preferredJobTitle?: string | null
    skills?: JobSeekerSkillLink[]
    workExperience?: ProfileWorkExperience[]
    documents?: UserDocument[]
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
  preferredSector?: string
  preferredJobTitle?: string
  preferredLanguage?: string
  profilePhoto?: string
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

  // Phone-OTP login step 1: request the login OTP. Step 2 is authAPI.login
  // with { identifier: <phone>, otp }.
  loginPhoneSend: async (phoneNumber: string) => {
    return apiRequest('/auth/login-phone-send', {
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

  // Email verification (6-digit OTP). POST /api/auth/verify-email-otp.
  // Required before a registered user can log in — BE login rejects unverified
  // emails (auth.service login + phone-OTP login both gate on emailVerified).
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
}

// Phone OTP (registration / generic) — POST /api/otp/{send,verify}
export const otpAPI = {
  send: async (phoneNumber: string) => {
    return apiRequest('/otp/send', {
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
// (email, purpose), so `purpose` is required on both calls (used by forgot-
// password etc.). Registration email-verify uses authAPI.verifyEmailOtp instead.
export type EmailOtpPurpose = 'REGISTRATION' | 'CHANGE_EMAIL' | 'FORGOT_PASSWORD'

export const emailOtpAPI = {
  send: async (email: string, purpose: EmailOtpPurpose) => {
    return apiRequest('/email-otp/send', {
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

// Matches BE jobSeekerRegisterSchema (auth.validator.ts). NOTE: dateOfBirth +
// gender are intentionally NOT here — the BE has no field for them yet
// (tracked as BR-1 in docs/be-requests.md). The UI still collects them; they're
// held client-side until the BE accepts them.
export interface SeekerRegisterData {
  fullName: string
  email: string
  phoneNumber: string // E.164
  // BR-3 — 3-level taxonomy. preferredCategory optional on the BE; sector +
  // jobTitle required. The FE sends the full triple (validateTriple checks path).
  preferredCategory?: string
  preferredSector: string
  preferredJobTitle: string
  preferredLanguage?: string
  latitude?: number
  longitude?: number
  location?: string
  workExperiences?: SeekerWorkExperience[]
  profilePic?: File
  document?: File
}

export interface SeekerRegisterResult {
  userId: string
  email: string
  // `otp` present only in non-production (BE returns it for dev/QA); always has expiresIn.
  emailVerification?: { otp?: string; expiresIn?: number }
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
  // a JSON string the controller JSON.parses). BE auto-sends the email-OTP and
  // returns emailVerification. No token yet — caller must verifyEmailOtp → login.
  register: async (data: SeekerRegisterData) => {
    const fd = new FormData()
    fd.append('fullName', data.fullName)
    fd.append('email', data.email)
    fd.append('phoneNumber', data.phoneNumber)
    if (data.preferredCategory) fd.append('preferredCategory', data.preferredCategory)
    fd.append('preferredSector', data.preferredSector)
    fd.append('preferredJobTitle', data.preferredJobTitle)
    fd.append('preferredLanguage', data.preferredLanguage ?? 'en')
    if (data.latitude != null) fd.append('latitude', String(data.latitude))
    if (data.longitude != null) fd.append('longitude', String(data.longitude))
    if (data.location) fd.append('location', data.location)
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

  // Step 4: set the account password (POST /api/jobseekers/set-password).
  setPassword: async (email: string, password: string) => {
    return apiRequest('/jobseekers/set-password', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },

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
    const { radius = 5, page = 1, limit = 10 } = params
    return apiRequest<JobsPage>(`/jobs/nearby?radius=${radius}&page=${page}&limit=${limit}`)
  },

  // Apply for job (multipart — optional audio cover letter). POST /api/applications
  // Body: jobId (required) + message? (BE field name, ≤1000) + audioDuration? (≤120s).
  // Audio file goes in the `audio` field (3 MB cap, webm/mp4/m4a/ogg/opus).
  applyForJob: async (
    jobId: string,
    applicationData: { audio?: File; message?: string; audioDuration?: number }
  ) => {
    const formData = new FormData()
    formData.append('jobId', jobId)
    if (applicationData.audio) {
      formData.append('audio', applicationData.audio)
    }
    if (applicationData.message) {
      formData.append('message', applicationData.message)
    }
    if (applicationData.audioDuration != null) {
      formData.append('audioDuration', String(applicationData.audioDuration))
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
  latitude?: number
  longitude?: number
  radius?: number
  salaryMin?: number
  salaryMax?: number
  paymentType?: PaymentTypeValue
  jobType: JobTypeValue
  urgencyLevel?: UrgencyLevelValue
  duration?: string
  numberOfPositions?: number
  expiresAt?: string // ISO datetime
  showEmailToSeekers?: boolean
  showPhoneToSeekers?: boolean
  companyName?: string
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
  audioUrl?: string | null
  audioDuration?: number | null
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
export type MessageType = 'TEXT' | 'AUDIO' | 'IMAGE' | 'SYSTEM'
export interface ChatMessage {
  id: string
  conversationId: string
  senderId: string
  type: MessageType
  content: string
  audioUrl?: string | null
  audioDuration?: number | null
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
// separately after email-verify per the 2026-05-13 split). Both register calls
// auto-send the email-verification OTP and return no token — the caller must
// verifyEmailOtp → login, same as the seeker flow.
export type CompanySize =
  | 'SIZE_1_10'
  | 'SIZE_11_50'
  | 'SIZE_51_200'
  | 'SIZE_201_500'
  | 'SIZE_501_1000'
  | 'SIZE_1000_PLUS'

export interface EmployerIndividualData {
  email: string
  fullName: string
  phoneNumber: string // E.164
  designation?: string
}

export interface EmployerBusinessData {
  email: string
  phoneNumber: string // E.164
  companyName: string
  companyEmail: string
  companyAddress: string
  companyFoundedDate: string // ISO date
  companySize: CompanySize
  gstNumber: string // exactly 15 chars
  registrationNumber: string
}

export interface EmployerRegisterResult {
  userId: string
  email: string
  emailVerification?: { otp?: string; expiresIn?: number }
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

  // Set the account password. POST /api/employers/set-password.
  setPassword: async (email: string, password: string) => {
    return apiRequest('/employers/set-password', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },

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
  deleteJob: async (jobId: string) => {
    return apiRequest(`/jobs/${jobId}`, {
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

export const subscriptionAPI = {
  // Public plan catalog. GET /api/plans → Plan[] (no auth required).
  getPlans: async () => {
    return apiRequest<Plan[]>('/plans')
  },
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

  // POST /api/conversations/:id/messages (AUDIO — multipart, 60s/2 MB cap server-side).
  sendAudioMessage: async (conversationId: string, audio: File, audioDuration?: number) => {
    const formData = new FormData()
    formData.append('type', 'AUDIO')
    formData.append('audio', audio)
    if (audioDuration != null) formData.append('audioDuration', String(audioDuration))
    return apiRequest<ChatMessage>(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: formData,
    })
  },

  // PATCH /api/messages/:id/read — mark one message read by the current user.
  markMessageRead: async (messageId: string) => {
    return apiRequest(`/messages/${messageId}/read`, { method: 'PATCH' })
  },

  // GET /api/notifications/unread-count → { count } (badge).
  getUnreadNotificationCount: async () => {
    return apiRequest<{ count: number }>('/notifications/unread-count')
  },
}

// TODO(thread-b): admin client (adminAPI) intentionally NOT defined here — the
// admin console is moving to the standalone `prosiddhi-admin` repo (2026-06-08).
// If the admin-removal thread touches this file, this marker is the seam.

// Export everything
export default {
  authAPI,
  otpAPI,
  emailOtpAPI,
  jobSeekerAPI,
  employerAPI,
  subscriptionAPI,
  taxonomyAPI,
  chatAPI,
}
