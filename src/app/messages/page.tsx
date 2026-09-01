'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import Image from 'next/image'
import Link from 'next/link'
import { Footer } from '@/components/home/Footer'
import { UserDropdown } from '@/components/navigation/UserDropdown'
import { EmployeeHeader } from '@/components/navigation/EmployeeHeader'
import { useAuth } from '@/contexts/AuthContext'
import { chatAPI, type Conversation } from '@/lib/api'
import { relativeTime, initials } from '@/lib/jobFormat'
import { MessageCircle, Loader2, AlertCircle } from 'lucide-react'

function otherPartyName(c: Conversation, isSeeker: boolean, t: TFunction): string {
  if (isSeeker) return c.employer?.companyName || c.employer?.fullName || t('chat:list.otherParty.employer')
  return c.jobSeeker?.fullName || t('chat:list.otherParty.candidate')
}

// Chat is text-only. A legacy AUDIO row (audio was removed from the product) has
// no `content`, so it previews as "no messages yet" rather than as a blank line.
function lastMessagePreview(c: Conversation, t: TFunction): string {
  return c.lastMessage?.content || t('chat:list.preview.none')
}

function MessagesListContent() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isSeeker = user?.role === 'JOB_SEEKER'

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let ignore = false
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const res = await chatAPI.getConversations()
        if (!ignore) setConversations(res)
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : t('chat:list.loadError'))
          setConversations([])
        }
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    run()
    return () => {
      ignore = true
    }
  }, [reloadKey])

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Employer keeps the existing minimal header unchanged; only the seeker
          side moves onto the shared EmployeeHeader (messages is reachable by
          both roles, so this can't be an unconditional swap). */}
      {isSeeker ? (
        <EmployeeHeader />
      ) : (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[119px] h-[65px] sm:h-[75px] flex items-center justify-between">
            <Link href="/" className="flex items-center min-h-[44px]">
              <div className="relative w-[100px] sm:w-[120px] lg:w-[142px] h-[28px] sm:h-[33px] lg:h-[39px]">
                <Image src="/assets/prosiddhi-logo-horizontal.png" alt={t('app.name')} fill className="object-contain" priority />
              </div>
            </Link>
            <UserDropdown />
          </div>
        </header>
      )}

      <main className="flex-1 py-8 sm:py-10 lg:py-12">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6">
          <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-bold text-black mb-6 sm:mb-8">{t('chat:list.title')}</h1>

          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-[#717182]">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary-50" />
              <p>{t('chat:list.loading')}</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
              <p className="text-red-600 mb-4 max-w-md">{error}</p>
              <button onClick={() => setReloadKey((k) => k + 1)} className="px-6 py-2 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors">{t('buttons.retry')}</button>
            </div>
          )}

          {!loading && !error && conversations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center text-[#717182]">
              <MessageCircle className="w-12 h-12 mb-4 text-gray-300" />
              <p className="text-lg font-medium text-black mb-1">{t('chat:list.emptyTitle')}</p>
              <p className="max-w-md">{isSeeker ? t('chat:list.emptySeeker') : t('chat:list.emptyEmployer')}</p>
            </div>
          )}

          {!loading && !error && conversations.length > 0 && (
            <div className="divide-y divide-gray-100 border border-[#eee] rounded-[10px] overflow-hidden">
              {conversations.map((c) => {
                const name = otherPartyName(c, isSeeker, t)
                const preview = lastMessagePreview(c, t)
                const unread = c.unreadCount ?? 0
                return (
                  <Link key={c.id} href={`/messages/${c.id}`} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                    <div className="w-12 h-12 bg-[#a9e5ff] rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-[#236987]">{initials(name)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-base truncate ${unread > 0 ? 'font-bold text-black' : 'font-medium text-black'}`}>{name}</p>
                        <span className="text-xs text-[#717182] flex-shrink-0">{relativeTime(c.lastMessageAt ?? undefined)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <p className={`text-sm truncate ${unread > 0 ? 'text-black' : 'text-[#717182]'}`}>
                          {preview}
                        </p>
                        {unread > 0 && (
                          <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 bg-primary-50 text-primary-100 text-xs font-medium rounded-full flex items-center justify-center">{unread}</span>
                        )}
                      </div>
                      {c.job?.title && <p className="text-xs text-[#9a9aa5] truncate mt-0.5">{t('chat:list.jobRef', { title: c.job.title })}</p>}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default function MessagesPage() {
  return (
    <ProtectedRoute>
      <MessagesListContent />
    </ProtectedRoute>
  )
}
