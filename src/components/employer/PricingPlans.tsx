'use client'

// Employer pricing catalog (PJP-176). Fetches the 8-tier plan catalog from
// GET /api/plans and presents it in the Figma pricing UI (node 1910:2521):
// a Basic / Enterprise toggle over a 4-up card grid — gradient header, big
// price, check-bullet inclusions, "*GST as applicable".
//
// UI style is from the mock; the DATA + rules are ours (decisions-tracker):
//   • Basic tab = PACK + STARTER, Enterprise tab = PRO (live plan.group)
//   • card facts are our structured plan attributes (posts / unlocks / seats /
//     validity) — NOT the mock's marketing bullets, and NO Phase-2 candidate-
//     search claim (#23)
//   • Buy launches the real Razorpay checkout (PJP-177)
//   • the permanent free tier + 14-day trial stays as a callout

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { subscriptionAPI, type Plan } from '@/lib/api'
import { CheckoutModal } from '@/components/employer/CheckoutModal'

type Tab = 'basic' | 'enterprise'

function formatInr(n: number): string {
  return n.toLocaleString('en-IN')
}

function PlanCard({ plan, onBuy }: { plan: Plan; onBuy: (plan: Plan) => void }) {
  const { t } = useTranslation()

  // Inclusions (our data, mock styling). Posts are the header subtitle, so the
  // bullets carry unlocks / seats / validity to avoid repeating the post count.
  const facts: string[] = [
    `${plan.downloadCredits} ${t('employer:plans.unlocksLabel')}`,
    `${plan.seats} ${plan.seats === 1 ? t('employer:plans.seat') : t('employer:plans.seats')}`,
    plan.durationDays == null
      ? t('employer:plans.neverExpires')
      : t('employer:plans.daysValid', { days: plan.durationDays }),
  ]

  return (
    <div className="bg-white border border-[#dddddd] rounded-[20px] overflow-hidden flex flex-col">
      {/* Gradient header — title, "N job posts", price */}
      <div className="bg-gradient-to-b from-primary-20 to-white px-6 pt-6 pb-6">
        <h4 className="text-xl sm:text-2xl font-semibold text-black">{plan.name}</h4>
        <p className="text-[16px] sm:text-[18px] text-[#717182] mt-1">
          {plan.postCredits} {t('employer:plans.postsLabel')}
        </p>
        <div className="mt-4 flex items-start gap-0.5">
          <span className="text-3xl sm:text-4xl font-bold leading-none mt-1">₹</span>
          <span className="text-5xl sm:text-6xl font-bold leading-none tracking-tight">
            {formatInr(plan.baseInr)}
          </span>
        </div>
      </div>

      {/* Body — inclusions, buy, GST note */}
      <div className="px-6 py-5 flex-1 flex flex-col">
        <ul className="space-y-3 flex-1">
          {facts.map((fact) => (
            <li key={fact} className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-primary-50 flex-shrink-0" />
              <span className="text-[15px] sm:text-[16px] text-[#0a0a0a]">{fact}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => onBuy(plan)}
          className="mt-5 w-full bg-primary-50 text-primary-100 rounded-[8px] py-3 text-[16px] font-medium hover:bg-primary-60 transition-colors"
        >
          {t('employer:plans.buy')}
        </button>
        <p className="mt-3 text-[14px] italic text-[#aaaaaa] text-center">
          {t('employer:plans.gstApplicable')}
        </p>
      </div>
    </div>
  )
}

export function PricingPlans() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isAuthenticated, user } = useAuth()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selected, setSelected] = useState<Plan | null>(null)
  const [tab, setTab] = useState<Tab>('basic')

  // This catalog renders on the PUBLIC employer landing as well as on the
  // signed-in /employer/plans screen. An anonymous visitor could open the checkout
  // modal, fill in their GSTIN and place of supply, hit Pay — and only then get a
  // 401, which logs them out and throws away everything they typed. You cannot buy
  // credits without an account, so send them to sign up instead of into a checkout
  // they cannot finish.
  const canCheckout =
    isAuthenticated && !!user?.role?.startsWith('EMPLOYER')

  const handleBuy = useCallback(
    (plan: Plan) => {
      if (!canCheckout) {
        router.push('/employer/register')
        return
      }
      setSelected(plan)
    },
    [canCheckout, router]
  )

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

  const byPrice = (a: Plan, b: Plan) => a.baseInr - b.baseInr
  const shown = plans
    .filter((p) => (tab === 'basic' ? p.group !== 'PRO' : p.group === 'PRO'))
    .sort(byPrice)

  const TABS: { key: Tab; label: string }[] = [
    { key: 'basic', label: t('employer:plans.tabBasic') },
    { key: 'enterprise', label: t('employer:plans.tabEnterprise') },
  ]

  return (
    <div className="bg-[#f8f8ff] rounded-[20px] px-4 sm:px-8 lg:px-12 py-10 sm:py-14">
      {/* Heading */}
      <div className="text-center mb-6">
        <h2 className="text-3xl sm:text-4xl lg:text-[48px] font-semibold text-black mb-2">
          {t('employer:plans.heading')}
        </h2>
        <p className="text-base sm:text-lg lg:text-xl text-[#717182]">
          {t('employer:plans.subheading')}
        </p>
        <p className="mt-3 text-sm text-[#717182] max-w-2xl mx-auto">
          {t('employer:plans.seekersFree')} {t('employer:plans.trialNote')}
        </p>
      </div>

      {/* Basic / Enterprise toggle */}
      <div className="flex justify-center mb-8 sm:mb-10">
        <div className="inline-flex bg-white border border-[#eeeeee] rounded-full p-1">
          {TABS.map((tabItem) => (
            <button
              key={tabItem.key}
              type="button"
              onClick={() => setTab(tabItem.key)}
              aria-pressed={tab === tabItem.key}
              className={`px-5 sm:px-6 py-2 rounded-full text-base sm:text-[20px] transition-colors ${
                tab === tabItem.key
                  ? 'bg-primary-50 text-primary-100 font-semibold'
                  : 'text-[#aaaaaa] hover:text-[#717182]'
              }`}
            >
              {tabItem.label}
            </button>
          ))}
        </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6 max-w-[1400px] mx-auto">
          {shown.map((plan) => (
            <PlanCard key={plan.code} plan={plan} onBuy={handleBuy} />
          ))}
        </div>
      )}

      {selected && <CheckoutModal plan={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

export default PricingPlans
