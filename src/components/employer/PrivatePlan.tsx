'use client'

// Private plan link: /employer/plans?plan=<code>. A salesperson sends this for a
// hidden plan, which the public catalog (PricingPlans) never lists. It fetches that
// one plan by code (GET /plans/:code), shows its card, and buys through the same
// CheckoutModal — checkout still validates and re-prices on the server.
//
// Kept apart from PricingPlans on purpose: the public catalog holds no private-plan
// state, so a hidden plan cannot leak into the list.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { ApiError, subscriptionAPI, type Plan } from '@/lib/api'
import { CheckoutModal } from '@/components/employer/CheckoutModal'
import { PlanCard } from '@/components/employer/PricingPlans'

type Status = 'loading' | 'ready' | 'unavailable' | 'error'

// 404: unknown or retired code. 400: a code the BE rejects as malformed (e.g. over
// 64 chars). Either way the link is no good and a retry cannot help.
function failureStatus(err: unknown): Status {
  return err instanceof ApiError && (err.status === 404 || err.status === 400) ? 'unavailable' : 'error'
}

/**
 * @param planCode the `plan` query value. The caller keys this component on it, so a
 * different code starts from a clean state.
 * @param canBuy same meaning as on PricingPlans: Buy is shown to the account OWNER only.
 */
export function PrivatePlan({ planCode, canBuy }: { planCode: string; canBuy: boolean }) {
  const { t } = useTranslation()
  const [plan, setPlan] = useState<Plan | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [selected, setSelected] = useState<Plan | null>(null)

  // Each request takes a number; only the latest one may write state. That drops an
  // older reply that lands after a newer one (Retry, or a second reprice), and a reply
  // that arrives after `planCode` changed or the page was left (the effect's cleanup).
  const latest = useRef(0)

  // `fresh` bypasses the browser cache: used after checkout found a new price.
  const load = useCallback(
    (fresh = false) => {
      const mine = ++latest.current
      subscriptionAPI
        .getPlan(planCode, { fresh })
        .then((p) => {
          if (mine !== latest.current) return
          setPlan(p)
          setStatus('ready')
        })
        .catch((err) => {
          if (mine === latest.current) setStatus(failureStatus(err))
        })
    },
    [planCode],
  )

  useEffect(() => {
    load()
    // Aliased only so react-hooks/exhaustive-deps does not warn: this ref is a counter,
    // not a DOM node, so reading `.current` in the cleanup is what we want.
    const counter = latest
    return () => {
      counter.current++
    }
  }, [load])

  // Retry, or re-read after checkout found a new price.
  const reload = (fresh = false) => {
    setStatus('loading')
    load(fresh)
  }

  const seeAll = (
    <Link href="/employer/plans" className="text-sm text-primary-50 hover:underline">
      {t('employer:plans.link.seeAll')}
    </Link>
  )

  return (
    <div className="bg-[#f8f8ff] rounded-[20px] px-4 sm:px-8 lg:px-12 py-10 sm:py-14">
      <div className="text-center mb-6">
        <h2 className="text-3xl sm:text-4xl lg:text-[48px] font-semibold text-black mb-2">
          {t('employer:plans.heading')}
        </h2>
        <p className="text-base sm:text-lg lg:text-xl text-[#717182]">{t('employer:plans.subheading')}</p>
        <p className="mt-3 text-sm text-[#717182] max-w-2xl mx-auto">
          {t('employer:plans.seekersFree')} {t('employer:plans.trialNote')}
        </p>
      </div>

      {status === 'loading' && <p className="text-center py-12 text-[#717182]">{t('employer:plans.loading')}</p>}

      {status === 'error' && (
        <div className="text-center py-12">
          <p className="text-[#717182] mb-3">{t('employer:plans.error')}</p>
          <button
            type="button"
            onClick={() => reload()}
            className="px-4 py-2 border border-primary-50 text-primary-50 rounded-lg text-sm hover:bg-primary-50/5 transition-colors"
          >
            {t('employer:plans.retry')}
          </button>
        </div>
      )}

      {status === 'unavailable' && (
        <div className="text-center py-12">
          <p className="text-[#717182] mb-3">{t('employer:plans.link.unavailable')}</p>
          {seeAll}
        </div>
      )}

      {status === 'ready' && plan && (
        <div className="max-w-sm mx-auto">
          <PlanCard plan={plan} onBuy={setSelected} canBuy={canBuy} />
          <p className="mt-4 text-center">{seeAll}</p>
        </div>
      )}

      {selected && (
        <CheckoutModal
          plan={selected}
          privatePlan
          onClose={(repriced) => {
            setSelected(null)
            // Checkout found a new price, so the card is out of date.
            if (repriced) reload(true)
          }}
        />
      )}
    </div>
  )
}

export default PrivatePlan
