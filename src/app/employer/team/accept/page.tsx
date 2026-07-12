'use client'

// RETIRED — kept only as a redirect.
//
// This used to be the accept screen, reached at /employer/team/accept?token=…. It
// sat behind ProtectedRoute, which meant an invitee without an account was bounced
// to /login and lost the token: they had to be sent the link a second time. The
// rebuilt invite flow (MONETIZATION §6.3) replaces it with the PUBLIC
// /invite/<token> landing page, which carries the token through sign-in or
// registration and auto-accepts on the way back.
//
// There is now exactly ONE accept path. Links already relayed to an invitee are
// forwarded here rather than 404ing them. Public by design — the old page's
// ProtectedRoute wrapper is exactly the bug being fixed.

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { invitePath, isValidInviteToken } from '@/lib/inviteToken'

function AcceptRedirect() {
  const router = useRouter()
  const token = useSearchParams().get('token') ?? ''

  useEffect(() => {
    // A malformed or absent token renders the invalid-invite state on the landing
    // page (which explains itself and offers a way out) rather than dead-ending here.
    router.replace(isValidInviteToken(token) ? invitePath(token) : '/invite/invalid')
  }, [router, token])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-primary-50"
        role="status"
        aria-label="Loading"
      />
    </div>
  )
}

export default function AcceptInviteRedirectPage() {
  return (
    <Suspense fallback={null}>
      <AcceptRedirect />
    </Suspense>
  )
}
