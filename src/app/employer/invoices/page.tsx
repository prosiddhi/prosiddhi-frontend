'use client'

// GST invoice history (PJP-180). Lists the employer's invoices from
// GET /api/employers/me/invoices and downloads the PDF (streamed binary from
// GET /api/employers/me/invoices/:id/pdf) via an authenticated blob fetch.

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Image from 'next/image'
import Link from 'next/link'
import { UserDropdown } from '@/components/navigation/UserDropdown'
import { subscriptionAPI, type InvoicesPage } from '@/lib/api'
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Download,
  Loader2,
  AlertCircle,
} from 'lucide-react'

const PAGE_SIZE = 20

function formatInr(n: number): string {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function InvoicesContent() {
  const { t } = useTranslation()
  const [data, setData] = useState<InvoicesPage | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState('')

  const load = useCallback(async (p: number) => {
    setLoading(true)
    setError('')
    try {
      setData(await subscriptionAPI.getInvoices(p, PAGE_SIZE))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('employer:invoices.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load(page)
  }, [load, page])

  const handleDownload = async (id: string, number: string) => {
    setDownloadingId(id)
    setDownloadError('')
    try {
      const blob = await subscriptionAPI.fetchInvoicePdf(id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${number.replace(/[/\\]/g, '-')}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 30000)
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : t('employer:invoices.downloadFailed'))
    } finally {
      setDownloadingId(null)
    }
  }

  const items = data?.items ?? []
  const totalPages = data?.pagination.totalPages ?? 1

  return (
    <div className="min-h-screen bg-[#f7fbfd] flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[119px] h-[65px] sm:h-[75px] flex items-center justify-between">
          <Link href="/employer" className="flex items-center">
            <div className="relative w-[100px] sm:w-[120px] lg:w-[142px] h-[28px] sm:h-[33px] lg:h-[39px]">
              <Image src="/assets/logo.png" alt={t('employer:invoices.logoAlt')} fill className="object-contain" priority />
            </div>
          </Link>
          <UserDropdown />
        </div>
      </header>

      <main className="flex-1 py-8 sm:py-10">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/employer" className="inline-flex items-center gap-2 text-black hover:text-primary-50 transition-colors mb-6">
            <ChevronLeft className="w-5 h-5" />
            <span>{t('employer:invoices.back')}</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-black mb-1">{t('employer:invoices.title')}</h1>
          <p className="text-[#717182] mb-6">{t('employer:invoices.subtitle')}</p>

          {loading && (
            <div className="flex items-center gap-2 py-10 text-[#717182]">
              <Loader2 className="w-5 h-5 animate-spin text-primary-50" />
              <span className="text-sm">{t('employer:invoices.loading')}</span>
            </div>
          )}

          {!loading && error && (
            <div className="flex items-center gap-3 py-4 text-sm">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <span className="text-red-600">{error}</span>
              <button type="button" onClick={() => void load(page)} className="text-primary-50 underline hover:no-underline">
                {t('buttons.retry')}
              </button>
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center text-[#717182]">
              <FileText className="w-10 h-10 mb-4 text-gray-300" />
              <p className="max-w-md">{t('employer:invoices.empty')}</p>
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <>
              {downloadError && (
                <div className="flex items-start gap-2 text-red-600 text-sm mb-4">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{downloadError}</span>
                </div>
              )}
              <div className="space-y-3">
                {items.map((inv) => (
                  <div key={inv.id} className="bg-white border border-[#dddddd] rounded-[10px] p-4 sm:p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#e3f5ff] flex items-center justify-center text-[#236987] flex-shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-black truncate">{inv.number}</p>
                      <p className="text-xs text-[#717182] truncate">
                        {formatDate(inv.createdAt)}{inv.description ? ` · ${inv.description}` : ''}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-black">{formatInr(inv.totalInr)}</p>
                      <p className="text-xs text-[#717182]">{t('employer:invoices.inclGst')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDownload(inv.id, inv.number)}
                      disabled={downloadingId === inv.id}
                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-primary-50 text-primary-50 rounded-lg text-sm hover:bg-primary-50/5 transition-colors disabled:opacity-50 flex-shrink-0"
                    >
                      {downloadingId === inv.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      <span className="hidden sm:inline">{t('employer:invoices.download')}</span>
                    </button>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-8">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="w-9 h-9 flex items-center justify-center border border-[#dddddd] rounded bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 text-sm text-[#717182]">
                    {t('employer:invoices.pageOf', { page, total: totalPages })}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="w-9 h-9 flex items-center justify-center border border-[#dddddd] rounded bg-white hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

export default function InvoicesPage() {
  return (
    <ProtectedRoute requiredRole="employer">
      <InvoicesContent />
    </ProtectedRoute>
  )
}
