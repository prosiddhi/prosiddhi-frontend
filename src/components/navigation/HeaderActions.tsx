'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Mail } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { NotificationBell } from './NotificationBell'
import { UserDropdown } from './UserDropdown'

/**
 * HeaderActions — the Mail / Bell / account-menu cluster on the right of the
 * seeker header.
 *
 * Six seeker pages each had this trio copy-pasted inline, with Mail and Bell as
 * bare <button>s carrying no onClick — so tapping "messages" or "notifications"
 * did nothing at all, on every page. /messages had no entry point anywhere in the
 * seeker UI either, which left the whole chat feature unreachable for a seeker.
 *
 * Now it lives in ONE component: Mail is a real link to /messages (or
 * /employer/messages, this component sits inside both EmployeeHeader and
 * EmployerHeader), and the bell is a real notifications dropdown (PJP-111).
 */
export function HeaderActions() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const messagesHref = user?.role === 'JOB_SEEKER' ? '/messages' : '/employer/messages'

  // Both icons used to be `hidden sm:block`, so on a phone a seeker had no way to
  // reach messages OR notifications at all. This is a mobile-first product for
  // users who are mostly ON a phone — they are now always visible.
  return (
    // Mail, Bell and the account button form a COMPACT cluster (their own
    // natural sizes, the gaps below and nothing else) anchored to the right
    // edge — matching the Figma, where this trio sits close together near
    // the boundary rather than spread across the whole available width.
    //
    // The leading `flex-1 min-w-0` spacer, not `flex-1` on the account
    // button, is what makes that possible without breaking "Mail/Bell/avatar
    // never move when the username changes". Three earlier attempts at this
    // same goal each failed a different requirement:
    //   - `justify-end` on the whole row (packing Mail+Bell+account as one
    //     group and right-aligning it) kept the cluster compact and right-
    //     anchored, but dragged Mail/Bell's X left by up to ~90px as the
    //     username got longer — the cluster's own width varied with the text.
    //   - `flex-1` directly on the account button (an earlier version of
    //     this file) froze Mail/Bell's X, but stretched the WHOLE cluster
    //     across the entire rail — Mail ended up sitting right next to the
    //     nav (measured: a 2px gap) while the username's box reached all the
    //     way to the header's right edge, ~540px away. Compact and
    //     position-invariant only look like opposite goals if the flexible
    //     element's width still depends on the username's own text — put the
    //     flex-1 BEFORE the fixed-size cluster instead of stretching a piece
    //     of the cluster itself, and both are true at once: this spacer's
    //     width is (rail width − Mail − Bell − account button's own fixed
    //     max-width − gaps), which depends only on the viewport, never on
    //     what name is loaded. See UserDropdown.tsx for the username's own
    //     fixed-width, 2-line-clamped box that makes this possible.
    <div className="flex items-center gap-4 sm:gap-6 lg:gap-8">
      <div aria-hidden="true" className="flex-1 min-w-0" />

      <Link
        href={messagesHref}
        aria-label={t('nav.messages')}
        title={t('nav.messages')}
        // The icon stays 20-24px; the TARGET is 44 (TD-20). -m-2.5 keeps the
        // extra padding from pushing the header layout around.
        className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] -m-2.5 hover:text-primary-50 transition-colors"
      >
        <Mail className="w-5 h-5 sm:w-6 sm:h-6" />
      </Link>

      <NotificationBell />

      <UserDropdown />
    </div>
  )
}

export default HeaderActions
