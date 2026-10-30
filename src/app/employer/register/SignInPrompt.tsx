'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { PUBLIC_LOGIN_HREF } from '@/lib/publicNav'

/**
 * "Already have an account? Sign in here" — the way back for an employer who found the
 * sign-up screens by mistake or whose session ended. Used by every employer sign-up step.
 *
 * It was five copies of a bold sky-blue (`primary-50`) inline link: 2.02:1 on white
 * (AA needs 4.5:1) and as tall as its text line (~20px). Now `secondary-80` (4.77:1),
 * underlined so it does not depend on colour, and at least 44px tall.
 */
export function SignInPrompt() {
  const { t } = useTranslation()
  return (
    <div className="text-center mt-6 text-sm sm:text-base">
      <span className="text-gray-600">{t('employerRegister:signInPrompt')}</span>
      <Link
        href={PUBLIC_LOGIN_HREF}
        className="inline-flex items-center min-h-[44px] px-1 font-semibold text-secondary-80 underline underline-offset-2 hover:text-secondary-90 transition-colors"
      >
        {t('employerRegister:signInLink')}
      </Link>
    </div>
  )
}
