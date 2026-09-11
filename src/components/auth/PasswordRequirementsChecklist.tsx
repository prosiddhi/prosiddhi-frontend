'use client'

import { CheckCircle2, Circle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { passwordRuleChecks } from '@/lib/validation/passwordPolicy'

interface PasswordRequirementsChecklistProps {
  password: string
}

/**
 * The live version of the password-requirements hint, shared by every screen
 * that sets a password (register, employer register, forgot-password reset,
 * settings change-password). Each row's met/unmet state comes from
 * `passwordRuleChecks` — the same checks `isStrongPassword` runs — so this
 * can never show a rule as satisfied that the actual gate would still reject.
 */
export function PasswordRequirementsChecklist({ password }: PasswordRequirementsChecklistProps) {
  const { t } = useTranslation()

  return (
    <div>
      <p className="text-sm font-medium text-black mb-2">{t('passwordRequirements.intro')}</p>
      <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
        {passwordRuleChecks.map(({ key, test }) => {
          const met = test(password)
          return (
            <li key={key} className="flex items-center gap-2 text-sm text-primary-50">
              {met ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <Circle className="w-4 h-4 flex-shrink-0" />
              )}
              {t(`passwordRequirements.${key}`)}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
