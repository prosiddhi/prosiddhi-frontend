'use client'

// Employer pricing catalog (PJP-176). Fetches the plan catalog from
// GET /api/plans and presents it in the Figma pricing UI (node 1910:2521):
// a tab toggle over a 4-up card grid — gradient header, big price,
// check-bullet inclusions, "+ 18% GST".
//
// UI style is from the mock; the DATA + rules are ours (decisions-tracker):
//   • employers buy JOB POSTS only for now (Nazir, 20 Oct 2026): the "Job
//     posting" tab lists the plans; "Bundle" and "Database" say "Launching soon"
//   • card facts are our structured plan attributes (posts / validity / how
//     long a job stays live) — NOT the mock's marketing bullets, and NO Phase-2
//     candidate-search claim (#23)
//   • a running offer shows as the list price struck through + the offer price
//     + a "% OFF" badge, and a sale banner above the plans. All amounts come
//     from the server; nothing here works a price out
//   • Buy launches the real Razorpay checkout (PJP-177)
//   • the permanent free tier + 14-day trial stays as a callout

import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { CheckCircle2, Clock, Headset } from 'lucide-react'
import { subscriptionAPI, type Plan, type PlanOffer } from '@/lib/api'
import { CheckoutModal } from '@/components/employer/CheckoutModal'
import { OfferPrice } from '@/components/employer/OfferPrice'
import { inrDigits, listPrice, planName } from '@/lib/pricing'
import { formatShortDate } from '@/lib/jobFormat'

type Tab = 'jobs' | 'bundle' | 'database'

function PlanCard({
  plan,
  onBuy,
  canBuy,
}: {
  plan: Plan
  onBuy: (plan: Plan) => void
  canBuy: boolean
}) {
  const { t } = useTranslation()

  // Inclusions (our data, mock styling). Posts are the header subtitle, so the
  // bullets carry validity and how long a job stays live. Unlocks and seats
  // show only when a plan adds them (today's plans: 0 unlocks, 1 seat).
  const facts: string[] = [
    plan.durationDays == null
      ? t('employer:plans.neverExpires')
      : t('employer:plans.useWithin', { days: plan.durationDays }),
  ]
  // An older backend does not send jobLiveDays — then the line is left out.
  if (plan.jobLiveDays) {
    facts.push(t('employer:plans.jobLive', { days: plan.jobLiveDays }))
  }
  if (plan.downloadCredits > 0) {
    facts.push(`${plan.downloadCredits} ${t('employer:plans.unlocksLabel')}`)
  }
  if (plan.seats > 1) {
    facts.push(`${plan.seats} ${t('employer:plans.seats')}`)
  }

  return (
    <div className="bg-white border border-[#dddddd] rounded-[20px] overflow-hidden flex flex-col">
      {/* Gradient header — title, "N job posts", price */}
      <div className="bg-gradient-to-b from-primary-20 to-white px-6 pt-6 pb-6">
        <h4 className="text-xl sm:text-2xl font-semibold text-black">{planName(t, plan)}</h4>
        <p className="text-[16px] sm:text-[18px] text-[#717182] mt-1">
          {t('employer:plans.posts', { count: plan.postCredits })}
        </p>
        {/* Fixed height so cards with and without an offer line up. */}
        <div className="mt-4 min-h-[28px]">
          <OfferPrice plan={plan} />
        </div>
        <div className="mt-1 flex items-start gap-0.5">
          <span className="text-3xl sm:text-4xl font-bold leading-none mt-1">₹</span>
          <span className="text-5xl sm:text-6xl font-bold leading-none tracking-tight">
            {inrDigits(plan.baseInr)}
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
        {canBuy && (
          <button
            type="button"
            onClick={() => onBuy(plan)}
            className="mt-5 w-full bg-primary-50 text-primary-100 rounded-[8px] py-3 text-[16px] font-medium hover:bg-primary-60 transition-colors"
          >
            {t('employer:plans.buy')}
          </button>
        )}
        <p className="mt-3 text-[14px] italic text-[#aaaaaa] text-center">
          {t('employer:plans.gstApplicable')}
        </p>
      </div>
    </div>
  )
}

