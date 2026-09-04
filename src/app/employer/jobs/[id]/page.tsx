'use client'

import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { EmployerHeader } from '@/components/employer/EmployerHeader'
import { JobDetailsView } from '@/components/job/JobDetailsView'

function EmployerJobDetailsContent() {
  const { t } = useTranslation()
  const router = useRouter()

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <EmployerHeader logoHref="/employer/jobs" />
      <JobDetailsView
        backLabel={t('employer:jobEdit.backToMyJobs')}
        onBack={() => router.push('/employer/jobs')}
      />
    </div>
  )
}

export default function EmployerJobDetailsPage() {
  return (
    <ProtectedRoute requiredRole="employer">
      <EmployerJobDetailsContent />
    </ProtectedRoute>
  )
}
