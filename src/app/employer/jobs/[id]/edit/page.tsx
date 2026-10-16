'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { Suspense, useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { JobForm } from '@/components/job/JobForm'
import { toSelectedCity, type SelectedCity } from '@/components/location/StateCitySelect'
import {
  jobSeekerAPI,
  employerAPI,
  teamAPI,
  fieldErrorsByPath,
  type JobFields,
  type UpdateJobData,
  type JobTypeValue,
  type PaymentTypeValue,
  type UrgencyLevelValue,
} from '@/lib/api'
import { isJobAwaitingReview, isJobUnderReview } from '@/lib/applicationStatus'
import { myJobsReturnUrl, myJobsUrl } from '@/lib/myJobsNav'
import { showToast } from '@/lib/toast'
import { ChevronLeft, Loader2, AlertCircle } from 'lucide-react'
import { EmployerHeader } from '@/components/employer/EmployerHeader'

function EditJobContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useParams()
  const jobId = Array.isArray(params.id) ? params.id[0] : (params.id as string)
  // The My Jobs tab / page this edit was opened from; Back and a plain save return there.
  const backUrl = myJobsReturnUrl(useSearchParams().get('from'))

  const [initial, setInitial] = useState<Partial<JobFields> | null>(null)
  // The job's cities for the picker, and — only for a job that has none — its saved
  // location text. That text is what puts the form in legacy mode (see JobForm).
  const [initialCities, setInitialCities] = useState<SelectedCity[]>([])
  const [legacyLocation, setLegacyLocation] = useState<string>()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  // The BE's per-field validation errors from the last failed save, shown at the fields.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>()

  useEffect(() => {
    let ignore = false
    const run = async () => {
      setLoading(true)
      setLoadError('')
      try {
        // GET /jobs/:id reads the token optionally: an expired one is answered as signed-out,
        // so a real owner gets isOwner:false (or a 404 on a post that is not live yet). Prove
        // the session first; an expired token is refreshed here, a dead one ends the session.
        await teamAPI.getEntitlements()
        if (ignore) return
        const job = await jobSeekerAPI.getJobDetails(jobId)
        if (ignore) return
        // Ownership is checked before any job data reaches the form. Only an explicit
        // `true` passes; a missing field is unverified, so the form stays blocked.
        if (job.isOwner === false) {
          showToast(t('employer:jobEdit.notYourJob'), 'error')
          router.replace(backUrl)
          return
        }
        if (job.isOwner !== true) {
          setLoadError(t('employer:jobEdit.loadFailed'))
          return
        }
        // `cities` comes with each state's name, which is what the picker needs to draw
        // "City, State". A job with none (posted before cities existed) is edited in legacy
        // mode: no city is required and its own location text is shown. A response that
        // lacks `cities` altogether is treated the same way, so the save then omits
        // `cityIds` and keeps whatever the job has.
        const cities = (job.cities ?? []).map(({ city }) => toSelectedCity(city))
        setInitialCities(cities)
        setLegacyLocation(cities.length === 0 ? (job.location ?? '') : undefined)
        setInitial({
          title: job.title,
          description: job.description ?? '',
          category: job.category ?? '',
          sector: job.sector ?? undefined,
          jobTitle: job.jobTitle ?? undefined,
          requirements: job.requirements ?? undefined,
          skillsRequired: job.skillsRequired ?? [],
          salaryMin: job.salaryMin ?? undefined,
          salaryMax: job.salaryMax ?? undefined,
          paymentType: (job.paymentType as PaymentTypeValue) ?? undefined,
          jobType: (job.jobType as JobTypeValue) ?? undefined,
          urgencyLevel: (job.urgencyLevel as UrgencyLevelValue) ?? undefined,
          numberOfPositions: job.numberOfPositions ?? undefined,
          companyName: job.companyName ?? undefined,
          // duration / expiresAt / showEmailToSeekers / showPhoneToSeekers were
          // hydrated here from a response that no longer carries them (dropped by
          // the BE in fe246f1).
        })
      } catch (err) {
        if (!ignore) setLoadError(err instanceof Error ? err.message : t('employer:jobEdit.loadFailed'))
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    if (jobId) run()
    return () => {
      ignore = true
    }
    // `t` is only toast / error text, and `router` / `backUrl` are only used on the
    // not-owner redirect. Listing them would re-run this effect (refetching the job and
    // repeating the entitlements check) on every language or URL change, so they are left out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId])

  const handleSubmit = async (data: UpdateJobData) => {
    if (!initial) return // `initial` is only set once ownership is verified
    setSubmitting(true)
    setError('')
    setFieldErrors(undefined)
    try {
      const job = await employerAPI.updateJob(jobId, data)
      // A material edit pulls an approved post back into review (and offline).
      // The BE reports it in the response, so we do not have to guess what counts.
      if (isJobAwaitingReview(job)) showToast(t('employer:jobs.noticeEdited'), 'info')
      // A post that is now waiting for review lives in the Pending Review tab, wherever
      // the edit started; otherwise go back to the tab and page it was opened from.
      router.push(isJobUnderReview(job) ? myJobsUrl('pending') : backUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('employer:jobEdit.saveFailed'))
      setFieldErrors(fieldErrorsByPath(err))
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7fbfd] flex flex-col">
      <EmployerHeader logoHref="/employer/jobs" />

      <main className="flex-1 py-8 sm:py-10 lg:py-12">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px]">
          <Link href={backUrl} className="inline-flex items-center gap-2 text-black hover:text-primary-50 transition-colors mb-6">
            <ChevronLeft className="w-5 h-5" />
            <span>{t('employer:jobEdit.backToMyJobs')}</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-bold text-black mb-6 sm:mb-8">{t('employer:jobEdit.title')}</h1>

          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-[#717182]">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary-50" />
              <p>{t('employer:jobEdit.loading')}</p>
            </div>
          )}

          {!loading && loadError && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
              <p className="text-red-600 max-w-md">{loadError}</p>
            </div>
          )}

          {!loading && !loadError && initial && (
            <JobForm mode="edit" initial={initial} initialCities={initialCities} legacyLocation={legacyLocation} submitLabel={t('employer:jobEdit.submitLabel')} submitting={submitting} error={error} serverFieldErrors={fieldErrors} onSubmit={handleSubmit} />
          )}
        </div>
      </main>
    </div>
  )
}

export default function EditJobPage() {
  return (
    <ProtectedRoute requiredRole="employer">
      {/* useSearchParams needs a Suspense boundary for the production build */}
      <Suspense>
        <EditJobContent />
      </Suspense>
    </ProtectedRoute>
  )
}
