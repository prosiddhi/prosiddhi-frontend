'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation, Trans } from 'react-i18next'
import { X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { jobSeekerAPI } from '@/lib/api'

// The BE caps the cover message at 1000 chars (application.validator).
const MESSAGE_MAX = 1000

interface ApplyModalProps {
  isOpen: boolean
  onClose: () => void
  jobId: string
  jobTitle: string
  companyName: string
  /** Called after a successful submission, so the parent can reflect "Applied". */
  onApplied?: () => void
}

/**
 * ApplyModal — send an application, optionally with a short written message.
 *
 * The 2-minute voice message that used to live here was REMOVED with the rest of
 * the audio feature (see docs/PRODUCT.md). The application is text-only; the BE
 * still accepts an empty message, so applying with nothing but the profile works.
 */
export function ApplyModal({ isOpen, onClose, jobId, jobTitle, companyName, onApplied }: ApplyModalProps) {
  const { t } = useTranslation()
  const [textMessage, setTextMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleClose = useCallback(() => {
    setTextMessage('')
    setSubmitError('')
    setSuccess(false)
    onClose()
  }, [onClose])

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    setSubmitError('')
    try {
      await jobSeekerAPI.applyForJob(jobId, {
        message: textMessage.trim() || undefined,
      })
      setSuccess(true)
      onApplied?.()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('seeker:applyModal.submitError'))
    } finally {
      setSubmitting(false)
    }
  }

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, handleClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[640px] max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={handleClose}
          aria-label={t('buttons.close')}
          className="absolute right-4 top-4 sm:right-6 sm:top-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Content */}
        <div className="p-6 sm:p-8 lg:p-10">
          {success ? (
            /* Success State */
            <div className="flex flex-col items-center text-center py-6 sm:py-10">
              <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
              <h2 className="text-2xl sm:text-3xl font-bold text-black mb-2">{t('seeker:applyModal.successTitle')}</h2>
              <p className="text-sm sm:text-base text-gray-600 mb-8 max-w-md">
                <Trans
                  i18nKey="seeker:applyModal.successBody"
                  values={{ jobTitle, companyName }}
                  components={{ bold: <span className="font-medium" /> }}
                />
              </p>
              <button
                onClick={handleClose}
                className="px-8 py-3 bg-primary-50 text-white rounded-lg text-base font-medium hover:bg-primary-60 transition-colors"
              >
                {t('seeker:applyModal.done')}
              </button>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-black mb-2">
                  {t('seeker:applyModal.title')}
                </h2>
                <p className="text-sm sm:text-base text-gray-600">
                  {t('seeker:applyModal.subtitle')}
                </p>
              </div>

              {/* Message */}
              <div className="mb-6 sm:mb-8">
                <label htmlFor="applyMessage" className="block text-base sm:text-lg font-medium text-black mb-3 sm:mb-4">
                  {t('seeker:applyModal.textLabel')}
                </label>
                <textarea
                  id="applyMessage"
                  value={textMessage}
                  onChange={(e) => setTextMessage(e.target.value)}
                  placeholder={t('seeker:applyModal.textPlaceholder')}
                  rows={6}
                  maxLength={MESSAGE_MAX}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm sm:text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent resize-none"
                />
                <p className="text-xs text-[#717182] mt-1 text-right tabular-nums">
                  {textMessage.length} / {MESSAGE_MAX}
                </p>
              </div>

              {/* Submit error */}
              {submitError && (
                <div className="mb-4 flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button
                  onClick={handleClose}
                  disabled={submitting}
                  className="flex-1 inline-flex items-center justify-center min-h-[48px] px-6 py-3 border border-gray-300 rounded-lg text-base font-medium text-black hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {t('seeker:applyModal.close')}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 min-h-[48px] px-6 py-3 bg-primary-50 text-white rounded-lg text-base font-medium hover:bg-primary-60 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                  {submitting ? t('seeker:applyModal.submitting') : t('seeker:applyModal.submit')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
