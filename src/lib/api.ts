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

  const response = await fetch(url, config)

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
  category?: string
  subcategory?: string | null
  skillsRequired?: string[]
  requirements?: string | null
  urgencyLevel?: string
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
  category?: string
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

export interface Application {
  id: string
  jobId?: string
  status?: string
  message?: string | null
  audioUrl?: string | null
  appliedAt?: string
  updatedAt?: string
  job?: Job
  [key: string]: unknown
}

export interface ApplicationsPage {
  applications: Application[]
  pagination: JobsPagination
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

  // Update profile. PUT /api/jobseekers/profile
  updateProfile: async (profileData: Partial<SeekerRegisterData>) => {
    return apiRequest('/jobseekers/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    })
  },
}

// ==========================================
// EMPLOYER APIs
// ==========================================

export interface PostJobData {
  title: string
  description: string
  location: string
  salary: string
  jobType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP'
  category: string
  [key: string]: unknown
}

export interface JobApplication {
  id: string
  applicantName?: string
  status?: string
  appliedAt?: string
  [key: string]: unknown
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
    return apiRequest('/employers/dashboard/stats')
  },
  getDashboardJobs: async () => {
    return apiRequest<Job[]>('/employers/dashboard/jobs')
  },
  getRecentApplications: async () => {
    return apiRequest<JobApplication[]>(
      '/employers/dashboard/recent-applications'
    )
  },

  // Post a new job. POST /api/jobs
  postJob: async (jobData: PostJobData) => {
    return apiRequest('/jobs', {
      method: 'POST',
      body: JSON.stringify(jobData),
    })
  },

  // Get employer's posted jobs. GET /api/jobs/employer/me/jobs
  getMyJobs: async () => {
    return apiRequest<Job[]>('/jobs/employer/me/jobs')
  },

  // Update / delete job. PUT|DELETE /api/jobs/:id
  updateJob: async (jobId: string, jobData: Partial<PostJobData>) => {
    return apiRequest(`/jobs/${jobId}`, {
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

  // Update company profile. PUT /api/employers/profile
  updateProfile: async (profileData: Record<string, unknown>) => {
    return apiRequest('/employers/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    })
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
}
