'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

export interface OtpInputHandle {
  focusFirst: () => void
}

interface OtpInputProps {
  /** Six slots, not a joined string — a hole in the middle must not shift
   *  later digits left. This IS the RHF field's value; there is no parallel
   *  internal copy of it. */
  value: string[]
  onChange: (next: string[]) => void
  /** Renders box ids as `${idPrefix}-0` … `${idPrefix}-5`. */
  idPrefix: string
  /** id of the `<label>` this group is named by (aria-labelledby). */
  labelledBy: string
  /** Per-box accessible name; the box index is appended. */
  ariaLabel: string
  disabled?: boolean
  /** Focus box 0 once, on mount — for a verify step that just appeared. */
  autoFocus?: boolean
}

const OTP_LENGTH = 6

/**
 * The six-box one-time-code field shared by /login's phone-OTP and Google
 * phone-bind flows — previously two hand-copied blocks in the same file.
 *
 * The DOM refs used for focus/paste are a genuine non-form concern (they
 * drive the browser cursor, not a value), so they stay local to this
 * component rather than living in the page or in RHF.
 */
export const OtpInput = forwardRef<OtpInputHandle, OtpInputProps>(function OtpInput(
  { value, onChange, idPrefix, labelledBy, ariaLabel, disabled, autoFocus },
  ref,
) {
  const boxRefs = useRef<Array<HTMLInputElement | null>>([])

  useImperativeHandle(ref, () => ({
    focusFirst: () => boxRefs.current[0]?.focus(),
  }))

  useEffect(() => {
    if (autoFocus) boxRefs.current[0]?.focus()
    // Mount-only, mirroring the old setTimeout(...focus(), 0) that ran once
    // when a fresh verify step appeared — not on every value change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const focusBox = (index: number) => {
    boxRefs.current[Math.min(Math.max(index, 0), OTP_LENGTH - 1)]?.focus()
  }

  // `slice(-1)` so typing into a box that already holds a digit REPLACES it
  // rather than being swallowed by maxLength.
  const handleChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1)
    const next = [...value]
    next[index] = digit
    onChange(next)
    if (digit && index < OTP_LENGTH - 1) focusBox(index + 1)
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      // Clear the previous digit as well as moving to it — otherwise it
      // takes two presses to delete one digit.
      e.preventDefault()
      const next = [...value]
      next[index - 1] = ''
      onChange(next)
      focusBox(index - 1)
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault()
      focusBox(index - 1)
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      e.preventDefault()
      focusBox(index + 1)
    }
  }

  // Paste needs its own handler: the change handler only ever sees ONE
  // character, so a pasted "502109" would otherwise land as a single "9" in
  // whichever box had focus.
  const handlePaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH - index)
    if (!digits) return
    e.preventDefault()
    const next = [...value]
    for (let i = 0; i < digits.length; i++) next[index + i] = digits[i]
    onChange(next)
    focusBox(index + digits.length)
  }

  return (
    <div role="group" aria-labelledby={labelledBy} className="grid grid-cols-6 gap-2 sm:gap-3">
      {value.map((digit, i) => (
        <input
          key={i}
          id={`${idPrefix}-${i}`}
          ref={(el) => {
            boxRefs.current[i] = el
          }}
          type="text"
          inputMode="numeric"
          /* First box only — that is where the platform offers the SMS
             autofill chip; repeating it across all six offers it six times. */
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => handlePaste(i, e)}
          /* Select on focus so tapping a filled box overtypes it rather than
             parking the caret beside the digit. */
          onFocus={(e) => e.target.select()}
          aria-label={`${ariaLabel} ${i + 1}`}
          className="w-full h-12 text-center text-xl font-semibold border border-[#b5b5b5] rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all disabled:opacity-50"
        />
      ))}
    </div>
  )
})
