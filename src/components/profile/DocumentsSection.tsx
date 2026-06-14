'use client'

import { useState, useEffect, useRef, useCallback, ChangeEvent } from 'react'
import { resolveMediaUrl, type UserDocument, type DocumentType } from '@/lib/api'
import {
  FileText,
  Upload,
  Trash2,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
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

const TYPE_LABELS: Record<DocumentType, string> = {
  IDENTITY_PROOF: 'Identity Proof',
  ADDRESS_PROOF: 'Address Proof',
  EDUCATION_CERTIFICATE: 'Education Certificate',
  SKILL_CERTIFICATE: 'Skill Certificate',
  GST_CERTIFICATE: 'GST Certificate',
  COMPANY_REGISTRATION: 'Company Registration',
  OTHER: 'Other',
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
      setError(err instanceof Error ? err.message : 'Failed to load documents.')
      setDocs([])
    } finally {
      setLoading(false)
    }
  }, [list])

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
      setError(err instanceof Error ? err.message : 'Failed to upload document.')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (doc: UserDocument) => {
    if (minOne && docs.length <= 1) {
      setError('At least one document is required. Upload another before removing this one.')
      return
    }
    if (!window.confirm('Remove this document? This cannot be undone.')) return
    setDeletingId(doc.id)
    setError('')
    try {
      await remove(doc.id)
      setDocs((prev) => prev.filter((d) => d.id !== doc.id))
    } catch (err) {
      // Surfaces the BE min-1 message (400) and any other failure.
      setError(err instanceof Error ? err.message : 'Failed to remove document.')
    } finally {
      setDeletingId(null)
    }
  }

  const atMin = minOne && docs.length <= 1

  return (
    <div>
      {/* Upload control */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select
          value={uploadType}
          onChange={(e) => setUploadType(e.target.value as DocumentType)}
          className="h-11 px-3 border border-[#b5b5b5] rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-primary-50"
        >
          {allowedTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <input ref={fileRef} type="file" accept={accept} onChange={handleFile} className="hidden" />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors text-sm disabled:opacity-60"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? 'Uploading…' : 'Upload Document'}
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
          <Loader2 className="w-5 h-5 animate-spin" /> Loading documents…
        </div>
      ) : docs.length === 0 ? (
        <p className="text-sm text-[#717182] py-4">No documents uploaded yet.</p>
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
                  <span>{TYPE_LABELS[doc.type] ?? doc.type}</span>
                  {fmtSize(doc.fileSize) && <span>· {fmtSize(doc.fileSize)}</span>}
                  {doc.verified ? (
                    <span className="inline-flex items-center gap-1 text-green-700">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-600">
                      <Clock className="w-3.5 h-3.5" /> Pending verification
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(doc)}
                disabled={deletingId === doc.id || atMin}
                title={atMin ? 'At least one document is required' : 'Remove document'}
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
        <p className="text-xs text-[#717182] mt-2">
          At least one document must remain on file. Upload another to replace this one.
        </p>
      )}
    </div>
  )
}
