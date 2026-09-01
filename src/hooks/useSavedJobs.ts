'use client'

// Saved-job state (PJP-140) shared by every seeker screen that renders a Save
// toggle on a job card. Fetched once on mount, mutated optimistically.
//
// Pulled out because the seeker Home page and Job Feed page both need the
// identical state — before this hook existed, the fetch-on-mount + optimistic
// toggle logic was copy-pasted verbatim between the two page files.

import { useState, useEffect } from 'react'
import { jobSeekerAPI } from '@/lib/api'

export interface UseSavedJobsResult {
  savedIds: Set<string>
  savingIds: Set<string>
  toggleSave: (jobId: string) => void
}

export function useSavedJobs(): UseSavedJobsResult {
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
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
  }, [])

  const toggleSave = async (jobId: string) => {
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
      else await jobSeekerAPI.saveJob(jobId)
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

  return { savedIds, savingIds, toggleSave }
}
