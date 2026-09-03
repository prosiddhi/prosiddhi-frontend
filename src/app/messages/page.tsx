'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Footer } from '@/components/home/Footer'
import { UserDropdown } from '@/components/navigation/UserDropdown'
import { EmployeeHeader } from '@/components/navigation/EmployeeHeader'
import { useAuth } from '@/contexts/AuthContext'
import { chatAPI, type Conversation, type ChatMessage, type MessagesPayload } from '@/lib/api'
import { relativeTime, initials } from '@/lib/jobFormat'
import {
  MessageCircle,
  Loader2,
  AlertCircle,
  ChevronLeft,
  Send,
  Check,
  CheckCheck,
} from 'lucide-react'

const POLL_MS = 10_000

function otherPartyName(c: Conversation, isSeeker: boolean, t: TFunction): string {
  if (isSeeker) return c.employer?.companyName || c.employer?.fullName || t('chat:list.otherParty.employer')
  return c.jobSeeker?.fullName || t('chat:list.otherParty.candidate')
}

// Chat is text-only. A legacy AUDIO row (audio was removed from the product) has
// no `content`, so it previews as "no messages yet" rather than as a blank line.
function lastMessagePreview(c: Conversation, t: TFunction): string {
  return c.lastMessage?.content || t('chat:list.preview.none')
}

// Merge a server message list into the current list: server entries overwrite by
// id (so read-receipt updates on already-seen messages land), new ones are added,
// any local-only (optimistic) ones are kept, and the result is createdAt-ordered.
function mergeMessages(prev: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map(prev.map((m) => [m.id, m]))
  for (const m of incoming) byId.set(m.id, m)
  return Array.from(byId.values()).sort((a, b) =>
    a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0
  )
}

interface ConversationThreadProps {
  conversation: Conversation
  myId?: string
  isSeeker: boolean
  onBack: () => void
  onRead: (conversationId: string) => void
  onMessageSent: (conversationId: string, message: ChatMessage) => void
}

