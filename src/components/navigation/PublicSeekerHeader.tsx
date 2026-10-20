'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import { Search, UserPlus, LogIn, User, Building2 } from 'lucide-react'
import { LanguageSwitcher } from '@/components/navigation/LanguageSwitcher'
import { publicJobsHref } from '@/lib/publicJobs'

/**
 * The logged-out seeker header: logo, Find Jobs / Companies / Language, and
 * Register / Login / Employer. Used by the seeker landing page (/employee) and by
 * a job opened from it while logged out (/job-details/[id]). Signed-in seekers get
 * EmployeeHeader instead.
 *
 * `fixed`, 75px tall — the page under it must leave that much room at the top.
 * Moved here unchanged from employee/page.tsx, except that Find Jobs now opens the
 * public job list rather than the signed-in Job Feed, which sent a logged-out
 * visitor straight to /login.
 */
export function PublicSeekerHeader() {
  const { t } = useTranslation()

  return (
    <header className="bg-white shadow-[10px_10px_50px_0px_rgba(0,0,0,0.05)] h-[75px] fixed top-0 left-0 right-0 z-40">
      {/* px-4 below `lg`: at px-12 the right-hand cluster ran to x=520 inside a
          390px bar. The header is `fixed`, so that never showed as a page
          scrollbar — it just clipped, and Login and Employer were off-screen
          and unreachable on a phone. Same three-step climb-down as the home
          header: labels at `md`, full spacing at `lg`.

          px-12 and the wide gaps are the Figma values and `2xl` keeps them, but
          they are also ~80px of the header's budget. At 1366 — an ordinary laptop
          at 100% zoom — that is space the nav needs more than the margins do, so
          `xl` runs one notch tighter. */}
      <div className="max-w-[1920px] mx-auto h-full px-4 sm:px-6 xl:px-4 2xl:px-6 min-[1920px]:px-12 flex items-center justify-between gap-3 xl:gap-2 2xl:gap-3 min-[1920px]:gap-6">
        {/* Left rail. `flex-1 basis-0` on BOTH outer rails is what keeps the nav
            on the viewport centre line the way the Figma draws it — two rails
            that grow from zero at the same rate meet in the middle. It is also
            why the nav no longer needs absolute positioning to look centred. */}
        <div className="flex-1 basis-0 flex justify-start">
          {/* Logo */}
          <Link href="/" className="flex items-center min-h-[44px] shrink-0">
            <div className="relative w-[112px] h-[31px] sm:w-[128px] sm:h-[35px] lg:w-[142px] lg:h-[39px]">
              <Image
                src="/assets/prosiddhi-logo-horizontal.png"
                alt={t('app.name')}
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>
        </div>

        {/* Navigation

            IN FLOW, not `absolute left-1/2 -translate-x-1/2`. Absolute took the
            nav out of the flex layout, so the browser could not know it had
            collided with anything — it simply drew on top of the auth cluster.

            `shrink-0`, and deliberately NOT `min-w-0`. A shrinkable nav is no
            better than an absolute one: the box narrows, the nowrap labels inside
            do not, and the text spills out of the box straight over Register.
            Measured at 1366 in Tamil: the switcher ran to x=815 while Register
            began at x=695. A nav that cannot shrink cannot spill.

            `xl`, NOT `2xl`. Gating the nav at 1536 meant a 1366 laptop at 100%
            zoom had no nav at all — and the nav reappearing at 80% zoom, because
            zooming out is what pushed the CSS viewport past 1536. A breakpoint
            that only clears on a zoomed-out browser is set wrong.

            What actually did not fit at 1366 was the language selector's text,
            not the nav: "Language: English" is 187px but "ഭാഷ: മലയാളം (Malayalam)"
            is 292px. That text now stands down on its own below `2xl` (the icon
            and chevron stay), which buys back more than the whole nav costs. */}
        <nav className="hidden xl:flex items-center gap-5 2xl:gap-8 min-[1920px]:gap-11 min-w-0">
          <Link href={publicJobsHref()} className="shrink-0 flex items-center gap-1 text-black text-[18px] whitespace-nowrap hover:text-primary-50 transition-colors">
            <Search className="w-4 h-4 shrink-0" />
            <span>{t('seeker:nav.findJobs')}</span>
          </Link>

          <Link href="/employer/welcome" className="shrink-0 flex items-center gap-1 text-black text-[18px] whitespace-nowrap hover:text-primary-50 transition-colors">
            <Building2 className="w-4 h-4 shrink-0" />
            <span>{t('seeker:nav.companies')}</span>
          </Link>

          <LanguageSwitcher />
        </nav>

        {/* Auth Buttons. The rail matches the left one so the centre line holds;
            `justify-end` keeps the cluster pinned right. The buttons themselves
            stay `shrink-0` — squeezing a 44px tap target is worse than running
            out of room. */}
        <div className="flex-1 basis-0 flex items-center justify-end gap-2 sm:gap-3 xl:gap-2 2xl:gap-4 min-[1920px]:gap-5">
          <Link
            href="/register"
            aria-label={t('seeker:nav.register')}
            title={t('seeker:nav.register')}
            className="inline-flex shrink-0 items-center justify-center gap-2 min-w-[44px] min-h-[44px] px-2 2xl:px-3 py-2 border border-secondary-70 rounded-lg text-sm 2xl:text-base text-black whitespace-nowrap hover:bg-secondary-10 transition-colors"
          >
            <UserPlus className="w-4 h-4 shrink-0" />
            <span className="hidden lg:inline">{t('seeker:nav.register')}</span>
          </Link>

          <Link
            href="/login"
            aria-label={t('seeker:nav.login')}
            title={t('seeker:nav.login')}
            className="inline-flex shrink-0 items-center justify-center gap-2 min-w-[44px] min-h-[44px] px-2 2xl:px-3 py-2 bg-primary-50 rounded-lg text-sm 2xl:text-base text-primary-100 whitespace-nowrap hover:bg-primary-60 transition-colors"
          >
            <LogIn className="w-5 h-5 shrink-0" />
            <span className="hidden lg:inline">{t('seeker:nav.login')}</span>
          </Link>

          <Link
            href="/employer/welcome"
            aria-label={t('seeker:nav.employer')}
            title={t('seeker:nav.employer')}
            className="inline-flex shrink-0 items-center justify-center gap-1 min-w-[44px] min-h-[44px] text-sm 2xl:text-base text-black whitespace-nowrap hover:text-primary-50 transition-colors"
          >
            <User className="w-4 h-4 shrink-0" />
            <span className="hidden lg:inline">{t('seeker:nav.employer')}</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
