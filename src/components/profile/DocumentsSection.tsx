'use client'

import { useState, useEffect, useRef, useCallback, ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError, fetchSignedFile, resolveMediaUrl, SignedFileError, type UserDocument, type DocumentType } from '@/lib/api'
import { verificationStatusPill, verificationStatusIcon } from '@/lib/applicationStatus'
import { isPreviewable, sniffPreviewType } from '@/lib/documentPreview'
import { saveBlob } from '@/lib/saveBlob'
import { MAX_DOCUMENT_BYTES, uploadErrorMessage } from '@/lib/uploadFile'
import {
  FileText,
  Upload,
  Trash2,
  Loader2,
  AlertCircle,
  ChevronDown,
  Eye,
  Download as DownloadIcon,
  X,
} from 'lucide-react'

// Per-document verification is APPROVED/PENDING/REJECTED (BE `verificationStatus`).
// Older/partial responses may carry only the boolean `verified` — this derives a
// status from it so the badge always has a value to render.
function docStatus(doc: UserDocument): string {
  return doc.verificationStatus ?? (doc.verified ? 'APPROVED' : 'PENDING')
}

export interface DocTypeOption {
  value: DocumentType
  label: string
}

interface DocumentsSectionProps {
  /** Document-type choices offered in the upload picker (role-specific). */
  allowedTypes: DocTypeOption[]
  /** `accept` attribute for the file input (role-specific mime/extension list). */
  accept: string
  /**
   * Enforce the employer min-1 invariant in the UI: disable the delete button
   * when only one document remains. The BE also rejects it (400) — surfaced.
   */
  minOne?: boolean
  list: () => Promise<UserDocument[]>
  upload: (file: File, type?: DocumentType) => Promise<UserDocument>
  remove: (documentId: string) => Promise<unknown>
}

