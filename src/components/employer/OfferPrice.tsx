'use client'

import { useTranslation } from 'react-i18next'
import type { Plan } from '@/lib/api'
import { formatInr, listPrice } from '@/lib/pricing'

/**
 * The struck-through normal price and the "10% OFF" badge, shown only while an
 * offer applies (nothing from an older backend that sends no discount). Used by
 * the plan cards and the top-up pop-up; `onDark` is for the pop-up's coloured
 * price banner.
 */
export function OfferPrice({ plan, onDark = false }: { plan: Plan; onDark?: boolean }) {
  const { t } = useTranslation()
  if ((plan.discountInr ?? 0) <= 0) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`text-base ${onDark ? 'text-white/80' : 'text-[#717182]'}`}>
        <span className="sr-only">{t('employer:plans.offer.normalPrice')} </span>
        <s>{formatInr(listPrice(plan))}</s>
      </span>
      {plan.offer && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-semibold">
          {t('employer:plans.offer.percentOff', { percent: plan.offer.percentOff })}
        </span>
      )}
    </div>
  )
}

export default OfferPrice
