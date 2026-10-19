'use client'

import { useTranslation } from 'react-i18next'
import { Tooltip } from '@/components/ui/Tooltip'

// "Actively Looking" pill for a candidate. Only a literal `true` shows it: false, null and
// a backend that does not send the field all draw nothing.
// `focusable={false}` for cards that are links themselves, so the pill is not a second tab stop.
export function ActivelyLookingBadge({
  active,
  focusable = true,
  className,
}: {
  active?: boolean | null
  focusable?: boolean
  className?: string
}) {
  const { t } = useTranslation()
  if (active !== true) return null
  return (
    <Tooltip content={t('employer:candidates.activelyLookingHint')} focusable={focusable} align="start" className={className}>
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
        {t('employer:candidates.activelyLooking')}
      </span>
    </Tooltip>
  )
}
