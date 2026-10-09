'use client'

// In-dashboard plans & pricing (PJP-177). Keeps a logged-in employer inside the
// dashboard shell to browse and buy the credit catalog, instead of bouncing them
// out to the public /employer/welcome marketing page. Renders the shared
// <PricingPlans /> catalog (which hands off to the Razorpay CheckoutModal) plus a
// quick single-pack top-up shortcut via <TopUpModal />.

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { ChevronLeft, Plus } from 'lucide-react'
import { PricingPlans } from '@/components/employer/PricingPlans'
import { TopUpModal } from '@/components/employer/TopUpModal'
import { EmployerHeader } from '@/components/employer/EmployerHeader'
import { useCredits } from '@/hooks/useCredits'

function PlansContent() {
  const { t } = useTranslation()
  const [topUp, setTopUp] = useState(false)
  // Buying is owner-only on the backend, so only an OWNER is shown the quick
  // top-up. Unknown role (still loading, or the wallet failed) → no button.
  const { wallet } = useCredits()
  const canBuy = wallet?.role === 'OWNER'

  return (
    <div className="min-h-screen bg-[#f7fbfd] flex flex-col">
      <EmployerHeader />

      <main className="flex-1 py-8 sm:py-10">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-12 xl:px-[120px]">
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
          <PricingPlans canBuy={canBuy} />
        </div>
      </main>

      {canBuy && topUp && <TopUpModal onClose={() => setTopUp(false)} />}
    </div>
  )
}

export default function EmployerPlansPage() {
  return (
    <ProtectedRoute requiredRole="employer">
      <PlansContent />
    </ProtectedRoute>
  )
}
