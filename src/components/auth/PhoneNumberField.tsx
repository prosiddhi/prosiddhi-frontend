'use client'

import { useRef, type ChangeEvent, type ClipboardEvent } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { Field } from '@/components/form/Field'
import { toMobileDigits, toMobileInputDigits } from '@/lib/identifier'

interface PhoneNumberFieldProps {
  id: string
  label: string
  placeholder: string
  register: UseFormRegisterReturn
  disabled?: boolean
  /** Only the Google phone-bind step marks this required in the original UI —
   *  the phone-OTP tab's own send button is already disabled while empty. */
  required?: boolean
  /** Called when typed or pasted text is refused (the field keeps its old value),
   *  so the host can show its invalid-number message. */
  onInputRefused?: () => void
  /** Called when the field takes a change, so the host can clear that message. */
  onInputAccepted?: () => void
}

/**
 * The phone-number input used before an OTP is sent.
 *
 * Typing and pasting follow the registration and Change Phone inputs: the text is
 * judged by `toMobileInputDigits` / `toMobileDigits` before it reaches the form, a
 * refused change keeps the previous value, and a whole supported number (`+91…`)
 * replaces the field with its 10 digits. The form still validates on submit.
 * No `maxLength`: the browser would cut a paste before either handler saw it.
 */
export function PhoneNumberField({
  id,
  label,
  placeholder,
  register,
  disabled,
  required,
  onInputRefused,
  onInputAccepted,
}: PhoneNumberFieldProps) {
  // The value the field held before the change being judged. The DOM already has
  // the new text by the time onChange runs; refreshed on focus because the form can
  // set the value itself (the tab switch carries a number over).
  const lastValue = useRef('')

  const take = (input: HTMLInputElement, digits: string) => {
    input.value = digits
    lastValue.current = digits
    register.onChange({ target: input, type: 'change' })
    onInputAccepted?.()
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const digits = toMobileInputDigits(e.target.value)
    if (digits === null) {
      e.target.value = lastValue.current
      onInputRefused?.()
      return
    }
    take(e.target, digits)
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const digits = toMobileDigits(e.clipboardData.getData('text'))
    if (!digits) return
    e.preventDefault()
    take(e.currentTarget, digits)
  }

  return (
    <Field label={label} className="block text-base font-medium text-black mb-2">
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className="w-full h-12 px-4 border border-[#b5b5b5] rounded-lg text-base text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all disabled:bg-gray-50"
        {...register}
        onChange={handleChange}
        onPaste={handlePaste}
        onFocus={(e) => {
          lastValue.current = e.currentTarget.value
        }}
      />
    </Field>
  )
}
