'use client'

import { useState, useEffect } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { X, Flag, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { jobSeekerAPI } from '@/lib/api'

interface ReportJobModalProps {
  isOpen: boolean
  onClose: () => void
  jobId: string
  jobTitle: string
}

const MIN_REASON = 5
const MAX_REASON = 1000

export function ReportJobModal({ isOpen, onClose, jobId, jobTitle }: ReportJobModalProps) {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Reset state each time the modal opens.
  useEffect(() => {
    if (isOpen) {
      setReason('')
      setError('')
      setSuccess(false)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const trimmedLength = reason.trim().length
  const canSubmit = trimmedLength >= MIN_REASON && !submitting

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError('')
    try {
      await jobSeekerAPI.reportJob(jobId, reason.trim())
      setSuccess(true)
    } catch (err) {
      // Surfaces the BE message, including the 429 rate-limit / duplicate text.
      setError(err instanceof Error ? err.message : t('seeker:reportModal.submitError'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[520px]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          {success ? (
            <div className="flex flex-col items-center text-center py-4">
              <CheckCircle2 className="w-14 h-14 text-green-500 mb-4" />
              <h2 className="text-xl sm:text-2xl font-bold text-black mb-2">{t('seeker:reportModal.successTitle')}</h2>
              <p className="text-sm text-gray-600 mb-6 max-w-sm">
                {t('seeker:reportModal.successBody')}
              </p>
              <button
                onClick={onClose}
                className="px-8 py-3 bg-primary-50 text-white rounded-lg text-base font-medium hover:bg-primary-60 transition-colors"
              >
                {t('seeker:reportModal.done')}
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <Flag className="w-5 h-5 text-red-500" />
                <h2 className="text-xl sm:text-2xl font-bold text-black">{t('seeker:reportModal.title')}</h2>
              </div>
              <p className="text-sm text-gray-600 mb-5">
                <Trans
                  i18nKey="seeker:reportModal.intro"
                  values={{ jobTitle }}
                  components={{ bold: <span className="font-medium" /> }}
                />
              </p>

              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('seeker:reportModal.placeholder')}
                rows={5}
                maxLength={MAX_REASON}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm sm:text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent resize-none"
              />
              <div className="flex justify-between items-center mt-1 mb-4">
                <span className="text-xs text-gray-400">
                  {trimmedLength < MIN_REASON ? t('seeker:reportModal.minChars', { count: MIN_REASON }) : ''}
                </span>
                <span className="text-xs text-gray-400">{t('seeker:reportModal.charCount', { current: reason.length, max: MAX_REASON })}</span>
              </div>

              {error && (
                <div className="mb-4 flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={onClose}
                  disabled={submitting}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-base font-medium text-black hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {t('seeker:reportModal.cancel')}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="flex-1 px-6 py-3 bg-red-500 text-white rounded-lg text-base font-medium hover:bg-red-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                  {submitting ? t('seeker:reportModal.submitting') : t('seeker:reportModal.submit')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
