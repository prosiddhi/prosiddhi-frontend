'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { UserDropdown } from '@/components/navigation/UserDropdown'
import {
  employerAPI,
  type EmployerDashboardStats,
  type EmployerDashboardJob,
  type RecentApplication,
} from '@/lib/api'
import { relativeTime, initials } from '@/lib/jobFormat'
import { statusMeta } from '@/lib/applicationStatus'
import {
  Plus,
  Briefcase,
  Users,
  Clock,
  CheckCircle2,
  Star,
  Loader2,
  AlertCircle,
  MapPin,
} from 'lucide-react'

function StatTile({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#dddddd] rounded-[10px] p-4 sm:p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-lg bg-[#e3f5ff] flex items-center justify-center flex-shrink-0 text-[#236987]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-black leading-tight">{value}</p>
        <p className="text-xs sm:text-sm text-[#717182] truncate">{label}</p>
      </div>
    </div>
  )
}

function EmployerDashboardContent() {
  const [stats, setStats] = useState<EmployerDashboardStats | null>(null)
  const [jobs, setJobs] = useState<EmployerDashboardJob[]>([])
  const [recent, setRecent] = useState<RecentApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let ignore = false
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        // Fetch the three panels in parallel; tolerate partial failures so one
        // slow/erroring panel doesn't blank the whole dashboard.
        const [s, j, r] = await Promise.allSettled([
          employerAPI.getDashboardStats(),
          employerAPI.getDashboardJobs(1, 5),
          employerAPI.getRecentApplications(5),
        ])
        if (ignore) return
        if (s.status === 'fulfilled') setStats(s.value)
        if (j.status === 'fulfilled') setJobs(j.value.jobs)
        if (r.status === 'fulfilled') setRecent(r.value.applications)
        // Only treat it as a page error if everything failed.
        if (s.status === 'rejected' && j.status === 'rejected' && r.status === 'rejected') {
          setError(s.reason instanceof Error ? s.reason.message : 'Failed to load your dashboard.')
        }
      } catch (err) {
        if (!ignore) setError(err instanceof Error ? err.message : 'Failed to load your dashboard.')
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    run()
    return () => {
      ignore = true
    }
  }, [reloadKey])

  return (
    <div className="min-h-screen bg-[#f7fbfd] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[119px] h-[65px] sm:h-[75px] flex items-center justify-between">
          <Link href="/employer" className="flex items-center">
            <div className="relative w-[100px] sm:w-[120px] lg:w-[142px] h-[28px] sm:h-[33px] lg:h-[39px]">
              <Image src="/assets/logo.png" alt="Job Portal Logo" fill className="object-contain" priority />
            </div>
          </Link>
          <div className="flex items-center gap-3 sm:gap-5">
            <Link
              href="/employer/jobs/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors text-sm sm:text-base"
            >
              <Plus className="w-4 h-4" />
              Post a Job
            </Link>
            <UserDropdown />
          </div>
        </div>
      </header>

      <main className="flex-1 py-8 sm:py-10 lg:py-12">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px]">
          <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-bold text-black mb-6 sm:mb-8">
            Dashboard
          </h1>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-[#717182]">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary-50" />
              <p>Loading your dashboard...</p>
            </div>
          )}

          {/* Error (only when everything failed) */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
              <p className="text-red-600 mb-4 max-w-md">{error}</p>
              <button
                onClick={() => setReloadKey((k) => k + 1)}
                className="px-6 py-2 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && (
            <>
              {/* Stats */}
              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-8 sm:mb-10">
                  <StatTile label="Total Jobs" value={stats.totalJobPosts} icon={<Briefcase className="w-5 h-5" />} />
                  <StatTile label="Active Jobs" value={stats.activeJobs} icon={<CheckCircle2 className="w-5 h-5" />} />
                  <StatTile label="Applications" value={stats.totalApplications} icon={<Users className="w-5 h-5" />} />
                  <StatTile label="Pending" value={stats.pendingApplications} icon={<Clock className="w-5 h-5" />} />
                  <StatTile label="Shortlisted" value={stats.shortlistedApplications} icon={<Star className="w-5 h-5" />} />
                  <StatTile label="Accepted" value={stats.acceptedApplications} icon={<CheckCircle2 className="w-5 h-5" />} />
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
                {/* Your Jobs */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl sm:text-2xl font-semibold text-black">Your Jobs</h2>
                    <Link href="/employer/jobs" className="text-sm text-primary-50 hover:underline">Manage all</Link>
                  </div>
                  {jobs.length > 0 ? (
                    <div className="space-y-3 sm:space-y-4">
                      {jobs.map((job) => (
                        <div key={job.id} className="bg-white border border-[#dddddd] rounded-[10px] p-4 sm:p-5">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <h3 className="text-base sm:text-lg font-semibold text-black min-w-0 truncate">{job.title}</h3>
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                                job.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {job.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-[#717182]">
                            <span><span className="font-semibold text-black">{job.applicationCount ?? 0}</span> applicants</span>
                            <span><span className="font-semibold text-black">{job.pendingCount}</span> pending</span>
                            <span><span className="font-semibold text-black">{job.shortlistedCount}</span> shortlisted</span>
                            <span><span className="font-semibold text-black">{job.acceptedCount}</span> accepted</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white border border-dashed border-[#dddddd] rounded-[10px] p-8 text-center text-[#717182]">
                      <Briefcase className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                      <p className="mb-4">You haven&apos;t posted any jobs yet.</p>
                      <Link href="/employer/post-job" className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors text-sm">
                        <Plus className="w-4 h-4" /> Post your first job
                      </Link>
                    </div>
                  )}
                </section>

                {/* Recent Applications */}
                <section>
                  <h2 className="text-xl sm:text-2xl font-semibold text-black mb-4">Recent Applications</h2>
                  {recent.length > 0 ? (
                    <div className="space-y-3 sm:space-y-4">
                      {recent.map((app) => {
                        const meta = statusMeta(app.status)
                        return (
                          <div key={app.id} className="bg-white border border-[#dddddd] rounded-[10px] p-4 sm:p-5 flex items-center gap-4">
                            <div className="w-11 h-11 bg-[#a9e5ff] rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-semibold text-[#236987]">{initials(app.applicant.name)}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm sm:text-base font-medium text-black truncate">{app.applicant.name || 'Applicant'}</p>
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
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="bg-white border border-dashed border-[#dddddd] rounded-[10px] p-8 text-center text-[#717182]">
                      <Users className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                      <p>No applications yet. They&apos;ll appear here as candidates apply.</p>
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
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
