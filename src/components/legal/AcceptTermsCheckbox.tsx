'use client'

import { useId } from 'react'
import { Trans, useTranslation } from 'react-i18next'

/**
 * "I agree to the Terms of Use and the Privacy Policy" — the one wording used by every
 * sign-up form and by the after-sign-in acceptance screen (ConsentGate), so what a
 * person ticked is the same everywhere.
 *
 * Starts UNTICKED and the caller must keep it that way: a pre-ticked box is not a
 * clear affirmative action (DPDP Act s.6(1)) and would make the recorded acceptance
 * worthless as evidence. The links open in a new tab so reading them never loses
 * what the person has already typed into the form.
 *
 * `showRequired` puts the "please tick the box" hint directly under the box. The
 * sign-up pages print their other errors at the top of the form, out of sight of
 * the button that was just pressed; this one has to be where the person is looking.
 */
export function AcceptTermsCheckbox({
  checked,
  onChange,
  showRequired = false,
  className = 'text-sm lg:text-base text-[#4d4d4d]',
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  showRequired?: boolean
  className?: string
}) {
  const { t } = useTranslation('legal')
  const hintId = useId()
  const link = 'text-primary-90 underline'
  const invalid = showRequired && !checked
  return (
    <div>
      <label className={`flex items-start gap-2 ${className}`}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 mt-1 shrink-0 accent-primary-50"
          aria-required="true"
          aria-invalid={invalid}
          aria-describedby={invalid ? hintId : undefined}
        />
        <span>
          <Trans
            i18nKey="legal:consent.agreeLabel"
            components={{
              terms: <a href="/terms" target="_blank" rel="noopener noreferrer" className={link} />,
              privacy: <a href="/privacy" target="_blank" rel="noopener noreferrer" className={link} />,
            }}
          />
        </span>
      </label>
      {invalid && (
        <p id={hintId} role="alert" className="mt-1 ml-6 text-sm text-red-600">
          {t('consent.requiredHint')}
        </p>
      )}
    </div>
  )
}
