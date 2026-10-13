'use client'

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'

/**
 * The one date picker. It replaces the bare `<input type="date">` the portal
 * used in ten places, whose popup is drawn by the browser and cannot be styled.
 *
 * **The value contract is the native input's:** `value` and `onChange` are the
 * `YYYY-MM-DD` string an `<input type="date">` produces ('' when empty), so
 * every caller's state, validation (`isAtLeast18`, required checks) and API
 * payload stay exactly as they were. `min`/`max` are the same strings.
 *
 * **Hybrid.** On a touch-primary device the real native input is rendered
 * instead — the Android/iOS date sheets are familiar and accessible. On
 * mouse/trigger-pad devices a custom calendar opens in a popover.
 *
 * **No timezone shifts.** Dates are handled as {year, month, day} numbers and
 * built with the LOCAL `Date` constructor. Nothing here calls `toISOString()` or
 * `new Date('YYYY-MM-DD')` (which parses as UTC midnight and is the day before
 * for anyone west of UTC). Range checks compare the ISO strings, which sort
 * correctly as text.
 *
 * `id` goes on the trigger button so `<label htmlFor>` and `Field` (which
 * attaches an id to its first child) name it for screen readers.
 */

interface YMD {
  y: number
  /** 1–12 */
  m: number
  d: number
}

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/

const pad = (n: number, width = 2) => String(n).padStart(width, '0')

function parseISO(iso: string | undefined | null): YMD | null {
  const match = iso ? ISO_RE.exec(iso) : null
  if (!match) return null
  const y = Number(match[1])
  const m = Number(match[2])
  const d = Number(match[3])
  // Round-trips through the local constructor, so 2026-02-31 is rejected.
  const check = new Date(y, m - 1, d)
  if (check.getFullYear() !== y || check.getMonth() !== m - 1 || check.getDate() !== d) return null
  return { y, m, d }
}

/**
 * A min/max prop as YYYY-MM-DD, or undefined when it is not a real date. The date
 * part is taken as written, so '2026-03-10T00:00:00' and '2026-03-10 08:00' (with
 * or without a zone) both mean 10 March: nothing is parsed through `Date`, so no
 * timezone can move the day. An unusable bound is ignored rather than disabling
 * every day.
 */
function boundISO(raw: string | undefined): string | undefined {
  const date = raw ? /^(\d{4}-\d{2}-\d{2})(?:[T ]|$)/.exec(raw)?.[1] : undefined
  return date && parseISO(date) ? date : undefined
}

const toISO = ({ y, m, d }: YMD) => `${pad(y, 4)}-${pad(m)}-${pad(d)}`

const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate()

// Noon, so a DST change at midnight can never move the day.
const toLocalDate = ({ y, m, d }: YMD) => new Date(y, m - 1, d, 12)

function today(): YMD {
  const now = new Date()
  return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() }
}

function addDays(p: YMD, n: number): YMD {
  const dt = new Date(p.y, p.m - 1, p.d + n, 12)
  return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() }
}

// Clamps the day, so Mar 31 + 1 month is Apr 30 and Feb 29 - 1 year is Feb 28.
function addMonths(p: YMD, n: number): YMD {
  const total = p.y * 12 + (p.m - 1) + n
  const y = Math.floor(total / 12)
  const m = (total % 12) + 1
  return { y, m, d: Math.min(p.d, daysInMonth(y, m)) }
}

/** The date `years` ago today, as YYYY-MM-DD (local). For `defaultMonth`. */
export function yearsAgoISO(years: number): string {
  return toISO(addMonths(today(), -12 * years))
}

