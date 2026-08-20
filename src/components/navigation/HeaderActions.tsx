'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Mail } from 'lucide-react'
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
 * Now it lives in ONE component: Mail is a real link to /messages, and the bell
 * is a real notifications dropdown (PJP-111).
 */
export function HeaderActions() {
  const { t } = useTranslation()

  // Both icons used to be `hidden sm:block`, so on a phone a seeker had no way to
  // reach messages OR notifications at all. This is a mobile-first product for
  // users who are mostly ON a phone — they are now always visible.
  return (
    <div className="flex items-center gap-4 sm:gap-6 lg:gap-8">
      <Link
        href="/messages"
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
