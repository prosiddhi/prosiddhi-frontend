'use client'

import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { EmployeeHeader } from '@/components/navigation/EmployeeHeader'
import { PublicSeekerHeader } from '@/components/navigation/PublicSeekerHeader'
import { JobDetailsView } from '@/components/job/JobDetailsView'
import { publicJobsHref } from '@/lib/publicJobs'

// Employer traffic used to share this exact route before the /employer/jobs/
// [id] split — the "My Jobs > View" link pointed here (DEF-023). An employer
// who still lands here (an old bookmark, or a not-yet-updated client) is
// forwarded to their own route with the same job id, instead of being bounced
// to their dashboard and losing which job they clicked.
function SeekerJobDetailsGate() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const { user, isLoading } = useAuth()
  const isSeeker = user?.role === 'JOB_SEEKER'
  const jobId = String(params?.id ?? '')

  useEffect(() => {
    if (isLoading || isSeeker) return
    router.replace(`/employer/jobs/${jobId}`)
  }, [isLoading, isSeeker, jobId, router])

  // Home, Job Feed, Saved Jobs, and Application Details all link here with
  // `?from=` so the Back link returns to whichever one the seeker actually
  // came from, instead of a generic browser-back that breaks for any other
  // entry point.
  const from = searchParams.get('from')
  // Application Details also passes the applicationId it came from, so Back
  // is a deterministic push to that exact application — not browser history,
  // which would break if the seeker navigated elsewhere in a new tab or the
  // history stack got dropped.
  const applicationId = searchParams.get('applicationId')
  const activeNavTab = from === 'home' ? 'home' : from === 'job-feed' ? 'jobFeed' : from === 'saved-jobs' ? 'savedJobs' : undefined
  const backLabel =
    from === 'home'
      ? t('seeker:jobDetails.backToHome')
      : from === 'job-feed'
        ? t('seeker:jobDetails.backToFeed')
        : from === 'saved-jobs'
          ? t('seeker:jobDetails.backToSavedJobs')
          : from === 'application-details'
            ? t('seeker:jobDetails.backToApplicationDetails')
            : t('seeker:jobDetails.back')
  const goBack = () => {
    if (from === 'home') router.push('/home')
    // Opened from the public list while logged out, then signed in to apply.
    else if (from === 'employee') router.push(publicJobsHref())
    else if (from === 'job-feed') router.push('/job-feed')
    else if (from === 'saved-jobs') router.push('/saved-jobs')
    else if (from === 'application-details') router.push(applicationId ? `/my-applications/${applicationId}` : '/my-applications')
    else router.back()
  }

  if (!isLoading && !isSeeker) return null

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <EmployeeHeader active={activeNavTab} />
      <JobDetailsView
        backLabel={backLabel}
        onBack={goBack}
        // Saved Jobs and Application Details already point at this job, so a 404
        // there means it is no longer live. The feed and home only list live jobs.
        unavailableOn404={from === 'saved-jobs' || from === 'application-details'}
      />
    </div>
  )
}

/**
 * A job opened while logged out — from the public list on /employee or a shared
 * link. GET /jobs/:id is public, so the whole posting shows; Apply is the way to
 * sign in (see JobDetailsView). Back always goes to the public list: browser
 * history would leave the site for a visitor who arrived on a shared link.
 */
function PublicJobDetails() {
  const { t } = useTranslation()
  const router = useRouter()

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <PublicSeekerHeader />
      {/* PublicSeekerHeader is `fixed` and 75px tall. */}
      <div className="pt-[75px] flex-1 flex flex-col">
        <JobDetailsView
          backLabel={t('seeker:jobDetails.back')}
          onBack={() => router.push(publicJobsHref())}
          // Usually a shared link, and links outlive jobs: a 404 means the job has
          // closed or expired, which is not an error the visitor made.
          unavailableOn404
        />
      </div>
    </div>
  )
}

/**
 * Anyone may read a job; only the actions need an account.
 *
 * Logged out → the public view. Signed in → exactly the path this page always
 * had: ProtectedRoute (password-change hold) and the seeker gate (an employer is
 * forwarded to their own route). While the session is still being read,
 * ProtectedRoute shows its spinner, so a signed-in seeker never sees the public
 * page flash first.
 */
export default function JobDetailsPage() {
  const { isAuthenticated, isLoading } = useAuth()

  if (!isLoading && !isAuthenticated) return <PublicJobDetails />

  return (
    <ProtectedRoute>
      <SeekerJobDetailsGate />
    </ProtectedRoute>
  )
}
