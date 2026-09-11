'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { EmployerHeader } from '@/components/employer/EmployerHeader'
import { MessagesView } from '@/components/chat/MessagesView'

function EmployerMessagesContent() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <EmployerHeader />
      <MessagesView />
    </div>
  )
}

export default function EmployerMessagesPage() {
  return (
    <ProtectedRoute requiredRole="employer">
      <EmployerMessagesContent />
    </ProtectedRoute>
  )
}
