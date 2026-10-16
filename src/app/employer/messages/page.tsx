'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { EmployerHeader } from '@/components/employer/EmployerHeader'
import { MessagesView } from '@/components/chat/MessagesView'
import { ChatGate } from '@/components/chat/ChatGate'

function EmployerMessagesContent() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <EmployerHeader />
      <MessagesView showFooter={false} />
    </div>
  )
}

export default function EmployerMessagesPage() {
  return (
    <ChatGate>
      <ProtectedRoute requiredRole="employer">
        <EmployerMessagesContent />
      </ProtectedRoute>
    </ChatGate>
  )
}