/** Human file size (B / KB / MB). */
function fmtSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentsSection({
  allowedTypes,
  accept,
  minOne = false,
  list,
  upload,
  remove,
}: DocumentsSectionProps) {
  const { t } = useTranslation()
  // Document-type label, translated by enum value (profile:documents.types.<value>).
  const typeLabel = (type: DocumentType) => t(`profile:documents.types.${type}`)
  const [docs, setDocs] = useState<UserDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [uploadType, setUploadType] = useState<DocumentType>(allowedTypes[0]?.value ?? 'OTHER')
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  // ".pdf,.jpg,.jpeg,.png" -> "PDF, JPG, PNG" for the hint under the picker.
  const acceptedTypes = Array.from(
    new Set(accept.split(',').map((ext) => ext.trim().replace(/^\./, '').toUpperCase().replace(/^JPEG$/, 'JPG'))),
  ).join(', ')

  // View / Download. One file request at a time: `busy` drives the UI, `inFlight`
  // (a ref, so it flips before React re-renders) swallows a rapid second click.
  // A neutral heads-up (not an error), shown when Download fell back to the browser.
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState<{ id: string; action: 'view' | 'download' } | null>(null)
  const inFlight = useRef<AbortController | null>(null)
  // `url` is null while the file is still being fetched.
  const [viewer, setViewer] = useState<{ doc: UserDocument; url: string | null } | null>(null)

  // The Blob URL's whole life: revoked when the viewer closes, is replaced, or the
  // section unmounts. Nothing else creates one for a viewer.
  const viewerUrl = viewer?.url
  useEffect(() => {
    return () => {
      if (viewerUrl) URL.revokeObjectURL(viewerUrl)
    }
  }, [viewerUrl])

  // Leaving the page cancels a request still in flight.
  useEffect(() => () => inFlight.current?.abort(), [])

  const closeViewer = useCallback(() => {
    inFlight.current?.abort()
    inFlight.current = null
    setBusy(null)
    setViewer(null)
  }, [])

  useEffect(() => {
    if (!viewer) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeViewer()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [viewer, closeViewer])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await list()
      setDocs(Array.isArray(res) ? res : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : t('profile:documents.loadError'))
      setDocs([])
    } finally {
      setLoading(false)
    }
  }, [list, t])

  useEffect(() => {
    load()
  }, [load])

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Reset the input so re-selecting the same file fires onChange again.
    if (fileRef.current) fileRef.current.value = ''
    if (!file) return
    setUploading(true)
    setError('')
    setNotice('')
    try {
      const created = await upload(file, uploadType)
      // The BE can replace or remove an older row on upload (employer GST / company
      // registration are one-per-type), and POST returns only the new row. So the list
      // is re-read instead of prepending. If that read fails the upload still worked:
      // show the new row, and say the LIST could not be refreshed (never "upload failed").
      const fresh = await list().catch(() => null)
      if (Array.isArray(fresh)) {
        setDocs(fresh)
      } else {
        setDocs((prev) => [created, ...prev])
        setError(t('profile:documents.loadError'))
      }
    } catch (err) {
      setError(uploadErrorMessage(err, t, t('profile:documents.uploadError')))
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (doc: UserDocument) => {
    if (minOne && docs.length <= 1) {
      setError(t('profile:documents.minOneError'))
      return
    }
    if (!window.confirm(t('profile:documents.removeConfirm'))) return
    setDeletingId(doc.id)
    setError('')
    setNotice('')
    try {
      await remove(doc.id)
      setDocs((prev) => prev.filter((d) => d.id !== doc.id))
    } catch (err) {
      // Surfaces the BE min-1 message (400) and any other failure.
      setError(err instanceof Error ? err.message : t('profile:documents.removeError'))
    } finally {
      setDeletingId(null)
    }
  }

  // Signed links expire in minutes and `docs` may be older than that, so the link is
  // taken from a fresh list at click time, never from the row that was rendered.
  const freshFileUrl = async (doc: UserDocument): Promise<string> => {
    const fresh = (await list()).find((d) => d.id === doc.id)
    if (!fresh?.fileUrl) throw new SignedFileError('missing')
    return fresh.fileUrl
  }

  // Download fallback for when the Blob fetch fails (e.g. the bucket has no CORS rule):
  // hand the same fresh signed link to the browser in a new tab. The BE serves every PDF
  // and Word file as `attachment`, so that is a download, not an inline view — this
  // relies on that policy and must never be used for View. Limits: the saved name comes
  // from the server (sanitised, not always the original), and a JPEG/PNG is served
  // inline so it opens in the tab instead of saving. Returns false when a popup blocker
  // stopped it, so the caller can show an error rather than claim success.
  const openDirectDownload = (fileUrl: string): boolean => {
    const win = window.open(resolveMediaUrl(fileUrl), '_blank')
    if (!win) return false
    win.opener = null
    return true
  }

  const fileErrorMessage = (err: unknown): string => {
    if (err instanceof SignedFileError) {
      if (err.reason === 'expired') return t('profile:documents.linkExpired')
      if (err.reason === 'missing') return t('profile:documents.missing')
      return t('profile:documents.fetchError')
    }
    // A failed list() carries its own readable message: an ApiError, or one of the plain
    // `new Error(...)`s api.ts throws on purpose (session refresh / changed). Any other
    // type — e.g. a TypeError from reading the Blob — gets the localized generic message,
    // never the browser's raw English one.
    return err instanceof ApiError || (err instanceof Error && err.constructor === Error)
      ? err.message
      : t('profile:documents.fetchError')
  }

  const openFile = async (doc: UserDocument, action: 'view' | 'download') => {
    if (inFlight.current) return
    const ctrl = new AbortController()
    inFlight.current = ctrl
    setError('')
    setNotice('')
    setBusy({ id: doc.id, action })
    // The viewer opens now, inside the click, and fills in once the file arrives —
    // so there is no popup for a blocker to stop.
    if (action === 'view') setViewer({ doc, url: null })
    let fileUrl = ''
    try {
      fileUrl = await freshFileUrl(doc)
      const blob = await fetchSignedFile(fileUrl, ctrl.signal)
      if (ctrl.signal.aborted) return
      if (action === 'download') {
        saveBlob(blob, doc.fileName || 'document')
        return
      }
      // Re-type the Blob from its own first bytes: only PDF, JPEG and PNG get a URL.
      const type = sniffPreviewType(new Uint8Array(await blob.slice(0, 8).arrayBuffer()))
      if (ctrl.signal.aborted) return
      if (!type) {
        setViewer(null)
        setError(t('profile:documents.previewUnavailable'))
        return
      }
      setViewer({ doc, url: URL.createObjectURL(blob.slice(0, blob.size, type)) })
    } catch (err) {
      if (ctrl.signal.aborted) return // the user closed the viewer
      // Only a request that got NO response (CORS / network) falls back. An expired or
      // missing file, or a 5xx, would fail the same way in the new tab — and never
      // while offline.
      if (
        action === 'download' &&
        fileUrl &&
        err instanceof SignedFileError &&
        err.reason === 'network' &&
        navigator.onLine &&
        openDirectDownload(fileUrl)
      ) {
        setNotice(t('profile:documents.downloadFallback'))
        return
      }
      setViewer(null)
      setError(fileErrorMessage(err))
    } finally {
      if (inFlight.current === ctrl) {
        inFlight.current = null
        setBusy(null)
      }
    }
  }

  const atMin = minOne && docs.length <= 1
  const actionBtnCls =
    'inline-flex items-center gap-1.5 min-h-[40px] px-3 py-2 border border-[#b5b5b5] text-black rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed'

  return (
    <div>
      {/* Upload control */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {/* TD-39. No visible label — the control sits inline beside the Upload
            button — so the name has to come from aria-label, and a <select> has
            no placeholder to fall back on. Until this, a screen reader on either
            profile page reached it and said only "combo box". */}
        <div className="relative">
          {/* `appearance-none` + the ChevronDown below replace the browser's
              own arrow, which hugs the right edge on Windows Chrome/Edge —
              `pr-10`/`right-3` matches the chevron spacing used by the other
              selects in the app (home, employee, job-feed pages). */}
          <select
            aria-label={t('profile:documents.typeLabel')}
            value={uploadType}
            onChange={(e) => setUploadType(e.target.value as DocumentType)}
            className="h-11 pl-3 pr-10 border border-[#b5b5b5] rounded-lg text-sm text-black appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-50"
          >
            {allowedTypes.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {typeLabel(opt.value)}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
        <input ref={fileRef} type="file" accept={accept} onChange={handleFile} className="hidden" />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading || loading || deletingId !== null}
          className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2.5 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors text-sm disabled:opacity-60"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? t('profile:documents.uploading') : t('profile:documents.uploadDocument')}
        </button>
      </div>
      <p className="mb-3 text-xs text-[#717182]">
        {t('profile:documents.acceptedHint', { types: acceptedTypes, maxMb: MAX_DOCUMENT_BYTES / (1024 * 1024) })}
      </p>

      {error && (
        <div className="flex items-start gap-2 mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {notice && (
        <p className="mb-4 text-sm text-[#444] bg-gray-50 border border-[#dddddd] rounded-lg px-3 py-2">{notice}</p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-[#717182] py-6">
          <Loader2 className="w-5 h-5 animate-spin" /> {t('profile:documents.loading')}
        </div>
      ) : docs.length === 0 ? (
        <p className="text-sm text-[#717182] py-4">{t('profile:documents.empty')}</p>
      ) : (
        <ul className="space-y-3">
          {docs.map((doc) => {
            const status = docStatus(doc)
            const { label, pill } = verificationStatusPill(status)
            const StatusIcon = verificationStatusIcon(status)
            return (
              <li
                key={doc.id}
                className="flex flex-wrap items-center gap-3 border border-[#dddddd] rounded-[10px] p-3 sm:p-4"
              >
                <div className="w-10 h-10 rounded-lg bg-[#eaf6fd] flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-primary-50" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-black truncate block">{doc.fileName}</span>
                  <p className="text-xs text-[#717182] flex items-center gap-2 flex-wrap mt-0.5">
                    <span>{typeLabel(doc.type)}</span>
                    {fmtSize(doc.fileSize) && <span>· {fmtSize(doc.fileSize)}</span>}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${pill}`}>
                      <StatusIcon className="w-3 h-3" /> {label}
                    </span>
                  </p>
                  {status === 'REJECTED' && doc.rejectionReason && (
                    <p className="text-xs text-red-600 mt-1">
                      {t('profile:documents.rejectionReason')}: {doc.rejectionReason}
                    </p>
                  )}
                  {!isPreviewable(doc) && (
                    <p className="text-xs text-[#717182] mt-1">{t('profile:documents.previewUnavailable')}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  {isPreviewable(doc) && (
                    <button
                      type="button"
                      onClick={() => openFile(doc, 'view')}
                      disabled={busy !== null}
                      className={actionBtnCls}
                    >
                      {busy?.id === doc.id && busy.action === 'view' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                      {busy?.id === doc.id && busy.action === 'view'
                        ? t('profile:documents.preparing')
                        : t('profile:documents.view')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openFile(doc, 'download')}
                    disabled={busy !== null}
                    className={actionBtnCls}
                  >
                    {busy?.id === doc.id && busy.action === 'download' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <DownloadIcon className="w-4 h-4" />
                    )}
                    {busy?.id === doc.id && busy.action === 'download'
                      ? t('profile:documents.preparing')
                      : t('profile:documents.download')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(doc)}
                    disabled={deletingId === doc.id || atMin || uploading}
                    title={atMin ? t('profile:documents.minOneTitle') : t('profile:documents.removeTitle')}
                    aria-label={t('profile:documents.removeTitle')}
                    className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {deletingId === doc.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {atMin && (
        <p className="text-xs text-[#717182] mt-2">{t('profile:documents.minOneHint')}</p>
      )}

      {viewer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6"
          onClick={closeViewer}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={viewer.doc.fileName}
            className="flex flex-col w-full max-w-4xl h-[85vh] bg-white rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[#dddddd]">
              <span className="text-sm font-medium text-black truncate">{viewer.doc.fileName}</span>
              <button
                type="button"
                autoFocus
                onClick={closeViewer}
                aria-label={t('profile:documents.closeViewer')}
                className="inline-flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 min-h-0 bg-[#f5f5f5]">
              {viewer.url ? (
                <iframe src={viewer.url} title={viewer.doc.fileName} className="w-full h-full border-0" />
              ) : (
                <div className="flex items-center justify-center gap-2 h-full text-[#717182]">
                  <Loader2 className="w-5 h-5 animate-spin" /> {t('profile:documents.preparing')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
