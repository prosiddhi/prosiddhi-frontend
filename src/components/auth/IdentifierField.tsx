'use client'

import type { UseFormRegisterReturn } from 'react-hook-form'
import { Field } from '@/components/form/Field'

interface IdentifierFieldProps {
  id: string
  label: string
  placeholder: string
  register: UseFormRegisterReturn
}

/**
 * The phone-or-email login field (TD-37). `type="text"`, not "tel" or
 * "email" — this field takes either, and a tel keypad cannot produce an "@".
 * autoCapitalize/spellCheck off because Android otherwise renders an email as
 * "You@example.com" mid-type.
 */
export function IdentifierField({ id, label, placeholder, register }: IdentifierFieldProps) {
  return (
    <Field label={label} className="block text-base font-medium text-black mb-2">
      <input
        id={id}
        type="text"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        placeholder={placeholder}
        className="w-full h-12 px-4 border border-[#b5b5b5] rounded-lg text-base text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all"
        required
        {...register}
      />
    </Field>
  )
}
