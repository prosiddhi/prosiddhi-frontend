'use client'

// Employer credit-wallet card (PJP-178). Shows POST + DOWNLOAD balances, the
// wallet's single expiry date, and a "credits never expire" note when the
// employer holds pack credits. Data from GET /api/employers/me/credits via
// useCredits(); `reload()` is called by checkout/post-gate after a spend/grant.

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, Unlock, Loader2, AlertCircle, Plus } from 'lucide-react'
import { useCredits } from '@/hooks/useCredits'
import { TopUpModal } from '@/components/employer/TopUpModal'

// Absolute date like "12 Jul 2026" (wallet expiry is a calendar-relevant date).
function formatDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function Tile({
  icon,
  label,
  balance,
  expiry,
}: {
  icon: React.ReactNode
  label: string
  balance: number
  expiry: string | null
}) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-4">
      <div className="w-11 h-11 rounded-lg bg-[#e3f5ff] flex items-center justify-center flex-shrink-0 text-[#236987]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-black leading-tight">{balance}</p>
        <p className="text-xs sm:text-sm text-[#717182]">{label}</p>
        {expiry && (
          <p className="text-xs text-[#717182] mt-0.5">{t('employer:wallet.expires', { date: expiry })}</p>
        )}
      </div>
    </div>
  )
}

export function CreditWallet({ className }: { className?: string }) {
  const { t } = useTranslation()
  const { wallet, loading, error, reload } = useCredits()
  const [topUp, setTopUp] = useState(false)

  return (
    <div className={`bg-white border border-[#dddddd] rounded-[10px] p-5 sm:p-6 ${className ?? ''}`}>
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="text-lg sm:text-xl font-semibold text-black">{t('employer:wallet.title')}</h2>
        <button
          type="button"
          onClick={() => setTopUp(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors text-sm whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          {t('employer:wallet.buyCredits')}
        </button>
      </div>

      {topUp && (
        <TopUpModal
          onClose={() => {
            setTopUp(false)
            reload() // refresh balances in case a top-up completed
          }}
        />
      )}

      {loading && (
        <div className="flex items-center gap-2 py-4 text-[#717182]">
          <Loader2 className="w-5 h-5 animate-spin text-primary-50" />
          <span className="text-sm">{t('employer:wallet.loading')}</span>
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-3 py-4 text-sm">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-red-600">{t('employer:wallet.error')}</span>
          <button type="button" onClick={reload} className="text-primary-50 underline hover:no-underline">
            {t('buttons.retry')}
          </button>
        </div>
      )}

      {!loading && !error && wallet && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Tile
              icon={<FileText className="w-5 h-5" />}
              label={t('employer:wallet.postCredits')}
              balance={wallet.post.balance}
              expiry={formatDate(wallet.post.expiresAt)}
            />
            <Tile
              icon={<Unlock className="w-5 h-5" />}
              label={t('employer:wallet.downloadCredits')}
              balance={wallet.download.balance}
              expiry={formatDate(wallet.download.expiresAt)}
            />
          </div>
          {wallet.packNeverExpires && (
            <p className="text-xs text-[#717182] mt-4">{t('employer:wallet.packNeverExpires')}</p>
          )}
        </>
      )}
    </div>
  )
}

export default CreditWallet
