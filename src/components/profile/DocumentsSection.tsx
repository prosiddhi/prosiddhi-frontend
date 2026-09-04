'use client'

import { useState, useEffect, useRef, useCallback, ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { resolveMediaUrl, type UserDocument, type DocumentType } from '@/lib/api'
import {
  FileText,
  Upload,
  Trash2,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
} from 'lucide-react'

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
    try {
      const created = await upload(file, uploadType)
      setDocs((prev) => [created, ...prev])
    } catch (err) {
      setError(err instanceof Error ? err.message : t('profile:documents.uploadError'))
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

  const atMin = minOne && docs.length <= 1

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
          disabled={uploading}
          className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2.5 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors text-sm disabled:opacity-60"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? t('profile:documents.uploading') : t('profile:documents.uploadDocument')}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-[#717182] py-6">
          <Loader2 className="w-5 h-5 animate-spin" /> {t('profile:documents.loading')}
        </div>
      ) : docs.length === 0 ? (
        <p className="text-sm text-[#717182] py-4">{t('profile:documents.empty')}</p>
      ) : (
        <ul className="space-y-3">
          {docs.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center gap-3 border border-[#dddddd] rounded-[10px] p-3 sm:p-4"
            >
              <div className="w-10 h-10 rounded-lg bg-[#eaf6fd] flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-primary-50" />
              </div>
              <div className="flex-1 min-w-0">
                <a
                  href={resolveMediaUrl(doc.fileUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-black hover:text-primary-50 truncate block"
                >
                  {doc.fileName}
                </a>
                <p className="text-xs text-[#717182] flex items-center gap-2 flex-wrap">
                  <span>{typeLabel(doc.type)}</span>
                  {fmtSize(doc.fileSize) && <span>· {fmtSize(doc.fileSize)}</span>}
                  {doc.verified ? (
                    <span className="inline-flex items-center gap-1 text-green-700">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {t('profile:documents.verified')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-600">
                      <Clock className="w-3.5 h-3.5" /> {t('profile:documents.pending')}
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(doc)}
                disabled={deletingId === doc.id || atMin}
                title={atMin ? t('profile:documents.minOneTitle') : t('profile:documents.removeTitle')}
                className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-300 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deletingId === doc.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {atMin && (
        <p className="text-xs text-[#717182] mt-2">{t('profile:documents.minOneHint')}</p>
      )}
    </div>
  )
}
