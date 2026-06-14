'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { UserDropdown } from '@/components/navigation/UserDropdown'
import { employerAPI, type Job } from '@/lib/api'
import { formatSalary, humanizeJobType, relativeTime } from '@/lib/jobFormat'
import {
  Plus,
  MapPin,
  IndianRupee,
  Clock,
  Users,
  Eye,
  Pencil,
  Power,
  PowerOff,
  Trash2,
  Loader2,
  AlertCircle,
  Briefcase,
} from 'lucide-react'

type Tab = 'active' | 'expired'

// BE getEmployerJobs (the "active" feed) has no status filter — it returns every
// job the employer owns, including the FILLED/CLOSED/CANCELLED ones that also show
// under the Expired tab. Filter those out client-side so a job never appears in
// both tabs and the "Active" label stays honest.
const EXPIRED_STATUSES = new Set(['FILLED', 'CLOSED', 'CANCELLED'])

function MyJobsContent() {
  const [tab, setTab] = useState<Tab>('active')
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [actioningId, setActioningId] = useState<string | null>(null)

  useEffect(() => {
    let ignore = false
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const res = tab === 'active'
          ? await employerAPI.getMyJobs(1, 50)
          : await employerAPI.getMyExpiredJobs(1, 50)
        const list = tab === 'active'
          ? res.jobs.filter((j) => !EXPIRED_STATUSES.has((j.status ?? '').toUpperCase()))
          : res.jobs
        if (!ignore) setJobs(list)
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : 'Failed to load your jobs. Please try again.')
          setJobs([])
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    run()
    return () => {
      ignore = true
    }
  }, [tab, reloadKey])

  const runAction = async (fn: () => Promise<unknown>, id: string) => {
    if (actioningId) return
    setActioningId(id)
    try {
      await fn()
      setReloadKey((k) => k + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed. Please try again.')
    } finally {
      setActioningId(null)
    }
  }

  const handleDelete = (id: string) => {
    if (!window.confirm('Delete this job? This cannot be undone.')) return
    runAction(() => employerAPI.deleteJob(id), id)
  }

  return (
    <div className="min-h-screen bg-[#f7fbfd] flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[119px] h-[65px] sm:h-[75px] flex items-center justify-between">
          <Link href="/employer/workers" className="flex items-center">
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
          <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-bold text-black mb-6 sm:mb-8">My Jobs</h1>

          {/* Tabs */}
          <div className="flex gap-2 sm:gap-3 mb-6 border-b border-gray-200">
            {([
              { key: 'active', label: 'Active' },
              { key: 'expired', label: 'Expired' },
            ] as { key: Tab; label: string }[]).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 sm:px-6 py-3 text-sm sm:text-base font-medium border-b-2 -mb-px transition-colors ${
                  tab === t.key ? 'border-primary-50 text-primary-50' : 'border-transparent text-[#717182] hover:text-black'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-[#717182]">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary-50" />
              <p>Loading your jobs...</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
              <p className="text-red-600 mb-4 max-w-md">{error}</p>
              <button onClick={() => setReloadKey((k) => k + 1)} className="px-6 py-2 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors">
                Retry
              </button>
            </div>
          )}

          {!loading && !error && jobs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center text-[#717182]">
              <Briefcase className="w-12 h-12 mb-4 text-gray-300" />
              <p className="text-lg font-medium text-black mb-1">{tab === 'active' ? 'No active jobs' : 'No expired jobs'}</p>
              <p className="max-w-md mb-6">
                {tab === 'active' ? 'Post a job to start receiving applications.' : 'Jobs that are filled, closed, or past their expiry appear here.'}
              </p>
              {tab === 'active' && (
                <Link href="/employer/jobs/new" className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors text-sm">
                  <Plus className="w-4 h-4" /> Post a Job
                </Link>
              )}
            </div>
          )}

          {!loading && !error && jobs.length > 0 && (
            <div className="space-y-4 sm:space-y-5">
              {jobs.map((job) => {
                const busy = actioningId === job.id
                const isActive = job.status === 'ACTIVE'
                return (
                  <div key={job.id} className="bg-white border border-[#dddddd] rounded-[10px] p-4 sm:p-6">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-6">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-lg sm:text-xl font-semibold text-black">{job.title}</h3>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${isActive ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {job.status ? job.status.charAt(0) + job.status.slice(1).toLowerCase() : 'Unknown'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-[#717182]">
                          <span className="flex items-center gap-1"><IndianRupee className="w-4 h-4" />{formatSalary(job.salaryMin, job.salaryMax)}</span>
                          {job.jobType && <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{humanizeJobType(job.jobType)}</span>}
                          {job.location && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{job.location}</span>}
                          {typeof job.viewCount === 'number' && <span className="flex items-center gap-1"><Eye className="w-4 h-4" />{job.viewCount} views</span>}
                        </div>
                        <p className="text-xs text-[#9a9aa5] mt-2">Posted {relativeTime(job.createdAt)}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/employer/candidates?jobId=${job.id}`} className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                          <Users className="w-4 h-4" /> Candidates
                        </Link>
                        <Link href={`/job-details/${job.id}`} className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                          <Eye className="w-4 h-4" /> View
                        </Link>
                        <Link href={`/employer/jobs/${job.id}/edit`} className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                          <Pencil className="w-4 h-4" /> Edit
                        </Link>
                        {isActive ? (
                          <button
                            onClick={() => runAction(() => employerAPI.deactivateJob(job.id), job.id)}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 px-3 py-2 border border-amber-300 text-amber-700 rounded-lg text-sm hover:bg-amber-50 transition-colors disabled:opacity-60"
                          >
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <PowerOff className="w-4 h-4" />} Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => runAction(() => employerAPI.activateJob(job.id), job.id)}
                            disabled={busy}
                            className="inline-flex items-center gap-1.5 px-3 py-2 border border-green-300 text-green-700 rounded-lg text-sm hover:bg-green-50 transition-colors disabled:opacity-60"
                          >
                            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />} Activate
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(job.id)}
                          disabled={busy}
                          className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-colors disabled:opacity-60"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default function MyJobsPage() {
  return (
    <ProtectedRoute requiredRole="employer">
      <MyJobsContent />
    </ProtectedRoute>
  )
}
