'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { CreditWallet } from '@/components/employer/CreditWallet'
import { InlineError } from '@/components/feedback/InlineError'
import { employerAPI, candidateAPI, ApiError } from '@/lib/api'
import { relativeTime, initials } from '@/lib/jobFormat'
import { statusMeta, jobStatusMeta, isJobRejected } from '@/lib/applicationStatus'
import {
  Plus,
  Briefcase,
  Users,
  Clock,
  CheckCircle2,
  Star,
  Loader2,
  MapPin,
  Unlock,
  ChevronRight,
  Eye,
  XCircle,
} from 'lucide-react'
import { EmployerHeader } from '@/components/employer/EmployerHeader'

// One tile: icon, big number, label. `href` turns it into a link and `action`
// adds a trailing affordance — the unlocked-candidates shortcut is the same
// tile with both, so it does not need its own copy of this markup.
function StatTile({
  label,
  value,
  icon,
  href,
  action,
}: {
  label: string
  value: number
  icon: React.ReactNode
  href?: string
  action?: React.ReactNode
}) {
  const shell =
    'bg-white border border-[#dddddd] rounded-[10px] p-4 sm:p-5 flex items-center justify-between gap-3'
  const body = (
    <>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-11 h-11 rounded-lg bg-[#e3f5ff] flex items-center justify-center flex-shrink-0 text-[#236987]">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-black leading-tight">{value}</p>
          <p className="text-xs sm:text-sm text-[#717182] leading-snug break-words">{label}</p>
        </div>
      </div>
      {action}
    </>
  )
  if (!href) return <div className={shell}>{body}</div>
  return (
    <Link href={href} className={`${shell} hover:shadow-lg transition-shadow`}>
      {body}
    </Link>
  )
}

// What went wrong, as far as the panel needs to tell apart. `noAccess` is a refusal
// that asking again cannot change (403), so it gets no Retry. Everything else may be
// transient and keeps Retry — including 400, which this backend also uses for server
// faults, and 404, which a proxy can return briefly during a deploy.
type PanelErrorKind = 'failed' | 'rateLimited' | 'noAccess'

function panelErrorKind(err: unknown): PanelErrorKind {
  if (!(err instanceof ApiError)) return 'failed'
  if (err.status === 429) return 'rateLimited'
  if (err.status === 403) return 'noAccess'
  return 'failed'
}

// One dashboard panel's load state. A failed panel carries no data on purpose:
// an error must never sit next to old numbers that look current.
type PanelState<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T }
  | { status: 'error'; kind: PanelErrorKind }

// Module-level so their identity is stable for usePanel. A body without the array we
// asked for is a failure, not an empty list — `[]` here would show "no jobs".
const fetchStats = async (signal: AbortSignal) => {
  const res = await employerAPI.getDashboardStats({ signal })
  if (typeof res?.totalApplications !== 'number') throw new Error('Unexpected stats response')
  return res
}
const fetchJobs = async (signal: AbortSignal) => {
  const res = await employerAPI.getDashboardJobs(1, 5, { signal })
  if (!Array.isArray(res?.jobs)) throw new Error('Unexpected jobs response')
  return res.jobs
}
const fetchRecent = async (signal: AbortSignal) => {
  const res = await employerAPI.getRecentApplications(5, { signal })
  if (!Array.isArray(res?.applications)) throw new Error('Unexpected applications response')
  return res.applications
}

/**
 * Loads one panel on mount and again whenever `load` is called (its Retry button).
 * Only read-only GETs are passed in, so repeating one is safe.
 *
 * A reply that arrives after a newer load started, or after unmount, is dropped.
 * A 401, or a 403 PASSWORD_CHANGE_REQUIRED, leaves the panel loading: the API client
 * has already started the central redirect (sign-out, or the change-password
 * screen), and an error block flashing first would be noise.
 */
function usePanel<T>(fetcher: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<PanelState<T>>({ status: 'loading' })
  const controller = useRef<AbortController | null>(null)

  const load = useCallback(() => {
    controller.current?.abort()
    const ctl = new AbortController()
    controller.current = ctl
    setState({ status: 'loading' })
    fetcher(ctl.signal)
      .then((data) => {
        if (!ctl.signal.aborted) setState({ status: 'ready', data })
      })
      .catch((err) => {
        if (ctl.signal.aborted) return
        if (err instanceof ApiError && (err.status === 401 || err.code === 'PASSWORD_CHANGE_REQUIRED')) return
        setState({ status: 'error', kind: panelErrorKind(err) })
      })
  }, [fetcher])

  useEffect(() => {
    load()
    return () => controller.current?.abort()
  }, [load])

  return [state, load] as const
}

