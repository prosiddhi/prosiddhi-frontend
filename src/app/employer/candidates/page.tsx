'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { Suspense, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { UserDropdown } from '@/components/navigation/UserDropdown'
import { employerAPI, type EmployerApplicationItem } from '@/lib/api'
import { relativeTime, initials } from '@/lib/jobFormat'
import { statusMeta } from '@/lib/applicationStatus'
import {
  Search,
  MapPin,
  Users,
  Loader2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react'

type Tab = { key: string; label: string; status?: string }

const TABS: Tab[] = [
  { key: 'all', label: 'All' },
  { key: 'accepted', label: 'Accepted', status: 'ACCEPTED' },
  { key: 'shortlisted', label: 'Shortlisted', status: 'SHORTLISTED' },
  { key: 'rejected', label: 'Rejected', status: 'REJECTED' },
  { key: 'bookmarked', label: 'Bookmarked', status: 'BOOKMARKED' },
]

function CandidatesContent() {
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const jobId = searchParams.get('jobId') ?? undefined

  const [tabKey, setTabKey] = useState('all')
  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<EmployerApplicationItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const activeStatus = TABS.find((t) => t.key === tabKey)?.status

  useEffect(() => {
    let ignore = false
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await employerAPI.getEmployerAllApplications({
          page: 1,
          limit: 50,
          jobId,
          status: activeStatus,
          search: search || undefined,
        })
        if (!ignore) {
          setItems(res.applications)
          setTotal(res.pagination.total)
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : t('employer:candidates.loadFailed'))
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
  }, [activeStatus, search, jobId, reloadKey])

  return (
    <div className="min-h-screen bg-[#f7fbfd] flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[119px] h-[65px] sm:h-[75px] flex items-center justify-between">
          <Link href="/employer" className="flex items-center">
            <div className="relative w-[100px] sm:w-[120px] lg:w-[142px] h-[28px] sm:h-[33px] lg:h-[39px]">
              <Image src="/assets/prosiddhi-logo-horizontal.png" alt={t('employer:candidates.logoAlt')} fill className="object-contain" priority />
            </div>
          </Link>
          <UserDropdown />
        </div>
      </header>

      <main className="flex-1 py-8 sm:py-10 lg:py-12">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px]">
          <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-bold text-black mb-2">{t('employer:candidates.title')}</h1>
          {!loading && !error && (
            <p className="text-sm sm:text-base text-[#717182] mb-6">{jobId ? t('employer:candidates.countForJob', { count: total }) : t('employer:candidates.count', { count: total })}</p>
          )}

          {/* Search */}
          <div className="flex gap-3 mb-6 max-w-xl">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setSearch(searchDraft.trim())}
                placeholder={t('employer:candidates.searchPlaceholder')}
                className="w-full h-11 pl-10 pr-4 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-50"
              />
            </div>
            <button onClick={() => setSearch(searchDraft.trim())} className="h-11 px-5 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors text-sm">
              {t('employer:candidates.search')}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 sm:gap-3 mb-6 border-b border-gray-200 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setTabKey(tab.key)}
                className={`px-3 sm:px-5 py-3 text-sm sm:text-base font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${
                  tabKey === tab.key ? 'border-primary-50 text-primary-50' : 'border-transparent text-[#717182] hover:text-black'
                }`}
              >
                {t(`employer:candidates.tabs.${tab.key}`)}
              </button>
            ))}
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-[#717182]">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary-50" />
              <p>{t('employer:candidates.loading')}</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
              <p className="text-red-600 mb-4 max-w-md">{error}</p>
              <button onClick={() => setReloadKey((k) => k + 1)} className="px-6 py-2 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors">{t('buttons.retry')}</button>
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center text-[#717182]">
              <Users className="w-12 h-12 mb-4 text-gray-300" />
              <p className="text-lg font-medium text-black mb-1">{t('employer:candidates.noneTitle')}</p>
              <p className="max-w-md">{search ? t('employer:candidates.noneSearch') : t('employer:candidates.noneDefault')}</p>
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <div className="space-y-3 sm:space-y-4">
              {items.map((app) => {
                const meta = statusMeta(app.status)
                const seeker = app.jobSeeker
                return (
                  <Link
                    key={app.id}
                    href={`/employer/candidates/${app.id}`}
                    className="block bg-white border border-[#dddddd] rounded-[10px] p-4 sm:p-5 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[#a9e5ff] rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-[#236987]">{initials(seeker?.fullName)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-black truncate">{seeker?.fullName || t('employer:candidates.applicantFallback')}</p>
                        <p className="text-sm text-[#717182] truncate">{app.job?.title}</p>
                        {seeker?.location && (
                          <p className="text-xs text-[#717182] flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" /> {seeker.location}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${meta.pill}`}>{meta.label}</span>
                        <span className="text-xs text-[#717182]">{relativeTime(app.appliedAt)}</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default function CandidatesPage() {
  return (
    <ProtectedRoute requiredRole="employer">
      <Suspense fallback={<div className="min-h-screen bg-[#f7fbfd]" />}>
        <CandidatesContent />
      </Suspense>
    </ProtectedRoute>
  )
}
