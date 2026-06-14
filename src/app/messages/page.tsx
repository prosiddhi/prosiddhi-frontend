'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Footer } from '@/components/home/Footer'
import { UserDropdown } from '@/components/navigation/UserDropdown'
import { useAuth } from '@/contexts/AuthContext'
import { chatAPI, type Conversation } from '@/lib/api'
import { relativeTime, initials } from '@/lib/jobFormat'
import { MessageCircle, Loader2, AlertCircle, Mic } from 'lucide-react'

function otherPartyName(c: Conversation, isSeeker: boolean): string {
  if (isSeeker) return c.employer?.companyName || c.employer?.fullName || 'Employer'
  return c.jobSeeker?.fullName || 'Candidate'
}

function lastMessagePreview(c: Conversation): { text: string; isAudio: boolean } {
  const m = c.lastMessage
  if (!m) return { text: 'No messages yet', isAudio: false }
  if (m.type === 'AUDIO') return { text: 'Voice message', isAudio: true }
  if (m.type === 'SYSTEM') return { text: m.content, isAudio: false }
  return { text: m.content, isAudio: false }
}

function MessagesListContent() {
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
          setError(err instanceof Error ? err.message : 'Failed to load your messages. Please try again.')
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
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[119px] h-[65px] sm:h-[75px] flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <div className="relative w-[100px] sm:w-[120px] lg:w-[142px] h-[28px] sm:h-[33px] lg:h-[39px]">
              <Image src="/assets/logo.png" alt="Job Portal Logo" fill className="object-contain" priority />
            </div>
          </Link>
          <UserDropdown />
        </div>
      </header>

      <main className="flex-1 py-8 sm:py-10 lg:py-12">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6">
          <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-bold text-black mb-6 sm:mb-8">Messages</h1>

          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-[#717182]">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary-50" />
              <p>Loading your messages...</p>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
              <p className="text-red-600 mb-4 max-w-md">{error}</p>
              <button onClick={() => setReloadKey((k) => k + 1)} className="px-6 py-2 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors">Retry</button>
            </div>
          )}

          {!loading && !error && conversations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center text-[#717182]">
              <MessageCircle className="w-12 h-12 mb-4 text-gray-300" />
              <p className="text-lg font-medium text-black mb-1">No conversations yet</p>
              <p className="max-w-md">{isSeeker ? 'Apply to a job and the employer can start a conversation with you.' : 'Conversations with candidates will appear here.'}</p>
            </div>
          )}

          {!loading && !error && conversations.length > 0 && (
            <div className="divide-y divide-gray-100 border border-[#eee] rounded-[10px] overflow-hidden">
              {conversations.map((c) => {
                const name = otherPartyName(c, isSeeker)
                const preview = lastMessagePreview(c)
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
                        <p className={`text-sm truncate flex items-center gap-1 ${unread > 0 ? 'text-black' : 'text-[#717182]'}`}>
                          {preview.isAudio && <Mic className="w-3.5 h-3.5" />}
                          {preview.text}
                        </p>
                        {unread > 0 && (
                          <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 bg-primary-50 text-white text-xs font-medium rounded-full flex items-center justify-center">{unread}</span>
                        )}
                      </div>
                      {c.job?.title && <p className="text-xs text-[#9a9aa5] truncate mt-0.5">Re: {c.job.title}</p>}
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
