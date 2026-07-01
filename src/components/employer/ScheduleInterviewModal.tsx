'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, CalendarClock, Loader2, AlertCircle } from 'lucide-react'
import { employerAPI } from '@/lib/api'

interface ScheduleInterviewModalProps {
  isOpen: boolean
  onClose: () => void
  applicationId: string
  candidateName: string
  /** Called after the accept (with or without interview) succeeds. */
  onAccepted: () => void
}

// Accept-with-optional-interview. Mode dropdown is intentionally omitted — Q13
// (interview mode picker) is deferred for a separate decision; web design has
// only date/time/notes. The BE accept flow creates the Interview + flips status.
export function ScheduleInterviewModal({
  isOpen,
  onClose,
  applicationId,
  candidateName,
  onAccepted,
}: ScheduleInterviewModalProps) {
  const { t } = useTranslation()
  const [withInterview, setWithInterview] = useState(true)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setWithInterview(true)
      setDate('')
      setTime('')
      setNotes('')
      setError('')
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const canSubmit = !submitting && (!withInterview || (date !== '' && time.trim() !== ''))

  const handleSubmit = async () => {
    if (!canSubmit) return
    setSubmitting(true)
    setError('')
    try {
      // Send the raw yyyy-mm-dd value (BE accepts a date string and stores it via
      // new Date()); avoids the toISOString() UTC shift landing on the prior day.
      const body =
        withInterview && date && time.trim()
          ? { interview: { date, time: time.trim(), notes: notes.trim() || undefined } }
          : {}
      await employerAPI.acceptApplication(applicationId, body)
      onAccepted()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('employer:scheduleInterview.acceptFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[520px]">
        <button onClick={onClose} className="absolute right-4 top-4 p-2 hover:bg-gray-100 rounded-full transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-1">
            <CalendarClock className="w-5 h-5 text-primary-50" />
            <h2 className="text-xl sm:text-2xl font-bold text-black">{t('employer:scheduleInterview.title')}</h2>
          </div>
          <p className="text-sm text-gray-600 mb-5">
            {t('employer:scheduleInterview.intro', { name: candidateName })}
          </p>

          <label className="flex items-center gap-2 text-sm text-black cursor-pointer mb-4">
            <input type="checkbox" checked={withInterview} onChange={(e) => setWithInterview(e.target.checked)} />
            {t('employer:scheduleInterview.scheduleToggle')}
          </label>

          {withInterview && (
            <div className="space-y-4 mb-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">{t('employer:scheduleInterview.dateLabel')}</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">{t('employer:scheduleInterview.timeLabel')}</label>
                  <input type="text" value={time} onChange={(e) => setTime(e.target.value)} placeholder={t('employer:scheduleInterview.timePlaceholder')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-50" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">{t('employer:scheduleInterview.notesLabel')}</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder={t('employer:scheduleInterview.notesPlaceholder')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-50 resize-none" />
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 mt-2 flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button onClick={onClose} disabled={submitting} className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-base font-medium text-black hover:bg-gray-50 transition-colors disabled:opacity-50">
              {t('buttons.cancel')}
            </button>
            <button onClick={handleSubmit} disabled={!canSubmit} className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg text-base font-medium hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
              {submitting ? t('employer:scheduleInterview.accepting') : withInterview ? t('employer:scheduleInterview.acceptSchedule') : t('employer:scheduleInterview.accept')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
