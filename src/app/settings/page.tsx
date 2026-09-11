'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { EmployeeHeader } from '@/components/navigation/EmployeeHeader'
import { SettingsView } from '@/components/settings/SettingsView'

// Employer traffic used to share this exact route before the /employer/settings
// split — including bookmarks and the account-menu link itself, both pointing at
// plain /settings. A plain `requiredRole="seeker"` gate would bounce those
// straight to the dashboard with no explanation, so an employer landing here is
// forwarded to the new route instead.
function SeekerSettingsGate() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  const isSeeker = user?.role === 'JOB_SEEKER'

  useEffect(() => {
    if (isLoading || isSeeker) return
    router.replace('/employer/settings')
  }, [isLoading, isSeeker, router])

  if (!isLoading && !isSeeker) return null

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <EmployeeHeader />
      <SettingsView />
    </div>
  )
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SeekerSettingsGate />
    </ProtectedRoute>
  )
}
