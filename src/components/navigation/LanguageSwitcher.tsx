'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Languages, ChevronDown, Check } from 'lucide-react'
import {
  useLanguagePreference,
  type SupportedLanguage,
} from '@/hooks/useLanguagePreference'
import { SUPPORTED_LANGUAGES } from '@/i18n/config'
import { LANGUAGE_OPTIONS } from '@/lib/jobCategories'

/**
 * Re-exported for the call sites that already import it from here (settings).
 *
 * **Endonyms are data, not translations.** These labels used to be i18n keys
 * (`language.english`, `language.hindi`) resolved with `t()`, which is wrong on
 * its face: "தமிழ்" is "தமிழ்" in every locale. Keeping them in the locale files
 * meant 10 files each carrying all 10 names — 100 strings that had to stay
 * byte-identical, every one of them foreign script inside its own file.
 *
 * The single definition lives in lib/jobCategories.ts, so the header switcher,
 * the home language section and the registration picker cannot drift apart —
 * which is exactly what happened when each kept its own copy.
 */
export { LANGUAGE_OPTIONS }

/**
 * LanguageSwitcher — the in-header EN/HI control. The change itself lives in
 * `useLanguagePreference` (localStorage + a role-agnostic server sync), shared
 * with the language section of the Settings page.
 */
/**
 * `labelClassName` styles the trigger's TEXT only — the icon and chevron always
 * stay.
 *
 * **The closed trigger prints the FULL label, English gloss included** — it
 * reads "மொழி: தமிழ் (Tamil)", not "மொழி: தமிழ்". Product decision, 2026-08-29:
 * the bracketed English name has to be visible in the bar, not only inside the
 * dropdown.
 *
 * ⚠️ That gloss is the single widest thing in the header, and it is not free.
 * Measured in a real Edge, it costs ~71px in Tamil, which is more than a whole
 * step of nav type (~44px). The header's breakpoint ladder is sized around it —
 * see `components/home/Header.tsx`, whose thresholds were re-derived when this
 * was restored. Do not "tidy" the gloss away again to win header width without
 * re-measuring that ladder; and do not truncate or hide it at high zoom, which
 * is what this decision explicitly rules out.
 *
 * By default the trigger is one unbreakable unit on one line, and the caller's
 * ladder is expected to guarantee a tier where it fits — that's still true
 * for this file's own Header.tsx. `wrapLabel` opts OUT of that contract for
 * callers that would rather wrap the label onto a second line than keep
 * shrinking type to force one line (see EmployeeHeader.tsx, which wraps every
 * nav item's label the same way and needs this control to match). It swaps
 * `whitespace-nowrap` for `line-clamp-2` and top-aligns the icon/chevron
 * against the label's first line instead of centering them against a block
 * that may now be two lines tall.
 */
