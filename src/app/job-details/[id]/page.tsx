'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { Footer } from '@/components/home/Footer'
import { ApplyModal } from '@/components/job/ApplyModal'
import { ContactRecruiterModal } from '@/components/job/ContactRecruiterModal'
import { ReportJobModal } from '@/components/job/ReportJobModal'
import { jobSeekerAPI, type Job } from '@/lib/api'
import {
  humanizeJobType,
  humanizePaymentType,
  humanizeCompanySize,
  formatSalary,
  formatSalaryLine,
  formatShortDate,
  relativeTime,
  initials,
  localizeLocation,
} from '@/lib/jobFormat'
import {
  Briefcase,
  Bookmark,
  Clock,
  MapPin,
  IndianRupee,
  ChevronLeft,
  Phone,
  BookmarkCheck,
  Eye,
  Flag,
  Loader2,
  AlertCircle,
  Users,
  CalendarDays,
  Layers,
  Zap,
  Building2,
  type LucideIcon,
} from 'lucide-react'
import { EmployeeHeader } from '@/components/navigation/EmployeeHeader'

function companyOf(job: Job, fallback: string): string {
  return job.companyName || job.employer?.companyName || job.employer?.fullName || fallback
}

// One icon + fact row in the "Job Details" sidebar card — kept as a top-level
// helper (not inline JSX) so the icon tile's styling can't drift between rows.
function InfoRow({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-sm text-black">
      <span className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-[#3386a9] shrink-0">
        <Icon className="w-3.5 h-3.5" />
      </span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  )
}

function JobDetailsContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const jobId = String(params?.id ?? '')

  // Home, Job Feed, and Saved Jobs all link here with `?from=` so the Back link
  // returns to whichever one the seeker actually came from, instead of a generic
  // browser-back that breaks for any other entry point (my applications,
  // employer's own job list) — those keep the old router.back().
  const from = searchParams.get('from')
  const activeNavTab = from === 'home' ? 'home' : from === 'job-feed' ? 'jobFeed' : from === 'saved-jobs' ? 'savedJobs' : undefined
  const backLabel =
    from === 'home'
      ? t('seeker:jobDetails.backToHome')
      : from === 'job-feed'
        ? t('seeker:jobDetails.backToFeed')
        : from === 'saved-jobs'
          ? t('seeker:jobDetails.backToSavedJobs')
          : t('seeker:jobDetails.back')
  const goBack = () => {
    if (from === 'home') router.push('/home')
    else if (from === 'job-feed') router.push('/job-feed')
    else if (from === 'saved-jobs') router.push('/saved-jobs')
    else router.back()
  }

  const [job, setJob] = useState<Job | null>(null)
  const [related, setRelated] = useState<Job[]>([])
  const [isSaved, setIsSaved] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [hasApplied, setHasApplied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false)
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)

  // This page is the ONLY job-detail view in the product, and the employer's own
  // "My Jobs > View" link points here (DEF-023). It used to be gated
  // requiredRole="seeker", so the link 404'd-by-redirect for the only role it was
  // shown to. Employers are admitted now, but every seeker-only ACTION is hidden
  // from them: an employer must not apply to, save, or report a job — and the
  // backend would refuse anyway, so offering the button is a broken promise.
  const { user } = useAuth()
  const isSeeker = user?.role === 'JOB_SEEKER'

  useEffect(() => {
    if (!jobId) return
    let ignore = false
    const run = async () => {
      setLoading(true)
      setError('')
      // Reset per-job state up front. Without this the PREVIOUS job's values
      // survive into this render, and because the writes below are guarded on
      // 'fulfilled', a rejected check leaves them showing indefinitely — the
      // stale-"Applied"-badge bug (DEF-028).
      setRelated([])
      setIsSaved(false)
      setHasApplied(false)
      try {
        const j = await jobSeekerAPI.getJobDetails(jobId)
        if (ignore) return
        setJob(j)
        // Related is public; saved/applied are seeker-only and 403 for an employer,
        // so they are simply not requested when the viewer is not a seeker.
        const [rel, saved, applied] = await Promise.allSettled([
          jobSeekerAPI.getRelatedJobs(jobId),
          isSeeker ? jobSeekerAPI.isJobSaved(jobId) : Promise.resolve({ isSaved: false }),
          isSeeker ? jobSeekerAPI.checkIfApplied(jobId) : Promise.resolve({ hasApplied: false, jobId }),
        ])
        if (ignore) return
        if (rel.status === 'fulfilled') setRelated(rel.value.relatedJobs ?? [])
        if (saved.status === 'fulfilled') setIsSaved(!!saved.value.isSaved)
        if (applied.status === 'fulfilled') setHasApplied(!!applied.value.hasApplied)
      } catch (err) {
        if (!ignore) setError(err instanceof Error ? err.message : t('seeker:jobDetails.loadError'))
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    run()
    return () => {
      ignore = true
    }
  }, [jobId, t, isSeeker])

  const handleSaveJob = async () => {
    if (saveLoading || !job) return
    setSaveLoading(true)
    setSaveError('')
    try {
      if (isSaved) {
        await jobSeekerAPI.unsaveJob(jobId)
        setIsSaved(false)
      } else {
        await jobSeekerAPI.saveJob(jobId)
        setIsSaved(true)
      }
    } catch {
      setSaveError(t('seeker:savedJobs.removeError'))
      // Re-sync with the server so the button reflects truth (handles a stale
      // check or a duplicate-save race).
      try {
        const s = await jobSeekerAPI.isJobSaved(jobId)
        setIsSaved(!!s.isSaved)
      } catch {
        /* ignore — keep current state */
      }
    } finally {
      setSaveLoading(false)
    }
  }

  const descriptionLines = (job?.description ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const requirementLines = (job?.requirements ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const viewCount = typeof job?.viewCount === 'number' ? job.viewCount : undefined
  const applicationCount = typeof job?.applicationCount === 'number' ? job.applicationCount : undefined
  const openings = typeof job?.numberOfPositions === 'number' && job.numberOfPositions > 0 ? job.numberOfPositions : undefined
  const isUrgent = job?.urgencyLevel === 'URGENT'
  const applyByDate = formatShortDate(job?.liveUntil)

  // Salary carries its actual pay period (Monthly/Hourly/...) instead of the
  // generic "/ Month" suffix `formatSalaryLine` appends everywhere else — that
  // shared helper is used by ~15 screens that only ever show monthly figures,
  // but a real job here can be HOURLY/DAILY/WEEKLY/FIXED.
  const paymentTypeLabel = humanizePaymentType(job?.paymentType)
  const salaryAmount = formatSalary(job?.salaryMin, job?.salaryMax)
  const hasSalaryAmount = job?.salaryMin != null || job?.salaryMax != null
  const salaryLine = hasSalaryAmount && paymentTypeLabel ? `${salaryAmount} · ${paymentTypeLabel}` : salaryAmount

  // "About the Company" only makes sense for a real registered company — an
  // INDIVIDUAL employer's `companyName` is null, and showing their personal
  // name under a "Company" heading would misrepresent who posted the job.
  const employerCompanyName = job?.employer?.companyName?.trim() || ''
  const companySizeLabel = humanizeCompanySize(job?.employer?.companySize)

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <EmployeeHeader active={activeNavTab} />

      <main className="flex-1 pt-[clamp(16px,5.33px_+_1.67vw,32px)] pb-[clamp(24px,8px_+_2.5vw,48px)]">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px]">
          {/* Same max-width as the outer div above — deliberately, not a typo.
              An earlier version capped this inner wrapper at 1180px, narrower
              than the outer 1920px, to keep the 2-column body from stretching
              too wide. That created a gap between this content column's right
              edge and the outer container's true edge that grew as the
              effective viewport widened (e.g. zooming out) — invisible at
              typical zoom, but an increasingly visible "the page content
              isn't using the full width" mismatch at lower zoom. Matching
              this wrapper's max-width to the outer's removes that gap
              entirely: there is only one content boundary, matching how
              Home and Job Feed already work (no extra inner cap). Wraps the
              back link too, so it shares one left edge with the hero at
              every viewport. */}
          <div className="max-w-[1920px] mx-auto">
            <button onClick={goBack} className="flex items-center gap-2 text-black hover:text-primary-50 transition-colors mb-[clamp(16px,8px_+_1.25vw,28px)]">
              <ChevronLeft className="w-5 h-5" />
              <span className="text-base sm:text-lg">{backLabel}</span>
            </button>

            {/* Loading */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-24 text-[#717182]">
                <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary-50" />
                <p>{t('seeker:jobDetails.loading')}</p>
              </div>
            )}

            {/* Error / not found */}
            {!loading && (error || !job) && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
                <p className="text-red-600 mb-4 max-w-md">{error || t('seeker:jobDetails.notFound')}</p>
                <Link href="/job-feed" className="px-6 py-2 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors">
                  {t('seeker:jobDetails.backToFeed')}
                </Link>
              </div>
            )}

            {!loading && !error && job && (
              <>
                {/* Job Hero */}
              <div className="mb-4 sm:mb-6">
                {/* `justify-between`, so Save's right edge always lands on the
                    row's true right edge — the same edge the body grid below
                    always fills (a CSS grid is 100% of its parent by
                    definition; this flex row needs the same rule stated
                    explicitly, or nothing pins its last item there). The
                    `lg:max-w-[900px]` cap still stops the identity column
                    itself from stretching wide — `justify-between` only
                    repositions Save, it doesn't resize anything.

                    The gap (and every size/spacing value through this Hero,
                    the actions row, and the Body grid below) is a `clamp()`
                    fluid value, not a discrete breakpoint step. Reasoning:
                    browser zoom shrinks the *effective* CSS viewport as it
                    zooms in (110%, 125%, ...) — a page built from fixed
                    breakpoint tiers (base/sm/lg) sits at its largest tier's
                    values for a WIDE span of that shrinking range with zero
                    compensation, so zoom's own magnification is the only
                    thing changing, and it reads as the page "growing" the
                    more you zoom in. A `clamp(min, A + Bvw, max)` value
                    instead *continuously* tracks the effective viewport
                    width — as zoom-in shrinks that width, the computed size
                    shrinks too, partially cancelling the zoom multiplier
                    instead of adding to it. Every clamp() on this page
                    shares the same two control points — 640px (Tailwind's
                    own `sm` breakpoint) mapped to each element's previous
                    mobile/base value, and 1600px (empirically, roughly 80%
                    zoom on a common laptop) mapped to each element's
                    previous desktop-max value — so the whole hierarchy
                    scales together on one coordinated curve rather than
                    each element shrinking on its own schedule. Below 640px
                    (real mobile) and above 1600px (very wide/zoomed-out
                    desktops) clamp() floors/ceils at exactly the old
                    min/max, so those ends of the range are unchanged. */}
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-[clamp(24px,13.33px_+_1.67vw,40px)]">
                  <div className="flex items-start gap-4 sm:gap-5 min-w-0 lg:max-w-[900px]">
                    <div className="w-[clamp(64px,56px_+_1.25vw,76px)] h-[clamp(64px,56px_+_1.25vw,76px)] bg-[#a9e5ff] rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-[clamp(26px,22px_+_0.625vw,32px)] font-semibold text-[#236987]">{initials(companyOf(job, t('seeker:jobCard.company')))}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                        <h1 className="text-[clamp(24px,16px_+_1.25vw,36px)] font-bold text-black leading-tight break-words">{job.title}</h1>
                        {isUrgent && (
                          <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 border border-red-100 px-2.5 py-1 rounded-full text-xs font-medium shrink-0">
                            <Zap className="w-3 h-3" />
                            {t('seeker:jobFeed.filters.urgentOpening')}
                          </span>
                        )}
                      </div>
                      <p className="text-[clamp(16px,14.67px_+_0.21vw,18px)] text-black mb-3">{companyOf(job, t('seeker:jobCard.company'))}</p>

                      <div className="flex items-center gap-1.5 mb-4">
                        <IndianRupee className="w-[clamp(16px,13.33px_+_0.42vw,20px)] h-[clamp(16px,13.33px_+_0.42vw,20px)] text-primary-50 shrink-0" />
                        <span className="text-[clamp(18px,16.67px_+_0.21vw,20px)] font-semibold text-black">{salaryLine}</span>
                      </div>

                      {/* Classification chips (BR-3 taxonomy) — Job Type/Location are
                          the "at a glance" facts, Category/Sector the taxonomy the
                          job was filed under; the "Job Details" card repeats all
                          four for scanning, which is deliberate, not accidental. */}
                      <div className="flex flex-wrap gap-2 sm:gap-3">
                        {job.jobType && (
                          <div className="bg-[#efefef] px-[clamp(12px,9.33px_+_0.42vw,16px)] py-[clamp(6px,4.67px_+_0.21vw,8px)] rounded-full flex items-center gap-1.5">
                            <Clock className="w-[clamp(12px,9.33px_+_0.42vw,16px)] h-[clamp(12px,9.33px_+_0.42vw,16px)] text-[#3386a9]" />
                            <span className="text-[clamp(12px,10.67px_+_0.21vw,14px)] text-black">{humanizeJobType(job.jobType)}</span>
                          </div>
                        )}
                        {job.location && (
                          <div className="bg-[#efefef] px-[clamp(12px,9.33px_+_0.42vw,16px)] py-[clamp(6px,4.67px_+_0.21vw,8px)] rounded-full flex items-center gap-1.5">
                            <MapPin className="w-[clamp(12px,9.33px_+_0.42vw,16px)] h-[clamp(12px,9.33px_+_0.42vw,16px)] text-[#3386a9]" />
                            <span className="text-[clamp(12px,10.67px_+_0.21vw,14px)] text-black">{localizeLocation(job.location)}</span>
                          </div>
                        )}
                        {job.category && (
                          <div className="bg-[#efefef] px-[clamp(12px,9.33px_+_0.42vw,16px)] py-[clamp(6px,4.67px_+_0.21vw,8px)] rounded-full flex items-center gap-1.5">
                            <Briefcase className="w-[clamp(12px,9.33px_+_0.42vw,16px)] h-[clamp(12px,9.33px_+_0.42vw,16px)] text-[#3386a9]" />
                            <span className="text-[clamp(12px,10.67px_+_0.21vw,14px)] text-black">{job.category}</span>
                          </div>
                        )}
                        {job.sector && (
                          <div className="bg-[#efefef] px-[clamp(12px,9.33px_+_0.42vw,16px)] py-[clamp(6px,4.67px_+_0.21vw,8px)] rounded-full flex items-center gap-1.5">
                            <Layers className="w-[clamp(12px,9.33px_+_0.42vw,16px)] h-[clamp(12px,9.33px_+_0.42vw,16px)] text-[#3386a9]" />
                            <span className="text-[clamp(12px,10.67px_+_0.21vw,14px)] text-black">{job.sector}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Save — the one seeker action that lives in the hero; Apply and
                      Contact are their own row below (TD-19). */}
                  {isSeeker && (
                    <div className="flex flex-row lg:flex-col items-center lg:items-end gap-2 shrink-0">
                      <button
                        onClick={handleSaveJob}
                        disabled={saveLoading}
                        className="px-[clamp(16px,10.67px_+_0.83vw,24px)] py-3 rounded-lg flex items-center justify-center gap-2 transition-colors min-h-[48px] min-w-[120px] bg-[#eeeeee] hover:bg-gray-200 disabled:opacity-60"
                      >
                        {isSaved ? <BookmarkCheck className="w-5 h-5 text-primary-50" /> : <Bookmark className="w-5 h-5" />}
                        <span className="text-[clamp(14px,12.67px_+_0.21vw,16px)]">{saveLoading ? '...' : isSaved ? t('buttons.saved') : t('buttons.save')}</span>
                      </button>
                      {saveError && <p role="alert" className="text-xs text-red-500 text-right">{saveError}</p>}
                    </div>
                  )}
                </div>

                {/* Posted-time / views / applicants — lightweight social proof,
                    kept separate from the "Job Details" card's static facts
                    (openings, apply-by, ...). */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-4 pt-3.5 border-t border-gray-100 text-sm text-[#717182]">
                  <span>{relativeTime(job.postedAt ?? job.createdAt)}</span>
                  {viewCount != null && (
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" /> {t('seeker:jobDetails.views', { count: viewCount })}
                    </span>
                  )}
                  {applicationCount != null && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {t('seeker:jobDetails.applicants', { count: applicationCount })}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons — seeker-only. An employer viewing their own post
                  (DEF-023) gets the detail, not actions the backend would refuse.
                  Apply carries the strongest visual weight of the two. */}
              {isSeeker && (
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <button
                    onClick={() => setIsApplyModalOpen(true)}
                    disabled={hasApplied}
                    className="inline-flex items-center justify-center min-h-[48px] px-[clamp(32px,26.67px_+_0.83vw,40px)] py-3 bg-primary-50 text-primary-100 font-semibold rounded-lg hover:bg-primary-60 transition-colors text-[clamp(14px,12.67px_+_0.21vw,16px)] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {hasApplied ? t('seeker:jobDetails.applied') : t('buttons.apply')}
                  </button>
                  {/* Contact recruiter (PJP-113). Always shown: the per-job
                      showEmail/showPhone toggles this used to gate on were DROPPED by
                      the backend in fe246f1 (2026-08-06), so both read `undefined` and
                      the button rendered on NO job at all — the feature was invisible.
                      Employer contact is now unconditional by product decision (the
                      seeker side is free), and GET /jobs/:id/recruiter-contact no
                      longer filters. That endpoint stays a separate authenticated call
                      — GET /jobs/:id is public, so folding contact into the job payload
                      would hand every employer's email and phone to anonymous callers. */}
                  <button
                    onClick={() => setIsContactModalOpen(true)}
                    className="min-h-[48px] px-[clamp(24px,18.67px_+_0.83vw,32px)] py-3 border border-primary-50 text-primary-50 rounded-lg hover:bg-[#f0f9fc] transition-colors flex items-center justify-center gap-2 text-[clamp(14px,12.67px_+_0.21vw,16px)]"
                  >
                    <Phone className="w-5 h-5" />
                    {t('seeker:jobDetails.contactRecruiter')}
                  </button>
                </div>
              )}

              {/* Main content + sidebar. Sidebar stacks below on tablet/mobile —
                  plain DOM order, no grid-area juggling needed for that. */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-[clamp(24px,18.67px_+_0.83vw,32px)]">
                <div className="lg:col-span-2 min-w-0">
                  {/* Job Description */}
                  {descriptionLines.length > 0 && (
                    <section className="mb-6 sm:mb-8">
                      <h2 className="text-[clamp(20px,17.33px_+_0.42vw,24px)] font-semibold mb-3.5">{t('seeker:jobDetails.description')}</h2>
                      <div className="max-w-[720px] space-y-3">
                        {descriptionLines.map((line, i) => (
                          <p key={i} className="text-sm sm:text-base leading-relaxed text-black">{line}</p>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Skills & Qualifications */}
                  {(requirementLines.length > 0 || (job.skillsRequired?.length ?? 0) > 0) && (
                    <section className="mb-6 sm:mb-8">
                      <h2 className="text-[clamp(20px,17.33px_+_0.42vw,24px)] font-semibold mb-3.5">{t('seeker:jobDetails.skillsTitle')}</h2>
                      {requirementLines.length > 0 && (
                        <ul className="max-w-[720px] space-y-2.5 mb-5">
                          {requirementLines.map((line, i) => (
                            <li key={i} className="flex gap-3 text-sm sm:text-base leading-relaxed">
                              <span className="text-black mt-1.5">•</span>
                              <span className="flex-1 text-black">{line}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {(job.skillsRequired?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-2 sm:gap-3">
                          {job.skillsRequired!.map((skill) => (
                            <span key={skill} className="bg-[#e3f5ff] text-[#236987] px-3 py-1.5 rounded-full text-xs sm:text-sm">{skill}</span>
                          ))}
                        </div>
                      )}
                    </section>
                  )}

                  {/* Report this job (PJP-152) — trust affordance for scam/abusive
                      posts. Seeker-only, and deliberately the last, quietest thing
                      in the main column. */}
                  {isSeeker && (
                    <button
                      onClick={() => setIsReportModalOpen(true)}
                      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors pt-2"
                    >
                      <Flag className="w-4 h-4" />
                      {t('seeker:jobDetails.reportJob')}
                    </button>
                  )}
                </div>

                {/* Sidebar — a compact facts sheet, kept apart from the hero's
                    narrative presentation of the same handful of fields; the
                    repetition is intentional (this is the reference view). */}
                <div className="lg:col-span-1 min-w-0 space-y-5">
                  <div className="bg-[#f9fafb] rounded-xl p-5">
                    <h2 className="text-base font-semibold text-black mb-3.5">{t('breadcrumbs.jobDetails')}</h2>
                    <div className="space-y-3">
                      {openings != null && <InfoRow icon={Users}>{t('seeker:jobDetails.openings', { count: openings })}</InfoRow>}
                      {job.jobType && <InfoRow icon={Clock}>{humanizeJobType(job.jobType)}</InfoRow>}
                      {job.location && <InfoRow icon={MapPin}>{localizeLocation(job.location)}</InfoRow>}
                      {job.category && <InfoRow icon={Briefcase}>{job.category}</InfoRow>}
                      {job.sector && <InfoRow icon={Layers}>{job.sector}</InfoRow>}
                      <InfoRow icon={IndianRupee}>{salaryLine}</InfoRow>
                      {applyByDate && <InfoRow icon={CalendarDays}>{t('seeker:jobDetails.applyBy', { date: applyByDate })}</InfoRow>}
                    </div>
                  </div>

                  {/* About the Company — only for a real registered company; an
                      INDIVIDUAL employer has no `companyName` to show here.
                      Same card treatment as "Job Details" above (bg/radius/
                      padding/heading scale) so the two read as one family. */}
                  {employerCompanyName && (
                    <div className="bg-[#f9fafb] rounded-xl p-5">
                      <h2 className="text-base font-semibold text-black mb-3.5">{t('seeker:jobDetails.aboutCompany')}</h2>
                      <div className="space-y-3">
                        <InfoRow icon={Building2}>{employerCompanyName}</InfoRow>
                        {companySizeLabel && <InfoRow icon={Users}>{companySizeLabel}</InfoRow>}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Related Jobs */}
              {related.length > 0 && (
                <section className="mt-10 sm:mt-12 pt-6 sm:pt-8 border-t border-gray-100">
                  <h2 className="text-[clamp(20px,17.33px_+_0.42vw,24px)] font-semibold mb-5 sm:mb-6">{t('seeker:jobDetails.relatedJobs')}</h2>
                  {/* Capped at 2 columns, not 3 — on medium viewports (roughly
                      1024-1366px, well below where this page's own width cap
                      ever matters) a 3-up row leaves each card too narrow for
                      its own chip row: "Full Time" + a long category chip
                      stop sharing a line and each chip falls to its own row
                      instead. 2 columns keeps chips on one line at every
                      width this page renders at. */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-[clamp(16px,10.67px_+_0.83vw,24px)]">
                    {related.map((rel) => (
                      <Link key={rel.id} href={`/job-details/${rel.id}`} className="bg-white border border-[#dddddd] rounded-[10px] p-4 sm:p-5 hover:shadow-lg transition-shadow">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-[48px] h-[48px] bg-[#a9e5ff] rounded-lg flex items-center justify-center flex-shrink-0">
                              <span className="text-[20px] font-semibold text-[#236987]">{initials(companyOf(rel, t('seeker:jobCard.company')))}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-base sm:text-lg font-semibold break-words">{rel.title}</h3>
                              <p className="text-xs sm:text-sm text-gray-600">{companyOf(rel, t('seeker:jobCard.company'))}</p>
                            </div>
                          </div>
                          <span className="shrink-0 mt-0.5 text-xs text-[#717182] whitespace-nowrap">{relativeTime(rel.postedAt ?? rel.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1 mb-3 text-sm text-black font-medium">
                          <IndianRupee className="w-3.5 h-3.5 text-[#3386a9] shrink-0" />
                          {formatSalaryLine(rel.salaryMin, rel.salaryMax)}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {rel.jobType && (
                            <div className="bg-[#efefef] px-2.5 py-1 rounded-full flex items-center gap-1">
                              <Clock className="w-3 h-3 text-[#3386a9]" />
                              <span className="text-xs text-black">{humanizeJobType(rel.jobType)}</span>
                            </div>
                          )}
                          {rel.category && (
                            <div className="bg-[#efefef] px-2.5 py-1 rounded-full flex items-center gap-1">
                              <Briefcase className="w-3 h-3 text-[#3386a9]" />
                              <span className="text-xs text-black">{rel.category}</span>
                            </div>
                          )}
                          {rel.location && (
                            <div className="bg-[#efefef] px-2.5 py-1 rounded-full flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[#3386a9]" />
                              <span className="text-xs text-black">{localizeLocation(rel.location)}</span>
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {job && (
        <ApplyModal
          isOpen={isApplyModalOpen}
          onClose={() => setIsApplyModalOpen(false)}
          jobId={job.id}
          jobTitle={job.title}
          companyName={companyOf(job, t('seeker:jobCard.company'))}
          onApplied={() => setHasApplied(true)}
        />
      )}

      {job && (
        <ContactRecruiterModal
          isOpen={isContactModalOpen}
          onClose={() => setIsContactModalOpen(false)}
          jobId={job.id}
          companyName={companyOf(job, t('seeker:jobCard.company'))}
        />
      )}

      {job && (
        <ReportJobModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          jobId={job.id}
          jobTitle={job.title}
        />
      )}
    </div>
  )
}

// No `requiredRole` — any authenticated user (DEF-023). The employer's own
// "My Jobs > View" link lands here, and requiredRole="seeker" bounced them to
// their dashboard, so the link was broken for the only role it was shown to.
// Still authenticated-only, and every seeker action is hidden inside, so an
// employer sees the post as a seeker would without being offered actions the
// backend would refuse.
export default function JobDetailsPage() {
  return (
    <ProtectedRoute>
      <JobDetailsContent />
    </ProtectedRoute>
  )
}
