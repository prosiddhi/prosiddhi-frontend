'use client'

// Employer credit ledger — every POST/DOWNLOAD movement, newest first, from
// GET /api/employers/me/credits/history. Owner-only on the backend (every seat
// can see the balance via CreditWallet, but the breakdown names individual
// teammates); a MEMBER seat gets a 403 with code 'NOT_OWNER', handled below as
// a plain access message rather than a generic load error.

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { formatShortDate } from '@/lib/jobFormat'
import i18n from '@/i18n/config'
import { ApiError, subscriptionAPI, type CreditHistoryPage } from '@/lib/api'
import {
  ChevronLeft,
  ChevronRight,
  Receipt,
  Loader2,
  AlertCircle,
  Lock,
} from 'lucide-react'
import { EmployerHeader } from '@/components/employer/EmployerHeader'
import { CreditWallet } from '@/components/employer/CreditWallet'

const PAGE_SIZE = 20

// "16 Jun 2026, 03:42 PM" — date via the shared formatShortDate (locale-aware),
// time via toLocaleTimeString using the same hi/en split jobFormat.ts uses
// internally, since that helper isn't exported.
function formatDateTime(iso: string): string {
  const date = formatShortDate(iso)
  if (!date) return ''
  const time = new Date(iso).toLocaleTimeString(i18n.language?.startsWith('hi') ? 'hi-IN' : 'en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return `${date}, ${time}`
}

// Cosmetic only ('SPEND_POST' -> 'Spend Post') — same transform jobFormat.ts's
// humanizeJobType() falls back to for an enum value with no translation.
function humanizeReason(reason: string): string {
  return reason
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function LedgerContent() {
  const { t } = useTranslation()
  const [data, setData] = useState<CreditHistoryPage | null>(null)
  const [page, setPage] = useState(1)
  const [kind, setKind] = useState<'' | 'POST' | 'DOWNLOAD'>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notOwner, setNotOwner] = useState(false)
  const reqIdRef = useRef(0)

  const load = useCallback(async () => {
    const myReq = ++reqIdRef.current
    setLoading(true)
    setError('')
    setNotOwner(false)
    try {
      const res = await subscriptionAPI.getCreditHistory({
        page,
        limit: PAGE_SIZE,
        kind: kind || undefined,
        from: from || undefined,
        to: to || undefined,
      })
      if (myReq !== reqIdRef.current) return
      setData(res)
    } catch (err) {
      if (myReq !== reqIdRef.current) return
      if (err instanceof ApiError && err.code === 'NOT_OWNER') {
        setNotOwner(true)
      } else {
        setError(err instanceof Error ? err.message : t('employer:ledger.loadFailed'))
      }
      setData(null)
    } finally {
      if (myReq === reqIdRef.current) setLoading(false)
    }
  }, [page, kind, from, to, t])

  useEffect(() => {
    void load()
  }, [load])

  // Every filter change goes back to page 1 — a stale page number from a wider
  // result set can otherwise land past the end of a narrower one.
  const updateKind = (v: string) => {
    setKind(v as '' | 'POST' | 'DOWNLOAD')
    setPage(1)
  }
  const updateFrom = (v: string) => {
    setFrom(v)
    setPage(1)
  }
  const updateTo = (v: string) => {
    setTo(v)
    setPage(1)
  }
  const clearFilters = () => {
    setKind('')
    setFrom('')
    setTo('')
    setPage(1)
  }
  const hasFilters = !!kind || !!from || !!to

  const entries = data?.entries ?? []
  const pagination = data?.pagination

  return (
    <div className="min-h-screen bg-[#f7fbfd] flex flex-col">
      <EmployerHeader />

      <main className="flex-1 py-8 sm:py-10">
        {/* Same outer container as the header (EmployerHeader.tsx) and the
            dashboard/jobs-list pages — max-w-[1920px] + lg:px-[120px] — so the
            body's left/right edges line up with the header's logo/nav instead
            of drifting inward like the narrower single-column pages
            (invoices/profile/team) do. */}
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px]">
          <Link href="/employer" className="inline-flex items-center gap-2 text-black hover:text-primary-50 transition-colors mb-6">
            <ChevronLeft className="w-5 h-5" />
            <span>{t('employer:ledger.back')}</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-black mb-1">{t('employer:ledger.title')}</h1>
          <p className="text-[#717182] mb-6">{t('employer:ledger.subtitle')}</p>

          <CreditWallet className="mb-6" />

          {notOwner ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-[#717182]">
              <Lock className="w-10 h-10 mb-4 text-gray-300" />
              <p className="max-w-md">{t('employer:ledger.notOwner')}</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-end gap-3 mb-6">
                <div>
                  <label htmlFor="ledger-kind" className="block text-xs text-[#717182] mb-1">
                    {t('employer:ledger.filters.kindLabel')}
                  </label>
                  <select
                    id="ledger-kind"
                    value={kind}
                    onChange={(e) => updateKind(e.target.value)}
                    className="h-11 min-w-[160px] px-3 border border-[#dddddd] rounded-lg text-sm bg-white"
                  >
                    <option value="">{t('employer:ledger.filters.kindAll')}</option>
                    <option value="POST">{t('employer:wallet.postCredits', { count: 2 })}</option>
                    <option value="DOWNLOAD">{t('employer:wallet.downloadCredits', { count: 2 })}</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="ledger-from" className="block text-xs text-[#717182] mb-1">
                    {t('employer:ledger.filters.fromLabel')}
                  </label>
                  <input
                    id="ledger-from"
                    type="date"
                    value={from}
                    max={to || undefined}
                    onChange={(e) => updateFrom(e.target.value)}
                    className="h-11 px-3 border border-[#dddddd] rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label htmlFor="ledger-to" className="block text-xs text-[#717182] mb-1">
                    {t('employer:ledger.filters.toLabel')}
                  </label>
                  <input
                    id="ledger-to"
                    type="date"
                    value={to}
                    min={from || undefined}
                    onChange={(e) => updateTo(e.target.value)}
                    className="h-11 px-3 border border-[#dddddd] rounded-lg text-sm bg-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={clearFilters}
                  disabled={!hasFilters}
                  className="h-11 px-3 text-sm text-primary-50 underline hover:no-underline disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline transition-opacity"
                >
                  {t('employer:ledger.filters.clear')}
                </button>
              </div>

              {loading && (
                <div className="flex items-center gap-2 py-10 text-[#717182]">
                  <Loader2 className="w-5 h-5 animate-spin text-primary-50" />
                  <span className="text-sm">{t('employer:ledger.loading')}</span>
                </div>
              )}

              {!loading && error && (
                <div className="flex items-center gap-3 py-4 text-sm">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="text-red-600">{error}</span>
                  <button type="button" onClick={() => void load()} className="text-primary-50 underline hover:no-underline">
                    {t('buttons.retry')}
                  </button>
                </div>
              )}

              {!loading && !error && entries.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center text-[#717182]">
                  <Receipt className="w-10 h-10 mb-4 text-gray-300" />
                  <p className="max-w-md">{t('employer:ledger.empty')}</p>
                </div>
              )}

              {!loading && !error && entries.length > 0 && (
                <>
                  <div className="bg-white border border-[#dddddd] rounded-[10px] overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#dddddd] text-left text-xs text-[#717182]">
                          <th className="px-4 py-3 font-medium whitespace-nowrap">{t('employer:ledger.columns.date')}</th>
                          <th className="px-4 py-3 font-medium whitespace-nowrap">{t('employer:ledger.columns.kind')}</th>
                          <th className="px-4 py-3 font-medium whitespace-nowrap">{t('employer:ledger.columns.delta')}</th>
                          <th className="px-4 py-3 font-medium whitespace-nowrap">{t('employer:ledger.columns.reason')}</th>
                          <th className="px-4 py-3 font-medium">{t('employer:ledger.columns.label')}</th>
                          <th className="px-4 py-3 font-medium">{t('employer:ledger.columns.ref')}</th>
                          <th className="px-4 py-3 font-medium">{t('employer:ledger.columns.actor')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((entry, i) => (
                          <tr key={`${entry.at}-${i}`} className="border-b border-[#f0f0f0] last:border-0">
                            <td className="px-4 py-3 whitespace-nowrap text-black">{formatDateTime(entry.at)}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#e3f5ff] text-[#236987]">
                                {entry.kind === 'POST'
                                  ? t('employer:wallet.postCredits', { count: 1 })
                                  : t('employer:wallet.downloadCredits', { count: 1 })}
                              </span>
                            </td>
                            <td
                              className={`px-4 py-3 whitespace-nowrap font-semibold ${
                                entry.delta > 0 ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              {entry.delta > 0 ? `+${entry.delta}` : entry.delta}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-[#717182]">{humanizeReason(entry.reason)}</td>
                            <td className="px-4 py-3 text-black">{entry.label}</td>
                            <td className="px-4 py-3">
                              {entry.ref && entry.ref.type === 'job' ? (
                                <Link href={`/employer/jobs/${entry.ref.id}`} className="text-primary-50 hover:underline">
                                  {entry.ref.name ?? t('employer:ledger.noRef')}
                                </Link>
                              ) : (
                                <span className="text-[#717182]">{entry.ref?.name ?? t('employer:ledger.noRef')}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-[#717182]">{entry.actor?.name ?? t('employer:ledger.noActor')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {pagination && pagination.totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 mt-8">
                      <button
                        disabled={!pagination.hasPrevPage}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className="w-9 h-9 flex items-center justify-center border border-[#dddddd] rounded bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="px-3 text-sm text-[#717182]">
                        {t('employer:ledger.pageOf', { page: pagination.page, total: pagination.totalPages })}
                      </span>
                      <button
                        disabled={!pagination.hasNextPage}
                        onClick={() => setPage((p) => p + 1)}
                        className="w-9 h-9 flex items-center justify-center border border-[#dddddd] rounded bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default function LedgerPage() {
  return (
    <ProtectedRoute requiredRole="employer">
      <LedgerContent />
    </ProtectedRoute>
  )
}
