'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import type { UseFormRegisterReturn } from 'react-hook-form'

interface PasswordFieldProps {
  id: string
  label: string
  placeholder: string
  register: UseFormRegisterReturn
  showLabel: string
  hideLabel: string
}

/**
 * Password input with its own show/hide toggle.
 *
 * Kept out of `Field`: the toggle button sits INSIDE the same relative
 * wrapper as the input, not as a sibling Field would clone the id onto — that
 * is exactly the "label points at the wrapper, not the control" trap Field's
 * own docstring warns about (TD-39). Visibility is local UI state, not a form
 * value, so it stays a plain `useState` here rather than living in RHF.
 */
export function PasswordField({ id, label, placeholder, register, showLabel, hideLabel }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div>
      <label htmlFor={id} className="block text-base font-medium text-black mb-2">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder={placeholder}
          className="w-full h-12 px-4 pr-12 border border-[#b5b5b5] rounded-lg text-base text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all"
          required
          {...register}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center justify-center min-w-[44px] min-h-[44px] hover:bg-gray-100 rounded transition-colors"
          aria-label={visible ? hideLabel : showLabel}
        >
          {visible ? <EyeOff className="w-5 h-5 text-gray-600" /> : <Eye className="w-5 h-5 text-gray-600" />}
        </button>
      </div>
    </div>
  )
}
