'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Ban, Flag } from 'lucide-react'
import { safetyAPI, type SafetyTargetType } from '@/lib/api'
import { safetyErrorKey } from '@/lib/safetyErrors'
import { showToast } from '@/lib/toast'
import { ReportUserModal } from '@/components/safety/ReportUserModal'
import { SafetyConfirmDialog } from '@/components/safety/SafetyConfirmDialog'

// "Report …" and "Block …" for a person (R1-10), shared by the seeker's job page
// (about the employer) and the employer's candidate pages (about the seeker).
//
// Blocking asks first, in plain words (the app's wording, mobile tasks M-3 / M-4),
// then calls the API, shows "<name> blocked" and hands back to the page through
// `onBlocked`, which leaves it: the blocked side is gone from every list from now
// on, and the page itself must not stay open on someone who is blocked.
// The blocked person is never told.

interface ReportBlockActionsProps {
  /** EMPLOYER from a job page; JOB_SEEKER from a candidate page. */
  targetType: SafetyTargetType
  /** The PROFILE id (Employer.id / JobSeeker.id), never a user id. */
  targetId: string
  /** The company name or the candidate's name, for the dialogs and the toast. */
  targetName: string
  /** The job this is about, if any; sent with a report. */
  jobId?: string
  /** After a successful block: leave the page. */
  onBlocked: () => void
  className?: string
}

export function ReportBlockActions({ targetType, targetId, targetName, jobId, onBlocked, className = '' }: ReportBlockActionsProps) {
  const { t } = useTranslation()
  const [reportOpen, setReportOpen] = useState(false)
  const [reported, setReported] = useState(false)
  const [blockOpen, setBlockOpen] = useState(false)
  const [blocking, setBlocking] = useState(false)
  const [blockErrorKey, setBlockErrorKey] = useState('')

  const aboutEmployer = targetType === 'EMPLOYER'

  const handleBlock = async () => {
    setBlocking(true)
    setBlockErrorKey('')
    try {
      // 201 a new block, 200 already blocked: both mean done.
      await safetyAPI.block(targetType, targetId)
      setBlockOpen(false)
      showToast(t('common:safety.block.done', { name: targetName }), 'success')
      onBlocked()
    } catch (err) {
      setBlockErrorKey(safetyErrorKey(err))
    } finally {
      setBlocking(false)
    }
  }

  const linkCls = 'flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors'

  return (
    <div className={`flex flex-wrap items-center gap-x-5 gap-y-2 ${className}`}>
      {!reported && (
        <button type="button" onClick={() => setReportOpen(true)} className={linkCls}>
          <Flag className="w-4 h-4" />
          {t(aboutEmployer ? 'common:safety.actions.reportEmployer' : 'common:safety.actions.reportCandidate')}
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          setBlockErrorKey('')
          setBlockOpen(true)
        }}
        className={linkCls}
      >
        <Ban className="w-4 h-4" />
        {t(aboutEmployer ? 'common:safety.actions.blockEmployer' : 'common:safety.actions.blockCandidate')}
      </button>

      {reportOpen && (
        <ReportUserModal
          onClose={() => setReportOpen(false)}
          onReported={() => setReported(true)}
          targetType={targetType}
          targetId={targetId}
          targetName={targetName}
          jobId={jobId}
        />
      )}

      {blockOpen && (
        <SafetyConfirmDialog
          title={t('common:safety.block.title', { name: targetName })}
          body={t(aboutEmployer ? 'common:safety.block.bodyEmployer' : 'common:safety.block.bodyCandidate')}
          confirmLabel={t('common:safety.block.confirm')}
          busyLabel={t('common:safety.block.confirming')}
          cancelLabel={t('common:safety.block.cancel')}
          busy={blocking}
          error={blockErrorKey ? t(blockErrorKey) : undefined}
          onConfirm={handleBlock}
          onCancel={() => setBlockOpen(false)}
        />
      )}
    </div>
  )
}
