'use client'

// In-dashboard plans & pricing (PJP-177). Keeps a logged-in employer inside the
// dashboard shell to browse and buy the credit catalog, instead of bouncing them
// out to the public /employer/welcome marketing page. Renders the shared
// <PricingPlans /> catalog (which hands off to the Razorpay CheckoutModal) plus a
// quick single-pack top-up shortcut via <TopUpModal />.

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ChevronLeft, Clock, Plus } from 'lucide-react'
import { PricingPlans } from '@/components/employer/PricingPlans'
import { PrivatePlan } from '@/components/employer/PrivatePlan'
import { TopUpModal } from '@/components/employer/TopUpModal'
import { EmployerHeader } from '@/components/employer/EmployerHeader'
import { PAGE_BOX } from '@/lib/layout'
import { useCredits } from '@/hooks/useCredits'
import { employerAPI } from '@/lib/api'
import { track } from '@/lib/analytics'

function PlansContent() {
  const { t } = useTranslation()
  const [topUp, setTopUp] = useState(false)

  useEffect(() => {
    track('plans_viewed', {})
  }, [])

  // Buying is owner-only on the backend, so only an OWNER is shown the quick
  // top-up. Unknown role (still loading, or the wallet failed) → no button.
  const { wallet } = useCredits()
  const canBuy = wallet?.role === 'OWNER'

  // Checkout is refused until an admin approves the account, so say so before the buyer fills the
  // form in. A business that has not uploaded its documents has no review running, so it is told
  // to upload them instead of to wait. Only for the owner, whose own record is the organisation's.
  // A failed read shows nothing: checkout still refuses, with its own message.
  const [pendingStatus, setPendingStatus] = useState<'PENDING_ADMIN_APPROVAL' | 'PENDING_DOCUMENTS' | null>(null)
  const docsPending = pendingStatus === 'PENDING_DOCUMENTS'
  useEffect(() => {
    if (!canBuy) return
    let ignore = false
    employerAPI
      .getProfile()
      .then((p) => {
        const status = p?.accountStatus
        if (!ignore) setPendingStatus(status === 'PENDING_ADMIN_APPROVAL' || status === 'PENDING_DOCUMENTS' ? status : null)
      })
      .catch(() => {})
    return () => {
      ignore = true
    }
  }, [canBuy])
  // /employer/plans?plan=<code> is the private link for a hidden plan: it shows just
  // that plan. The public list below never contains a hidden plan.
  const planCode = useSearchParams().get('plan')?.trim() || undefined

  return (
    <div className="min-h-screen bg-[#f7fbfd] flex flex-col">
      <EmployerHeader />

      <main className="flex-1 py-8 sm:py-10">
        <div className={PAGE_BOX}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <Link href="/employer" className="inline-flex items-center gap-2 text-black hover:text-primary-50 transition-colors">
              <ChevronLeft className="w-5 h-5" />
              <span>{t('employer:plans.back')}</span>
            </Link>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/employer/my-plans" className="text-sm text-primary-50 hover:underline whitespace-nowrap">
                {t('employer:myPlans.navLabel')}
              </Link>
              {canBuy && (
                <button
                  type="button"
                  onClick={() => setTopUp(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors text-sm whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  {t('employer:plans.quickTopUp')}
                </button>
              )}
            </div>
          </div>

          {/* A member can browse the catalog but not buy from it. Only said once
              the wallet has told us so; while the role is unknown the Buy
              buttons are simply hidden. */}
          {wallet && !canBuy && (
            <p className="text-sm text-[#717182] mb-4">{t('employer:myPlans.ownerBuysNote')}</p>
          )}
          {canBuy && pendingStatus && (
            <div role="status" className="mb-6 bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
              <Clock className="w-5 h-5 text-secondary-70 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-secondary-70">
                  {t(docsPending ? 'employer:plans.docsPendingTitle' : 'employer:accountReview.title')}
                </p>
                <p className="text-sm text-secondary-70">
                  {t(docsPending ? 'employer:plans.docsPendingBody' : 'employer:accountReview.body')}
                </p>
                {docsPending && (
                  <Link href="/employer/profile" className="inline-block mt-2 text-sm font-medium text-primary-50 hover:text-primary-60 transition-colors">
                    {t('employerRegister:underReview.uploadDocs')}
                  </Link>
                )}
              </div>
            </div>
          )}
          {planCode ? <PrivatePlan key={planCode} planCode={planCode} canBuy={canBuy} /> : <PricingPlans canBuy={canBuy} />}
        </div>
      </main>

      {canBuy && topUp && <TopUpModal onClose={() => setTopUp(false)} />}
    </div>
  )
}

export default function EmployerPlansPage() {
  // `useSearchParams` (for ?plan=) needs a Suspense boundary or the static prerender
  // of this route fails at build time — same as /login and /change-password, which
  // also wrap Suspense around ProtectedRoute.
  return (
    <Suspense fallback={null}>
      <ProtectedRoute requiredRole="employer">
        <PlansContent />
      </ProtectedRoute>
    </Suspense>
  )
}
