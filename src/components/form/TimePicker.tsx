'use client'

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Clock } from 'lucide-react'
import { formatInterviewTime, parse24Hour, to24Hour, type Meridiem, type Time12 } from '@/lib/timeFormat'

/**
 * The time picker that sits next to `DatePicker` (same trigger, same popover shell).
 *
 * **The value contract is the native input's:** `value` and `onChange` are the
 * 24-hour `HH:mm` string an `<input type="time">` produces ('' when empty), so
 * 3:30 PM is sent as "15:30" and the API payload is unchanged.
 *
 * **Hybrid, like DatePicker.** On a touch-primary device the real native input is
 * rendered instead (the Android/iOS time sheets are familiar and accessible). On
 * mouse/trackpad devices a popover opens with three lists: hour (1-12), minute
 * (00-59, scrollable) and AM/PM.
 *
 * **Selection follows focus.** Each list is a single-select listbox with one tab
 * stop (the selected item). Up/Down/Home/End move AND select, Left/Right move
 * focus to the neighbouring list. Picks edit a draft only: "Done" (enabled once
 * hour, minute and AM/PM are all chosen) commits it, "Clear" empties the value,
 * and Escape, an outside click or scrolling away discard the draft.
 *
 * The popover mechanics (portal, flip/reposition, outside click, Escape, Tab wrap,
 * focus back to the trigger) are copied from DatePicker, not shared with it, so
 * the date picker is untouched.
 */

type Column = 'h' | 'm' | 'p'

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1)
const MINUTES = Array.from({ length: 60 }, (_, i) => i)
const PERIODS: Meridiem[] = ['AM', 'PM']
const COLUMNS: Column[] = ['h', 'm', 'p']

const pad2 = (n: number) => String(n).padStart(2, '0')

