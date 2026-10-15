'use client'

import { useState } from 'react'
import { CheckCircle2, Circle, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { passwordRuleChecks } from '@/lib/validation/passwordPolicy'

interface PasswordRequirementsChecklistProps {
  password: string
  /**
   * The field has been left (blur) or a submit was blocked on it. Together with
   * "something was typed", this ends the neutral starting state: from then on an
   * empty password shows its real, unmet rules.
   */
  touched?: boolean
}

/**
 * The live version of the password-requirements hint, shared by every screen
 * that sets a password (register, employer register, forgot-password reset,
 * change-password, settings). Each row's met/unmet state comes from
 * `passwordRuleChecks` — the same checks `isStrongPassword` runs — so this
 * can never show a rule as satisfied that the actual gate would still reject.
 *
 * Before the person has interacted there is nothing to judge, so every row is
 * neutral grey rather than claiming the rules are met (or failed). After that:
 * met rows are green with a check, unmet rows red with a cross.
 */
export function PasswordRequirementsChecklist({ password, touched = false }: PasswordRequirementsChecklistProps) {
  const { t } = useTranslation()
  // Set once something has been typed and never cleared, so deleting the text
  // again shows the unmet state instead of dropping back to neutral. Setting
  // state during render is the supported way to derive this from a prop.
  const [typed, setTyped] = useState(false)
  if (password !== '' && !typed) setTyped(true)
  const neutral = password === '' && !typed && !touched

  return (
    <div>
      <p className="text-sm font-medium text-black mb-2">{t('passwordRequirements.intro')}</p>
      <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
        {passwordRuleChecks.map(({ key, test }) => {
          const met = !neutral && test(password)
          const tone = neutral ? 'text-gray-500' : met ? 'text-green-700' : 'text-red-600'
          const Icon = neutral ? Circle : met ? CheckCircle2 : XCircle
          return (
            <li key={key} className={`flex items-center gap-2 text-sm ${tone}`}>
              <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
              {t(`passwordRequirements.${key}`)}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
