'use client'

// My Plans — the subscriptions, credit packs and trial this employer holds, each
// with its own dates. Read-only. Data comes from the same wallet call as the
// dashboard card (GET /api/employers/me/credits via useCredits()); buying stays
// on /employer/plans.
//
// What the API does and does not say, and what this page therefore avoids:
//   • `plans[]` holds only subscriptions unexpired at the server's clock, so we
//     never print "Active"/"Expired" — there is no status field to trust. We show
//     the dates and a day count. The count is display-only: it is worked out from
//     the browser's clock when the page renders (so a wrong device clock, or a tab
//     left open, gives a wrong count), and nothing here uses it to decide whether
//     a plan is running.
//   • Subscriptions run side by side, not queued. Dates are shown as returned.
//   • A plan's `postCredits`/`downloadCredits` are what it GRANTED, not what is
//     left. The pooled balance sits in the summary.
//   • Seats are NOT summed: `seatCap` is the MAX over plans. Seats are shown once,
//     in the summary; each card only says how many its own plan includes.

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { AlertCircle, ChevronLeft, FileText, Loader2, PauseCircle, Receipt, Unlock, Users } from 'lucide-react'
import { EmployerHeader } from '@/components/employer/EmployerHeader'
import { useCredits } from '@/hooks/useCredits'
import { formatShortDate } from '@/lib/jobFormat'
import type { HeldPlan, HeldProduct, Wallet } from '@/lib/api'

const DAY_MS = 86_400_000
// A plan ending within this many days gets the "Ends soon" badge.
const ENDS_SOON_DAYS = 7

const GROUP_KEYS: Record<string, string> = { STARTER: 'starter', PRO: 'pro' }
const BILLING_KEYS: Record<string, string> = {
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  HALF_YEARLY: 'halfYearly',
  YEARLY: 'yearly',
  LIFETIME: 'lifetime',
}

/** Whole days until `iso`, never negative; null when the date is missing or invalid. */
function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null
  const time = new Date(iso).getTime()
  if (Number.isNaN(time)) return null
  return Math.max(0, Math.ceil((time - Date.now()) / DAY_MS))
}

/** Soonest expiry first; a missing or invalid date sorts last. */
function sortBySoonestExpiry(plans: HeldPlan[]): HeldPlan[] {
  const key = (p: HeldPlan) => {
    const time = new Date(p.expiresAt).getTime()
    return Number.isNaN(time) ? Infinity : time
  }
  return [...plans].sort((a, b) => key(a) - key(b))
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg sm:text-xl font-semibold text-black mb-4">{title}</h2>
      {children}
    </section>
  )
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-11 h-11 rounded-lg bg-[#e3f5ff] flex items-center justify-center flex-shrink-0 text-[#236987]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xl sm:text-2xl font-bold text-black leading-tight">{value}</p>
        <p className="text-xs sm:text-sm text-[#717182]">{label}</p>
      </div>
    </div>
  )
}

function Summary({ wallet }: { wallet: Wallet }) {
  const { t } = useTranslation()
  const expiry = formatShortDate(wallet.planExpiresAt)
  return (
    <div className="bg-white border border-[#dddddd] rounded-[10px] p-5 sm:p-6 mb-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Stat
          icon={<FileText className="w-5 h-5" />}
          value={String(wallet.post.balance)}
          label={t('employer:wallet.postCredits', { count: wallet.post.balance })}
        />
        <Stat
          icon={<Unlock className="w-5 h-5" />}
          value={String(wallet.download.balance)}
          label={t('employer:wallet.downloadCredits', { count: wallet.download.balance })}
        />
        <Stat
          icon={<Users className="w-5 h-5" />}
          value={t('employer:myPlans.seatsValue', { used: wallet.seatsUsed, total: wallet.seatCap })}
          label={t('employer:myPlans.seats')}
        />
      </div>
      {expiry && (
        <p className="text-sm text-[#717182] mt-4">{t('employer:myPlans.lastPlanEnds', { date: expiry })}</p>
      )}
      <p className="text-xs text-[#717182] mt-2">{t('employer:myPlans.balanceNote')}</p>
    </div>
  )
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-[#717182]">{label}</dt>
      <dd className="text-sm text-black mt-0.5">{children}</dd>
    </div>
  )
}

