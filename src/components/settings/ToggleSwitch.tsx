'use client'

import { useId } from 'react'

interface ToggleSwitchProps {
  label: string
  description?: string
  checked: boolean
  /** True while this switch's own save is in flight. */
  busy?: boolean
  onChange: (next: boolean) => void
}

/**
 * One labelled on/off setting. A native <button> with `role="switch"`, so Space and
 * Enter work and a screen reader announces "on" / "off". The label and the helper
 * text are tied to it with aria-labelledby / aria-describedby.
 */
export function ToggleSwitch({ label, description, checked, busy = false, onChange }: ToggleSwitchProps) {
  const labelId = useId()
  const descId = useId()

  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p id={labelId} className="text-sm sm:text-base font-medium text-black">
          {label}
        </p>
        {description && (
          <p id={descId} className="text-sm text-[#717182] mt-0.5">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={description ? descId : undefined}
        // aria-disabled, not `disabled`: a disabled button is blurred, so a keyboard user
        // would lose their place after pressing Space. The click is ignored while busy.
        aria-disabled={busy}
        onClick={() => {
          if (!busy) onChange(!checked)
        }}
        // 44px-wide hit area around the 48x28 track, same minimum as the other buttons here.
        className="flex-shrink-0 flex items-center justify-center min-h-[44px] min-w-[56px] rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-50 focus-visible:ring-offset-2 aria-disabled:cursor-wait"
      >
        <span
          aria-hidden="true"
          className={`relative inline-block h-7 w-12 rounded-full transition-colors ${
            checked ? 'bg-primary-50' : 'bg-[#b5b5b5]'
          } ${busy ? 'opacity-60' : ''}`}
        >
          <span
            className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              checked ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </span>
      </button>
    </div>
  )
}
