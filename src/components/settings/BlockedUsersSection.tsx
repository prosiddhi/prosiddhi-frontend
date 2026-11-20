'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Ban, Loader2, RefreshCw } from 'lucide-react'
import { ApiError, safetyAPI, type BlockedUser } from '@/lib/api'
import { formatShortDate } from '@/lib/jobFormat'
import { safetyErrorKey } from '@/lib/safetyErrors'
import { showToast } from '@/lib/toast'
import { cardCls, outlineBtnBaseCls, sectionHeadingCls, sectionHeadingIconCls } from '@/components/settings/formClasses'
import { SafetyConfirmDialog } from '@/components/safety/SafetyConfirmDialog'

// "Blocked users" in Settings (R1-10), for seekers and employers alike: the people
// this side has blocked, newest first, with Unblock. Placed right after
// Notifications, as in the app (mobile task M-5).
//
// GET /blocks is paged (20 a page). "Load more" asks for the next page. An unblock
// removes the row at once and the list stays as it is. The server's pages have then
// shifted up by one, so the next page would skip a row: "Load more" counts the rows
// removed since the last fetch and steps back that many pages' worth (see loadMore).
// For an employer these are the COMPANY's blocks: any active teammate's block shows.

const PAGE_SIZE = 20

export function BlockedUsersSection() {
  const { t } = useTranslation()
  const [items, setItems] = useState<BlockedUser[]>([])
  const [page, setPage] = useState(1)
  const [hasNext, setHasNext] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  // Rows taken out of the list since the last fetch; each one moved the server's pages up by one.
  const [removed, setRemoved] = useState(0)

  const [confirming, setConfirming] = useState<BlockedUser | null>(null)
  const [unblocking, setUnblocking] = useState(false)
  const [unblockErrorKey, setUnblockErrorKey] = useState('')

  // First page: on mount and on Retry.
  useEffect(() => {
    let active = true
    safetyAPI
      .listBlocks({ page: 1, limit: PAGE_SIZE })
      .then((res) => {
        if (!active) return
        setItems(res.items)
        setPage(1)
        setRemoved(0)
        setHasNext(res.pagination.hasNextPage)
        setLoadFailed(false)
      })
      .catch(() => {
        if (active) setLoadFailed(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [reloadKey])

  const retry = () => {
    setLoading(true)
    setLoadFailed(false)
    setReloadKey((k) => k + 1)
  }

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      // 20 rows loaded, one unblocked: the server's next unseen row now sits at the end
      // of page 1, not the start of page 2. Step back one page per 20 rows removed.
      const removedAtStart = removed
      const nextPage = page + 1 - Math.ceil(removedAtStart / PAGE_SIZE)
      const res = await safetyAPI.listBlocks({ page: nextPage, limit: PAGE_SIZE })
      // Skip anything already shown: the step back re-reads a few rows we have.
      setItems((prev) => [...prev, ...res.items.filter((b) => !prev.some((p) => p.id === b.id))])
      setPage(nextPage)
      // Only the removals this fetch accounted for: an unblock while it was in flight still counts.
      setRemoved((n) => n - removedAtStart)
      setHasNext(res.pagination.hasNextPage)
    } catch {
      showToast(t('common:safety.blocked.loadError'), 'error')
    } finally {
      setLoadingMore(false)
    }
  }

  const removeRow = (block: BlockedUser) => {
    setItems((prev) => prev.filter((b) => b.id !== block.id))
    setRemoved((n) => n + 1)
  }

  const handleUnblock = async () => {
    if (!confirming) return
    const block = confirming
    setUnblocking(true)
    setUnblockErrorKey('')
    try {
      await safetyAPI.unblock(block.id)
      setConfirming(null)
      removeRow(block)
      showToast(t('common:safety.blocked.unblocked', { name: block.displayName }), 'success')
    } catch (err) {
      if (err instanceof ApiError && err.code === 'BLOCK_NOT_FOUND') {
        // Already unblocked (another tab, or a teammate): the row is stale, not an error.
        setConfirming(null)
        removeRow(block)
        showToast(t('common:safety.errors.alreadyUnblocked'), 'info')
      } else {
        setUnblockErrorKey(safetyErrorKey(err))
      }
    } finally {
      setUnblocking(false)
    }
  }

  const closeConfirm = useCallback(() => setConfirming(null), [])

  return (
    <section className={cardCls} aria-labelledby="blockedUsersTitle" aria-busy={loading}>
      <h2 id="blockedUsersTitle" className={sectionHeadingCls + ' mb-1'}>
        <Ban className={sectionHeadingIconCls} /> {t('common:safety.blocked.title')}
      </h2>
      <p className="text-sm text-[#717182] mb-2">{t('common:safety.blocked.intro')}</p>

      {loading && (
        <div role="status" className="flex items-center justify-center gap-2 py-6 text-sm text-[#717182]">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t('status.loading')}
        </div>
      )}

      {!loading && loadFailed && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-3">
          <p role="alert" className="text-sm text-error-600">{t('common:safety.blocked.loadError')}</p>
          <button
            type="button"
            onClick={retry}
            className={`${outlineBtnBaseCls} border border-primary-50 text-primary-50 hover:bg-primary-50 hover:text-primary-100 focus-visible:ring-primary-50`}
          >
            <RefreshCw className="w-4 h-4" />
            {t('buttons.retry')}
          </button>
        </div>
      )}

      {/* Empty only when the server has nothing more either: every loaded row may have been unblocked while more pages remain. */}
      {!loading && !loadFailed && items.length === 0 && !hasNext && (
        <p className="text-sm text-[#717182] py-4">{t('common:safety.blocked.empty')}</p>
      )}

      {!loading && !loadFailed && (items.length > 0 || hasNext) && (
        <>
          <ul className="divide-y divide-[#eee] mt-2">
            {items.map((block) => (
              <li key={block.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm sm:text-base font-medium text-black break-words">{block.displayName}</p>
                  <p className="text-xs sm:text-sm text-[#717182]">
                    {t('common:safety.blocked.blockedOn', { date: formatShortDate(block.createdAt) })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUnblockErrorKey('')
                    setConfirming(block)
                  }}
                  className="flex-shrink-0 px-4 py-2 border border-[#b5b5b5] rounded-lg text-sm font-medium text-black hover:bg-gray-50 transition-colors"
                >
                  {t('common:safety.blocked.unblock')}
                </button>
              </li>
            ))}
          </ul>
          {hasNext && (
            <div className="flex justify-center pt-3">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-primary-50 hover:underline disabled:opacity-60"
              >
                {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('common:safety.blocked.loadMore')}
              </button>
            </div>
          )}
        </>
      )}

      {confirming && (
        <SafetyConfirmDialog
          title={t('common:safety.blocked.confirmTitle', { name: confirming.displayName })}
          body={t('common:safety.blocked.confirmBody')}
          confirmLabel={t('common:safety.blocked.confirm')}
          busyLabel={t('common:safety.blocked.unblocking')}
          cancelLabel={t('common:safety.blocked.cancel')}
          busy={unblocking}
          error={unblockErrorKey ? t(unblockErrorKey) : undefined}
          tone="neutral"
          onConfirm={handleUnblock}
          onCancel={closeConfirm}
        />
      )}
    </section>
  )
}