// After a 429 the panel's Retry stays disabled this long. The server's limit window is
// 15 minutes, so asking again at once would only be refused again. Per panel, not
// automatic: nothing retries by itself, and a page reload starts fresh.
const RATE_LIMIT_COOLDOWN_MS = 2 * 60 * 1000

// A panel's body: a spinner while loading, a message with Retry on failure (429 gets
// its own wording and a cooldown), and `children(data)` once loaded. An empty result
// is still "loaded", so each panel's own empty state belongs inside `children`.
function PanelBody<T>({
  state,
  errorMessage,
  onRetry,
  children,
}: {
  state: PanelState<T>
  errorMessage: string
  onRetry: () => void
  children: (data: T) => React.ReactNode
}) {
  const { t } = useTranslation()

  // Every failure is a fresh state object, so "the cooldown for THIS failure is over" is
  // remembered by that object. Retry is disabled from the first render of a rate-limited
  // state (no enabled flash) until its timer fires; loading or loading again ends it.
  const rateLimited = state.status === 'error' && state.kind === 'rateLimited'
  const [cooledOff, setCooledOff] = useState<PanelState<T> | null>(null)
  useEffect(() => {
    if (!rateLimited) return
    const timer = setTimeout(() => setCooledOff(state), RATE_LIMIT_COOLDOWN_MS)
    return () => clearTimeout(timer)
  }, [rateLimited, state])
  const coolingDown = rateLimited && cooledOff !== state

  if (state.status === 'loading') {
    return (
      <div role="status" aria-label={t('employer:dashboard.loading')} className="flex justify-center py-10 text-primary-50">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }
  if (state.status === 'error') {
    if (state.kind === 'noAccess') {
      return <InlineError compact message={t('employer:dashboard.errors.noAccess')} />
    }
    return (
      <InlineError
        compact
        message={state.kind === 'rateLimited' ? t('employer:dashboard.errors.rateLimited') : errorMessage}
        onRetry={onRetry}
        retryDisabled={coolingDown}
      />
    )
  }
  return <>{children(state.data)}</>
}

function EmployerDashboardContent() {
  const { t } = useTranslation()
  const [statsPanel, reloadStats] = usePanel(fetchStats)
  const [jobsPanel, reloadJobs] = usePanel(fetchJobs)
  const [recentPanel, reloadRecent] = usePanel(fetchRecent)
  const [unlockedCount, setUnlockedCount] = useState<number | null>(null)
  const [accountStatus, setAccountStatus] = useState<string | null>(null)

  // Supplementary and independent of the panels: each hides its card on failure
  // instead of showing an error, so neither can hold the panels up.
  useEffect(() => {
    let ignore = false
    candidateAPI
      .getUnlockedCandidates({ page: 1, limit: 1 })
      .then((u) => {
        if (!ignore) setUnlockedCount(u?.pagination?.total ?? null)
      })
      .catch(() => {})
    employerAPI
      .getProfile()
      .then((p) => {
        if (!ignore) setAccountStatus(p?.accountStatus ?? null)
      })
      .catch(() => {})
    return () => {
      ignore = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#f7fbfd] flex flex-col">
      {/* Header */}
      <EmployerHeader />

      <main className="flex-1 py-8 sm:py-10 lg:py-12">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px]">
          <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-bold text-black mb-6 sm:mb-8">
            {t('employer:dashboard.title')}
          </h1>

          {/* Each panel below loads, fails and retries on its own, so one slow or
              failing request never blanks the others. */}
          {/* Documents are with admin. Only PENDING_ADMIN_APPROVAL: a business that
              has not uploaded yet (PENDING_DOCUMENTS) has no review running, so the
              2-working-days promise would be false for them. */}
          {accountStatus === 'PENDING_ADMIN_APPROVAL' && (
            <div className="mb-6 sm:mb-8 bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
              <Clock className="w-5 h-5 text-secondary-70 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-secondary-70">{t('employer:docsReview.title')}</p>
                <p className="text-sm text-secondary-70">{t('employer:docsReview.sla')}</p>
              </div>
            </div>
          )}

          <PanelBody state={statsPanel} errorMessage={t('employer:dashboard.errors.stats')} onRetry={reloadStats}>
            {(stats) => (
              <>
                {/* Job Overview — job-level counts, kept separate from the
                    application-lifecycle metrics below so the two don't read as
                    one flat, undifferentiated row of six unrelated numbers.
                    Capped to sm:max-w-md so two cards don't stretch across the
                    full dashboard width. */}
                <section className="mb-6 sm:mb-8">
                  <h2 className="text-xs sm:text-sm font-semibold text-[#717182] uppercase tracking-wide mb-2 sm:mb-3">
                    {t('employer:dashboard.jobOverviewTitle')}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 sm:max-w-md">
                    <StatTile label={t('employer:dashboard.stats.totalJobs')} value={stats.totalJobPosts} icon={<Briefcase className="w-5 h-5" />} />
                    <StatTile label={t('employer:dashboard.stats.activeJobs')} value={stats.activeJobs} icon={<CheckCircle2 className="w-5 h-5" />} />
                  </div>
                </section>

                {/* Application Overview — every application-lifecycle metric in
                    one group, in pipeline order. The BE computes
                    reviewedApplications = accepted + rejected + shortlisted
                    (employer.controller.ts): it is a decided-vs-pending count,
                    not a funnel stage before Shortlisted, so it is shown as a
                    plain metric alongside the others rather than as an arrow
                    chain that would imply a sequential workflow. */}
                <section className="mb-6 sm:mb-8">
                  <h2 className="text-xs sm:text-sm font-semibold text-[#717182] uppercase tracking-wide mb-2 sm:mb-3">
                    {t('employer:dashboard.overviewTitle')}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6 gap-3 sm:gap-4">
                    <StatTile label={t('employer:dashboard.stats.applications')} value={stats.totalApplications} icon={<Users className="w-5 h-5" />} />
                    <StatTile label={t('employer:dashboard.stats.pending')} value={stats.pendingApplications} icon={<Clock className="w-5 h-5" />} />
                    <StatTile label={t('employer:dashboard.stats.reviewed')} value={stats.reviewedApplications} icon={<Eye className="w-5 h-5" />} />
                    <StatTile label={t('employer:dashboard.stats.shortlisted')} value={stats.shortlistedApplications} icon={<Star className="w-5 h-5" />} />
                    <StatTile label={t('employer:dashboard.stats.accepted')} value={stats.acceptedApplications} icon={<CheckCircle2 className="w-5 h-5" />} />
                    <StatTile label={t('employer:candidates.tabs.rejected')} value={stats.rejectedApplications} icon={<XCircle className="w-5 h-5" />} />
                  </div>
                </section>
              </>
            )}
          </PanelBody>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Your Jobs */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl sm:text-2xl font-semibold text-black">{t('employer:dashboard.yourJobs')}</h2>
                <Link href="/employer/jobs" className="text-sm text-primary-50 hover:underline">{t('employer:dashboard.manageAll')}</Link>
              </div>
              <PanelBody state={jobsPanel} errorMessage={t('employer:dashboard.errors.jobs')} onRetry={reloadJobs}>
              {(jobs) => jobs.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {jobs.map((job) => {
                    const badge = jobStatusMeta(job)
                    // Same rule as My Jobs, which hides Candidates on its Rejected tab
                    // (status CANCELLED, which an admin rejection also sets).
                    const clickable = !isJobRejected(job) && job.status !== 'CANCELLED'
                    const cardClass = 'block bg-white border border-[#dddddd] rounded-[10px] p-4 sm:p-5'
                    const body = (
                      <>
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <h3 className="text-base sm:text-lg font-semibold text-black min-w-0 truncate">{job.title}</h3>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${badge.pill}`}>
                            {badge.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-[#717182]">
                          <span><span className="font-semibold text-black">{job.applicationCount ?? 0}</span> {t('employer:dashboard.applicants', { count: job.applicationCount ?? 0 })}</span>
                          <span><span className="font-semibold text-black">{job.pendingCount}</span> {t('employer:dashboard.pendingCount')}</span>
                          <span><span className="font-semibold text-black">{job.shortlistedCount}</span> {t('employer:dashboard.shortlistedCount')}</span>
                          <span><span className="font-semibold text-black">{job.acceptedCount}</span> {t('employer:dashboard.acceptedCount')}</span>
                        </div>
                        {job.postedAt && (
                          <p className="mt-2 text-xs text-[#717182]">{t('employer:dashboard.posted', { time: relativeTime(job.postedAt) })}</p>
                        )}
                      </>
                    )
                    return clickable ? (
                      <Link
                        key={job.id}
                        href={`/employer/candidates?jobId=${job.id}`}
                        className={`${cardClass} cursor-pointer hover:bg-gray-50 hover:border-[#c8c8c8] transition-colors duration-150`}
                      >
                        {body}
                      </Link>
                    ) : (
                      <div key={job.id} className={cardClass}>
                        {body}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="bg-white border border-dashed border-[#dddddd] rounded-[10px] p-8 text-center text-[#717182]">
                  <Briefcase className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                  <p className="mb-4">{t('employer:dashboard.noJobsTitle')}</p>
                  <Link href="/employer/jobs/new" className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors text-sm">
                    <Plus className="w-4 h-4" /> {t('employer:dashboard.postFirstJob')}
                  </Link>
                </div>
              )}
              </PanelBody>
            </section>

            {/* Recent Applications */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl sm:text-2xl font-semibold text-black">{t('employer:dashboard.recentApplications')}</h2>
                <Link href="/employer/candidates" className="text-sm text-primary-50 hover:underline">{t('employer:dashboard.manageAll')}</Link>
              </div>
              <PanelBody state={recentPanel} errorMessage={t('employer:dashboard.errors.applications')} onRetry={reloadRecent}>
              {(recent) => recent.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {recent.map((app) => {
                    const meta = statusMeta(app.status)
                    return (
                      <Link key={app.id} href={`/employer/candidates/${app.id}`} className="bg-white border border-[#dddddd] rounded-[10px] p-4 sm:p-5 flex items-center gap-4 cursor-pointer hover:bg-gray-50 hover:border-[#c8c8c8] transition-colors duration-150">
                        <div className="w-11 h-11 bg-[#a9e5ff] rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-[#236987]">{initials(app.applicant.name)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm sm:text-base font-medium text-black truncate">{app.applicant.name || t('employer:dashboard.applicantFallback')}</p>
                          <p className="text-xs sm:text-sm text-[#717182] truncate">{app.job.title}</p>
                          {app.applicant.location && (
                            <p className="text-xs text-[#717182] flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" /> {app.applicant.location}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${meta.pill}`}>{meta.label}</span>
                          <span className="text-xs text-[#717182]">{relativeTime(app.appliedAt)}</span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              ) : (
                <div className="bg-white border border-dashed border-[#dddddd] rounded-[10px] p-8 text-center text-[#717182]">
                  <Users className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                  <p>{t('employer:dashboard.noApplications')}</p>
                </div>
              )}
              </PanelBody>
            </section>
          </div>

          {/* Billing sits below the hiring panels (TD-18): the dashboard used
              to open with the wallet and a Buy button, so an employer's first
              screen was their bill rather than their jobs.

              Unconditional, exactly as it was when it rendered above the
              panels. The wallet fetches its own data (PJP-178) and this page
              renders no footer, so `/employer/invoices` and the plans CTA are
              reachable from nowhere else — gating it on the panels' load state
              would strand both whenever a dashboard call failed or hung. */}
          <div className="mt-8 sm:mt-10 space-y-6 sm:space-y-8">
            <CreditWallet />
            {/* The paid candidate history. Supplementary: hidden, not errored,
                when its count fails to load. */}
            {unlockedCount !== null && (
              <StatTile
                href="/employer/workers?tab=unlocked"
                label={t('employer:dashboard.unlockedCandidates')}
                value={unlockedCount}
                icon={<Unlock className="w-5 h-5" />}
                action={
                  <span className="inline-flex items-center gap-1 text-sm text-primary-50 font-medium whitespace-nowrap">
                    {t('employer:dashboard.viewAll')} <ChevronRight className="w-4 h-4" />
                  </span>
                }
              />
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function EmployerDashboardPage() {
  return (
    <ProtectedRoute requiredRole="employer">
      <EmployerDashboardContent />
    </ProtectedRoute>
  )
}
