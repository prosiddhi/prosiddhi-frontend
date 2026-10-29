'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { teamAPI } from '@/lib/api'

// One entitlements request per signed-in user, shared by everything that asks: the header's
// account menu and the bottom bar's More sheet. A failed request is not kept, so the next
// mount asks again. The answer lasts for the page load, so a seat that becomes owner mid-session
// sees the Ledger link after a reload, and one that loses ownership still gets the ledger's own
// NOT_OWNER 403, which that page handles.
let cached: { userId: string; owner: Promise<boolean> } | null = null

function loadIsOwner(userId: string): Promise<boolean> {
  if (cached?.userId === userId) return cached.owner
  const entry = {
    userId,
    // `getEntitlements()` answers for any seat and carries no roster, unlike `getTeam()`.
    owner: teamAPI.getEntitlements().then((entitlements) => entitlements.role === 'OWNER'),
  }
  cached = entry
  entry.owner.catch(() => {
    if (cached === entry) cached = null
  })
  return entry.owner
}

/**
 * Whether the signed-in employer is the OWNER of their workspace. Starts false and stays
 * false on any failure or for another user's earlier answer: an owner-only menu item must
 * never show for a member, or while ownership is still unknown.
 */
export function useEmployerOwner(): boolean {
  const { user } = useAuth()
  const userId = user?.id
  const isEmployer = !!user?.role?.startsWith('EMPLOYER')
  const [answer, setAnswer] = useState<{ userId: string; isOwner: boolean } | null>(null)

  useEffect(() => {
    if (!isEmployer || !userId) return
    let ignore = false
    loadIsOwner(userId)
      .then((isOwner) => {
        if (!ignore) setAnswer({ userId, isOwner })
      })
      .catch(() => {
        // Leave the answer unset — fail closed, not open.
      })
    return () => {
      ignore = true
    }
  }, [isEmployer, userId])

  return !!answer && answer.userId === userId && answer.isOwner
}
