'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Mail, Phone, Copy, Check, Loader2, AlertCircle } from 'lucide-react'
import { jobSeekerAPI } from '@/lib/api'

interface ContactRecruiterModalProps {
  isOpen: boolean
  onClose: () => void
  jobId: string
  companyName: string
}

export function ContactRecruiterModal({ isOpen, onClose, jobId, companyName }: ContactRecruiterModalProps) {
  const { t } = useTranslation()
  const [contact, setContact] = useState<{ email?: string; phoneNumber?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<'email' | 'phone' | null>(null)

  // Fetch the contact only while open — the GET itself is the gated reveal.
  useEffect(() => {
    if (!isOpen) return
    let ignore = false
    setLoading(true)
    setError('')
    setContact(null)
    setCopied(null)
    jobSeekerAPI
      .getRecruiterContact(jobId)
      .then((res) => {
        if (!ignore) setContact(res)
      })
      .catch((err) => {
        if (!ignore) setError(err instanceof Error ? err.message : t('seeker:contactModal.loadError'))
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [isOpen, jobId, t])

  // Lock body scroll while open.
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = 'unset'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const copy = async (value: string, which: 'email' | 'phone') => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(which)
      window.setTimeout(() => setCopied((c) => (c === which ? null : c)), 1500)
    } catch {
      /* clipboard unavailable — the tap-to-call/mail link still works */
    }
  }

  if (!isOpen) return null

  const hasAny = !!(contact && (contact.email || contact.phoneNumber))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[480px]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-black mb-1">{t('seeker:contactModal.title')}</h2>
          <p className="text-sm text-gray-600 mb-6">{companyName}</p>

          {loading && (
            <div className="flex flex-col items-center justify-center py-10 text-[#717182]">
              <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary-50" />
              <p className="text-sm">{t('seeker:contactModal.loading')}</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <AlertCircle className="w-8 h-8 text-red-500 mb-3" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && !hasAny && (
            <div className="flex flex-col items-center justify-center py-10 text-center text-[#717182]">
              <AlertCircle className="w-8 h-8 text-gray-300 mb-3" />
              <p className="text-sm">{t('seeker:contactModal.noContact')}</p>
            </div>
          )}

          {!loading && !error && hasAny && (
            <div className="space-y-4">
              {contact?.phoneNumber && (
                <div className="flex items-center gap-3 border border-gray-200 rounded-lg p-3 sm:p-4">
                  <div className="w-10 h-10 bg-[#e3f5ff] rounded-full flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-[#236987]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">{t('seeker:contactModal.phone')}</p>
                    <a href={`tel:${contact.phoneNumber}`} className="text-sm sm:text-base font-medium text-black hover:text-primary-50 break-all">
                      {contact.phoneNumber}
                    </a>
                  </div>
                  <button
                    onClick={() => copy(contact.phoneNumber!, 'phone')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                    title={t('seeker:contactModal.copyPhone')}
                  >
                    {copied === 'phone' ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5 text-gray-500" />}
                  </button>
                </div>
              )}

              {contact?.email && (
                <div className="flex items-center gap-3 border border-gray-200 rounded-lg p-3 sm:p-4">
                  <div className="w-10 h-10 bg-[#e3f5ff] rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-[#236987]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500">{t('seeker:contactModal.email')}</p>
                    <a href={`mailto:${contact.email}`} className="text-sm sm:text-base font-medium text-black hover:text-primary-50 break-all">
                      {contact.email}
                    </a>
                  </div>
                  <button
                    onClick={() => copy(contact.email!, 'email')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                    title={t('seeker:contactModal.copyEmail')}
                  >
                    {copied === 'email' ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5 text-gray-500" />}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
