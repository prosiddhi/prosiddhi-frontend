'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { ChevronLeft } from 'lucide-react'

/**
 * "← Back" to the landing page (`/`), for the two pages a visitor reaches from
 * its role cards: the seeker landing (/employee) and the employer landing
 * (/employer/welcome). Always `/`, not browser history — someone who arrived on a
 * shared link has no history on this site to go back to.
 *
 * Same look as the Back link on a job's page (JobDetailsView).
 */
export function BackToLandingLink() {
  const { t } = useTranslation()

  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 min-h-[44px] text-black hover:text-primary-50 transition-colors"
    >
      <ChevronLeft className="w-5 h-5" />
      <span className="text-base sm:text-lg">{t('buttons.back')}</span>
    </Link>
  )
}
