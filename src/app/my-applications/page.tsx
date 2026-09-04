'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { Footer } from '@/components/home/Footer'
import { jobSeekerAPI, type Application } from '@/lib/api'
import { ApplicationCard } from '@/components/job/ApplicationCard'
import {
  Briefcase,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CalendarClock,
} from 'lucide-react'
import { EmployeeHeader } from '@/components/navigation/EmployeeHeader'

const PAGE_SIZE = 10

function MyApplicationsPageContent() {
  const { t } = useTranslation()
  const [items, setItems] = useState<Application[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let ignore = false
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await jobSeekerAPI.getMyApplications(page, PAGE_SIZE)
        if (!ignore) {
          setItems(res.applications)
          setTotal(res.pagination.total)
          setTotalPages(res.pagination.totalPages || 1)
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : t('seeker:myApplications.loadError'))
          setItems([])
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    run()
    return () => {
      ignore = true
    }
  }, [page, reloadKey, t])

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <EmployeeHeader />

      {/* Main Content */}
      <main className="flex-1 py-8 sm:py-12 lg:py-16">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px]">
          {/* Page Header */}
          <div className="mb-8 sm:mb-10 lg:mb-12 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-bold text-black mb-2">
                {t('seeker:myApplications.title')}
              </h1>
              {!loading && !error && (
                <p className="text-sm sm:text-base text-[#717182]">{t('seeker:myApplications.count', { count: total })}</p>
              )}
            </div>
            <Link
              href="/my-interviews"
              className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 border border-primary-50 text-primary-50 rounded-lg hover:bg-[#f0f9fc] transition-colors text-sm sm:text-base self-start"
            >
              <CalendarClock className="w-4 h-4" />
              {t('seeker:myApplications.myInterviews')}
            </Link>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-[#717182]">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary-50" />
              <p>{t('seeker:myApplications.loading')}</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
              <p className="text-red-600 mb-4 max-w-md">{error}</p>
              <button
                onClick={() => setReloadKey((k) => k + 1)}
                className="px-6 py-2 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors"
              >
                {t('buttons.retry')}
              </button>
            </div>
          )}

          {/* Applied Jobs List */}
          {!loading && !error && items.length > 0 && (
            <div className="space-y-4 sm:space-y-5 lg:space-y-6">
              {items.map((app) => (
                <ApplicationCard key={app.id} application={app} />
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 lg:py-24">
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <Briefcase className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400" />
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-3">
                {t('seeker:myApplications.emptyTitle')}
              </h2>
              <p className="text-sm sm:text-base text-[#717182] mb-6 text-center max-w-md">
                {t('seeker:myApplications.emptyBody')}
              </p>
              <Link
                href="/job-feed"
                className="px-6 py-3 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors"
              >
                {t('seeker:myApplications.browseJobs')}
              </Link>
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && items.length > 0 && totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8 sm:mt-10 lg:mt-12">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="w-11 h-11 flex items-center justify-center border border-[#dddddd] rounded bg-[#eeeeee] hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {totalPages <= 10 ? (
                Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`w-11 h-11 flex items-center justify-center rounded text-base transition-colors ${
                      page === i + 1 ? 'bg-primary-50 text-primary-100' : 'hover:bg-gray-100'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))
              ) : (
                <span className="px-3 text-sm text-[#717182]">{t('seeker:jobFeed.pageOf', { page, total: totalPages })}</span>
              )}

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="w-11 h-11 flex items-center justify-center border border-[#dddddd] rounded bg-[#eeeeee] hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}

export default function MyApplicationsPage() {
  return (
    <ProtectedRoute requiredRole="seeker">
      <MyApplicationsPageContent />
    </ProtectedRoute>
  )
}