/** True on a phone/tablet whose primary input is touch. Re-evaluates live. */
function useTouchPrimary() {
  const [touch, setTouch] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(hover: none) and (pointer: coarse)')
    const sync = () => setTouch(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return touch
}

export interface TimePickerProps {
  id?: string
  /** 24-hour HH:mm, or '' */
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  /** Sizes and colours the trigger (and the native input on touch devices). */
  className?: string
  /** id of the element that describes the field (a hint), set on the trigger. */
  describedBy?: string
}

export function TimePicker({
  id,
  value,
  onChange,
  disabled,
  placeholder,
  className = '',
  describedBy,
}: TimePickerProps) {
  const { t } = useTranslation()
  const touch = useTouchPrimary()

  const uid = useId()
  const popId = `${uid}-time`
  const valueId = `${uid}-value`
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  const [wantOpen, setOpen] = useState(false)
  // A field that becomes disabled while its picker is open takes the picker with it.
  const open = wantOpen && !disabled
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  // Forget the open request too, so re-enabling the field does not bring the
  // popover back. (Adjusting state while rendering is React's supported pattern
  // for this; it re-renders at once, before anything is painted.)
  if (disabled && wantOpen) {
    setOpen(false)
    setPos(null)
  }

  // The committed time. The popover edits `draft`, which only becomes the value
  // when Done is pressed with all three parts chosen, so an empty picker can
  // never produce a time the user did not pick, and Escape or an outside click
  // leaves the value as it was.
  const selected = parse24Hour(value)
  const [draft, setDraft] = useState<Partial<Time12>>({})
  const { hour12: draftHour, minute: draftMinute, period: draftPeriod } = draft

  const openPicker = () => {
    setDraft(selected ?? {})
    setOpen(true)
  }

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false)
    setPos(null)
    if (returnFocus) triggerRef.current?.focus()
  }, [])

  const reposition = useCallback(() => {
    const trigger = triggerRef.current
    const pop = popRef.current
    if (!trigger || !pop) return
    const r = trigger.getBoundingClientRect()
    const w = pop.offsetWidth
    const h = pop.offsetHeight
    const left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8)
    let top = r.bottom + 6
    if (top + h > window.innerHeight - 8) {
      // Flip above when there is room there; otherwise slide up just far enough
      // to stay on screen (over the field) rather than running off the bottom.
      top = r.top - h - 6 >= 8 ? r.top - h - 6 : Math.max(8, window.innerHeight - h - 8)
    }
    setPos((prev) => (prev && prev.top === top && prev.left === left ? prev : { top, left }))
  }, [])

  useLayoutEffect(() => {
    if (open) reposition()
  }, [open, reposition])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (popRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      close(false)
    }
    // Close once the trigger has scrolled completely out of view; the popover
    // would otherwise float over other content.
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver((entries) => {
            if (entries[entries.length - 1].isIntersecting) return
            if (popRef.current?.contains(document.activeElement)) triggerRef.current?.focus({ preventScroll: true })
            close(false)
          })
    if (triggerRef.current) observer?.observe(triggerRef.current)
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
    document.addEventListener('mousedown', onDown)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', reposition)
      window.removeEventListener('scroll', reposition, true)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open, reposition, close])

  // Once the popover is placed: scroll the hour and minute lists so the selected
  // value is in the middle, and put focus on the selected hour (else the first).
  // Keyed on `positioned`, not `pos`, so the popover following a scroll never
  // pulls focus back.
  const positioned = pos !== null
  useEffect(() => {
    if (!open || !positioned) return
    const pop = popRef.current
    if (!pop) return
    for (const list of pop.querySelectorAll<HTMLElement>('[data-list]')) {
      const current = list.querySelector<HTMLElement>('[aria-selected="true"]')
      if (current) list.scrollTop = current.offsetTop - list.clientHeight / 2 + current.clientHeight / 2
    }
    pop.querySelector<HTMLElement>('[data-col="h"][tabindex="0"]')?.focus({ preventScroll: true })
  }, [open, positioned])

  if (touch) {
    return (
      <input
        type="time"
        id={id}
        value={selected ? value : ''}
        disabled={disabled}
        aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.value)}
        className={className}
      />
    )
  }

  const choose = (col: Column, val: number | Meridiem) => {
    setDraft((prev) =>
      col === 'h' ? { ...prev, hour12: val as number } : col === 'm' ? { ...prev, minute: val as number } : { ...prev, period: val as Meridiem },
    )
  }

  const canApply = draftHour !== undefined && draftMinute !== undefined && draftPeriod !== undefined
  const apply = () => {
    if (draftHour === undefined || draftMinute === undefined || draftPeriod === undefined) return
    onChange(to24Hour({ hour12: draftHour, minute: draftMinute, period: draftPeriod }))
    close(true)
  }

  const focusOption = (col: Column, val: number | Meridiem) => {
    popRef.current?.querySelector<HTMLElement>(`[data-col="${col}"][data-val="${val}"]`)?.focus()
  }

  const onOptionKeyDown = (e: KeyboardEvent<HTMLDivElement>, col: Column, val: number | Meridiem) => {
    const items: (number | Meridiem)[] = col === 'h' ? HOURS : col === 'm' ? MINUTES : PERIODS
    const i = items.indexOf(val)
    let next: number | Meridiem
    switch (e.key) {
      case 'ArrowDown': next = items[Math.min(i + 1, items.length - 1)]; break
      case 'ArrowUp': next = items[Math.max(i - 1, 0)]; break
      case 'Home': next = items[0]; break
      case 'End': next = items[items.length - 1]; break
      case 'ArrowLeft':
      case 'ArrowRight': {
        // Move to the neighbouring list's tab stop. Focus only: nothing is chosen.
        const at = COLUMNS.indexOf(col) + (e.key === 'ArrowRight' ? 1 : -1)
        if (at < 0 || at >= COLUMNS.length) return
        e.preventDefault()
        popRef.current?.querySelector<HTMLElement>(`[data-col="${COLUMNS[at]}"][tabindex="0"]`)?.focus()
        return
      }
      case 'Enter':
      case ' ':
        e.preventDefault()
        choose(col, val)
        return
      default:
        return
    }
    e.preventDefault()
    choose(col, next)
    focusOption(col, next)
  }

  const onPopKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      // Stop here so a surrounding modal's own Escape handler does not also close.
      e.preventDefault()
      e.stopPropagation()
      close(true)
    } else if (e.key === 'Tab') {
      // Keep Tab inside the popover and wrap at either end: the three lists (one
      // tab stop each), Clear and Done. Escape is what closes it.
      const stops = Array.from(
        popRef.current?.querySelectorAll<HTMLElement>('[role="option"], button:not([disabled])') ?? [],
      ).filter((el) => el.tabIndex >= 0)
      if (stops.length === 0) return
      const active = document.activeElement
      const index = active instanceof HTMLElement ? stops.indexOf(active) : -1
      const leaving = index === -1 || (e.shiftKey ? index === 0 : index === stops.length - 1)
      if (leaving) {
        e.preventDefault()
        ;(e.shiftKey ? stops[stops.length - 1] : stops[0]).focus()
      }
    }
  }

  const option = (col: Column, val: number | Meridiem, text: string, isSelected: boolean, isStop: boolean) => (
    <div
      key={val}
      role="option"
      aria-selected={isSelected}
      data-col={col}
      data-val={val}
      tabIndex={isStop ? 0 : -1}
      onClick={() => {
        choose(col, val)
        focusOption(col, val)
      }}
      onKeyDown={(e) => onOptionKeyDown(e, col, val)}
      className={`flex h-8 cursor-pointer items-center justify-center rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-70 ${
        isSelected ? 'bg-primary-50 font-semibold text-primary-100' : 'text-black hover:bg-primary-10'
      }`}
    >
      {text}
    </div>
  )

  // One tab stop per list: the selected item, else the first.
  const hourStop = draftHour ?? HOURS[0]
  const minuteStop = draftMinute ?? MINUTES[0]
  const periodStop = draftPeriod ?? PERIODS[0]
  const listCls = 'relative flex max-h-48 flex-col gap-0.5 overflow-y-auto rounded-md'

  // A non-empty value that is not HH:mm (never set by this modal) is shown as it
  // is, not hidden behind the placeholder, so it can be seen and cleared. It is
  // never rewritten or sent on by the picker.
  const label = value ? formatInterviewTime(value) : placeholder ?? t('timePicker.select')

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popId : undefined}
        // A <label for> names this button, and a name from a label replaces the
        // button's own text, so the chosen time is described here instead (the
        // same approach as DatePicker): label, then the value, then the hint.
        aria-describedby={describedBy ? `${valueId} ${describedBy}` : valueId}
        onClick={() => (open ? close(false) : openPicker())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault()
            openPicker()
          }
        }}
        className={`flex items-center justify-between gap-2 text-left ${className}`}
      >
        <span className={value ? '' : 'text-[#aaaaaa]'}>{label}</span>
        <Clock className="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
      </button>
      <span id={valueId} className="sr-only">
        {label}
      </span>

      {open &&
        createPortal(
          <div
            ref={popRef}
            id={popId}
            role="dialog"
            // Focusable (not in the tab order) so a click on blank space leaves
            // focus inside the popover where Tab and Escape still work.
            tabIndex={-1}
            aria-label={t('timePicker.title')}
            onKeyDown={onPopKeyDown}
            style={{
              position: 'fixed',
              top: pos?.top ?? 0,
              left: pos?.left ?? 0,
              visibility: pos ? 'visible' : 'hidden',
            }}
            className="z-[100] w-64 max-w-[calc(100vw-1rem)] max-h-[calc(100vh-1rem)] overflow-y-auto rounded-xl border border-gray-200 bg-white p-3 shadow-xl focus-visible:ring-0 focus-visible:ring-offset-0"
          >
            <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
              <div role="listbox" aria-label={t('timePicker.hour')} data-list className={listCls}>
                {HOURS.map((h) => option('h', h, String(h), draftHour === h, h === hourStop))}
              </div>
              <div role="listbox" aria-label={t('timePicker.minute')} data-list className={listCls}>
                {MINUTES.map((m) => option('m', m, pad2(m), draftMinute === m, m === minuteStop))}
              </div>
              <div role="listbox" aria-label={t('timePicker.period')} className={`${listCls} w-14`}>
                {PERIODS.map((p) => option('p', p, p, draftPeriod === p, p === periodStop))}
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
                disabled={!value && draftHour === undefined && draftMinute === undefined && draftPeriod === undefined}
                onClick={() => {
                  onChange('')
                  close(true)
                }}
              >
                {t('datePicker.clear')}
              </button>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm font-medium text-primary-70 hover:bg-primary-10 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
                disabled={!canApply}
                onClick={apply}
              >
                {t('timePicker.done')}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
