'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { EmployerHeader } from '@/components/employer/EmployerHeader'
import { SettingsView } from '@/components/settings/SettingsView'

function EmployerSettingsContent() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <EmployerHeader />
      <SettingsView />
    </div>
  )
}

export default function EmployerSettingsPage() {
  return (
    <ProtectedRoute requiredRole="employer">
      <EmployerSettingsContent />
    </ProtectedRoute>
  )
}