/**
 * Moves focus to the nearest control after `from` in tab order, else the nearest
 * before it. Skips anything inside `skip`, and a candidate that refuses focus
 * (hidden, inert) is passed over for the next one.
 *
 * Inside a dialog or overlay (`role="dialog"`, `aria-modal`, or a `position: fixed`
 * ancestor, which is what the portal's modals are) it never leaves that overlay:
 * anything outside is behind it. The innermost holder (a form counts) is tried
 * first, then the ones around it. If none has a usable control, focus is left
 * focus goes to the overlay itself, so the keyboard stays in the modal's context
 * instead of dropping to <body>. That needs it to be focusable, so it gets
 * `tabindex="-1"` and `outline: none` only until it next loses focus, and a
 * caller's own tabindex or outline is never touched. Focus is never put on
 * `from` itself, which is disabled. Outside any overlay the search widens to the
 * whole page, after the form, and with no usable control focus falls to <body>.
 * (If the overlay has no tabbable control, Tab can still leave it: trapping Tab
 * is the modal's job, not the picker's.)
 */
function focusNearest(from: HTMLElement, skip: HTMLElement | null): void {
  const scopes: ParentNode[] = []
  let overlay: HTMLElement | null = null
  for (let p = from.parentElement; p && p !== document.body; p = p.parentElement) {
    const isOverlay = p.matches('[role="dialog"], [aria-modal="true"]') || getComputedStyle(p).position === 'fixed'
    if (isOverlay || p.matches('form')) scopes.push(p)
    if (isOverlay) {
      overlay = p // stop here: whatever surrounds the overlay is behind it
      break
    }
  }
  if (!overlay) scopes.push(document)
  for (const scope of scopes) {
    const after: HTMLElement[] = []
    const before: HTMLElement[] = []
    const candidates = scope.querySelectorAll<HTMLElement>('a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]')
    for (const el of Array.from(candidates)) {
      if (el === from || skip?.contains(el) || el.tabIndex < 0 || el.matches(':disabled')) continue
      ;(from.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING ? after : before).push(el)
    }
    for (const el of [...after, ...before.reverse()]) {
      el.focus({ preventScroll: true })
      if (document.activeElement === el) return
    }
  }
  if (!overlay || document.activeElement === overlay) return
  const hadTabindex = overlay.hasAttribute('tabindex')
  const outline = overlay.style.outline
  const restore = () => {
    if (!hadTabindex) overlay.removeAttribute('tabindex')
    overlay.style.outline = outline
  }
  if (!hadTabindex) overlay.setAttribute('tabindex', '-1')
  overlay.style.outline = 'none'
  overlay.focus({ preventScroll: true })
  // Only wait for blur if the focus took; otherwise nothing would ever restore it.
  if (document.activeElement === overlay) overlay.addEventListener('blur', restore, { once: true })
  else restore()
}

