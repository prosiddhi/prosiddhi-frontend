'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, CheckCircle2, Flag, Loader2, X } from 'lucide-react'
import {
  REPORT_DETAILS_MAX,
  REPORT_DETAILS_MIN,
  USER_REPORT_REASONS,
  safetyAPI,
  type SafetyTargetType,
  type UserReportReason,
} from '@/lib/api'
import { safetyErrorKey } from '@/lib/safetyErrors'

// "Report a person" (R1-10): a seeker reports an employer (the whole company), an
// employer user reports a seeker. Looks and behaves like ReportJobModal, plus a
// fixed list of reasons (decision D-6).
//
// The reason LABELS differ by side — a seeker sees "Fake company or job", an
// employer sees "Fake profile" — but the value sent is the same
// (FAKE_PROFILE_OR_JOB). Same behaviour and wording as the app (mobile task M-2).

// Mount it only while it is open (`{open && <ReportUserModal … />}`): each opening
// then starts with a fresh form, with no reset effect.
interface ReportUserModalProps {
  onClose: () => void
  /** Fired once the report is accepted, e.g. to hide the Report button. */
  onReported?: () => void
  /** Who is being reported: EMPLOYER (from a job page) or JOB_SEEKER (from a candidate page). */
  targetType: SafetyTargetType
  /** The PROFILE id: job.employer.id, or the candidate's jobSeeker.id. Never a user id. */
  targetId: string
  /** Shown in the title: the company name, or the candidate's name. */
  targetName: string
  /** The job this came from, if any. */
  jobId?: string
}

// The backend refuses these in `details` (plainText). Checked here so the person is
// told before sending, in their own language.
const NOT_PLAIN_TEXT = /[<>\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/

export function ReportUserModal({ onClose, onReported, targetType, targetId, targetName, jobId }: ReportUserModalProps) {
  const { t } = useTranslation()
  const [reason, setReason] = useState<UserReportReason | null>(null)
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  // An i18n key, resolved at render time so it follows a language switch.
  const [errorKey, setErrorKey] = useState('')
  const [success, setSuccess] = useState(false)

  // Lock the page behind the dialog while it is mounted.
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  // A seeker reports an employer, so sees the seeker-side labels, and the other way round.
  const labelSide = targetType === 'EMPLOYER' ? 'seeker' : 'employer'
  const trimmed = details.trim()
  const detailsNeeded = reason === 'OTHER'
  const detailsProblem = NOT_PLAIN_TEXT.test(details)
    ? 'common:safety.report.noMarkup'
    : detailsNeeded && trimmed.length < REPORT_DETAILS_MIN
      ? 'common:safety.report.detailsRequired'
      : ''
  const canSubmit = reason !== null && !detailsProblem && !submitting

  const handleSubmit = async () => {
    if (!canSubmit || !reason) return
    setSubmitting(true)
    setErrorKey('')
    try {
      await safetyAPI.reportUser({
        targetType,
        targetId,
        reason,
        ...(trimmed ? { details: trimmed } : {}),
        ...(jobId ? { jobId } : {}),
      })
      setSuccess(true)
      onReported?.()
    } catch (err) {
      setErrorKey(safetyErrorKey(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={submitting ? undefined : onClose} />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-user-title"
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[520px] max-h-[calc(100vh-2rem)] overflow-y-auto"
      >
        <button
          onClick={onClose}
          disabled={submitting}
          aria-label={t('common:safety.report.cancel')}
          className="absolute right-4 top-4 p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          {success ? (
            <div className="flex flex-col items-center text-center py-4">
              <CheckCircle2 className="w-14 h-14 text-green-500 mb-4" />
              <h2 className="text-xl sm:text-2xl font-bold text-black mb-2">{t('common:safety.report.successTitle')}</h2>
              <p className="text-sm text-gray-600 mb-6 max-w-sm">{t('common:safety.report.successBody')}</p>
              <button
                onClick={onClose}
                className="px-8 py-3 bg-primary-50 text-primary-100 rounded-lg text-base font-medium hover:bg-primary-60 transition-colors"
              >
                {t('common:safety.report.done')}
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1 pr-8">
                <Flag className="w-5 h-5 text-red-500 flex-shrink-0" />
                <h2 id="report-user-title" className="text-xl sm:text-2xl font-bold text-black break-words">
                  {t('common:safety.report.title', { name: targetName })}
                </h2>
              </div>
              <p className="text-sm text-gray-600 mb-5">{t('common:safety.report.intro')}</p>

              <fieldset className="mb-4">
                <legend className="text-sm font-medium text-black mb-2">{t('common:safety.report.reasonLabel')}</legend>
                <div className="space-y-2">
                  {USER_REPORT_REASONS.map((value) => (
                    <label
                      key={value}
                      className={`flex items-center gap-3 px-4 py-3 border rounded-lg cursor-pointer text-sm sm:text-base transition-colors ${
                        reason === value ? 'border-red-400 bg-red-50' : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="report-user-reason"
                        value={value}
                        checked={reason === value}
                        onChange={() => setReason(value)}
                        className="w-4 h-4 accent-red-500"
                      />
                      <span>{t(`common:safety.reasons.${labelSide}.${value}`)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <label htmlFor="report-user-details" className="block text-sm font-medium text-black mb-1">
                {t('common:safety.report.detailsLabel')}{' '}
                {!detailsNeeded && <span className="font-normal text-gray-500">{t('common:safety.report.detailsOptional')}</span>}
              </label>
              <textarea
                id="report-user-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder={t('common:safety.report.detailsPlaceholder')}
                rows={4}
                maxLength={REPORT_DETAILS_MAX}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm sm:text-base placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent resize-none"
              />
              <div className="flex justify-between items-start gap-3 mt-1 mb-4">
                <span className={`text-xs ${detailsProblem === 'common:safety.report.noMarkup' ? 'text-red-600' : 'text-gray-400'}`}>
                  {detailsProblem ? t(detailsProblem, { min: REPORT_DETAILS_MIN }) : ''}
                </span>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {t('common:safety.report.charCount', { current: details.length, max: REPORT_DETAILS_MAX })}
                </span>
              </div>

              {errorKey && (
                <div role="alert" className="mb-4 flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{t(errorKey)}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={onClose}
                  disabled={submitting}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-base font-medium text-black hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {t('common:safety.report.cancel')}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="flex-1 px-6 py-3 bg-red-500 text-white rounded-lg text-base font-medium hover:bg-red-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
                  {submitting ? t('common:safety.report.submitting') : t('common:safety.report.submit')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
