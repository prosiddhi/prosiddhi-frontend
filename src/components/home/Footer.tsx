'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { COMPANY_LEGAL_NAME, currentYear } from '@/lib/legal'
import { useAuth } from '@/contexts/AuthContext'

/**
 * Footer — every link here goes somewhere real.
 *
 * It used to carry 11 links to routes that do not exist (Careers, Blog, Help
 * Centre, FAQ, About, Career Advice, Employer Resources, Pricing, …), plus four
 * `href="#"` social icons. Dead Privacy / Terms / Contact links are a compliance
 * problem for a product that takes payments and holds PII, so those three are now
 * real pages; everything else that led nowhere is gone rather than faked.
 *
 * Social icons were removed outright: we have no confirmed accounts to point at,
 * and an icon that goes nowhere is worse than no icon. Add them back with real
 * URLs when the business has them.
 *
 * Auth-gated destinations (job feed, post a job, …) are intentional: a logged-out
 * visitor is sent to /login, which is a real screen — not a 404.
 */
/**
 * `audience` picks which product-specific column(s) show: the seeker landing page
 * passes 'seeker' and the employer landing page 'employer', so each only links
 * to its own side. The default shows both, which is what every other page and
 * the main landing page want. Company and Legal always show.
 *
 * A signed-in job seeker never sees the employer column, whatever `audience` the
 * page passed — the footer is shared by public pages a seeker also visits.
 */
