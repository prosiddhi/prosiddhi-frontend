'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { UserDropdown } from '@/components/navigation/UserDropdown'
import { useAuth } from '@/contexts/AuthContext'
import { chatAPI, type ChatMessage, type MessagesPayload } from '@/lib/api'
import { relativeTime } from '@/lib/jobFormat'
import {
  ChevronLeft,
  Send,
  Check,
  CheckCheck,
  Loader2,
  AlertCircle,
} from 'lucide-react'

const POLL_MS = 10_000

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

function ChatContent() {
  const { t } = useTranslation()
  const params = useParams()
  const conversationId = Array.isArray(params.conversationId) ? params.conversationId[0] : (params.conversationId as string)
  const { user } = useAuth()
  const myId = user?.id

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [meta, setMeta] = useState<Pick<MessagesPayload, 'job' | 'otherParty'> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')

  const messagesRef = useRef<ChatMessage[]>([])
  const markedRef = useRef<Set<string>>(new Set())
  const bottomRef = useRef<HTMLDivElement | null>(null)

  // Tracks whether the user is scrolled near the bottom, so polling/new messages
  // don't yank them down while they're reading history.
  const nearBottomRef = useRef(true)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

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

  // Initial load.
  useEffect(() => {
    let ignore = false
    const run = async () => {
      setLoading(true)
      setError('')
      // Reset per-conversation state so a client-side nav to another chat starts clean.
      markedRef.current = new Set()
      setMessages([])
      try {
        const res = await chatAPI.getMessages(conversationId)
        if (ignore) return
        setMessages(res.messages)
        setMeta({ job: res.job, otherParty: res.otherParty })
        markIncomingRead(res.messages)
      } catch (err) {
        if (!ignore) setError(err instanceof Error ? err.message : t('chat:conversation.loadError'))
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    if (conversationId) run()
    return () => {
      ignore = true
    }
  }, [conversationId, markIncomingRead])

  // Polling loop (~10s). We FULL-refetch (no `after` cursor) and merge by id: the
  // incremental cursor only returns brand-new messages, so it could never refresh
  // the `readBy` of already-seen messages — read receipts would never upgrade to
  // ✓✓. Merging the full list keeps receipts + ordering correct (MVP convos are
  // small; >50-message paging is a BE limit tracked separately).
  useEffect(() => {
    if (!conversationId) return
    const id = window.setInterval(async () => {
      try {
        const res = await chatAPI.getMessages(conversationId)
        setMeta((prev) => (prev ? { ...prev, otherParty: res.otherParty } : { job: res.job, otherParty: res.otherParty }))
        setMessages((prev) => mergeMessages(prev, res.messages))
        markIncomingRead(res.messages)
      } catch {
        /* transient poll failure — next tick retries */
      }
    }, POLL_MS)
    return () => window.clearInterval(id)
  }, [conversationId, markIncomingRead])

  // Auto-scroll to newest — but only when the user is already near the bottom, so
  // a poll arriving while they read history doesn't yank them down.
  useEffect(() => {
    if (nearBottomRef.current) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
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
      setText('')
    } catch (err) {
      setSendError(err instanceof Error ? err.message : t('chat:conversation.sendTextError'))
    } finally {
      setSending(false)
    }
  }

  const otherUserId = meta?.otherParty?.userId ?? null
  const lastSeen = meta?.otherParty?.lastSeenAt

  return (
    <div className="min-h-screen bg-[#f7fbfd] flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6 h-[65px] flex items-center gap-3">
          <Link href="/messages" className="p-1 hover:text-primary-50 transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </Link>
          <Link href="/" className="hidden sm:flex items-center">
            <div className="relative w-[110px] h-[30px]">
              <Image src="/assets/logo.png" alt={t('app.name')} fill className="object-contain" priority />
            </div>
          </Link>
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <p className="text-sm font-semibold text-black truncate">{meta?.job?.title ? t('chat:conversation.jobRef', { title: meta.job.title }) : t('chat:conversation.fallbackTitle')}</p>
            {lastSeen && <p className="text-xs text-[#717182]">{t('chat:conversation.lastSeen', { time: relativeTime(lastSeen) })}</p>}
          </div>
          <UserDropdown />
        </div>
      </header>

      <main className="flex-1 w-full max-w-[900px] mx-auto px-3 sm:px-6 py-4 flex flex-col">
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center text-[#717182]">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary-50" />
            <p>{t('chat:conversation.loading')}</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
            <p className="text-red-600 max-w-md">{error}</p>
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
              className="flex-1 space-y-3 overflow-y-auto pb-4"
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
                    <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 ${mine ? 'bg-primary-50 text-white rounded-br-sm' : 'bg-white border border-[#e6e6e6] text-black rounded-bl-sm'}`}>
                      <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                      <div className={`flex items-center gap-1 mt-1 ${mine ? 'justify-end text-white/80' : 'justify-start text-[#9a9aa5]'}`}>
                        <span className="text-[10px]">{relativeTime(m.createdAt)}</span>
                        {mine && (readByOther ? <CheckCheck className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />)}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {sendError && (
              <div className="flex items-center gap-2 text-red-600 text-sm mb-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{sendError}</span>
              </div>
            )}

            {/* Composer — text only (audio was removed from the product). */}
            <div className="bg-white border border-[#e6e6e6] rounded-xl p-2 flex items-center gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendText())}
                placeholder={t('chat:conversation.typePlaceholder')}
                className="flex-1 h-10 px-3 text-sm bg-transparent focus:outline-none"
              />
              <button onClick={handleSendText} disabled={sending || !text.trim()} className="p-2 bg-primary-50 text-white rounded-lg hover:bg-primary-60 disabled:opacity-50 disabled:cursor-not-allowed" title={t('buttons.send')}>
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <ChatContent />
    </ProtectedRoute>
  )
}
