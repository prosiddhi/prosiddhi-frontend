'use client'

// The GST / registration number error state shared by the employer registration
// form and the employer profile editor: the message under each input, the 409
// "already registered to another employer" handling, and moving keyboard focus
// to the field that failed.
//
// Focus, because both forms are long and these inputs sit well above the submit
// button — a message can be off-screen and the button then looks as if it did
// nothing. It is done in an effect, not in the click handler: the registration
// form disables its inputs while the request is in flight, and a disabled input
// cannot take focus. The effect runs after the render that re-enables it. Each
// request is a NEW object, so failing twice on the same field focuses it twice.

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { duplicateIdentifierField, type BusinessIdentifierField } from '@/lib/api'
import { DUPLICATE_IDENTIFIER_MESSAGE } from '@/lib/businessIdentifiers'

export type IdentifierErrors = Partial<Record<BusinessIdentifierField, string>>

// The input's id is the field name, and its message is `<field>-error`.
const FIELDS: BusinessIdentifierField[] = ['gstNumber', 'registrationNumber']

export function useIdentifierErrors() {
  const { t } = useTranslation()
  const [errors, setErrors] = useState<IdentifierErrors>({})
  const [focusRequest, setFocusRequest] = useState<{ field: BusinessIdentifierField } | null>(null)

  useEffect(() => {
    if (focusRequest) document.getElementById(focusRequest.field)?.focus()
  }, [focusRequest])

  /** Show these messages and move focus to the first field that has one. */
  const show = (next: IdentifierErrors) => {
    setErrors(next)
    const first = FIELDS.find((field) => next[field])
    if (first) setFocusRequest({ field: first })
  }

  return {
    errors,
    show,
    /** Start an attempt clean. */
    reset: () => setErrors({}),
    /** The user is editing this field, so its message no longer applies. */
    clear: (field: BusinessIdentifierField) =>
      setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev)),
    /**
     * If `err` is the BE's 409 for a GST / registration number another employer
     * already holds, show it under the field the BE names and return true.
     * Anything else returns false and is left for the caller.
     */
    fromError: (err: unknown): boolean => {
      const duplicate = duplicateIdentifierField(err)
      if (!duplicate) return false
      show({ [duplicate]: t(DUPLICATE_IDENTIFIER_MESSAGE[duplicate]) })
      return true
    },
    /** Spread onto the input: its id, and the link to the message under it. */
    inputProps: (field: BusinessIdentifierField) => ({
      id: field,
      'aria-invalid': !!errors[field],
      'aria-describedby': errors[field] ? `${field}-error` : undefined,
    }),
  }
}
