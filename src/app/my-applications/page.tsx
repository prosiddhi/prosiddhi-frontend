'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { Suspense, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Footer } from '@/components/home/Footer'
import { jobSeekerAPI, type Application } from '@/lib/api'
import { ApplicationCard } from '@/components/job/ApplicationCard'
import { statusMeta, APPLICATION_STATUSES } from '@/lib/applicationStatus'
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

function pageUrl(status: string, page: number) {
  const qs = new URLSearchParams()
  if (status) qs.set('status', status)
  if (page > 1) qs.set('page', String(page))
  const query = qs.toString()
  return query ? `/my-applications?${query}` : '/my-applications'
}

function MyApplicationsPageContent() {
  const { t } = useTranslation()
  const [items, setItems] = useState<Application[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  // Filter + page live in the URL so Back from an application restores them.
  // Anything that is not a known status / positive integer falls back to the default.
  const router = useRouter()
  const searchParams = useSearchParams()
  const statusParam = searchParams.get('status')?.toUpperCase() ?? ''
  const statusFilter = APPLICATION_STATUSES.includes(statusParam) ? statusParam : ''
  const pageParam = Number.parseInt(searchParams.get('page') ?? '', 10)
  const page = pageParam > 0 ? pageParam : 1

  const changeFilter = (status: string) => router.push(pageUrl(status, 1), { scroll: false })
  const goToPage = (nextPage: number) => router.push(pageUrl(statusFilter, nextPage), { scroll: false })

  useEffect(() => {
    let ignore = false
    let redirected = false
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await jobSeekerAPI.getMyApplications(page, PAGE_SIZE, statusFilter || undefined)
        if (!ignore && res.applications.length === 0 && page > 1 && res.pagination.totalPages > 0) {
          // A typed or stale ?page= past the end: jump to the last real page.
          redirected = true
          router.replace(pageUrl(statusFilter, res.pagination.totalPages), { scroll: false })
        } else if (!ignore) {
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
        if (!ignore && !redirected) setLoading(false)
      }
    }
    run()
    return () => {
      ignore = true
    }
  }, [page, statusFilter, reloadKey, router, t])

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <EmployeeHeader />

      {/* Main Content */}
      <main className="flex-1 py-8 sm:py-12 lg:py-16">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px]">
          {/* Page Header */}
          <div className="mb-4 sm:mb-5 lg:mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
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

          {/* Status filter */}
          <div
            role="group"
            aria-label={t('seeker:myApplications.filterLabel')}
            className="mb-6 flex flex-wrap gap-2"
          >
            {['', ...APPLICATION_STATUSES].map((status) => {
              const active = statusFilter === status
              return (
                <button
                  key={status || 'all'}
                  type="button"
                  aria-pressed={active}
                  onClick={() => changeFilter(status)}
                  className={`min-h-[44px] px-4 rounded-full border text-sm sm:text-base transition-colors ${
                    active
                      ? 'bg-primary-50 border-primary-50 text-primary-100 font-medium'
                      : 'bg-white border-[#dddddd] text-black hover:bg-gray-100'
                  }`}
                >
                  {status ? statusMeta(status).label : t('seeker:myApplications.filterAll')}
                </button>
              )
            })}
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
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-3 text-center">
                {t(statusFilter ? 'seeker:myApplications.emptyFilteredTitle' : 'seeker:myApplications.emptyTitle')}
              </h2>
              <p className="text-sm sm:text-base text-[#717182] mb-6 text-center max-w-md">
                {t(statusFilter ? 'seeker:myApplications.emptyFilteredBody' : 'seeker:myApplications.emptyBody')}
              </p>
              {statusFilter ? (
                <button
                  type="button"
                  onClick={() => changeFilter('')}
                  className="px-6 py-3 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors"
                >
                  {t('seeker:myApplications.showAll')}
                </button>
              ) : (
                <Link
                  href="/job-feed"
                  className="px-6 py-3 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors"
                >
                  {t('seeker:myApplications.browseJobs')}
                </Link>
              )}
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && items.length > 0 && totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8 sm:mt-10 lg:mt-12">
              <button
                disabled={page <= 1}
                onClick={() => goToPage(Math.max(1, page - 1))}
                className="w-11 h-11 flex items-center justify-center border border-[#dddddd] rounded bg-[#eeeeee] hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {totalPages <= 10 ? (
                Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToPage(i + 1)}
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
                onClick={() => goToPage(Math.min(totalPages, page + 1))}
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
      {/* useSearchParams needs a Suspense boundary for the production build */}
      <Suspense>
        <MyApplicationsPageContent />
      </Suspense>
    </ProtectedRoute>
  )
}
