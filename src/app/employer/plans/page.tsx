'use client'

// In-dashboard plans & pricing (PJP-177). Keeps a logged-in employer inside the
// dashboard shell to browse and buy the credit catalog, instead of bouncing them
// out to the public /employer/welcome marketing page. Renders the shared
// <PricingPlans /> catalog (which hands off to the Razorpay CheckoutModal) plus a
// quick single-pack top-up shortcut via <TopUpModal />.

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, Plus } from 'lucide-react'
import { UserDropdown } from '@/components/navigation/UserDropdown'
import { PricingPlans } from '@/components/employer/PricingPlans'
import { TopUpModal } from '@/components/employer/TopUpModal'

function PlansContent() {
  const { t } = useTranslation()
  const [topUp, setTopUp] = useState(false)

  return (
    <div className="min-h-screen bg-[#f7fbfd] flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[119px] h-[65px] sm:h-[75px] flex items-center justify-between">
          <Link href="/employer" className="flex items-center">
            <div className="relative w-[100px] sm:w-[120px] lg:w-[142px] h-[28px] sm:h-[33px] lg:h-[39px]">
              <Image src="/assets/logo.png" alt={t('employer:plans.logoAlt')} fill className="object-contain" priority />
            </div>
          </Link>
          <UserDropdown />
        </div>
      </header>

      <main className="flex-1 py-8 sm:py-10">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-12 xl:px-[120px]">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <Link href="/employer" className="inline-flex items-center gap-2 text-black hover:text-primary-50 transition-colors">
              <ChevronLeft className="w-5 h-5" />
              <span>{t('employer:plans.back')}</span>
            </Link>
            <button
              type="button"
              onClick={() => setTopUp(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors text-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              {t('employer:plans.quickTopUp')}
            </button>
          </div>

          <PricingPlans />
        </div>
      </main>

      {topUp && <TopUpModal onClose={() => setTopUp(false)} />}
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
