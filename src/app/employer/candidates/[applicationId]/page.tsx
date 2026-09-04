'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter, useParams } from 'next/navigation'
import { ScheduleInterviewModal } from '@/components/employer/ScheduleInterviewModal'
import { employerAPI, resolveMediaUrl, type EmployerApplicationItem } from '@/lib/api'
import { formatDate, relativeTime } from '@/lib/jobFormat'
import { statusMeta } from '@/lib/applicationStatus'
import {
  ChevronLeft,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  CalendarClock,
  FileText,
  Check,
  X,
  Bookmark,
  Star,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { EmployerHeader } from '@/components/employer/EmployerHeader'

function CandidateDetailContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useParams()
  const applicationId = Array.isArray(params.applicationId) ? params.applicationId[0] : (params.applicationId as string)

  const [app, setApp] = useState<EmployerApplicationItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [acceptOpen, setAcceptOpen] = useState(false)
  const [bookmarking, setBookmarking] = useState(false)
  const [shortlisting, setShortlisting] = useState(false)
  const [actionError, setActionError] = useState('')

  // Inline reject panel.
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)

  useEffect(() => {
    let ignore = false
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await employerAPI.getCandidateDetails(applicationId)
        if (!ignore) setApp(res)
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : t('employer:candidateDetail.loadFailed'))
          setApp(null)
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    if (applicationId) run()
    return () => {
      ignore = true
    }
  }, [applicationId, reloadKey])

  const refetch = () => setReloadKey((k) => k + 1)

  const handleBookmark = async () => {
    if (bookmarking) return
    setBookmarking(true)
    setActionError('')
    try {
      await employerAPI.toggleBookmark(applicationId)
      refetch()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('employer:candidateDetail.bookmarkFailed'))
    } finally {
      setBookmarking(false)
    }
  }

  /**
   * Mark the candidate SHORTLISTED (DEF-033).
   *
   * The Shortlisted tab on the candidates list has always filtered for this
   * status, but nothing in the employer UI could ever set it — so the tab was
   * empty by construction. The backend supported it the whole time: SHORTLISTED
   * is in the Prisma enum, in the `ApplicationStatus` Zod enum the route
   * validates against, and `PUT /api/applications/:id/status` accepts it.
   * Only the button was missing.
   */
  const handleShortlist = async () => {
    setShortlisting(true)
    setActionError('')
    try {
      await employerAPI.updateApplicationStatus(applicationId, 'SHORTLISTED')
      refetch()
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : t('employer:candidateDetail.shortlistFailed')
      )
    } finally {
      setShortlisting(false)
    }
  }

  const handleReject = async () => {
    const reason = rejectReason.trim()
    if (reason && reason.length < 10) {
      setActionError(t('employer:candidateDetail.rejectReasonTooShort'))
      return
    }
    setRejecting(true)
    setActionError('')
    try {
      await employerAPI.rejectApplication(applicationId, reason ? { reason } : {})
      setRejectOpen(false)
      setRejectReason('')
      refetch()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('employer:candidateDetail.rejectFailed'))
    } finally {
      setRejecting(false)
    }
  }

  const seeker = app?.jobSeeker
  const meta = statusMeta(app?.status)
  const skills = seeker?.skills ?? []
  const experience = seeker?.workExperience ?? []
  const documents = seeker?.documents ?? []
  const isTerminal = app?.status === 'ACCEPTED' || app?.status === 'REJECTED'
  /**
   * When to offer Shortlist. The BE imposes almost nothing here — its only
   * status guard is that an ACCEPTED application cannot be REJECTED — so every
   * restriction below is a product rule the client has to hold.
   *
   * Status is a SINGLE column, so setting SHORTLISTED overwrites whatever was
   * there. That makes three states unsafe to offer it from:
   *
   *   ACCEPTED / REJECTED  the decision is already made; shortlisting is
   *                        "still deciding", so it would be a regression.
   *   WITHDRAWN            the SEEKER pulled out. Shortlisting would erase that
   *                        and resurface them as a live candidate — the employer
   *                        would be working a list of people who are gone.
   *   BOOKMARKED           it would silently destroy the bookmark, and there is
   *                        no way back: toggleBookmark only accepts
   *                        PENDING/REVIEWED/BOOKMARKED, so from SHORTLISTED the
   *                        bookmark cannot be restored. The employer can
   *                        un-bookmark and then shortlist — two clicks, but
   *                        nothing is lost and nothing happens that they did not
   *                        ask for.
   *
   * And SHORTLISTED itself, where the button would be a no-op.
   */
  const canShortlist =
    !!app &&
    !isTerminal &&
    app.status !== 'SHORTLISTED' &&
    app.status !== 'WITHDRAWN' &&
    app.status !== 'BOOKMARKED'
  // BE toggleBookmark only accepts PENDING/REVIEWED (→bookmark) or BOOKMARKED (→un-bookmark);
  // any other status throws. Only show the button when the toggle is actually valid.
  const canBookmark =
    app?.status === 'PENDING' || app?.status === 'REVIEWED' || app?.status === 'BOOKMARKED'

  return (
    <div className="min-h-screen bg-[#f7fbfd] flex flex-col">
      <EmployerHeader />

      <main className="flex-1 py-6 sm:py-8 lg:py-12">
        <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-black hover:text-primary-50 transition-colors mb-6">
            <ChevronLeft className="w-5 h-5" />
            <span>{t('employer:candidateDetail.backToCandidates')}</span>
          </button>

          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-[#717182]">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary-50" />
              <p>{t('employer:candidateDetail.loading')}</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
              <p className="text-red-600 mb-4 max-w-md">{error}</p>
              <button onClick={refetch} className="px-6 py-2 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors">{t('buttons.retry')}</button>
            </div>
          )}

          {!loading && !error && app && (
            <div className="space-y-6">
              {/* Profile header */}
              <div className="bg-white border border-[#dddddd] rounded-[10px] p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h1 className="text-2xl sm:text-3xl font-bold text-black">{seeker?.fullName || t('employer:candidateDetail.applicantFallback')}</h1>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${meta.pill}`}>{meta.label}</span>
                    </div>
                    <p className="text-sm text-[#717182] mb-3">
                      {t('employer:candidateDetail.appliedTo')} <span className="font-medium text-black">{app.job?.title}</span> · {relativeTime(app.appliedAt)}
                    </p>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-black">
                      {seeker?.location && <span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-[#3386a9]" /> {seeker.location}</span>}
                      {seeker?.user?.email && <a href={`mailto:${seeker.user.email}`} className="flex items-center gap-1 hover:text-primary-50"><Mail className="w-4 h-4 text-[#3386a9]" /> {seeker.user.email}</a>}
                      {seeker?.user?.phoneNumber && <a href={`tel:${seeker.user.phoneNumber}`} className="flex items-center gap-1 hover:text-primary-50"><Phone className="w-4 h-4 text-[#3386a9]" /> {seeker.user.phoneNumber}</a>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Interview (if already scheduled) */}
              {app.interview && (
                <div className="border border-[#d0e8f0] bg-[#f0f9fc] rounded-[10px] p-5">
                  <div className="flex items-center gap-2 mb-3 text-[#164e65]">
                    <CalendarClock className="w-5 h-5" />
                    <h2 className="text-lg font-semibold">{t('employer:candidateDetail.interviewScheduled')}</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <p><span className="text-gray-500">{t('employer:candidateDetail.dateLabel')}</span> <span className="font-medium">{formatDate(app.interview.date) || t('employer:candidateDetail.tbc')}</span></p>
                    <p><span className="text-gray-500">{t('employer:candidateDetail.timeLabel')}</span> <span className="font-medium">{app.interview.time || t('employer:candidateDetail.tbc')}</span></p>
                  </div>
                  {app.interview.notes && <p className="text-sm mt-2"><span className="text-gray-500">{t('employer:candidateDetail.notesLabel')}</span> {app.interview.notes}</p>}
                </div>
              )}

              {/* Application message */}
              <div className="bg-white border border-[#dddddd] rounded-[10px] p-5 sm:p-6">
                <h2 className="text-lg font-semibold text-black mb-3">{t('employer:candidateDetail.application')}</h2>
                {app.message ? (
                  <p className="text-sm text-black whitespace-pre-line mb-4">{app.message}</p>
                ) : (
                  <p className="text-sm text-[#717182] mb-4">{t('employer:candidateDetail.noCoverMessage')}</p>
                )}
              </div>

              {/* Skills */}
              {skills.length > 0 && (
                <div className="bg-white border border-[#dddddd] rounded-[10px] p-5 sm:p-6">
                  <h2 className="text-lg font-semibold text-black mb-3">{t('employer:candidateDetail.skills')}</h2>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((s, i) => (
                      <span key={s.id ?? i} className="bg-[#e3f5ff] text-[#236987] px-3 py-1 rounded-full text-xs">{s.skill?.name ?? t('employer:candidateDetail.skillFallback')}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Work experience */}
              {experience.length > 0 && (
                <div className="bg-white border border-[#dddddd] rounded-[10px] p-5 sm:p-6">
                  <h2 className="text-lg font-semibold text-black mb-3">{t('employer:candidateDetail.workExperience')}</h2>
                  <div className="space-y-3">
                    {experience.map((w, i) => (
                      <div key={w.id ?? i} className="flex gap-3">
                        <Briefcase className="w-4 h-4 text-[#3386a9] mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-black">{w.position || t('employer:candidateDetail.roleFallback')}{w.company ? ` · ${w.company}` : ''}</p>
                          <p className="text-xs text-[#717182]">
                            {formatDate(w.startDate)}{w.startDate ? ' — ' : ''}{w.endDate ? formatDate(w.endDate) : w.startDate ? t('employer:candidateDetail.present') : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents */}
              {documents.length > 0 && (
                <div className="bg-white border border-[#dddddd] rounded-[10px] p-5 sm:p-6">
                  <h2 className="text-lg font-semibold text-black mb-3">{t('employer:candidateDetail.documents')}</h2>
                  <div className="space-y-2">
                    {documents.map((d, i) => (
                      <a
                        key={d.id ?? i}
                        href={resolveMediaUrl(d.fileUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary-50 hover:underline"
                      >
                        <FileText className="w-4 h-4" />
                        {d.documentType || t('employer:candidateDetail.documentFallback')} {d.verified ? t('employer:candidateDetail.verified') : ''}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Action error */}
              {actionError && (
                <div className="flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Reject panel */}
              {rejectOpen && (
                <div className="bg-white border border-red-200 rounded-[10px] p-5">
                  <h3 className="text-base font-semibold text-black mb-2">{t('employer:candidateDetail.rejectTitle')}</h3>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder={t('employer:candidateDetail.rejectPlaceholder')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none mb-3"
                  />
                  <div className="flex gap-3">
                    <button onClick={() => { setRejectOpen(false); setRejectReason(''); setActionError('') }} disabled={rejecting} className="px-5 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">{t('buttons.cancel')}</button>
                    <button onClick={handleReject} disabled={rejecting} className="px-5 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 disabled:opacity-60 flex items-center gap-2">
                      {rejecting && <Loader2 className="w-4 h-4 animate-spin" />} {t('employer:candidateDetail.confirmReject')}
                    </button>
                  </div>
                </div>
              )}

              {/* Actions */}
              {!rejectOpen && (
                <div className="flex flex-wrap gap-3">
                  {!isTerminal && (
                    <button onClick={() => setAcceptOpen(true)} className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                      <Check className="w-5 h-5" /> {t('employer:candidateDetail.accept')}
                    </button>
                  )}
                  {!isTerminal && (
                    <button onClick={() => { setRejectOpen(true); setActionError('') }} className="inline-flex items-center gap-2 px-6 py-3 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium">
                      <X className="w-5 h-5" /> {t('employer:candidateDetail.reject')}
                    </button>
                  )}
                  {canShortlist && (
                    <button onClick={handleShortlist} disabled={shortlisting} className="inline-flex items-center gap-2 px-6 py-3 border border-primary-50 text-primary-70 rounded-lg hover:bg-primary-10 transition-colors text-sm font-medium disabled:opacity-60">
                      {shortlisting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Star className="w-5 h-5" />}
                      {t('employer:candidateDetail.shortlist')}
                    </button>
                  )}
                  {canBookmark && (
                    <button onClick={handleBookmark} disabled={bookmarking} className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium disabled:opacity-60">
                      {bookmarking ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bookmark className={`w-5 h-5 ${app.status === 'BOOKMARKED' ? 'fill-primary-50 text-primary-50' : ''}`} />}
                      {app.status === 'BOOKMARKED' ? t('employer:candidateDetail.bookmarked') : t('employer:candidateDetail.bookmark')}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {app && (
        <ScheduleInterviewModal
          isOpen={acceptOpen}
          onClose={() => setAcceptOpen(false)}
          applicationId={applicationId}
          candidateName={seeker?.fullName || t('employer:candidateDetail.candidateFallback')}
          onAccepted={() => { setAcceptOpen(false); refetch() }}
        />
      )}
    </div>
  )
}

export default function CandidateDetailPage() {
  return (
    <ProtectedRoute requiredRole="employer">
      <CandidateDetailContent />
    </ProtectedRoute>
  )
}
