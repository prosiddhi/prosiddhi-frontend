'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { Footer } from '@/components/home/Footer'

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

  return (
    <>
      {children}
      {showFooter && <Footer audience="employer" />}
    </>
  )
}
