'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { CHAT_ENABLED } from '@/lib/features'

/**
 * Wraps the Chat route pages. With Chat off it sends the visitor to `/` and
 * renders nothing, so no Chat component mounts and no conversation API is called.
 */
export function ChatGate({ children }: { children: ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    if (!CHAT_ENABLED) router.replace('/')
  }, [router])

  return CHAT_ENABLED ? <>{children}</> : null
}
