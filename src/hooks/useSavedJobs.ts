'use client'

// Saved-job state (PJP-140) shared by every seeker screen that renders a Save
// toggle on a job card. Fetched once on mount, mutated optimistically.
//
// Pulled out because the seeker Home page and Job Feed page both need the
// identical state — before this hook existed, the fetch-on-mount + optimistic
// toggle logic was copy-pasted verbatim between the two page files.

import { useState, useEffect } from 'react'
import { jobSeekerAPI } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { categoryParam, track } from '@/lib/analytics'

export interface UseSavedJobsResult {
  savedIds: Set<string>
  savingIds: Set<string>
  /** `category` is the job's taxonomy category name, for analytics only. */
  toggleSave: (jobId: string, category?: string) => void
  /**
   * Whether this viewer can save at all — a signed-in seeker. Saved jobs are only
   * fetched for them: asked for without a seeker session, the endpoint answers
   * 401, which AuthContext treats as "session ended" and answers with /login. A
   * public page (the /employee job list) reads this to send everyone else to sign in.
   */
  canSave: boolean
}

export function useSavedJobs(): UseSavedJobsResult {
  const { user } = useAuth()
  const canSave = user?.role === 'JOB_SEEKER'
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!canSave) return
    let ignore = false
    jobSeekerAPI
      // High limit so the page knows about effectively all saved jobs in one call.
      .getSavedJobs(1, 100)
      .then((res) => {
        if (!ignore) setSavedIds(new Set(res.savedJobs.map((it) => it.jobId)))
      })
      .catch(() => {
        // Non-fatal: the page still works, toggles just start from "not saved".
      })
    return () => {
      ignore = true
    }
  }, [canSave])

  const toggleSave = async (jobId: string, category?: string) => {
    if (savingIds.has(jobId)) return
    const wasSaved = savedIds.has(jobId)
    setSavingIds((prev) => new Set(prev).add(jobId))
    // Optimistic flip.
    setSavedIds((prev) => {
      const next = new Set(prev)
      if (wasSaved) next.delete(jobId)
      else next.add(jobId)
      return next
    })
    try {
      if (wasSaved) await jobSeekerAPI.unsaveJob(jobId)
      else {
        await jobSeekerAPI.saveJob(jobId)
        track('job_saved', { category: categoryParam(category) })
      }
    } catch {
      // Revert on failure.
      setSavedIds((prev) => {
        const next = new Set(prev)
        if (wasSaved) next.add(jobId)
        else next.delete(jobId)
        return next
      })
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev)
        next.delete(jobId)
        return next
      })
    }
  }

  return { savedIds, savingIds, toggleSave, canSave }
}