function PlanCard({ plan }: { plan: HeldPlan }) {
  const { t } = useTranslation()
  const days = daysUntil(plan.expiresAt)
  const endsSoon = days !== null && days <= ENDS_SOON_DAYS
  const groupKey = GROUP_KEYS[plan.group]
  const billingKey = BILLING_KEYS[plan.billingPeriod]

  return (
    <li className="bg-white border border-[#dddddd] rounded-[10px] p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-semibold text-black break-words">{plan.name}</h3>
          <p className="text-sm text-[#717182] mt-0.5">
            {[groupKey && t(`employer:myPlans.group.${groupKey}`), billingKey && t(`employer:myPlans.billing.${billingKey}`)]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
        {endsSoon && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium whitespace-nowrap">
            <AlertCircle className="w-3.5 h-3.5" />
            {t('employer:myPlans.endsSoon')}
          </span>
        )}
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-3 mt-4">
        <Detail label={t('employer:myPlans.started')}>{formatShortDate(plan.startedAt) || '—'}</Detail>
        <Detail label={t('employer:myPlans.ends')}>
          {formatShortDate(plan.expiresAt) || '—'}
          {days !== null && (
            <span className="block text-xs text-[#717182]">
              {days === 0 ? t('employer:myPlans.endingNow') : t('employer:myPlans.daysLeft', { count: days })}
            </span>
          )}
        </Detail>
        <Detail label={t('employer:myPlans.seats')}>
          {t('employer:myPlans.seatsIncluded', { count: plan.seats })}
        </Detail>
        <Detail label={t('employer:myPlans.granted')}>
          <span className="block">
            {plan.postCredits} {t('employer:wallet.postCredits', { count: plan.postCredits })}
          </span>
          <span className="block">
            {plan.downloadCredits} {t('employer:wallet.downloadCredits', { count: plan.downloadCredits })}
          </span>
        </Detail>
      </dl>
    </li>
  )
}

function ProductRow({ product, wallet }: { product: HeldProduct; wallet: Wallet }) {
  const { t } = useTranslation()
  const isTrial = product.group === 'TRIAL'
  // The trial's own deadline is `wallet.trial.expiresAt`; `product.expiresAt` is the
  // same lot's date. Prefer the wallet's, which is what the dashboard banner uses.
  const expiresAt = isTrial ? (wallet.trial?.expiresAt ?? product.expiresAt) : product.expiresAt
  const date = formatShortDate(expiresAt)
  const trial = isTrial ? wallet.trial : null

  return (
    <li className="bg-white border border-[#dddddd] rounded-[10px] p-5 sm:p-6">
      <h3 className="text-base font-semibold text-black break-words">
        {isTrial ? t('employer:myPlans.freeTrial') : product.name}
      </h3>
      <p className="text-sm text-[#717182] mt-1">
        {date
          ? t('employer:wallet.expires', { date })
          : product.group === 'PACK'
            ? t('employer:myPlans.neverExpires')
            : null}
      </p>
      {trial && (
        <p className="text-sm text-black mt-2">
          {t('employer:myPlans.left')}: {trial.postRemaining} {t('employer:wallet.postCredits', { count: trial.postRemaining })}
          {' · '}
          {trial.downloadRemaining} {t('employer:wallet.downloadCredits', { count: trial.downloadRemaining })}
        </p>
      )}
    </li>
  )
}

function Empty({ wallet, canBuy }: { wallet: Wallet; canBuy: boolean }) {
  const { t } = useTranslation()
  // `hasPurchased` with no plan rows means they bought before and nothing is
  // running now — not that they never bought.
  const boughtBefore = !!wallet.hasPurchased
  return (
    <div className="bg-white border border-[#dddddd] rounded-[10px] p-6 text-center">
      <p className="font-semibold text-black">
        {boughtBefore ? t('employer:myPlans.noneRunningTitle') : t('employer:myPlans.neverBoughtTitle')}
      </p>
      <p className="text-sm text-[#717182] mt-1">
        {boughtBefore ? t('employer:myPlans.noneRunningBody') : t('employer:myPlans.neverBoughtBody')}
      </p>
      {canBuy ? (
        <Link
          href="/employer/plans"
          className="inline-flex mt-4 px-5 py-2.5 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors text-sm"
        >
          {boughtBefore ? t('employer:wallet.renew') : t('employer:myPlans.browsePlans')}
        </Link>
      ) : (
        <p className="text-sm text-[#717182] mt-4">{t('employer:myPlans.ownerBuysNote')}</p>
      )}
    </div>
  )
}

