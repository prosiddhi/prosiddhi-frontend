'use client'

// Employer credit top-up pop-up (Figma node 746:2937 — visual style only).
//
// Shown when an employer needs to add credits (out of post credits at the
// post-gate, or the wallet "Top up" action). Promotes the ₹499 Single-Post
// pack — the canonical top-up in our model: one-time payment, credits never
// expire (which is exactly what the mock's "one time payment / lifetime access"
// framing describes). The mock's seeker copy is ignored; bullets are our real
// pack facts. The CTA hands off to the existing Razorpay CheckoutModal (the
// mock's custom payment screen 749:3139 is intentionally NOT used).

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { CheckCircle2, X, Loader2 } from 'lucide-react'
import { subscriptionAPI, type Plan } from '@/lib/api'
import { CheckoutModal } from '@/components/employer/CheckoutModal'

// The plan we surface as the quick top-up (seed code).
const TOPUP_PLAN_CODE = 'PACK_SINGLE_POST'

export function TopUpModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const [pack, setPack] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)

  useEffect(() => {
    let active = true
    subscriptionAPI
      .getPlans()
      .then((plans) => {
        if (!active) return
        const found = plans.find((p) => p.code === TOPUP_PLAN_CODE) ?? null
        setPack(found)
        setError(found === null)
      })
      .catch(() => {
        if (active) setError(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  // Hand off to the real checkout for the pack; closing checkout closes the
  // whole top-up flow.
  if (checkingOut && pack) {
    return <CheckoutModal plan={pack} onClose={onClose} />
  }

  const bullets = pack
    ? [
        `${pack.postCredits} ${t('employer:plans.postsLabel')}`,
        `${pack.downloadCredits} ${t('employer:plans.unlocksLabel')}`,
        t('employer:topUp.neverExpire'),
        t('employer:topUp.oneTime'),
      ]
    : []

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/50 backdrop-blur-[10px] p-4">
      <div className="bg-gradient-to-b from-[#effaff] to-white rounded-[16px] w-full max-w-[468px] p-6 sm:p-8 relative shadow-xl">
        <button
          type="button"
          onClick={onClose}
          aria-label={t('employer:topUp.close')}
          className="absolute right-4 top-4 text-gray-400 hover:text-black"
        >
          <X className="w-5 h-5" />
        </button>

        {loading && (
          <div className="flex items-center gap-2 py-10 text-[#717182]">
            <Loader2 className="w-5 h-5 animate-spin text-primary-50" />
            <span className="text-sm">{t('employer:topUp.loading')}</span>
          </div>
        )}

        {!loading && (error || !pack) && (
          <div className="py-8 text-center">
            <p className="text-[#717182] mb-4">{t('employer:topUp.unavailable')}</p>
            <Link
              href="/employer/welcome#pricing"
              className="inline-flex px-5 py-2.5 bg-primary-50 text-white rounded-lg text-sm hover:bg-primary-60 transition-colors"
            >
              {t('employer:topUp.viewAllPlans')}
            </Link>
          </div>
        )}

        {!loading && !error && pack && (
          <>
            <h3 className="text-2xl sm:text-[28px] font-semibold text-black mb-4">{pack.name}</h3>

            {/* Price banner */}
            <div className="rounded-[12px] bg-gradient-to-r from-primary-50 to-primary-40 px-5 py-4 flex items-center gap-3 mb-6">
              <span className="text-white font-bold leading-none">
                <span className="text-3xl align-top">₹</span>
                <span className="text-5xl">{pack.baseInr.toLocaleString('en-IN')}</span>
              </span>
              <div className="text-[#236987] text-[15px] leading-tight">
                <p>{t('employer:topUp.oneTimeShort')}</p>
                <p>{t('employer:topUp.lifetime')}</p>
              </div>
            </div>

            <ul className="space-y-3 mb-6">
              {bullets.map((b) => (
                <li key={b} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-primary-50 flex-shrink-0" />
                  <span className="text-[15px] sm:text-[16px] text-[#0a0a0a]">{b}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => setCheckingOut(true)}
              className="w-full bg-primary-50 text-white rounded-[8px] py-3 text-[16px] font-medium hover:bg-primary-60 transition-colors"
            >
              {t('employer:topUp.cta')}
            </button>
            <p className="mt-3 text-[13px] italic text-[#aaaaaa] text-center">
              {t('employer:plans.gstApplicable')}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default TopUpModal
