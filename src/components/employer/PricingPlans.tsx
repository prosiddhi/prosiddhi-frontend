'use client'

// Employer pricing catalog (PJP-176). Fetches the 8-tier plan catalog from
// GET /api/plans and renders it grouped Pack / Starter / Pro, plus the permanent
// Free tier. Prices are shown BASE with a "+18% GST" note (functional-spec §2.2,
// §3 "GST" row). Buy buttons are stubbed "Coming soon" until checkout (PJP-177)
// lands. Phase-1 rule (decisions-tracker #23, Option A): NO candidate-search
// claim anywhere here — that's a Phase-2 capability.

import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { subscriptionAPI, type Plan, type PlanGroup } from '@/lib/api'

// Display order for the grouped sections (the BE orders by group name
// alphabetically, which would put PRO before STARTER — override here).
const GROUP_ORDER: PlanGroup[] = ['PACK', 'STARTER', 'PRO']

function formatInr(n: number): string {
  return `₹${n.toLocaleString('en-IN')}`
}

function PlanCard({ plan, highlighted }: { plan: Plan; highlighted: boolean }) {
  const { t } = useTranslation()

  const facts: { label: string; value: string }[] = [
    { label: t('employer:plans.postsLabel'), value: String(plan.postCredits) },
    { label: t('employer:plans.unlocksLabel'), value: String(plan.downloadCredits) },
    {
      label: t('employer:plans.seatsLabel'),
      value: `${plan.seats} ${plan.seats === 1 ? t('employer:plans.seat') : t('employer:plans.seats')}`,
    },
    {
      label: t('employer:plans.validityLabel'),
      value:
        plan.durationDays == null
          ? t('employer:plans.neverExpires')
          : t('employer:plans.daysValid', { days: plan.durationDays }),
    },
  ]

  return (
    <div
      className={`bg-neutral-50 rounded-[20px] p-6 sm:p-7 w-full flex flex-col ${
        highlighted ? 'border-[3px] border-primary-50' : 'border-2 border-white'
      }`}
    >
      <h4 className="text-xl sm:text-2xl font-semibold">{plan.name}</h4>

      <div className="mt-4 mb-1 flex items-baseline gap-1">
        <span className="text-4xl sm:text-5xl font-bold">{formatInr(plan.baseInr)}</span>
        <span className="text-sm text-[#717182]">{t('employer:plans.gstNote')}</span>
      </div>
      <p className="text-sm text-[#717182] mb-4">
        {t('employer:plans.inclGst', { total: formatInr(plan.totalInr) })}
      </p>

      <div className="space-y-2 py-3 border-t border-[#ececec] flex-1">
        {facts.map((fact) => (
          <div key={fact.label} className="flex items-start gap-2">
            <Check className="w-4 h-4 text-primary-50 mt-0.5 flex-shrink-0" />
            <span className="text-sm text-neutral-950">
              <span className="font-medium">{fact.value}</span> {fact.label}
            </span>
          </div>
        ))}
      </div>

      {/* Stub until checkout (PJP-177) lands. */}
      <button
        type="button"
        disabled
        className="mt-4 px-4 py-2.5 bg-neutral-200 text-[#717182] rounded-lg text-sm w-full cursor-not-allowed"
      >
        {t('employer:plans.comingSoon')}
      </button>
    </div>
  )
}

function FreeTierCard() {
  const { t } = useTranslation()
  const features = [
    t('employer:plans.free.f1'),
    t('employer:plans.free.f2'),
    t('employer:plans.free.f3'),
    t('employer:plans.free.f4'),
  ]

  return (
    <div className="bg-neutral-50 border-2 border-white rounded-[20px] p-6 sm:p-7 w-full flex flex-col">
      <h4 className="text-xl sm:text-2xl font-semibold">{t('employer:plans.free.title')}</h4>
      <p className="text-sm text-[#717182]">{t('employer:plans.free.tagline')}</p>

      <div className="mt-4 mb-4 flex items-baseline gap-1">
        <span className="text-4xl sm:text-5xl font-bold">{t('employer:plans.free.price')}</span>
      </div>

      <div className="space-y-2 py-3 border-t border-[#ececec] flex-1">
        {features.map((feature) => (
          <div key={feature} className="flex items-start gap-2">
            <Check className="w-4 h-4 text-primary-50 mt-0.5 flex-shrink-0" />
            <span className="text-sm text-neutral-950">{feature}</span>
          </div>
        ))}
      </div>

      <Link
        href="/employer/register"
        className="mt-4 px-4 py-2.5 bg-primary-50 text-white rounded-lg text-sm w-full text-center hover:bg-primary-60 transition-colors"
      >
        {t('employer:plans.free.cta')}
      </Link>
    </div>
  )
}

export function PricingPlans() {
  const { t } = useTranslation()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      setPlans(await subscriptionAPI.getPlans())
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // The single Pro plan we visually emphasise (best value / most credits).
  const highlightCode = 'PRO_6M_1S'

  return (
    <div>
      <div className="text-center mb-4">
        <h2 className="text-2xl sm:text-3xl lg:text-[40px] font-medium mb-2 sm:mb-3">
          {t('employer:plans.heading')}
        </h2>
        <p className="text-base sm:text-lg lg:text-xl text-[#717182] px-4">
          {t('employer:plans.subheading')}
        </p>
        <p className="mt-2 inline-flex items-center gap-2 text-sm text-primary-50 font-medium">
          <Check className="w-4 h-4" />
          {t('employer:plans.seekersFree')}
        </p>
      </div>

      {loading && (
        <p className="text-center py-12 text-[#717182]">{t('employer:plans.loading')}</p>
      )}

      {error && !loading && (
        <div className="text-center py-12">
          <p className="text-[#717182] mb-3">{t('employer:plans.error')}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="px-4 py-2 border border-primary-50 text-primary-50 rounded-lg text-sm hover:bg-primary-50/5 transition-colors"
          >
            {t('employer:plans.retry')}
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="max-w-[1200px] mx-auto space-y-10">
          {/* Free tier + Credit Pack live together on the first row. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <FreeTierCard />
            {plans
              .filter((p) => p.group === 'PACK')
              .map((p) => (
                <PlanCard key={p.code} plan={p} highlighted={false} />
              ))}
          </div>

          {GROUP_ORDER.filter((g) => g !== 'PACK').map((group) => {
            const groupPlans = plans.filter((p) => p.group === group)
            if (!groupPlans.length) return null
            return (
              <div key={group}>
                <h3 className="text-xl sm:text-2xl font-semibold mb-4">
                  {t(`employer:plans.groups.${group}`)}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {groupPlans.map((p) => (
                    <PlanCard key={p.code} plan={p} highlighted={p.code === highlightCode} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default PricingPlans
