'use client'

import type { UseFormRegisterReturn } from 'react-hook-form'
import { Field } from '@/components/form/Field'

interface PhoneNumberFieldProps {
  id: string
  label: string
  placeholder: string
  register: UseFormRegisterReturn
  disabled?: boolean
  /** Only the Google phone-bind step marks this required in the original UI —
   *  the phone-OTP tab's own send button is already disabled while empty. */
  required?: boolean
}

/** The phone-number input used before an OTP is sent. */
export function PhoneNumberField({ id, label, placeholder, register, disabled, required }: PhoneNumberFieldProps) {
  return (
    <Field label={label} className="block text-base font-medium text-black mb-2">
      <input
        id={id}
        type="tel"
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className="w-full h-12 px-4 border border-[#b5b5b5] rounded-lg text-base text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all disabled:bg-gray-50"
        {...register}
      />
    </Field>
  )
}
