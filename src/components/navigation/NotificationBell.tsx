'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import {
  Bell,
  Loader2,
  CheckCheck,
  Check,
  X,
  Calendar,
  Briefcase,
  CreditCard,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { notificationAPI, type AppNotification, type NotificationType } from '@/lib/api'
import { relativeTime } from '@/lib/jobFormat'

// Figma gives each notification a colored avatar badge carrying the actor's
// initials (e.g. "AD", "UP"). Initials only work for a Latin title — every one
// of our 10 shipped languages translates `title`, so slicing letters off it
// would print two meaningless glyphs (or nothing at all) in Tamil/Kannada/
// Malayalam/Bengali. `type` is the one field on AppNotification that is NOT
// translated, so the badge is keyed off it instead: an icon + color that carry
// the same "what kind of update is this" meaning without depending on script.
const BADGE_BY_TYPE: Record<NotificationType, { icon: typeof Bell; className: string }> = {
  APPLICATION_ACCEPTED: { icon: Check, className: 'bg-success-500' },
  DOCUMENT_VERIFIED: { icon: Check, className: 'bg-success-500' },
  PROFILE_APPROVED: { icon: Check, className: 'bg-success-500' },
  APPLICATION_REJECTED: { icon: X, className: 'bg-error-500' },
  DOCUMENT_REJECTED: { icon: X, className: 'bg-error-500' },
  PROFILE_REJECTED: { icon: X, className: 'bg-error-500' },
  ADMIN_WARNING: { icon: X, className: 'bg-error-500' },
  INTERVIEW_SCHEDULED: { icon: Calendar, className: 'bg-primary-50' },
  APPLICATION_SUBMITTED: { icon: Briefcase, className: 'bg-primary-50' },
  ADMIN_PAYMENT_REMINDER: { icon: CreditCard, className: 'bg-warning-500' },
  SYSTEM: { icon: Bell, className: 'bg-grey-500' },
}

// Match the chat's cadence: notifications are created by the same server-side
// hooks (application status, interviews, document verification), and there is no
// push channel yet, so polling is the only way they arrive.
const POLL_MS = 60_000
const LIST_LIMIT = 20

/**
 * NotificationBell — PJP-111.
 *
 * The header bell was a no-op <button> on every seeker page while
 * GET /api/notifications + /unread-count had been live all along. This wires it
 * to the real endpoints: a badge with the unread count, a dropdown of the latest
 * notifications, mark-one-read on click (which also routes to the thing the
 * notification is about), and mark-all-read.
 */
