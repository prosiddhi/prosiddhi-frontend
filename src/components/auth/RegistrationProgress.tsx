'use client'

import { useTranslation } from 'react-i18next'
import { ChevronLeft } from 'lucide-react'

/**
 * RegistrationProgress — the ONE progress indicator for seeker registration.
 *
 * The flow used to disagree with itself: the language step showed nothing, phone
 * through categories counted "Step N of 7", the experience step swapped to a
 * completely different 3-dot stepper with no counter at all, and the password step
 * then jumped straight to "Step 7 of 7" — so the count skipped 6 and the total was
 * wrong. Some steps drew 5 progress dots while claiming to be one of 7.
 *
 * For an audience that is often low-literacy, a progress indicator that lies is
 * worse than none: it is the only signal of "how much is left". This component is
 * the single source of truth — one segment per real step, an honest count, and the
 * same look on every screen.
 */

/**
 * The registration flow, in order. `/register/success` is the confirmation, not a
 * step, so it is not listed. Keep this in sync with the route order — the total
 * is derived from it, so adding a step cannot silently break the count again.
 */
export const REGISTRATION_STEPS = [
  'language', // /register
  'phone', // /register/phone
  'otp', // /register/otp
  'profile', // /register/profile
  'categories', // /register/categories
  'experience', // /register/experience
  'password', // /register/password
  'verifyEmail', // /register/verify-email
] as const

export type RegistrationStep = (typeof REGISTRATION_STEPS)[number]

export const TOTAL_STEPS = REGISTRATION_STEPS.length

export function RegistrationProgress({
  step,
  onBack,
  className = '',
}: {
  /** Which step this screen is — by name, so the numbering can never drift. */
  step: RegistrationStep
  /** Renders a back chevron when provided. */
  onBack?: () => void
  className?: string
}) {
  const { t } = useTranslation()

  const current = REGISTRATION_STEPS.indexOf(step) + 1

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label={t('buttons.back')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-gray-600" />
        </button>
      )}

      <div
        className="flex items-center gap-1.5"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={1}
        aria-valuemax={TOTAL_STEPS}
        aria-label={t('auth:registration.stepOf', { current, total: TOTAL_STEPS })}
      >
        {REGISTRATION_STEPS.map((name, i) => (
          <div
            key={name}
            className={`w-[22px] sm:w-[30px] h-[8px] rounded transition-colors ${
              i < current ? 'bg-primary-50' : 'bg-[#E0E0E0]'
            }`}
          />
        ))}
      </div>

      <span className="text-[#767676] text-sm sm:text-[16px] ml-1 sm:ml-2 whitespace-nowrap">
        {t('auth:registration.stepOf', { current, total: TOTAL_STEPS })}
      </span>
    </div>
  )
}

export default RegistrationProgress
