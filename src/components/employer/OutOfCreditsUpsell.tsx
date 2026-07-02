'use client'

// Out-of-post-credits upsell (PJP-179). Shown in place of the job form when the
// employer has 0 POST credits (proactive), or after the BE returns 402 on
// publish (reactive backstop — the server owns enforcement). Routes the buyer to
// the pricing page to purchase a plan or the ₹499 single-post pack.

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { Wallet } from 'lucide-react'
import { TopUpModal } from '@/components/employer/TopUpModal'

export function OutOfCreditsUpsell() {
  const { t } = useTranslation()
  const [topUp, setTopUp] = useState(false)
  return (
    <div className="max-w-xl mx-auto bg-white border border-[#dddddd] rounded-[12px] p-8 text-center">
      <div className="w-14 h-14 rounded-full bg-[#e3f5ff] flex items-center justify-center mx-auto mb-4 text-[#236987]">
        <Wallet className="w-7 h-7" />
      </div>
      <h2 className="text-xl font-semibold text-black mb-2">{t('employer:postGate.title')}</h2>
      <p className="text-sm text-[#717182] mb-6">{t('employer:postGate.body')}</p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setTopUp(true)}
          className="inline-flex items-center justify-center px-6 py-2.5 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors text-sm font-medium"
        >
          {t('employer:postGate.topUpNow')}
        </button>
        <Link
          href="/employer/welcome#pricing"
          className="inline-flex items-center justify-center px-6 py-2.5 border border-primary-50 text-primary-50 rounded-lg hover:bg-primary-50/5 transition-colors text-sm font-medium"
        >
          {t('employer:postGate.viewPlans')}
        </Link>
      </div>

      {topUp && <TopUpModal onClose={() => setTopUp(false)} />}
    </div>
  )
}

export default OutOfCreditsUpsell