export function NotificationBell() {
  const { t } = useTranslation()
  const router = useRouter()
  const { user } = useAuth()
  const isEmployer = !!user?.role?.startsWith('EMPLOYER')

  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<AppNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  // Badge: poll just the count — cheap, and it's all the closed dropdown needs.
  useEffect(() => {
    let ignore = false
    const tick = async () => {
      try {
        const res = await notificationAPI.unreadCount()
        if (!ignore) setUnread(res.count)
      } catch {
        // Transient — the next tick retries. Never surface this in the header.
      }
    }
    tick()
    const id = window.setInterval(tick, POLL_MS)
    return () => {
      ignore = true
      window.clearInterval(id)
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await notificationAPI.list({ limit: LIST_LIMIT })
      setItems(res.items)
      setUnread(res.unreadCount)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('notifications.loadError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  // Fetch the list only when the user actually opens the dropdown.
  useEffect(() => {
    if (open) void load()
  }, [open, load])

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

  /**
   * Where a notification should take you. `entityId` is the row it is about; the
   * type decides which screen renders that row.
   *
   * This is ROLE-AWARE on purpose. The same notification type lands on different
   * screens for the two roles, and the backend sends some types to only one of
   * them — APPLICATION_SUBMITTED goes to the EMPLOYER (application.service.ts:137),
   * while ACCEPTED / REJECTED / INTERVIEW_SCHEDULED go to the SEEKER. Routing an
   * employer at /my-applications/:id (a seeker-only route) would just bounce them
   * off ProtectedRoute — the same dead-end this QA pass is fixing elsewhere.
   *
   * Anything we cannot place (admin warnings, generic SYSTEM notes) returns null:
   * the notification is still marked read, but we don't navigate somewhere
   * irrelevant.
   */
  const destinationFor = (n: AppNotification): string | null => {
    if (!n.entityId) return null

    switch (n.type) {
      case 'APPLICATION_SUBMITTED':
        // Employer-only: a candidate applied to their job.
        return isEmployer ? `/employer/candidates/${n.entityId}` : null

      case 'APPLICATION_ACCEPTED':
      case 'APPLICATION_REJECTED':
        // Seeker-only: the outcome of THEIR application.
        return isEmployer ? null : `/my-applications/${n.entityId}`

      case 'INTERVIEW_SCHEDULED':
        return isEmployer ? `/employer/candidates/${n.entityId}` : '/my-interviews'

      case 'DOCUMENT_VERIFIED':
      case 'DOCUMENT_REJECTED':
      case 'PROFILE_APPROVED':
      case 'PROFILE_REJECTED':
        // Both roles have documents; each has its own profile screen.
        return isEmployer ? '/employer/profile' : '/profile'

      default:
        return null
    }
  }

  const handleOpenItem = async (n: AppNotification) => {
    setOpen(false)
    if (!n.read) {
      // Optimistic — the badge should drop the moment they click.
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
      setUnread((c) => Math.max(0, c - 1))
      notificationAPI.markRead(n.id).catch(() => {
        // Revert on failure so the unread state stays honest.
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: false } : x)))
        setUnread((c) => c + 1)
      })
    }
    const to = destinationFor(n)
    if (to) router.push(to)
  }

  const handleMarkAll = async () => {
    const previous = items
    const previousUnread = unread
    setItems((prev) => prev.map((x) => ({ ...x, read: true })))
    setUnread(0)
    try {
      await notificationAPI.markAllRead()
    } catch {
      setItems(previous)
      setUnread(previousUnread)
    }
  }

  return (
    // `inline-flex items-center`: the Mail link and this button both use the
    // -m-2.5 trick to shrink a 44px tap target back to a ~24px footprint, but
    // Mail's <a> is itself the header row's flex child, so `align-items: center`
    // on the row centers it directly. This wrapper div is a plain block, so
    // without its own flex context the inline-flex button inside falls back to
    // baseline alignment, which does not cancel the negative margin the same
    // way — the bell rendered a few px higher than Mail/the avatar as a result.
    <div className="relative inline-flex items-center" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={
          unread > 0
            ? t('notifications.ariaWithCount', { count: unread })
            : t('notifications.aria')
        }
        // 44px target around a 20-24px bell (TD-20).
        className="relative inline-flex items-center justify-center min-w-[44px] min-h-[44px] -m-2.5 hover:text-primary-50 transition-colors"
      >
        <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-error-500 text-white text-[10px] font-semibold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)} />
          <div
            role="menu"
            // `top-full` is load-bearing, not decorative. This wrapper is
            // `inline-flex items-center` (see the comment on it below), so
            // without an explicit `top` the browser positions an
            // absolutely-positioned flex child using `align-items` — i.e. it
            // CENTERS the panel on the ~24px bell icon's cross axis instead of
            // stacking it below. On a ~380px-tall panel that put roughly the
            // top half — the "Notifications" heading and the first item —
            // above the icon, rendering above the header/off the top of the
            // viewport on any page where the header sits near the top of the
            // screen. `top-full` (100% of the wrapper's own height) pins the
            // panel's top edge to the wrapper's bottom edge, which is what
            // "mt-2" alone was silently relying on and not getting.
            className="absolute right-0 top-full mt-2 w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-lg border border-gray-200 z-50 animate-fadeIn overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-black">{t('notifications.title')}</p>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAll}
                  className="flex items-center gap-1 text-xs text-primary-50 hover:text-primary-60 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  {t('notifications.markAllRead')}
                </button>
              )}
            </div>

            <div className="max-h-[380px] overflow-y-auto">
              {loading && (
                <div className="flex items-center justify-center py-8 text-[#717182]">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              )}

              {!loading && error && (
                <p className="px-4 py-6 text-sm text-error-600 text-center">{error}</p>
              )}

              {!loading && !error && items.length === 0 && (
                <p className="px-4 py-8 text-sm text-[#717182] text-center">
                  {t('notifications.empty')}
                </p>
              )}

              {!loading &&
                !error &&
                items.map((n) => {
                  const badge = BADGE_BY_TYPE[n.type]
                  const BadgeIcon = badge.icon
                  return (
                    <button
                      key={n.id}
                      type="button"
                      role="menuitem"
                      onClick={() => handleOpenItem(n)}
                      className={`w-full text-left px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${
                        n.read ? '' : 'bg-[#f3f9fd]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${badge.className}`}
                        >
                          <BadgeIcon className="w-4 h-4 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-black truncate">{n.title}</p>
                            <span className="text-[10px] text-[#9a9aa5] shrink-0 whitespace-nowrap mt-0.5">
                              {relativeTime(n.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-[#717182] mt-0.5 line-clamp-2">{n.body}</p>
                        </div>
                        {!n.read && (
                          <span className="mt-1.5 w-2 h-2 rounded-full bg-primary-50 shrink-0" />
                        )}
                      </div>
                    </button>
                  )
                })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default NotificationBell
