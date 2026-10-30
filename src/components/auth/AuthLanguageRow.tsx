'use client'

import { LanguageSwitcher } from '@/components/navigation/LanguageSwitcher'

/**
 * The language control for screens with no site header (/login, /forgot-password, the
 * employer sign-up steps): the same switcher and persistence as everywhere else.
 * Left-aligned with its list opening rightwards, to clear the card's Close button
 * (the default `pr-12` leaves room for it; a caller without one passes its own spacing).
 */
export function AuthLanguageRow({ className = 'pr-12 mb-2' }: { className?: string }) {
  return (
    <div className={`flex justify-start ${className}`}>
      <LanguageSwitcher labelClassName="text-sm" menuClassName="left-0" />
    </div>
  )
}
