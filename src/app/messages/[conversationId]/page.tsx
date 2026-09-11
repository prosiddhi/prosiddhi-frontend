'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

// The per-conversation thread now lives inline on /messages (seeker) or
// /employer/messages (employer) split view, rather than on its own route. This
// keeps old bookmarks/links working by forwarding them into the right role's
// split view with the conversation pre-selected.
//
// Role is read from the session, not guessed from the URL — this route predates
// the /employer/messages split, so every old link is a bare /messages/<id> with
// no role hint in it. An unauthenticated visitor falls back to /messages, same
// as before the split; ProtectedRoute there sends them through /login, which
// already re-derives the correct home for whoever signs in.
export default function LegacyConversationRedirect() {
  const params = useParams()
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuth()
  const conversationId = Array.isArray(params.conversationId) ? params.conversationId[0] : (params.conversationId as string)

  useEffect(() => {
    if (isLoading) return
    const base = isAuthenticated && user?.role !== 'JOB_SEEKER' ? '/employer/messages' : '/messages'
    router.replace(conversationId ? `${base}?c=${conversationId}` : base)
  }, [conversationId, isLoading, isAuthenticated, user?.role, router])

  return null
}
