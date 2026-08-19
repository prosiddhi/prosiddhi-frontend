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
// Aliased: `Wallet` is already the lucide icon imported above.
import type { Wallet as CreditWalletData } from '@/lib/api'

/**
 * @param wallet the caller's already-loaded wallet. Passed in rather than
 * re-fetched: `useCredits()` is uncached, so a second call here duplicated the
 * request and flashed the heading from the generic copy to the trial copy as
 * the response landed. `undefined` simply keeps the neutral wording.
 */
export function OutOfCreditsUpsell({ wallet }: { wallet?: CreditWalletData | null }) {
  const { t } = useTranslation()
  const [topUp, setTopUp] = useState(false)

  // An employer whose FREE TRIAL ran out should be told that, not the bare
  // "you're out of job-post credits" — which reads as though they had bought
  // something and implies they knew they were spending.
  //
  // `trialGranted` alone is not enough: it stays true for ever, so a paying
  // customer whose plan lapsed would be told their "free trial has ended"
  // months after they bought one. `hasPurchased` excludes them. And the trial
  // is only really over when no trial POST credit remains — checked per kind,
  // because leftover trial *unlock* credits do not let them post.
  const endedTrial =
    wallet?.trialGranted === true &&
    wallet?.hasPurchased === false &&
    (wallet?.trial?.postRemaining ?? 0) === 0

  return (
    <div className="max-w-xl mx-auto bg-white border border-[#dddddd] rounded-[12px] p-8 text-center">
      <div className="w-14 h-14 rounded-full bg-[#e3f5ff] flex items-center justify-center mx-auto mb-4 text-[#236987]">
        <Wallet className="w-7 h-7" />
      </div>
      <h2 className="text-xl font-semibold text-black mb-2">
        {t(endedTrial ? 'employer:postGate.trialEndedTitle' : 'employer:postGate.title')}
      </h2>
      <p className="text-sm text-[#717182] mb-6">
        {t(endedTrial ? 'employer:postGate.trialEndedBody' : 'employer:postGate.body')}
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setTopUp(true)}
          className="inline-flex items-center justify-center px-6 py-2.5 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors text-sm font-medium"
        >
          {t('employer:postGate.topUpNow')}
        </button>
        <Link
          href="/employer/plans"
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
