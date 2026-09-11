'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { EmployeeHeader } from '@/components/navigation/EmployeeHeader'
import { MessagesView } from '@/components/chat/MessagesView'

// Employer traffic used to share this exact route before the /employer/messages
// split, including `/messages?c=<id>` links bookmarked or left open from the old
// shared UI. A plain `requiredRole="seeker"` gate would bounce those straight to
// the dashboard and silently drop the `c=` conversation, so an employer landing
// here is forwarded to the new route with it intact instead.
function SeekerMessagesGate() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading } = useAuth()
  const isSeeker = user?.role === 'JOB_SEEKER'

  useEffect(() => {
    if (isLoading || isSeeker) return
    const c = searchParams.get('c')
    router.replace(c ? `/employer/messages?c=${c}` : '/employer/messages')
  }, [isLoading, isSeeker, searchParams, router])

  if (!isLoading && !isSeeker) return null

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <EmployeeHeader />
      <MessagesView />
    </div>
  )
}

export default function MessagesPage() {
  return (
    <ProtectedRoute>
      <SeekerMessagesGate />
    </ProtectedRoute>
  )
}
