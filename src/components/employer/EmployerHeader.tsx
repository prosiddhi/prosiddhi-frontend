'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Plus, Search, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { HeaderActions } from '@/components/navigation/HeaderActions'
import { PAGE_BOX } from '@/lib/layout'

/**
 * The employer area's header — one component, previously twelve copies (TD-28).
 *
 * **Why it is shared.** Every authenticated employer page hand-rolled this same
 * markup. That is not just duplication: it is the mechanism by which one copy
 * rots while the others are fixed. `/employee` did exactly that — the original
 * seeker header moved to `<Link>`, its inline duplicate did not, and six dead
 * `<button>`s shipped (`bf32f3d`).
 *
 * **Why it is dark teal.** The employer area and the seeker area were the same
 * product: same primary, same logo, same bar, same cards — the only difference
 * was one button. An employer could not tell at a glance which half of the
 * product they were in.
 *
 * `primary-90` (#164e65) rather than a new colour: it is already in the scale,
 * and it is already what mobile's employer surfaces use, so this closes a
 * cross-surface divergence rather than opening one.
 *
 * ⚠️ It also fixes a contrast failure, which is the part worth not undoing. The
 * outline links in this header were `text-primary-50` — the brand sky, **1.9:1
 * on white**, well under the 4.5:1 WCAG AA needs for text. `primary-90` is
 * ~9:1. `HeroSection.tsx` records the same finding for the same reason.
 *
 * The solid "Post a Job" button keeps the sky FILL but no longer white text.
 * White on `primary-50` measures 2.02:1 and failed; `primary-100` on it is
 * 6.62:1, and 4.73:1 on the `primary-60` hover shade. That was TD-48, fixed
 * across all 106 call sites rather than here — an earlier draft of this comment
 * claimed a fill "is a different measurement and passes", which is simply false,
 * and `scripts/smoke/smoke-td28.js` measures it on every run.
 *
 * **Find workers / Team / Post a Job live here, not per-page.** They used to be
 * passed in as `children`, which only the dashboard and My Jobs actually did —
 * the other ten employer pages rendered a bare `<EmployerHeader />` and silently
 * shipped without them. Same TD-28 failure mode, one level down: the fix is the
 * same one, stop letting each page opt in to shared chrome.
 */
export function EmployerHeader() {
  const { t } = useTranslation()
  return (
    <header className="bg-white border-b-2 border-primary-90 sticky top-0 z-50">
      <div className={`${PAGE_BOX} h-[65px] sm:h-[75px] flex items-center justify-between`}>
        {/* The logo always goes to the dashboard, on every employer page. */}
        <Link href="/employer" className="flex items-center min-h-[44px] shrink-0">
          <div className="relative w-[100px] sm:w-[120px] lg:w-[142px] h-[28px] sm:h-[33px] lg:h-[39px]">
            <Image
              src="/assets/prosiddhi-logo-horizontal.png"
              alt={t('employer:dashboard.logoAlt')}
              fill
              className="object-contain"
              priority
            />
          </div>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-5">
          {/* Below `lg` the bottom bar (EmployerBottomNav) carries Find workers, Post a Job
              and — in its More sheet — Team, so the header keeps only the logo and
              HeaderActions there. From `lg`, Find workers and Team are icon-only until `xl`,
              where all three show their label; an icon-only link's text is `hidden`, so it
              carries an aria-label. */}
          <Link
            href="/employer/workers"
            aria-label={t('employer:dashboard.findWorkers')}
            title={t('employer:dashboard.findWorkers')}
            className={`hidden lg:inline-flex ${employerHeaderLinkCls}`}
          >
            <Search className="w-4 h-4" />
            <span className="hidden xl:inline">{t('employer:dashboard.findWorkers')}</span>
          </Link>
          <Link
            href="/employer/team"
            aria-label={t('employer:dashboard.team')}
            title={t('employer:dashboard.team')}
            className={`hidden lg:inline-flex ${employerHeaderLinkCls}`}
          >
            <Users className="w-4 h-4" />
            <span className="hidden xl:inline">{t('employer:dashboard.team')}</span>
          </Link>
          <Link href="/employer/jobs/new" className={`hidden lg:inline-flex ${employerHeaderCtaCls}`}>
            <Plus className="w-4 h-4" />
            {t('employer:dashboard.postJob')}
          </Link>
          <HeaderActions compact />
        </div>
      </div>
    </header>
  )
}

/**
 * A secondary action in the employer header — outlined, dark teal.
 *
 * Exported so the two pages that add their own actions cannot reinvent the
 * styling and drift from it, which is the whole failure mode TD-28 is about.
 *
 * ⚠️ **No display utility here.** Callers need their own responsive visibility
 * (`hidden lg:inline-flex`), and Tailwind generates a class only when it can SEE
 * the literal name while scanning source. A composed `` `hidden lg:${cls}` `` puts
 * `lg:inline-flex` together at runtime, so the utility is never generated and the
 * link stays hidden at every width. Callers write the display classes literally
 * and prepend them.
 */
export const employerHeaderLinkCls =
  'items-center justify-center gap-2 px-3 xl:px-4 py-2 min-h-[44px] min-w-[44px] shrink-0 whitespace-nowrap border border-primary-90 text-primary-90 rounded-lg hover:bg-primary-90/5 transition-colors text-sm sm:text-base'

/**
 * The one primary action. Sky fill, `primary-100` text — 6.62:1 (TD-48).
 *
 * ⚠️ Do not "restore" `text-white` here. It reads as the obvious pairing for a
 * coloured button and it is 2.02:1, which is what shipped for months.
 *
 * Same rule as above: no display utility. The caller adds `hidden lg:inline-flex`.
 */
export const employerHeaderCtaCls =
  'items-center justify-center gap-2 px-4 py-2 min-h-[44px] shrink-0 whitespace-nowrap bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors text-base'

export default EmployerHeader
