'use client'

// Paginated preview fetch for the seeker Home page's All/Recommended/Near By
// sections — same shape (state, effect, Show More, retry), different
// endpoint. Pulled out because the sections used to be ~65 lines of
// copy-paste that differed only in which API method they called. The public
// job list on /employee uses 'all' with filters.

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { jobSeekerAPI, type Job, type JobFeedFilters } from '@/lib/api'

// Stored in `error` when a request fails without a message of its own. A key,
// not translated text: the fetch effect must not depend on the language, or a
// language switch re-fetches the current page. Translated when returned.
const LOAD_ERROR_KEY = 'seeker:jobFeed.loadError'

export interface UseJobFeedPreviewResult {
  jobs: Job[]
  loading: boolean
  error: string
  hasMore: boolean
  total: number
  /**
   * Near By only. `true` means the seeker has no saved coordinate, so the
   * backend never ran the distance filter — see `JobsPage.noLocation` in
   * lib/api.ts for the full reasoning. Always `false` for 'all'/'recommended'.
   */
  noLocation: boolean
  showMore: () => void
  retry: () => void
}

/**
 * @param filters 'all' only: the GET /jobs filters (keyword, category, location).
 *   Read through `filtersKey`, which must change whenever they do — an object made
 *   on every render cannot be an effect dependency. A new key starts again at
 *   page 1.
 */
export function useJobFeedPreview(
  kind: 'all' | 'recommended' | 'nearby',
  pageSize: number,
  filters?: { query: JobFeedFilters; filtersKey: string }
): UseJobFeedPreviewResult {
  const { t } = useTranslation()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [noLocation, setNoLocation] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [page, setPage] = useState(1)

  // New filters are a new list: start again at page 1 with nothing on screen, so
  // the spinner shows and the last query's jobs are never left under the new
  // filters (or appended to by them). Done while rendering — React's pattern for
  // resetting state when an input changes — so the fetch below runs once, for
  // page 1, and never for a stale page.
  const filtersKey = filters?.filtersKey ?? ''
  const [listKey, setListKey] = useState(filtersKey)
  if (listKey !== filtersKey) {
    setListKey(filtersKey)
    setPage(1)
    setJobs([])
    setHasMore(false)
    setTotal(0)
  }

  useEffect(() => {
    let ignore = false
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const res =
          kind === 'all'
            ? await jobSeekerAPI.getJobFeed({ ...filters?.query, page, limit: pageSize, sortBy: 'postedAt', sortOrder: 'desc' })
            : kind === 'recommended'
              ? await jobSeekerAPI.getRecommendedJobs(page, pageSize)
              : await jobSeekerAPI.getNearbyJobs({ page, limit: pageSize })
        if (ignore) return
        setJobs((prev) => {
          if (page === 1) return res.jobs
          // Offset paging can repeat a job across pages; keep the loaded copy and order.
          const loaded = new Set(prev.map((j) => j.id))
          return [...prev, ...res.jobs.filter((j) => !loaded.has(j.id))]
        })
        setHasMore(!!res.pagination?.hasNextPage)
        setTotal(res.pagination?.total ?? 0)
        setNoLocation(res.noLocation === true)
      } catch (err) {
        if (!ignore) setError(err instanceof Error ? err.message : LOAD_ERROR_KEY)
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    run()
    return () => {
      ignore = true
    }
    // `filters` is read through `filtersKey` (see the parameter's comment).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, filtersKey, page, pageSize, reloadKey])

  return {
    jobs,
    loading,
    error: error === LOAD_ERROR_KEY ? t(LOAD_ERROR_KEY) : error,
    hasMore,
    total,
    noLocation,
    showMore: () => setPage((p) => p + 1),
    retry: () => setReloadKey((k) => k + 1),
  }
}