function MyPlansContent() {
  const { t } = useTranslation()
  const { wallet, loading, error, reload } = useCredits()

  // Buying is owner-only on the backend (checkout rejects a MEMBER), so a member
  // is not offered a buy link. `undefined` wallet → false: fail closed.
  const canBuy = wallet?.role === 'OWNER'
  const plans = sortBySoonestExpiry(wallet?.plans ?? [])
  const products = wallet?.products ?? []
  // A live trial the products list did not carry still deserves one row.
  const hasTrialProduct = products.some((p) => p.group === 'TRIAL')
  const liveTrial =
    wallet?.trial && (wallet.trial.postRemaining > 0 || wallet.trial.downloadRemaining > 0)
      ? wallet.trial
      : null
  const trialOnly: HeldProduct | null =
    liveTrial && !hasTrialProduct
      ? { name: '', code: null, group: 'TRIAL', expiresAt: liveTrial.expiresAt }
      : null
  const productRows = trialOnly ? [trialOnly, ...products] : products

  return (
    <div className="min-h-screen bg-[#f7fbfd] flex flex-col">
      <EmployerHeader />

      <main className="flex-1 py-8 sm:py-10">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px]">
          <Link href="/employer" className="inline-flex items-center gap-2 text-black hover:text-primary-50 transition-colors mb-6">
            <ChevronLeft className="w-5 h-5" />
            <span>{t('employer:myPlans.back')}</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-black mb-1">{t('employer:myPlans.title')}</h1>
          <p className="text-[#717182] mb-6">{t('employer:myPlans.subtitle')}</p>

          {loading && (
            <div className="flex items-center gap-2 py-8 text-[#717182]" role="status">
              <Loader2 className="w-5 h-5 animate-spin text-primary-50" />
              <span className="text-sm">{t('employer:myPlans.loading')}</span>
            </div>
          )}

          {!loading && error && (
            <div className="flex items-center gap-3 py-8 text-sm" role="alert">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <span className="text-red-600">{t('employer:myPlans.error')}</span>
              <button type="button" onClick={reload} className="text-primary-50 underline hover:no-underline">
                {t('buttons.retry')}
              </button>
            </div>
          )}

          {!loading && !error && wallet && (
            <>
              {/* Same banner as the Team page: the seat is over the plan's cap.
                  Reading still works; the backend blocks posting and unlocking. */}
              {wallet.seatStatus === 'SUSPENDED' && (
                <div className="flex items-start gap-3 mb-6 p-4 bg-amber-50 border border-amber-200 rounded-[12px]" role="status">
                  <PauseCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-900">{t('employer:team.suspendedBannerTitle')}</p>
                    <p className="text-amber-800">{t('employer:team.suspendedBannerBody')}</p>
                  </div>
                </div>
              )}

              {wallet.inGracePeriod && (
                <div className="flex flex-wrap items-center gap-2 mb-6 px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-sm" role="status">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{t('employer:myPlans.grace')}</span>
                  {canBuy ? (
                    <Link href="/employer/plans" className="underline font-medium whitespace-nowrap">
                      {t('employer:wallet.renew')}
                    </Link>
                  ) : (
                    <span>{t('employer:myPlans.ownerBuysNote')}</span>
                  )}
                </div>
              )}

              <Summary wallet={wallet} />

              <Section title={t('employer:myPlans.plansHeading')}>
                {plans.length > 0 ? (
                  <>
                    <p className="text-xs text-[#717182] mb-4">{t('employer:myPlans.seatsNote')}</p>
                    <ul className="space-y-4">
                      {plans.map((plan) => (
                        <PlanCard key={plan.subscriptionId} plan={plan} />
                      ))}
                    </ul>
                  </>
                ) : (
                  <Empty wallet={wallet} canBuy={canBuy} />
                )}
              </Section>

              {productRows.length > 0 && (
                <Section title={t('employer:myPlans.packsHeading')}>
                  <ul className="space-y-4">
                    {/* Products carry no id. group+code can repeat (the same plan code
                        from two sources), so the position is added; this list is never
                        re-sorted, so the position is stable between renders. */}
                    {productRows.map((product, i) => (
                      <ProductRow key={`${product.group}:${product.code ?? 'trial'}:${i}`} product={product} wallet={wallet} />
                    ))}
                  </ul>
                </Section>
              )}

              <div className="flex flex-wrap items-center gap-4">
                {canBuy && (
                  <Link href="/employer/plans" className="text-sm text-primary-50 hover:underline">
                    {t('employer:wallet.buyCredits')}
                  </Link>
                )}
                <Link href="/employer/invoices" className="inline-flex items-center gap-1.5 text-sm text-primary-50 hover:underline">
                  <Receipt className="w-4 h-4" />
                  {t('employer:wallet.invoices')}
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default function MyPlansPage() {
  return (
    <ProtectedRoute requiredRole="employer">
      <MyPlansContent />
    </ProtectedRoute>
  )
}
