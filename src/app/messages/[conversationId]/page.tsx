'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

// The per-conversation thread now lives inline on /messages (split view) rather
// than on its own route. This keeps old bookmarks/links working by forwarding
// them into the split view with the right conversation pre-selected.
export default function LegacyConversationRedirect() {
  const params = useParams()
  const router = useRouter()
  const conversationId = Array.isArray(params.conversationId) ? params.conversationId[0] : (params.conversationId as string)

  useEffect(() => {
    router.replace(conversationId ? `/messages?c=${conversationId}` : '/messages')
  }, [conversationId, router])

  return null
}
