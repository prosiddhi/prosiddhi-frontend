'use client'

import { useEffect, useId, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Mail } from 'lucide-react'

interface EmailPromptDialogProps {
  /**
   * "Add email now". Also what Escape and a click outside the card do: closing
   * the dialog is not a decision to skip, so the seeker stays on the form.
   */
  onAddEmail: () => void
  /** "Continue without email". */
  onContinue: () => void
}

/**
 * C:PR-06 — the soft "add an email?" nudge on the seeker profile step.
 *
 * Email stays optional (PRODUCT.md §2); this opens whenever Next is pressed with
 * the field blank. Mounted only while open. The caller owns what each choice
 * does — this component makes no API call.
 */
export function EmailPromptDialog({ onAddEmail, onContinue }: EmailPromptDialogProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const addRef = useRef<HTMLButtonElement>(null)
  const skipRef = useRef<HTMLButtonElement>(null)

  // Land on the encouraged choice, and lock page scroll while the card is up.
  useEffect(() => {
    addRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  // Escape closes; Tab cycles between the two buttons, also when focus has
  // slipped outside the card.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onAddEmail()
        return
      }
      if (e.key !== 'Tab') return
      const add = addRef.current
      const skip = skipRef.current
      if (!add || !skip) return
      const active = document.activeElement
      if (active !== add && active !== skip) {
        e.preventDefault()
        add.focus()
      } else if (e.shiftKey && active === add) {
        e.preventDefault()
        skip.focus()
      } else if (!e.shiftKey && active === skip) {
        e.preventDefault()
        add.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onAddEmail])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" onClick={onAddEmail} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[480px] p-6 lg:p-8"
      >
        <Mail className="w-10 h-10 text-primary-50 mb-4" aria-hidden="true" />
        <h2 id={titleId} className="text-2xl font-bold text-black mb-3">
          {t('auth:profile.emailPromptTitle')}
        </h2>
        <p className="text-base text-[#767676] mb-8">{t('auth:profile.emailPromptBody')}</p>
        <div className="flex flex-col gap-3">
          <button
            ref={addRef}
            type="button"
            onClick={onAddEmail}
            className="w-full min-h-[48px] bg-primary-50 text-primary-100 px-6 py-3 rounded-lg text-base font-medium hover:bg-primary-60 transition-colors"
          >
            {t('auth:profile.emailPromptAdd')}
          </button>
          <button
            ref={skipRef}
            type="button"
            onClick={onContinue}
            className="w-full min-h-[48px] px-6 py-3 border border-gray-300 rounded-lg text-base font-medium text-black hover:bg-gray-50 transition-colors"
          >
            {t('auth:profile.emailPromptSkip')}
          </button>
        </div>
      </div>
    </div>
  )
}
