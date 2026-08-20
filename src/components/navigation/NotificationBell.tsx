'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Bell, Loader2, CheckCheck } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { notificationAPI, type AppNotification } from '@/lib/api'
import { relativeTime } from '@/lib/jobFormat'

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
    <div className="relative" ref={ref}>
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
            className="absolute right-0 mt-2 w-[320px] max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-lg border border-gray-200 z-50 animate-fadeIn overflow-hidden"
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
                items.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    role="menuitem"
                    onClick={() => handleOpenItem(n)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${
                      n.read ? '' : 'bg-[#f3f9fd]'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read && (
                        <span className="mt-1.5 w-2 h-2 rounded-full bg-primary-50 flex-shrink-0" />
                      )}
                      <div className={`min-w-0 flex-1 ${n.read ? 'pl-4' : ''}`}>
                        <p className="text-sm font-medium text-black">{n.title}</p>
                        <p className="text-xs text-[#717182] mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-[10px] text-[#9a9aa5] mt-1">
                          {relativeTime(n.createdAt)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default NotificationBell
