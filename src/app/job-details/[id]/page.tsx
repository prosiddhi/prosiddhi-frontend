'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { Footer } from '@/components/home/Footer'
import { ApplyModal } from '@/components/job/ApplyModal'
import { ContactRecruiterModal } from '@/components/job/ContactRecruiterModal'
import { ReportJobModal } from '@/components/job/ReportJobModal'
import { LanguageSwitcher } from '@/components/navigation/LanguageSwitcher'
import { jobSeekerAPI, type Job } from '@/lib/api'
import { humanizeJobType, formatSalaryLine, relativeTime, initials } from '@/lib/jobFormat'
import {
  Home,
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
} from 'lucide-react'
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'
import { HeaderActions } from '@/components/navigation/HeaderActions'

function companyOf(job: Job, fallback: string): string {
  return job.companyName || job.employer?.companyName || job.employer?.fullName || fallback
}

function JobDetailsContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useParams()
  const jobId = String(params?.id ?? '')

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

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header/Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[119px] h-[65px] sm:h-[75px] flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <div className="relative w-[100px] sm:w-[120px] lg:w-[142px] h-[28px] sm:h-[33px] lg:h-[39px]">
              <Image src="/assets/prosiddhi-logo-horizontal.png" alt={t('app.name')} fill className="object-contain" priority />
            </div>
          </Link>
          <nav className="hidden lg:flex items-center gap-8 xl:gap-11">
            <Link href="/" className="flex items-center gap-1 text-black hover:text-primary-50 transition-colors">
              <Home className="w-[18px] h-[18px]" />
              <span className="text-[18px]">{t('seeker:nav.home')}</span>
            </Link>
            <Link href="/job-feed" className="flex items-center gap-1 text-black hover:text-primary-50 transition-colors">
              <Briefcase className="w-[18px] h-[18px]" />
              <span className="text-[18px]">{t('seeker:nav.jobFeed')}</span>
            </Link>
            <Link href="/saved-jobs" className="flex items-center gap-1 text-black hover:text-primary-50 transition-colors">
              <Bookmark className="w-[18px] h-[18px]" />
              <span className="text-[18px]">{t('seeker:nav.savedJobs')}</span>
            </Link>
            <LanguageSwitcher />
          </nav>
          <HeaderActions />
        </div>
      </header>

      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px] pt-4">
        <Breadcrumbs />
      </div>


      <main className="flex-1 py-6 sm:py-8 lg:py-12">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px]">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-black hover:text-primary-50 transition-colors mb-6 sm:mb-8 lg:mb-10">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-base sm:text-lg">{t('seeker:jobDetails.back')}</span>
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
              <Link href="/job-feed" className="px-6 py-2 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors">
                {t('seeker:jobDetails.backToFeed')}
              </Link>
            </div>
          )}

          {!loading && !error && job && (
            <>
              {/* Job Header Card */}
              <div className="bg-white rounded-[10px] mb-8 sm:mb-10 lg:mb-12">
                <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-8">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-[68px] h-[68px] sm:w-[78px] sm:h-[78px] bg-[#a9e5ff] rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-[32px] sm:text-[40px] font-semibold text-[#236987]">{initials(companyOf(job, t('seeker:jobCard.company')))}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-bold mb-2 sm:mb-3">{job.title}</h1>
                      <p className="text-base sm:text-lg lg:text-[18px] text-black mb-4 sm:mb-5">{companyOf(job, t('seeker:jobCard.company'))}</p>

                      <div className="flex items-center gap-1 mb-4 sm:mb-5">
                        <IndianRupee className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-base sm:text-lg lg:text-[18px] font-medium">{formatSalaryLine(job.salaryMin, job.salaryMax)}</span>
                      </div>

                      <div className="flex flex-wrap gap-2 sm:gap-3">
                        {job.jobType && (
                          <div className="bg-[#efefef] px-3 sm:px-4 py-1.5 sm:py-2 rounded-full flex items-center gap-1.5">
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-[#3386a9]" />
                            <span className="text-xs sm:text-sm text-black">{humanizeJobType(job.jobType)}</span>
                          </div>
                        )}
                        {job.category && (
                          <div className="bg-[#efefef] px-3 sm:px-4 py-1.5 sm:py-2 rounded-full flex items-center gap-1.5">
                            <Briefcase className="w-3 h-3 sm:w-4 sm:h-4 text-[#3386a9]" />
                            <span className="text-xs sm:text-sm text-black">{job.category}</span>
                          </div>
                        )}
                        {job.location && (
                          <div className="bg-[#efefef] px-3 sm:px-4 py-1.5 sm:py-2 rounded-full flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-[#3386a9]" />
                            <span className="text-xs sm:text-sm text-black">{job.location}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 160px, not 300px: that reservation was sized for the
                      Save + Apply pair that used to live here, and the title
                      column is flex-1, so it paid for the unused width. */}
                  <div className="flex flex-col items-end gap-4 lg:min-w-[160px]">
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm sm:text-base text-black">{relativeTime(job.createdAt)}</span>
                      {viewCount != null && (
                        <span className="flex items-center gap-1 text-xs text-[#717182]">
                          <Eye className="w-3.5 h-3.5" /> {t('seeker:jobDetails.views', { count: viewCount })}
                        </span>
                      )}
                    </div>

                    {/* Save. Apply is in the action row below (TD-19). */}
                    {isSeeker && (
                      <>
                        <button
                          onClick={handleSaveJob}
                          disabled={saveLoading}
                          className="px-4 sm:px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors min-h-[48px] min-w-[120px] bg-[#eeeeee] hover:bg-gray-200 disabled:opacity-60"
                        >
                          {isSaved ? <BookmarkCheck className="w-5 h-5 text-primary-50" /> : <Bookmark className="w-5 h-5" />}
                          <span className="text-sm sm:text-base">{saveLoading ? '...' : isSaved ? t('buttons.saved') : t('buttons.save')}</span>
                        </button>
                        {saveError && <p role="alert" className="text-xs text-red-500 text-right">{saveError}</p>}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons — seeker-only. An employer viewing their own post
                  (DEF-023) gets the detail, not actions the backend would refuse.
                  Sits above the description, matching the mobile job detail (TD-19). */}
              {isSeeker && (
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8 sm:mb-10 lg:mb-12">
                  <button
                    onClick={() => setIsApplyModalOpen(true)}
                    disabled={hasApplied}
                    className="inline-flex items-center justify-center min-h-[48px] px-6 sm:px-8 py-3 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors text-sm sm:text-base disabled:opacity-60 disabled:cursor-not-allowed"
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
                    className="min-h-[48px] px-6 sm:px-8 py-3 border border-primary-50 text-primary-50 rounded-lg hover:bg-[#f0f9fc] transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
                  >
                    <Phone className="w-5 h-5" />
                    {t('seeker:jobDetails.contactRecruiter')}
                  </button>
                </div>
              )}

              {/* Job Description */}
              {descriptionLines.length > 0 && (
                <section className="mb-8 sm:mb-10 lg:mb-12">
                  <h2 className="text-xl sm:text-2xl lg:text-[32px] font-semibold mb-4 sm:mb-6">{t('seeker:jobDetails.description')}</h2>
                  <div className="space-y-3 sm:space-y-4">
                    {descriptionLines.map((line, i) => (
                      <p key={i} className="text-sm sm:text-base lg:text-[16px] leading-relaxed text-black">{line}</p>
                    ))}
                  </div>
                </section>
              )}

              {/* Skills & Qualifications */}
              {(requirementLines.length > 0 || (job.skillsRequired?.length ?? 0) > 0) && (
                <section className="mb-8 sm:mb-10 lg:mb-12">
                  <h2 className="text-xl sm:text-2xl lg:text-[32px] font-semibold mb-4 sm:mb-6">{t('seeker:jobDetails.skillsTitle')}</h2>
                  {requirementLines.length > 0 && (
                    <ul className="space-y-3 sm:space-y-4 mb-6">
                      {requirementLines.map((line, i) => (
                        <li key={i} className="flex gap-3 text-sm sm:text-base lg:text-[16px] leading-relaxed">
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

              {/* Report this job (PJP-152) — trust affordance for scam/abusive posts.
                  Seeker-only: the report route is authorize(JOB_SEEKER), and an
                  employer reporting posts is not a flow we have. */}
              {isSeeker && (
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors mb-12 sm:mb-16 lg:mb-20"
              >
                <Flag className="w-4 h-4" />
                {t('seeker:jobDetails.reportJob')}
              </button>
              )}

              {/* Related Jobs */}
              {related.length > 0 && (
                <section>
                  <h2 className="text-xl sm:text-2xl lg:text-[32px] font-semibold mb-6 sm:mb-8 lg:mb-10">{t('seeker:jobDetails.relatedJobs')}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
                    {related.map((rel) => (
                      <Link key={rel.id} href={`/job-details/${rel.id}`} className="bg-white border border-[#dddddd] rounded-[10px] p-4 sm:p-5 lg:p-6 hover:shadow-lg transition-shadow">
                        <div className="flex items-start gap-3 sm:gap-4 mb-4">
                          <div className="w-[48px] h-[48px] bg-[#a9e5ff] rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-[20px] font-semibold text-[#236987]">{initials(companyOf(rel, t('seeker:jobCard.company')))}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base sm:text-lg font-semibold mb-1">{rel.title}</h3>
                            <p className="text-xs sm:text-sm text-gray-600">{companyOf(rel, t('seeker:jobCard.company'))}</p>
                          </div>
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
                              <span className="text-xs text-black">{rel.location}</span>
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