// The limited-time sale banner, built from the offers on the plans. The biggest
// offer names the sale. "All plans" is said only when every plan has the same
// percent off; otherwise "up to". "Ends …" only when that offer has an end date.
function SaleBanner({ plans }: { plans: Plan[] }) {
  const { t } = useTranslation()

  let best: PlanOffer | null = null
  let samePercentOnAll = true
  for (const plan of plans) {
    if (!plan.offer) {
      samePercentOnAll = false
      continue
    }
    if (best && best.percentOff !== plan.offer.percentOff) samePercentOnAll = false
    if (!best || plan.offer.percentOff > best.percentOff) best = plan.offer
  }
  if (!best) return null

  const headline = t(samePercentOnAll ? 'employer:plans.offer.bannerAll' : 'employer:plans.offer.bannerUpTo', {
    label: best.label,
    percent: best.percentOff,
  })
  const endsOn = formatShortDate(best.endsAt)

  return (
    <div className="mb-8 rounded-[16px] bg-gradient-to-r from-amber-100 via-orange-50 to-amber-100 border border-amber-200 px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-center sm:text-left">
      <p className="text-base sm:text-lg font-semibold text-[#7a3e00]">
        <span aria-hidden="true">🎉 </span>
        {headline}
      </p>
      <p className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-[#9a5200]">
        <Clock className="w-4 h-4" />
        {endsOn ? t('employer:plans.offer.endsOn', { date: endsOn }) : t('employer:plans.offer.limitedTime')}
      </p>
    </div>
  )
}

// A tab whose product is not on sale yet — a friendly note, nothing to buy.
function LaunchingSoon({ body }: { body: string }) {
  const { t } = useTranslation()
  return (
    <div className="max-w-xl mx-auto bg-white border border-[#dddddd] rounded-[20px] px-6 py-12 text-center">
      <Clock className="w-10 h-10 text-primary-50 mx-auto mb-4" />
      <h3 className="text-xl sm:text-2xl font-semibold text-black mb-2">{t('employer:plans.soon.title')}</h3>
      <p className="text-[#717182]">{body}</p>
    </div>
  )
}

// "Need more?" — a custom plan through sales. No price.
function CustomPlanCard() {
  const { t } = useTranslation()
  return (
    <div className="mt-8 max-w-[1400px] mx-auto bg-white border border-[#dddddd] rounded-[20px] px-6 py-6 sm:px-8 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
      <div className="w-12 h-12 rounded-full bg-[#e3f5ff] flex items-center justify-center text-[#236987] flex-shrink-0">
        <Headset className="w-6 h-6" />
      </div>
      <div className="flex-1">
        <h3 className="text-lg sm:text-xl font-semibold text-black mb-1">{t('employer:plans.custom.title')}</h3>
        <p className="text-[#717182]">{t('employer:plans.custom.body')}</p>
      </div>
      <Link
        href="/contact"
        className="inline-flex items-center justify-center px-6 py-3 border border-primary-50 text-primary-50 rounded-[8px] font-medium hover:bg-primary-50/5 transition-colors whitespace-nowrap"
      >
        {t('employer:plans.custom.cta')}
      </Link>
    </div>
  )
}

/**
 * @param canBuy whether to show the Buy buttons. The signed-in /employer/plans
 * screen passes `false` for anyone who is not the account OWNER (buying is
 * owner-only on the backend), including while the role is still unknown.
 *
 * Signed-in only: there is no public pricing (Nazir, 20 Oct 2026) — the
 * /employer/welcome catalog that used to render this for anonymous visitors is gone.
 */
export function PricingPlans({ canBuy }: { canBuy: boolean }) {
  const { t } = useTranslation()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selected, setSelected] = useState<Plan | null>(null)
  const [tab, setTab] = useState<Tab>('jobs')

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

  // The job-post plans, cheapest first by the normal price so an offer never
  // reorders the cards. PRO plans are retired; they are dropped here too in
  // case the catalog migration has not run yet.
  const shown = plans
    .filter((p) => p.group !== 'PRO')
    .sort((a, b) => listPrice(a) - listPrice(b))

  const TABS: { key: Tab; label: string }[] = [
    { key: 'jobs', label: t('employer:plans.tabJobs') },
    { key: 'bundle', label: t('employer:plans.tabBundle') },
    { key: 'database', label: t('employer:plans.tabDatabase') },
  ]

  return (
    <div className="bg-[#f8f8ff] rounded-[20px] px-4 sm:px-8 lg:px-12 py-10 sm:py-14">
      {tab === 'jobs' && !loading && !error && <SaleBanner plans={shown} />}

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

      {/* Job posting / Bundle / Database toggle */}
      <div className="flex justify-center mb-8 sm:mb-10">
        <div className="inline-flex flex-wrap justify-center bg-white border border-[#eeeeee] rounded-[24px] p-1">
          {TABS.map((tabItem) => (
            <button
              key={tabItem.key}
              type="button"
              onClick={() => setTab(tabItem.key)}
              aria-pressed={tab === tabItem.key}
              className={`px-4 sm:px-6 py-2 rounded-full text-base sm:text-[18px] transition-colors ${
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

      {tab === 'bundle' && <LaunchingSoon body={t('employer:plans.soon.bundleBody')} />}
      {tab === 'database' && <LaunchingSoon body={t('employer:plans.soon.databaseBody')} />}

      {tab === 'jobs' && loading && (
        <p className="text-center py-12 text-[#717182]">{t('employer:plans.loading')}</p>
      )}

      {tab === 'jobs' && error && !loading && (
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

      {tab === 'jobs' && !loading && !error && (
        // `min-[1350px]:grid-cols-4`, not `lg:` (1024) — at 1024-1280px (100-125%
        // zoom on this page's usual 1280-wide window) four columns squeezed each
        // card too narrow and clipped the price. 1350 sits between 1280 (100%,
        // needs 2) and 1422 (90%, already fine at 4), so those two stay untouched
        // while 100/110/125% drop to the `sm:grid-cols-2` tier already below it.
        <div className="grid grid-cols-1 sm:grid-cols-2 min-[1350px]:grid-cols-4 gap-5 lg:gap-6 max-w-[1400px] mx-auto">
          {shown.map((plan) => (
            <PlanCard key={plan.code} plan={plan} onBuy={setSelected} canBuy={canBuy} />
          ))}
        </div>
      )}

      <CustomPlanCard />

      {selected && (
        <CheckoutModal
          plan={selected}
          onClose={(repriced) => {
            setSelected(null)
            // Checkout found a new price, so the cards are out of date.
            if (repriced) void load()
          }}
        />
      )}
    </div>
  )
}

export default PricingPlans
