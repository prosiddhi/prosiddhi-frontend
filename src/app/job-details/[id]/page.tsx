'use client'

import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { EmployeeHeader } from '@/components/navigation/EmployeeHeader'
import { JobDetailsView } from '@/components/job/JobDetailsView'

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
    else if (from === 'job-feed') router.push('/job-feed')
    else if (from === 'saved-jobs') router.push('/saved-jobs')
    else if (from === 'application-details') router.push(applicationId ? `/my-applications/${applicationId}` : '/my-applications')
    else router.back()
  }

  if (!isLoading && !isSeeker) return null

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <EmployeeHeader active={activeNavTab} />
      <JobDetailsView backLabel={backLabel} onBack={goBack} />
    </div>
  )
}

export default function JobDetailsPage() {
  return (
    <ProtectedRoute>
      <SeekerJobDetailsGate />
    </ProtectedRoute>
  )
}