export function Footer({ audience = 'all' }: { audience?: 'all' | 'seeker' | 'employer' }) {
  const { t } = useTranslation('legal')
  const { user, isLoading } = useAuth()
  const isSeeker = user?.role === 'JOB_SEEKER'
  const showEmployers = audience !== 'seeker' && !isSeeker
  // The role is unknown until the stored session has been read, so a seeker could
  // otherwise see the employer column for a moment. While waiting, the column
  // keeps its space but is invisible: a seeker never sees it, and an employer or
  // visitor sees no layout shift when it appears.
  const employersPending = showEmployers && isLoading
  const layoutAudience = audience === 'all' && isSeeker ? 'seeker' : audience

  // inline-flex + min-h-[44px]: these were 18px-tall lines of text, the worst
  // tap targets in the app (TD-20). The footer gets taller; that is the trade.
  //
  // Which is also why the lists below are `space-y-0.5` and not `space-y-2`: a
  // 44px row already carries ~26px of its own clear space, so the extra 8 was
  // stacked on top of padding that was already there and made a three-link
  // column 170px tall.
  const linkClass = 'inline-flex items-center min-h-[44px] hover:text-white transition-colors'

  // The main footer keeps its four columns growing (see the note below). The
  // seeker and employer footers have only three, and growing there left uneven
  // gaps. From lg up their link block uses `display: contents`, so the logo and
  // the three columns become siblings of one row and `justify-between` spaces
  // all four evenly, with the logo on the left edge and the last column flush
  // right. Below lg nothing changes: the logo stacks above the columns.
  const filtered = layoutAudience !== 'all'
  const colClass = filtered ? 'sm:flex-initial' : 'sm:flex-auto'

  // py-10, not py-12/lg:py-16. The Figma footer block is ~330px tall and this
  // one measured 395 at 1920 — the gap was almost entirely outer padding.
  // ⚠️ This component is shared by twelve surfaces, so a change here lands on
  // every one of them, not just the seeker landing page.
  return (
    <footer className="bg-[#232323] text-white py-10">
      {/* `container`, not `max-w-[1920px]`: the header and the hero are both on
          Tailwind's container (1400px at its widest), so on a 1920 screen the
          footer logo used to sit ~200px to the LEFT of the header logo directly
          above it. Same wrapper, same edge. */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-10 lg:gap-8 mb-8 lg:mb-10">
          {/* Logo */}
          <div className="w-full lg:w-auto">
            <div className="relative w-[160px] h-[44px] sm:w-[192px] sm:h-[53px]">
              <Image
                src="/assets/prosiddhi-logo-horizontal-dark.png"
                alt={t('app.name', { ns: 'common' })}
                fill
                className="object-contain"
              />
            </div>
          </div>

          {/* Footer Links. Two columns on a phone rather than one: three stacked
              single-file columns of 44px rows ran ~600px of scroll for nine
              links.

              ⚠️ `overflow-wrap:anywhere`, NOT Tailwind's `break-words`. They look
              interchangeable and are not: `break-words` (overflow-wrap:break-word)
              lets a long word wrap but does NOT reduce the element's min-content
              width, so a flex/grid item still refuses to shrink below it. Tamil
              "தொழிலாளர்களைத் தேடுங்கள்" is 154px against a 124px column at a 305px
              layout width — with `break-words` it overflowed the page anyway.
              `anywhere` is the one that shrinks min-content.

              ⚠️ `sm:flex` + `sm:flex-auto` on the children, NOT `grid-cols-3`
              (grid's equal `1fr` tracks) and NOT plain `flex-1` (`flex: 1 1 0%`,
              basis zero) on the children either — both of those divide the row by
              grow-factor alone and ignore content, which is the bug this replaced
              twice already: first as fixed-width columns for every language
              (English got a ~300px column for a ~180px heading), then as a
              shrink-to-fit block that stopped stretching at all (short languages
              clustered left with a dead zone on the right).
              `flex-auto` (`flex: 1 1 auto`) starts each column at its OWN content
              width and shares only the genuinely leftover row width on top of
              that, equally — so columns keep growing to spread across the row for
              short languages, without being force-equalised for languages that
              already need most of the space.
              `sm:`, not `lg:`: three real columns (`sm:grid-cols-3`) start at the
              same breakpoint, and below `lg` the block sits under a full-width
              logo (`w-full` there) rather than beside it, so `sm:w-full` gives it
              the same row to grow into as the `lg:flex-1` tier does above 1024.
              Only below `sm` (a real phone, `grid-cols-2`) is this untouched. */}
          <div className={`grid grid-cols-2 sm:grid-cols-4 sm:flex sm:flex-row sm:w-full gap-x-6 gap-y-8 sm:gap-8 lg:gap-[100px] flex-1 [&>div]:min-w-0 [&_a]:[overflow-wrap:anywhere] [&_h3]:[overflow-wrap:anywhere] ${filtered ? 'sm:justify-between lg:contents' : ''}`}>
            {audience !== 'employer' && (
              <div className={colClass}>
                <h3 className="text-base sm:text-[18px] mb-2 sm:mb-3">{t('footer.candidates')}</h3>
                <ul className="space-y-0.5 text-sm text-[rgba(255,255,255,0.7)]">
                  <li><Link href="/job-feed" className={linkClass}>{t('footer.browseJobs')}</Link></li>
                  <li><Link href="/saved-jobs" className={linkClass}>{t('footer.savedJobs')}</Link></li>
                  <li><Link href="/my-applications" className={linkClass}>{t('footer.myApplications')}</Link></li>
                </ul>
              </div>
            )}
            {showEmployers && (
              <div className={employersPending ? `${colClass} invisible` : colClass} aria-hidden={employersPending || undefined}>
                <h3 className="text-base sm:text-[18px] mb-2 sm:mb-3">{t('footer.employers')}</h3>
                <ul className="space-y-0.5 text-sm text-[rgba(255,255,255,0.7)]">
                  <li><Link href="/employer/jobs/new" className={linkClass}>{t('footer.postJob')}</Link></li>
                  <li><Link href="/employer/workers" className={linkClass}>{t('footer.findWorkers')}</Link></li>
                  <li><Link href="/employer/plans" className={linkClass}>{t('footer.pricing')}</Link></li>
                </ul>
              </div>
            )}
            <div className={colClass}>
              <h3 className="text-base sm:text-[18px] mb-2 sm:mb-3">{t('footer.company')}</h3>
              <ul className="space-y-0.5 text-sm text-[rgba(255,255,255,0.7)]">
                <li><Link href="/contact" className={linkClass}>{t('footer.contact')}</Link></li>
                <li><Link href="/help" className={linkClass}>{t('footer.help')}</Link></li>
              </ul>
            </div>
            <div className={colClass}>
              <h3 className="text-base sm:text-[18px] mb-2 sm:mb-3">{t('footer.legal')}</h3>
              <ul className="space-y-0.5 text-sm text-[rgba(255,255,255,0.7)]">
                <li><Link href="/privacy" className={linkClass}>{t('footer.privacy')}</Link></li>
                <li><Link href="/terms" className={linkClass}>{t('footer.terms')}</Link></li>
                <li><Link href="/delete-account" className={linkClass}>{t('breadcrumbs.deleteAccount', { ns: 'common' })}</Link></li>
              </ul>
            </div>
          </div>

        </div>

        <div className="border-t border-white/10 pt-6 text-center">
          <p className="text-sm sm:text-base text-white">
            {t('footer.copyright', {
              year: currentYear(),
              company: COMPANY_LEGAL_NAME,
            })}
          </p>
        </div>
      </div>
    </footer>
  )
}