// The active thread pane. Lives inline next to the conversation list — selecting
// a row swaps this component's `conversation` prop rather than navigating to a
// separate route.
function ConversationThread({ conversation, myId, isSeeker, onBack, onRead, onMessageSent }: ConversationThreadProps) {
  const { t } = useTranslation()
  const conversationId = conversation.id

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [otherParty, setOtherParty] = useState<MessagesPayload['otherParty'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')

  const markedRef = useRef<Set<string>>(new Set())

  // Tracks whether the user is scrolled near the bottom, so polling/new messages
  // don't yank them down while they're reading history.
  const nearBottomRef = useRef(true)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // Mark any incoming, still-unread messages as read (fire-and-forget, deduped).
  const markIncomingRead = useCallback(
    (list: ChatMessage[]) => {
      if (!myId) return
      for (const m of list) {
        if (m.senderId !== myId && !markedRef.current.has(m.id) && !(m.readBy?.includes(myId))) {
          markedRef.current.add(m.id)
          chatAPI.markMessageRead(m.id).catch(() => {
            // Allow a later poll to retry if this failed.
            markedRef.current.delete(m.id)
          })
        }
      }
    },
    [myId]
  )

  // Initial load — re-runs whenever the selected conversation changes.
  useEffect(() => {
    let ignore = false
    const run = async () => {
      setLoading(true)
      setError('')
      markedRef.current = new Set()
      setMessages([])
      setOtherParty(null)
      try {
        const res = await chatAPI.getMessages(conversationId)
        if (ignore) return
        setMessages(res.messages)
        setOtherParty(res.otherParty)
        markIncomingRead(res.messages)
        onRead(conversationId)
      } catch (err) {
        if (!ignore) setError(err instanceof Error ? err.message : t('chat:conversation.loadError'))
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    run()
    return () => {
      ignore = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId])

  // Polling loop (~10s). We FULL-refetch (no `after` cursor) and merge by id: the
  // incremental cursor only returns brand-new messages, so it could never refresh
  // the `readBy` of already-seen messages — read receipts would never upgrade to
  // ✓✓. Merging the full list keeps receipts + ordering correct (MVP convos are
  // small; >50-message paging is a BE limit tracked separately).
  useEffect(() => {
    const id = window.setInterval(async () => {
      try {
        const res = await chatAPI.getMessages(conversationId)
        setOtherParty(res.otherParty)
        setMessages((prev) => mergeMessages(prev, res.messages))
        markIncomingRead(res.messages)
      } catch {
        /* transient poll failure — next tick retries */
      }
    }, POLL_MS)
    return () => window.clearInterval(id)
  }, [conversationId, markIncomingRead])

  // Auto-scroll to newest — but only when the user is already near the bottom, so
  // a poll arriving while they read history doesn't yank them down. Scrolls the
  // message pane itself (not bottomRef.scrollIntoView): the pane sits inside the
  // split-view layout now, not as the whole page, and scrollIntoView walks every
  // scrollable ancestor — including the page — yanking the list/header out of view.
  useEffect(() => {
    const el = scrollRef.current
    if (nearBottomRef.current && el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const appendSent = (m: ChatMessage) => {
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
  }

  const handleSendText = async () => {
    const content = text.trim()
    if (!content || sending) return
    setSending(true)
    setSendError('')
    try {
      const m = await chatAPI.sendTextMessage(conversationId, content)
      nearBottomRef.current = true
      appendSent(m)
      onMessageSent(conversationId, m)
      setText('')
    } catch (err) {
      setSendError(err instanceof Error ? err.message : t('chat:conversation.sendTextError'))
    } finally {
      setSending(false)
    }
  }

  const name = otherPartyName(conversation, isSeeker, t)
  const otherUserId = otherParty?.userId ?? null
  const lastSeen = otherParty?.lastSeenAt ?? conversation.otherPartyLastSeenAt ?? null

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 flex-shrink-0">
        <button onClick={onBack} className="sm:hidden p-1 -ml-1 text-black hover:text-primary-50 transition-colors" aria-label={t('buttons.back')}>
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="w-10 h-10 bg-[#a9e5ff] rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-semibold text-[#236987]">{initials(name)}</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-black truncate">{name}</p>
          <p className="text-xs text-[#717182] truncate">
            {conversation.job?.title ? t('chat:conversation.jobRef', { title: conversation.job.title }) : t('chat:conversation.fallbackTitle')}
            {lastSeen ? ` · ${t('chat:conversation.lastSeen', { time: relativeTime(lastSeen) })}` : ''}
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center text-[#717182]">
          <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary-50" />
          <p className="text-sm">{t('chat:conversation.loading')}</p>
        </div>
      )}

      {!loading && error && (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <AlertCircle className="w-8 h-8 text-red-500 mb-3" />
          <p className="text-red-600 text-sm max-w-md">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          <div
            ref={scrollRef}
            onScroll={() => {
              const el = scrollRef.current
              if (el) nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120
            }}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#f7fbfd]"
          >
            {messages.length === 0 && (
              <p className="text-center text-sm text-[#717182] py-10">{t('chat:conversation.emptyHello')}</p>
            )}
            {messages.map((m) => {
              if (m.type === 'SYSTEM') {
                return (
                  <div key={m.id} className="flex justify-center">
                    <span className="bg-[#eef2f4] text-[#5b6b73] text-xs px-3 py-1.5 rounded-full max-w-[80%] text-center">{m.content}</span>
                  </div>
                )
              }
              // Chat is text-only. A legacy AUDIO row (audio was removed from the
              // product; the DB column survives) carries no `content`, so skip it
              // rather than render an empty bubble.
              if (!m.content) return null
              const mine = m.senderId === myId
              const readByOther = !!(otherUserId && m.readBy?.includes(otherUserId))
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 ${mine ? 'bg-primary-50 text-primary-100 rounded-br-sm' : 'bg-white border border-[#e6e6e6] text-black rounded-bl-sm'}`}>
                    <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                    <div className={`flex items-center gap-1 mt-1 ${mine ? 'justify-end text-white/80' : 'justify-start text-[#9a9aa5]'}`}>
                      <span className="text-[10px]">{relativeTime(m.createdAt)}</span>
                      {mine && (readByOther ? <CheckCheck className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Composer — text only (audio was removed from the product). */}
          <div className="flex-shrink-0 border-t border-gray-200 p-3">
            {sendError && (
              <div className="flex items-center gap-2 text-red-600 text-sm mb-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{sendError}</span>
              </div>
            )}
            <div className="bg-white border border-[#e6e6e6] rounded-xl p-2 flex items-center gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendText())}
                placeholder={t('chat:conversation.typePlaceholder')}
                className="flex-1 h-10 px-3 text-sm bg-transparent focus:outline-none"
              />
              <button onClick={handleSendText} disabled={sending || !text.trim()} className="p-2 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 disabled:opacity-50 disabled:cursor-not-allowed" title={t('buttons.send')}>
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function MessagesListContent() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isSeeker = user?.role === 'JOB_SEEKER'
  const router = useRouter()
  const searchParams = useSearchParams()

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [seeded, setSeeded] = useState(false)

  // Seed the selection from ?c=<conversationId>, so a bookmarked/shared link into
  // a specific thread still lands there. Read in an effect (not a lazy useState
  // initialiser) — useSearchParams is empty during the server render.
  useEffect(() => {
    setSelectedId(searchParams.get('c'))
    setSeeded(true)
    // Deliberately mount-only: this seeds the INITIAL selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  const selectConversation = (id: string | null) => {
    setSelectedId(id)
    router.replace(id ? `/messages?c=${id}` : '/messages', { scroll: false })
  }

  const handleRead = (conversationId: string) => {
    setConversations((prev) => prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)))
  }

  const handleMessageSent = (conversationId: string, message: ChatMessage) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === conversationId)
      if (idx === -1) return prev
      const updated = { ...prev[idx], lastMessage: message, lastMessageAt: message.createdAt }
      return [updated, ...prev.filter((c) => c.id !== conversationId)]
    })
  }

  const selectedConversation = seeded ? conversations.find((c) => c.id === selectedId) ?? null : null
  const selectionMissing = seeded && !loading && !error && !!selectedId && !selectedConversation

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
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px]">
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
            <div className="flex gap-5 h-[min(70vh,640px)] min-h-[480px]">
              <div className={`${selectedId ? 'hidden sm:block' : 'block'} w-full sm:w-[360px] sm:flex-shrink-0 border border-[#eee] rounded-[10px] bg-white overflow-y-auto`}>
                <div className="divide-y divide-gray-100">
                  {conversations.map((c) => {
                    const name = otherPartyName(c, isSeeker, t)
                    const preview = lastMessagePreview(c, t)
                    const unread = c.unreadCount ?? 0
                    const active = c.id === selectedId
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => selectConversation(c.id)}
                        className={`w-full text-left flex items-center gap-4 p-4 transition-colors ${active ? 'bg-[#eaf6ff]' : 'hover:bg-gray-50'}`}
                      >
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
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className={`${selectedId ? 'flex' : 'hidden sm:flex'} flex-1 flex-col border border-[#eee] rounded-[10px] bg-white overflow-hidden`}>
                {selectedConversation && (
                  <ConversationThread
                    key={selectedConversation.id}
                    conversation={selectedConversation}
                    myId={user?.id}
                    isSeeker={isSeeker}
                    onBack={() => selectConversation(null)}
                    onRead={handleRead}
                    onMessageSent={handleMessageSent}
                  />
                )}
                {!selectedConversation && !selectionMissing && (
                  <div className="flex-1 hidden sm:flex flex-col items-center justify-center text-center px-4 text-[#717182]">
                    <MessageCircle className="w-10 h-10 mb-3 text-gray-300" />
                    <p>{t('chat:conversation.selectPrompt')}</p>
                  </div>
                )}
                {selectionMissing && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-4 text-[#717182]">
                    <AlertCircle className="w-10 h-10 mb-3 text-gray-300" />
                    <p>{t('chat:conversation.loadError')}</p>
                  </div>
                )}
              </div>
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