function useIntlFormats(lang: string) {
  return useMemo(() => {
    const make = (options: Intl.DateTimeFormatOptions) => {
      try {
        return new Intl.DateTimeFormat(lang, options)
      } catch {
        return new Intl.DateTimeFormat('en', options)
      }
    }
    return {
      display: make({ day: '2-digit', month: 'short', year: 'numeric' }),
      full: make({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      monthLong: make({ month: 'long' }),
      monthYear: make({ month: 'long', year: 'numeric' }),
      weekdayShort: make({ weekday: 'short' }),
    }
  }, [lang])
}

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

export interface DatePickerProps {
  id?: string
  /** YYYY-MM-DD, or '' */
  value: string
  onChange: (value: string) => void
  /** YYYY-MM-DD — earliest selectable day (an ISO datetime is read as its date part) */
  min?: string
  /** YYYY-MM-DD — latest selectable day (an ISO datetime is read as its date part) */
  max?: string
  disabled?: boolean
  placeholder?: string
  /** Sizes and colours the trigger (and the native input on touch devices). */
  className?: string
  /** YYYY-MM-DD — where the calendar opens when there is no value. */
  defaultMonth?: string
  /** Earliest year in the year list when `min` is not set. Default: 100 years back (fits a date of birth). */
  minYear?: number
}

export function DatePicker({
  id,
  value,
  onChange,
  min: minProp,
  max: maxProp,
  disabled,
  placeholder,
  className = '',
  defaultMonth,
  minYear,
}: DatePickerProps) {
  const { t, i18n } = useTranslation()
  const fmt = useIntlFormats(i18n.language || 'en')
  const touch = useTouchPrimary()
  const min = boundISO(minProp)
  const max = boundISO(maxProp)

  const uid = useId()
  const popId = `${uid}-cal`
  const descId = `${uid}-value`
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)
  // Whether DOM focus should follow `focusISO` (true while using the day grid).
  const gridFocus = useRef(false)
  // The day of month the user last chose on purpose. Month navigation clamps the
  // focused day (Jan 31 -> Feb 28) but must remember this, so the next month is
  // Mar 31 and not Mar 28.
  const dayRef = useRef(1)

  const [open, setOpen] = useState(false)
  const [view, setView] = useState<{ y: number; m: number }>(() => {
    const t0 = today()
    return { y: t0.y, m: t0.m }
  })
  const [focusISO, setFocusISO] = useState('')
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  const selected = parseISO(value)
  const selectedISO = selected ? toISO(selected) : ''
  const todayISO = toISO(today())

  const monthNames = useMemo(
    () => Array.from({ length: 12 }, (_, i) => fmt.monthLong.format(new Date(2000, i, 1, 12))),
    [fmt],
  )
  // 2023-01-01 was a Sunday.
  const weekdayNames = useMemo(
    () => Array.from({ length: 7 }, (_, i) => fmt.weekdayShort.format(new Date(2023, 0, 1 + i, 12))),
    [fmt],
  )

  const years = useMemo(() => {
    const thisYear = today().y
    let lo = parseISO(min)?.y ?? minYear ?? thisYear - 100
    let hi = parseISO(max)?.y ?? thisYear + 20
    // Never hide the year of an existing value (an old record, say) — unless
    // min/max already rule that year out entirely. The calendar opens inside the
    // allowed range, so a year with nothing selectable must not be offered.
    if (selected) {
      if (!min) lo = Math.min(lo, selected.y)
      if (!max) hi = Math.max(hi, selected.y)
    }
    const list: number[] = []
    for (let y = hi; y >= lo; y--) list.push(y)
    return list
  }, [min, max, minYear, selected])

  // The effective bounds: min/max, else the first/last day of the year list. Every
  // way of moving (day keys, month arrows, the selects, opening) goes through
  // these, so none of them reaches a year the list does not offer. (A min or max
  // outside the default window leaves the list empty; then only min/max apply.)
  const lowISO = min || (years.length ? `${pad(years[years.length - 1], 4)}-01-01` : undefined)
  const highISO = max || (years.length ? `${pad(years[0], 4)}-12-31` : undefined)
  // low after high: nothing can be selected, and nothing below tries to clamp.
  const invalidRange = !!lowISO && !!highISO && lowISO > highISO

  const inRange = useCallback(
    (iso: string) => !invalidRange && (!lowISO || iso >= lowISO) && (!highISO || iso <= highISO),
    [lowISO, highISO, invalidRange],
  )

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false)
    gridFocus.current = false
    if (returnFocus) triggerRef.current?.focus()
  }, [])

  const openPicker = () => {
    const base = selected ?? parseISO(defaultMonth) ?? today()
    let startISO = toISO(base)
    if (!invalidRange) {
      if (lowISO && startISO < lowISO) startISO = lowISO
      if (highISO && startISO > highISO) startISO = highISO
    }
    const start = parseISO(startISO) ?? base
    setView({ y: start.y, m: start.m })
    setFocusISO(toISO(start))
    dayRef.current = start.d
    gridFocus.current = true
    setOpen(true)
  }

  const choose = (iso: string) => {
    if (!inRange(iso)) return
    onChange(iso)
    close(true)
  }

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
    // Keep the same object when nothing moved: scroll and resize fire this often,
    // and a new object on every event would re-render the whole calendar.
    setPos((prev) => (prev && prev.top === top && prev.left === left ? prev : { top, left }))
  }, [])

  useLayoutEffect(() => {
    if (open) reposition()
  }, [open, reposition, view.y, view.m])

  useEffect(() => {
    if (!open) {
      setPos(null)
      return
    }
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (popRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      close(false)
    }
    // Close once the trigger has scrolled completely out of view (or out of its
    // scrolling container); the popover would otherwise float over other content.
    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver((entries) => {
            if (entries[entries.length - 1].isIntersecting) return // latest state wins
            // Keep keyboard users in the page: hand focus back without scrolling to it.
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

  // A field that becomes disabled while its picker is open takes the picker with it.
  // A disabled trigger cannot take focus back, so if focus was inside the popover
  // it goes to the nearest enabled control instead of dropping to <body>.
  useEffect(() => {
    if (!disabled || !open) return
    const trigger = triggerRef.current
    if (trigger && popRef.current?.contains(document.activeElement)) focusNearest(trigger, popRef.current)
    close(false)
  }, [disabled, open, close])

  // Move DOM focus to the active day (on open, and as the arrow keys move it).
  // Keyed on `positioned`, not `pos`: the popover moving while the page scrolls
  // must not re-run this and pull focus off a month/year control.
  const positioned = pos !== null
  useEffect(() => {
    if (!open || !positioned || !gridFocus.current) return
    popRef.current
      ?.querySelector<HTMLButtonElement>(`button[data-iso="${focusISO}"]`)
      ?.focus({ preventScroll: true })
  }, [open, positioned, focusISO, view.y, view.m])

  // If focus has fallen out of the popover, put it back on the popover itself
  // (not on a day: Enter there would select it), so Tab and Escape still work.
  // The month arrows use aria-disabled rather than disabled, so reaching the
  // first or last allowed month leaves focus on the arrow instead of dropping it.
  useEffect(() => {
    if (!open || !positioned || disabled) return
    const pop = popRef.current
    if (pop && !pop.contains(document.activeElement)) pop.focus({ preventScroll: true })
  }, [open, positioned, disabled, invalidRange, focusISO, view.y, view.m])

  if (touch) {
    return (
      <input
        type="date"
        id={id}
        value={selected ? selectedISO : ''}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={className}
      />
    )
  }

  // Does this month contain at least one day inside the bounds?
  const monthSelectable = (y: number, m: number) =>
    !invalidRange &&
    (!lowISO || toISO({ y, m, d: daysInMonth(y, m) }) >= lowISO) &&
    (!highISO || toISO({ y, m, d: 1 }) <= highISO)

  const clampToRange = (iso: string) => {
    if (invalidRange) return iso
    if (lowISO && iso < lowISO) return lowISO
    if (highISO && iso > highISO) return highISO
    return iso
  }

  // `remember`: the move picked a day (arrows, Home, End), as opposed to paging
  // by month, which keeps the remembered day of month.
  const moveFocus = (target: YMD, remember: boolean) => {
    // Keep focus on a selectable day: a move past the bounds lands on the limit.
    const next = parseISO(clampToRange(toISO(target)))
    if (!next) return
    // Never move into a month where nothing can be selected.
    if (!monthSelectable(next.y, next.m)) return
    gridFocus.current = true
    if (remember) dayRef.current = next.d
    setFocusISO(toISO(next))
    setView({ y: next.y, m: next.m })
  }

  const onDayKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    // Start from the day that has focus, not `focusISO`, which can lag behind it.
    const cur = parseISO(e.currentTarget.dataset.iso)
    if (!cur) return
    const dow = toLocalDate(cur).getDay()
    let next: YMD | null = null
    switch (e.key) {
      case 'ArrowLeft': next = addDays(cur, -1); break
      case 'ArrowRight': next = addDays(cur, 1); break
      case 'ArrowUp': next = addDays(cur, -7); break
      case 'ArrowDown': next = addDays(cur, 7); break
      case 'Home': next = addDays(cur, -dow); break
      case 'End': next = addDays(cur, 6 - dow); break
      case 'PageUp': next = addMonths({ ...cur, d: dayRef.current }, e.shiftKey ? -12 : -1); break
      case 'PageDown': next = addMonths({ ...cur, d: dayRef.current }, e.shiftKey ? 12 : 1); break
      default: return
    }
    e.preventDefault()
    moveFocus(next, !e.key.startsWith('Page'))
  }

  const onPopKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      // Stop here so a surrounding modal's own Escape handler does not also close.
      e.preventDefault()
      e.stopPropagation()
      close(true)
    } else if (e.key === 'Tab') {
      // Keep Tab inside the popover and wrap at either end, so the month/year
      // controls, the day grid, Clear and Today are all reachable, and focus
      // never falls through to the page behind (the popover sits at the end of
      // <body>). Escape is what closes it.
      const stops = Array.from(
        popRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), select:not([disabled])') ?? [],
      ).filter((el) => el.tabIndex >= 0)
      if (stops.length === 0) return
      const active = document.activeElement
      const index = active instanceof HTMLElement ? stops.indexOf(active) : -1
      // Wrap at either end. Focus on the popover itself (index -1, e.g. after a
      // click on blank space) enters the cycle from the matching end.
      const leaving = index === -1 || (e.shiftKey ? index === 0 : index === stops.length - 1)
      if (leaving) {
        e.preventDefault()
        ;(e.shiftKey ? stops[stops.length - 1] : stops[0]).focus()
      }
    }
  }

  // Remember whether focus is on a day or on a header control/button, so the
  // focus effect above only follows the keyboard while the user is in the grid.
  const onPopFocus = (e: FocusEvent<HTMLDivElement>) => {
    const iso = e.target instanceof HTMLElement ? e.target.dataset.iso : undefined
    gridFocus.current = iso !== undefined
    // A click can focus a day (even a disabled one) without selecting it; make
    // that day the grid's tab stop so Tab and the arrows continue from it.
    if (iso && iso !== focusISO) {
      setFocusISO(iso)
      dayRef.current = Number(iso.slice(8))
    }
  }

  // Show month `m` of year `y`, keeping the remembered day number where it fits.
  // The target is clamped into min/max, so changing the year can never land on
  // a month in which nothing is selectable (it lands on the nearest allowed one).
  const goTo = (y: number, m: number) => {
    gridFocus.current = false
    const target = parseISO(clampToRange(toISO({ y, m, d: Math.min(dayRef.current, daysInMonth(y, m)) })))
    if (!target) return
    setView({ y: target.y, m: target.m })
    setFocusISO(toISO(target))
  }
  const setMonth = (m: number) => goTo(view.y, m)
  const setYear = (y: number) => goTo(y, view.m)
  const stepMonth = (n: number) => {
    const next = addMonths({ y: view.y, m: view.m, d: 1 }, n)
    goTo(next.y, next.m)
  }

  // A month is unreachable when ALL of it is outside the bounds (min/max or the
  // year list), so the arrows agree with the day keys and the selects.
  const prevMonth = addMonths({ y: view.y, m: view.m, d: 1 }, -1)
  const nextMonth = addMonths({ y: view.y, m: view.m, d: 1 }, 1)
  const prevBlocked = !monthSelectable(prevMonth.y, prevMonth.m)
  const nextBlocked = !monthSelectable(nextMonth.y, nextMonth.m)
  const yearList = years.includes(view.y) ? years : [view.y, ...years]

  const firstDow = new Date(view.y, view.m - 1, 1).getDay()
  const dayCount = daysInMonth(view.y, view.m)
  const cells: (number | null)[] = Array.from({ length: 42 }, (_, i) => {
    const day = i - firstDow + 1
    return day >= 1 && day <= dayCount ? day : null
  })
  const rows = [0, 1, 2, 3, 4, 5].map((r) => cells.slice(r * 7, r * 7 + 7))

  const label = selected
    ? fmt.display.format(toLocalDate(selected))
    : placeholder ?? t('datePicker.select')

  const navBtn =
    'flex h-8 w-8 items-center justify-center rounded-full text-gray-700 hover:bg-primary-10 aria-disabled:cursor-not-allowed aria-disabled:text-gray-300 aria-disabled:hover:bg-transparent'
  const headSelect =
    'h-8 rounded-md border border-gray-200 bg-white px-2 text-sm font-medium text-black hover:border-primary-40'

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
        aria-describedby={selected ? descId : undefined}
        onClick={() => (open ? close(false) : openPicker())}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault()
            openPicker()
          }
        }}
        className={`flex items-center justify-between gap-2 text-left ${className}`}
      >
        <span className={selected ? '' : 'text-[#aaaaaa]'}>{label}</span>
        <CalendarDays className="h-4 w-4 shrink-0 text-gray-500" aria-hidden="true" />
      </button>
      {selected && (
        <span id={descId} className="sr-only">
          {fmt.full.format(toLocalDate(selected))}
        </span>
      )}

      {open &&
        createPortal(
          <div
            ref={popRef}
            id={popId}
            role="dialog"
            // Focusable (not in the tab order) so a click on blank space, or a
            // control that just disabled itself, leaves focus inside the popover
            // where Tab and Escape still work.
            tabIndex={-1}
            aria-label={fmt.monthYear.format(toLocalDate({ y: view.y, m: view.m, d: 1 }))}
            onKeyDown={onPopKeyDown}
            onFocus={onPopFocus}
            style={{
              position: 'fixed',
              top: pos?.top ?? 0,
              left: pos?.left ?? 0,
              visibility: pos ? 'visible' : 'hidden',
            }}
            className="z-[100] w-[19rem] max-w-[calc(100vw-1rem)] max-h-[calc(100vh-1rem)] overflow-y-auto rounded-xl border border-gray-200 bg-white p-3 shadow-xl focus-visible:ring-0 focus-visible:ring-offset-0"
          >
            <div className="mb-2 flex items-center gap-1">
              <button
                type="button"
                className={navBtn}
                aria-disabled={prevBlocked}
                aria-label={fmt.monthYear.format(toLocalDate({ ...prevMonth, d: 1 }))}
                onClick={() => !prevBlocked && stepMonth(-1)}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <div className="flex flex-1 items-center justify-center gap-1">
                <select
                  className={headSelect}
                  value={view.m}
                  disabled={invalidRange}
                  aria-label={fmt.monthLong.format(toLocalDate({ y: view.y, m: view.m, d: 1 }))}
                  onChange={(e) => setMonth(Number(e.target.value))}
                >
                  {monthNames.map((name, i) => (
                    <option key={i} value={i + 1} disabled={!monthSelectable(view.y, i + 1)}>
                      {name}
                    </option>
                  ))}
                </select>
                <select
                  className={headSelect}
                  value={view.y}
                  disabled={invalidRange}
                  aria-label={String(view.y)}
                  onChange={(e) => setYear(Number(e.target.value))}
                >
                  {yearList.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                className={navBtn}
                aria-disabled={nextBlocked}
                aria-label={fmt.monthYear.format(toLocalDate({ ...nextMonth, d: 1 }))}
                onClick={() => !nextBlocked && stepMonth(1)}
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <table role="grid" className="w-full border-collapse text-center">
              <thead>
                <tr>
                  {weekdayNames.map((name, i) => (
                    <th key={i} scope="col" className="pb-1 text-xs font-medium text-gray-500">
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((day, c) => {
                      if (day === null) return <td key={c} />
                      const iso = toISO({ y: view.y, m: view.m, d: day })
                      const isSelected = iso === selectedISO
                      const isToday = iso === todayISO
                      const allowed = inRange(iso)
                      let dayCls = 'text-black hover:bg-primary-10'
                      if (isSelected) dayCls = 'bg-primary-50 font-semibold text-primary-100'
                      else if (allowed) dayCls += isToday ? ' ring-1 ring-primary-50' : ''
                      else dayCls = 'cursor-not-allowed text-gray-300'
                      return (
                        <td key={c} className="p-0.5">
                          <button
                            type="button"
                            data-iso={iso}
                            tabIndex={iso === focusISO ? 0 : -1}
                            aria-pressed={isSelected}
                            aria-disabled={!allowed}
                            aria-current={isToday ? 'date' : undefined}
                            aria-label={fmt.full.format(toLocalDate({ y: view.y, m: view.m, d: day }))}
                            onClick={() => choose(iso)}
                            onKeyDown={onDayKeyDown}
                            className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm ${dayCls}`}
                          >
                            {day}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
                disabled={!selected}
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
                disabled={!inRange(todayISO)}
                onClick={() => choose(todayISO)}
              >
                {t('datePicker.today')}
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
