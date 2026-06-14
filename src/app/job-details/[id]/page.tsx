'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { Footer } from '@/components/home/Footer'
import { ApplyModal } from '@/components/job/ApplyModal'
import { UserDropdown } from '@/components/navigation/UserDropdown'
import { jobSeekerAPI, type Job } from '@/lib/api'
import { humanizeJobType, formatSalary, relativeTime, initials } from '@/lib/jobFormat'
import {
  Mail,
  Bell,
  Home,
  Briefcase,
  Bookmark,
  Languages,
  Clock,
  MapPin,
  IndianRupee,
  ChevronLeft,
  Phone,
  BookmarkCheck,
  Eye,
  Loader2,
  AlertCircle,
} from 'lucide-react'

function companyOf(job: Job): string {
  return job.companyName || job.employer?.companyName || job.employer?.fullName || 'Company'
}

function JobDetailsContent() {
  const router = useRouter()
  const params = useParams()
  const jobId = String(params?.id ?? '')

  const [job, setJob] = useState<Job | null>(null)
  const [related, setRelated] = useState<Job[]>([])
  const [isSaved, setIsSaved] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false)

  useEffect(() => {
    if (!jobId) return
    let ignore = false
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const j = await jobSeekerAPI.getJobDetails(jobId)
        if (ignore) return
        setJob(j)
        // Related + saved status are non-critical — don't fail the page on them.
        const [rel, saved] = await Promise.allSettled([
          jobSeekerAPI.getRelatedJobs(jobId),
          jobSeekerAPI.isJobSaved(jobId),
        ])
        if (ignore) return
        if (rel.status === 'fulfilled') setRelated(rel.value.relatedJobs ?? [])
        if (saved.status === 'fulfilled') setIsSaved(!!saved.value.isSaved)
      } catch (err) {
        if (!ignore) setError(err instanceof Error ? err.message : 'Failed to load this job.')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    run()
    return () => {
      ignore = true
    }
  }, [jobId])

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
      setSaveError('Could not update saved status.')
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
              <Image src="/assets/logo.png" alt="Job Portal Logo" fill className="object-contain" priority />
            </div>
          </Link>
          <nav className="hidden lg:flex items-center gap-8 xl:gap-11">
            <Link href="/" className="flex items-center gap-1 text-black hover:text-primary-50 transition-colors">
              <Home className="w-[18px] h-[18px]" />
              <span className="text-[18px]">Home</span>
            </Link>
            <Link href="/job-feed" className="flex items-center gap-1 text-black hover:text-primary-50 transition-colors">
              <Briefcase className="w-[18px] h-[18px]" />
              <span className="text-[18px]">Job Feed</span>
            </Link>
            <Link href="/saved-jobs" className="flex items-center gap-1 text-black hover:text-primary-50 transition-colors">
              <Bookmark className="w-[18px] h-[18px]" />
              <span className="text-[18px]">Saved Jobs</span>
            </Link>
            <button className="flex items-center gap-1 text-black hover:text-primary-50 transition-colors">
              <Languages className="w-[16px] h-[16px]" />
              <span className="text-[18px]">Languages: English</span>
            </button>
          </nav>
          <div className="flex items-center gap-4 sm:gap-6 lg:gap-8">
            <button className="hidden sm:block hover:text-primary-50 transition-colors"><Mail className="w-5 h-5 sm:w-6 sm:h-6" /></button>
            <button className="hidden sm:block hover:text-primary-50 transition-colors"><Bell className="w-5 h-5 sm:w-6 sm:h-6" /></button>
            <UserDropdown />
          </div>
        </div>
      </header>

      <main className="flex-1 py-6 sm:py-8 lg:py-12">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px]">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-black hover:text-primary-50 transition-colors mb-6 sm:mb-8 lg:mb-10">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-base sm:text-lg">Back</span>
          </button>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-24 text-[#717182]">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary-50" />
              <p>Loading job...</p>
            </div>
          )}

          {/* Error / not found */}
          {!loading && (error || !job) && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
              <p className="text-red-600 mb-4 max-w-md">{error || 'Job not found.'}</p>
              <Link href="/job-feed" className="px-6 py-2 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors">
                Back to Job Feed
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
                      <span className="text-[32px] sm:text-[40px] font-semibold text-[#236987]">{initials(companyOf(job))}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-bold mb-2 sm:mb-3">{job.title}</h1>
                      <p className="text-base sm:text-lg lg:text-[18px] text-black mb-4 sm:mb-5">{companyOf(job)}</p>

                      <div className="flex items-center gap-1 mb-4 sm:mb-5">
                        <IndianRupee className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-base sm:text-lg lg:text-[18px] font-medium">{formatSalary(job.salaryMin, job.salaryMax)} / Month</span>
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

                  <div className="flex flex-col items-end gap-4 lg:min-w-[300px]">
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm sm:text-base text-black">{relativeTime(job.createdAt)}</span>
                      {viewCount != null && (
                        <span className="flex items-center gap-1 text-xs text-[#717182]">
                          <Eye className="w-3.5 h-3.5" /> {viewCount} views
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full lg:w-auto">
                      <button
                        onClick={handleSaveJob}
                        disabled={saveLoading}
                        className="px-4 sm:px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors min-w-[120px] bg-[#eeeeee] hover:bg-gray-200 disabled:opacity-60"
                      >
                        {isSaved ? <BookmarkCheck className="w-5 h-5 text-primary-50" /> : <Bookmark className="w-5 h-5" />}
                        <span className="text-sm sm:text-base">{saveLoading ? '...' : isSaved ? 'Saved' : 'Save'}</span>
                      </button>
                      <button
                        onClick={() => setIsApplyModalOpen(true)}
                        className="px-4 sm:px-6 py-3 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors min-w-[140px] text-sm sm:text-base"
                      >
                        Apply
                      </button>
                    </div>
                    {saveError && <p className="text-xs text-red-500 text-right">{saveError}</p>}
                  </div>
                </div>
              </div>

              {/* Job Description */}
              {descriptionLines.length > 0 && (
                <section className="mb-8 sm:mb-10 lg:mb-12">
                  <h2 className="text-xl sm:text-2xl lg:text-[32px] font-semibold mb-4 sm:mb-6">Job Description</h2>
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
                  <h2 className="text-xl sm:text-2xl lg:text-[32px] font-semibold mb-4 sm:mb-6">Skills &amp; Qualifications</h2>
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

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-12 sm:mb-16 lg:mb-20">
                <button
                  onClick={() => setIsApplyModalOpen(true)}
                  className="px-6 sm:px-8 py-3 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors text-sm sm:text-base"
                >
                  Apply
                </button>
                {/* Contact-recruiter gating is PJP-113 — placeholder for now. */}
                <button
                  disabled
                  title="Contact recruiter — coming soon"
                  className="px-6 sm:px-8 py-3 border border-gray-300 rounded-lg text-gray-400 cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <Phone className="w-5 h-5" />
                  Contact the Recruiter
                </button>
              </div>

              {/* Related Jobs */}
              {related.length > 0 && (
                <section>
                  <h2 className="text-xl sm:text-2xl lg:text-[32px] font-semibold mb-6 sm:mb-8 lg:mb-10">Related Jobs</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
                    {related.map((rel) => (
                      <Link key={rel.id} href={`/job-details/${rel.id}`} className="bg-white border border-[#dddddd] rounded-[10px] p-4 sm:p-5 lg:p-6 hover:shadow-lg transition-shadow">
                        <div className="flex items-start gap-3 sm:gap-4 mb-4">
                          <div className="w-[48px] h-[48px] bg-[#a9e5ff] rounded-lg flex items-center justify-center flex-shrink-0">
                            <span className="text-[20px] font-semibold text-[#236987]">{initials(companyOf(rel))}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base sm:text-lg font-semibold mb-1">{rel.title}</h3>
                            <p className="text-xs sm:text-sm text-gray-600">{companyOf(rel)}</p>
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
          jobTitle={job.title}
          companyName={companyOf(job)}
        />
      )}
    </div>
  )
}

export default function JobDetailsPage() {
  return (
    <ProtectedRoute requiredRole="seeker">
      <JobDetailsContent />
    </ProtectedRoute>
  )
}
