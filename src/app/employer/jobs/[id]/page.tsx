'use client'

import { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { EmployerHeader } from '@/components/employer/EmployerHeader'
import { JobDetailsView } from '@/components/job/JobDetailsView'
import { myJobsReturnUrl } from '@/lib/myJobsNav'

function EmployerJobDetailsContent() {
  const { t } = useTranslation()
  const router = useRouter()
  // The My Jobs tab / page this was opened from, so Back lands on the same list.
  const backUrl = myJobsReturnUrl(useSearchParams().get('from'))

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <EmployerHeader logoHref="/employer/jobs" />
      <JobDetailsView
        backLabel={t('employer:jobEdit.backToMyJobs')}
        onBack={() => router.push(backUrl)}
        showFooter={false}
      />
    </div>
  )
}

export default function EmployerJobDetailsPage() {
  return (
    <ProtectedRoute requiredRole="employer">
      {/* useSearchParams needs a Suspense boundary for the production build */}
      <Suspense>
        <EmployerJobDetailsContent />
      </Suspense>
    </ProtectedRoute>
  )
}
