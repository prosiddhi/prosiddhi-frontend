'use client'

// Team seat management (Phase 3, EPIC C). Owner sees seat usage + roster,
// invites teammates by email (BE returns a one-shot token — no SMTP in v1, so
// we surface a copyable invite link the owner relays), and removes seats. Seat
// cap comes from the active plan (Pro plans include 2–3 seats); at 0 free seats
// the invite is gated with an upgrade prompt.

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Image from 'next/image'
import Link from 'next/link'
import { UserDropdown } from '@/components/navigation/UserDropdown'
import { formatShortDate } from '@/lib/jobFormat'
import { teamAPI, type TeamSummary, type InviteResult } from '@/lib/api'
import {
  ChevronLeft,
  Users,
  Mail,
  Trash2,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  UserPlus,
} from 'lucide-react'


function TeamContent() {
  const { t } = useTranslation()
  const [team, setTeam] = useState<TeamSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [email, setEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [lastInvite, setLastInvite] = useState<InviteResult | null>(null)
  const [copied, setCopied] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [removeError, setRemoveError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setTeam(await teamAPI.getTeam())
    } catch (err) {
      setError(err instanceof Error ? err.message : t('employer:team.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  // The BE returns the raw token exactly once (only its hash is stored), so this
  // link is the single copy in existence — losing it means re-inviting.
  const inviteLink = lastInvite
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/employer/team/accept?token=${encodeURIComponent(lastInvite.token)}`
    : ''

  const handleInvite = async () => {
    if (inviting) return // guard: Enter-key repeat / double-click
    const value = email.trim()
    if (!value) return
    setInviting(true)
    setInviteError('')
    setLastInvite(null)
    setCopied(false)
    try {
      const res = await teamAPI.invite(value)
      setLastInvite(res)
      setEmail('')
      await load() // refresh roster + seat counts
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : t('employer:team.inviteFailed'))
    } finally {
      setInviting(false)
    }
  }

  const handleCopy = async () => {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    } catch {
      // Clipboard unavailable — the link is visible for manual copy.
    }
  }

  const handleRemove = async (seatId: string) => {
    setRemovingId(seatId)
    setRemoveError('')
    try {
      await teamAPI.removeSeat(seatId)
      await load()
    } catch (err) {
      // Surface inline — do NOT use the page-level `error` (that gate would
      // blank the whole roster/usage/invite view on a transient failure).
      setRemoveError(err instanceof Error ? err.message : t('employer:team.removeFailed'))
    } finally {
      setRemovingId(null)
    }
  }

  const seatsFull = team ? team.seatsFree <= 0 : false

  return (
    <div className="min-h-screen bg-[#f7fbfd] flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[119px] h-[65px] sm:h-[75px] flex items-center justify-between">
          <Link href="/employer" className="flex items-center">
            <div className="relative w-[100px] sm:w-[120px] lg:w-[142px] h-[28px] sm:h-[33px] lg:h-[39px]">
              <Image src="/assets/logo.png" alt={t('employer:team.logoAlt')} fill className="object-contain" priority />
            </div>
          </Link>
          <UserDropdown />
        </div>
      </header>

      <main className="flex-1 py-8 sm:py-10">
        <div className="max-w-[800px] mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/employer" className="inline-flex items-center gap-2 text-black hover:text-primary-50 transition-colors mb-6">
            <ChevronLeft className="w-5 h-5" />
            <span>{t('employer:team.back')}</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-black mb-1">{t('employer:team.title')}</h1>
          <p className="text-[#717182] mb-6">{t('employer:team.subtitle')}</p>

          {loading && (
            <div className="flex items-center gap-2 py-10 text-[#717182]">
              <Loader2 className="w-5 h-5 animate-spin text-primary-50" />
              <span className="text-sm">{t('employer:team.loading')}</span>
            </div>
          )}

          {!loading && error && (
            <div className="flex items-center gap-3 py-4 text-sm">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <span className="text-red-600">{error}</span>
              <button type="button" onClick={() => void load()} className="text-primary-50 underline hover:no-underline">
                {t('buttons.retry')}
              </button>
            </div>
          )}

          {!loading && !error && team && (
            <div className="space-y-6">
              {/* Seat usage */}
              <div className="bg-white border border-[#dddddd] rounded-[12px] p-5 flex items-center gap-4">
                <div className="w-11 h-11 rounded-lg bg-[#e3f5ff] flex items-center justify-center text-[#236987] flex-shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-black">
                    {t('employer:team.usage', { used: team.seatsUsed, total: team.seatsTotal })}
                  </p>
                  <p className="text-sm text-[#717182]">{t('employer:team.freeSeats', { count: team.seatsFree })}</p>
                </div>
              </div>

              {/* Roster */}
              <div className="bg-white border border-[#dddddd] rounded-[12px] p-5">
                <h2 className="text-lg font-semibold text-black mb-4">{t('employer:team.roster')}</h2>
                <ul className="divide-y divide-[#eee]">
                  <li className="flex items-center gap-3 py-3">
                    <div className="w-9 h-9 rounded-full bg-[#a9e5ff] flex items-center justify-center text-[#236987] text-sm font-semibold flex-shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-black truncate">{team.owner.email}</p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-primary-50/10 text-primary-50 text-xs font-medium">
                      {t('employer:team.owner')}
                    </span>
                  </li>
                  {team.seats.map((seat) => (
                    <li key={seat.id} className="flex items-center gap-3 py-3">
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-sm font-semibold flex-shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-black truncate">{seat.email}</p>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          seat.status === 'ACCEPTED' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {seat.status === 'ACCEPTED' ? t('employer:team.statusActive') : t('employer:team.statusPending')}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemove(seat.id)}
                        disabled={removingId === seat.id}
                        aria-label={t('employer:team.remove')}
                        className="p-1.5 text-gray-400 hover:text-red-600 disabled:opacity-40"
                      >
                        {removingId === seat.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </li>
                  ))}
                </ul>
                {removeError && (
                  <div className="flex items-start gap-2 text-red-600 text-sm mt-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{removeError}</span>
                  </div>
                )}
              </div>

              {/* Invite */}
              <div className="bg-white border border-[#dddddd] rounded-[12px] p-5">
                <h2 className="text-lg font-semibold text-black mb-4">{t('employer:team.inviteTitle')}</h2>

                {seatsFull ? (
                  <div className="text-sm text-[#717182]">
                    <p className="mb-3">{t('employer:team.inviteFull')}</p>
                    <Link href="/employer/plans" className="inline-flex px-5 py-2.5 bg-primary-50 text-white rounded-lg text-sm hover:bg-primary-60 transition-colors">
                      {t('employer:team.viewPlans')}
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                          placeholder={t('employer:team.emailPlaceholder')}
                          className="w-full h-11 pl-10 pr-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-50"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleInvite}
                        disabled={inviting || !email.trim()}
                        className="h-11 px-5 bg-primary-50 text-white rounded-lg text-sm font-medium hover:bg-primary-60 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
                      >
                        {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                        {t('employer:team.sendInvite')}
                      </button>
                    </div>

                    {inviteError && (
                      <div className="flex items-start gap-2 text-red-600 text-sm mt-3">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{inviteError}</span>
                      </div>
                    )}
                  </>
                )}

                {/* One-shot invite link — shown after ANY successful invite, even
                    if it consumed the last seat (seatsFull would then hide the form
                    above, but the owner must still be able to copy this token). */}
                {lastInvite && (
                  <div className="mt-4 p-4 bg-[#f5fcff] border border-[#cceeff] rounded-lg">
                    <p className="text-sm text-black mb-2">
                      {t('employer:team.inviteCreated', { email: lastInvite.email })}
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 min-w-0 truncate text-xs bg-white border border-[#dddddd] rounded px-2 py-1.5 text-[#444]">
                        {inviteLink}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-primary-50 text-primary-50 rounded-lg text-xs hover:bg-primary-50/5 transition-colors whitespace-nowrap"
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? t('employer:team.copied') : t('employer:team.copyLink')}
                      </button>
                    </div>
                    <p className="text-xs text-[#717182] mt-2">
                      {t('employer:team.expires', { date: formatShortDate(lastInvite.expiresAt) })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default function TeamPage() {
  return (
    <ProtectedRoute requiredRole="employer">
      <TeamContent />
    </ProtectedRoute>
  )
}
