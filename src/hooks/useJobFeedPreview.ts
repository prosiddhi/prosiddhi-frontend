'use client'

// Paginated preview fetch for the seeker Home page's All/Recommended/Near By
// sections — same shape (state, effect, Show More, retry), different
// endpoint. Pulled out because the sections used to be ~65 lines of
// copy-paste that differed only in which API method they called.

import { useState, useEffect } from 'react'
import { jobSeekerAPI, type Job } from '@/lib/api'

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

export function useJobFeedPreview(
  kind: 'all' | 'recommended' | 'nearby',
  pageSize: number,
  loadErrorMessage: string
): UseJobFeedPreviewResult {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [total, setTotal] = useState(0)
  const [noLocation, setNoLocation] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let ignore = false
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const res =
          kind === 'all'
            ? await jobSeekerAPI.getJobFeed({ page, limit: pageSize, sortBy: 'postedAt', sortOrder: 'desc' })
            : kind === 'recommended'
              ? await jobSeekerAPI.getRecommendedJobs(page, pageSize)
              : await jobSeekerAPI.getNearbyJobs({ page, limit: pageSize })
        if (ignore) return
        setJobs((prev) => (page === 1 ? res.jobs : [...prev, ...res.jobs]))
        setHasMore(!!res.pagination?.hasNextPage)
        setTotal(res.pagination?.total ?? 0)
        setNoLocation(res.noLocation === true)
      } catch (err) {
        if (!ignore) setError(err instanceof Error ? err.message : loadErrorMessage)
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    run()
    return () => {
      ignore = true
    }
  }, [kind, page, pageSize, reloadKey, loadErrorMessage])

  return {
    jobs,
    loading,
    error,
    hasMore,
    total,
    noLocation,
    showMore: () => setPage((p) => p + 1),
    retry: () => setReloadKey((k) => k + 1),
  }
}
