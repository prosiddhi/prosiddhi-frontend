'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Footer } from '@/components/home/Footer'
import { inSameSection, rememberEmployerPage } from '@/lib/employerBackNav'

/**
 * Every signed-in employer page gets the site footer, so About, Contact (with the
 * Grievance Officer), Terms, Privacy, Refund & Cancellation and Delivery are one tap
 * away from anywhere an employer can pay — the payment gateway and consumer rules
 * both expect those pages to be reachable.
 *
 * Not on: /employer/welcome (the public landing page renders its own footer), the
 * sign-up steps under /employer/register, and the invite-accept screen — each is a
 * focused single-task screen.
 */
const WITHOUT_FOOTER = ['/employer/welcome', '/employer/register', '/employer/team/accept']

export default function EmployerLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const showFooter = !WITHOUT_FOOTER.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  // Note the page being left, for pages with a Back link (see employerBackNav). Only a
  // change of path counts: My Jobs' tab / search / page changes stay on one path.
  const arrivedAt = useRef<{ path: string; url: string } | null>(null)
  useEffect(() => {
    const last = arrivedAt.current
    if (!last) rememberEmployerPage(null)
    // Moving inside one section (My Jobs list ↔ View / Edit / New, Candidates list ↔ one
    // candidate) keeps what was saved, so Back from the list still reaches the page the
    // employer first came from.
    else if (last.path !== pathname && !inSameSection(last.path, pathname)) {
      rememberEmployerPage(last.url)
    }
    // The query is only trusted if the address bar has caught up with the new path.
    const query = window.location.pathname === pathname ? window.location.search : ''
    arrivedAt.current = { path: pathname, url: pathname + query }
  }, [pathname])

  return (
    <>
      {children}
      {showFooter && <Footer audience="employer" />}
    </>
  )
}