export function LanguageSwitcher({
  className = '',
  labelClassName = '',
  wrapLabel = false,
  iconWrapClassName = 'flex h-[27px] items-center justify-center shrink-0',
  rowGapClassName = 'gap-1',
}: {
  className?: string
  labelClassName?: string
  /** Wrap the label onto up to 2 lines instead of forcing one. Default false
   *  preserves every existing caller's one-line contract. */
  wrapLabel?: boolean
  /** `wrapLabel` only: sizes the box the icon/chevron centre inside — must
   *  match `labelClassName`'s actual rendered line-height (see EmployeeHeader.tsx,
   *  the only current `wrapLabel` caller, for why that can vary by language).
   *  Default matches `text-[18px] leading-normal`'s 27px for any future
   *  caller that doesn't pass one. */
  iconWrapClassName?: string
  /** `wrapLabel` only: gap between icon, label, and chevron in the row
   *  below. Default `gap-1` (4px) matches the spacing every caller had
   *  before this prop existed. */
  rowGapClassName?: string
}) {
  const { t } = useTranslation()
  const { language: current, setLanguage } = useLanguagePreference()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const currentLabel =
    LANGUAGE_OPTIONS.find((o) => o.value === current)?.label ?? current


  useEffect(() => {
    if (!open) return
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onEscape)
    }
  }, [open])

  const change = (lng: SupportedLanguage) => {
    setOpen(false)
    setLanguage(lng)
  }

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('language.select')}
        // A caller may hide the text (see labelClassName), leaving a bare icon.
        // aria-label already covers a screen reader; this covers a mouse.
        title={t('language.select')}
        // `whitespace-nowrap`: the bar is a fixed 75px, so this control must
        // resolve to one line or it pushes its own text out of the bar. The
        // header's tiers are sized so it always can.
        // `wrapLabel` swaps that for `min-w-0` (so the label can actually
        // shrink below its one-line width — without it the flex default
        // floors the button at min-content and nothing wraps).
        //
        // `wrapLabel`'s outer button is `items-center` — not `items-start` —
        // over a SINGLE child (the inner row below). With `min-h-[44px]`
        // (TD-20) and real content far shorter than that, `items-start` here
        // pinned icon/text/chevron to the very TOP of the 44px box: measured
        // 14px above the box's own centre, which is also the header's centre
        // (nav's own `items-center` — see EmployeeHeader.tsx — centres this
        // whole button by its outer box, blind to how content sits inside
        // it). `items-center` on the outer button fixes that regardless of
        // whether the inner row is 1 or 2 lines tall, since it centres
        // whatever height that row turns out to be within the fixed 44px.
        className={
          wrapLabel
            ? 'flex items-center min-w-0 text-black text-[18px] hover:text-primary-50 transition-colors min-h-[44px]'
            : 'flex items-center gap-1 whitespace-nowrap text-black text-[18px] hover:text-primary-50 transition-colors min-h-[44px]'
        }
      >
        {/* One unbreakable unit. Deliberately NO `min-w-0` on the button: a flex
            item's default `min-width:auto` floors it at min-content, which is
            exactly how far this should shrink. `min-w-0` removed that floor once
            and the button collapsed to 39px while the text inside stayed ~200px
            and spilled over its neighbours. (`wrapLabel` callers WANT that floor
            gone — see above — because they let the label wrap instead.) */}
        {wrapLabel ? (
          // Inner row, `items-start`: this is the OTHER alignment question —
          // once the label wraps to 2 lines, the icon/chevron must sit beside
          // the FIRST line only, not centred against the full 2-line block
          // (that would float them between the two lines). Icon and chevron
          // are each wrapped in `iconWrapClassName` — a box matching the
          // label's actual rendered line-height (constant across a given
          // language's render, since it's set by `labelClassName`'s own CSS,
          // not by script/content — the caller must keep the two in sync) —
          // and centred inside it, so each one lands precisely on the first
          // line's own vertical centre.
          //
          // A version of this put the chevron INSIDE the label span instead,
          // as trailing inline content, so it would flow to wherever the
          // text's own last line ended — reverted. `display:-webkit-box`
          // (what `line-clamp` requires) does not give its children normal
          // inline text flow despite looking like a block of wrapped text:
          // WebKit's legacy box model treats each child as its own flex-like
          // box, so the chevron rendered on a third line of its own, centred
          // below the label, detached from the text entirely — confirmed by
          // screenshot, not assumed. `rowGapClassName`/`chevronMarginClassName`
          // widening the icon↔label gap and reserving less fixed width for a
          // separate chevron box turned out to be enough on its own: freeing
          // the ~20px a dedicated chevron sibling used to reserve lets Tamil/
          // Malayalam's label fit on ONE line at the exact widths (1280–
          // 1360px) that used to force a 2-line wrap — see EmployeeHeader.tsx
          // for the measured before/after. On one line, "beside the first
          // line" and "after the last line" are the same position, which is
          // what actually fixes the reported "chevron detached from '(Tamil)'"
          // complaint, without relying on inline flow inside `-webkit-box`.
          <span className={`flex items-start ${rowGapClassName} min-w-0`}>
            <span className={iconWrapClassName}>
              <Languages className="w-4 h-4" strokeWidth={1.5} />
            </span>
            <span className={`${labelClassName} line-clamp-2 min-w-0`}>
              {t('language.label')}: {currentLabel}
            </span>
            <span className={iconWrapClassName}>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
              />
            </span>
          </span>
        ) : (
          <>
            <Languages className="w-4 h-4 shrink-0" strokeWidth={1.5} />
            <span className={labelClassName}>
              {t('language.label')}: {currentLabel}
            </span>
            <ChevronDown
              className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </>
        )}
      </button>

      {open && (
        // Ten options at a 44px tap target (TD-20) is a 468px list. The trigger
        // lives in a `fixed` 75px bar, so the list opens at a fixed y≈68 and
        // anything past the fold is unreachable — the page cannot be scrolled to
        // it, because the header does not scroll. Measured in a real Edge on a
        // 1920×900 window: fine to 150%, but 1 language lost at 175%, 2 at 200%
        // and 4 at 250%. On a 1366×768 laptop it starts at 110%.
        //
        // `max-h` is viewport-relative rather than a fixed pixel count so it uses
        // whatever height there actually is: 100dvh less the ~68px above the list
        // and a 12px breathing gap below. Paired with `overflow-y-auto` the
        // scrollbar is CONDITIONAL — at 100% the list is 468px against a ~820px
        // budget, so nothing scrolls and no scrollbar appears.
        //
        // `overscroll-contain` keeps a wheel/trackpad scroll that reaches the end
        // of the list from chaining on to the page behind it.
        <ul
          role="listbox"
          className="absolute right-0 mt-2 w-[180px] max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
        >
          {LANGUAGE_OPTIONS.map((opt) => {
            const selected = opt.value === current
            return (
              <li key={opt.value} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => change(opt.value)}
                  className={`flex items-center justify-between w-full px-4 py-3 text-left text-sm min-h-[44px] hover:bg-gray-50 transition-colors ${
                    selected ? 'text-primary-50 font-medium' : 'text-gray-900'
                  }`}
                >
                  <span>{opt.label}</span>
                  {selected && <Check className="w-4 h-4" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default LanguageSwitcher

// Re-export so call sites can render the supported set if needed.
export { SUPPORTED_LANGUAGES }
