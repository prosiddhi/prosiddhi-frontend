'use client'

// Team seat management, reconciled 2026-07-12 with the rebuilt BE seat contract
// (MONETIZATION.md §6.2/§6.3). A seat is a real org membership now, so the roster
// renders two DISTINCT populations:
//
//   members[] — people who hold a seat (incl. the OWNER). ACTIVE | SUSPENDED.
//               Removing one is DELETE /me/team/:membershipId.
//   invites[] — outstanding PENDING invitations, nobody behind them yet. They
//               still consume a seat. Cancelling one is DELETE
//               /me/team/invites/:inviteId — a DIFFERENT id and a DIFFERENT
//               endpoint. Crossing the two 404s.
//
// SUSPENDED is a real, expected state: when a plan lapses and the seat cap drops,
// the BE auto-suspends over-cap members (newest first, owner protected). We show
// it rather than silently rendering them as active.
//
// The BE returns a one-shot raw token per invite (no SMTP in v1), so we surface a
// copyable link to /invite/<token> — the public landing page — that the owner relays.

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { formatShortDate } from '@/lib/jobFormat'
import { inviteErrorKey } from '@/lib/inviteErrors'
import { invitePath } from '@/lib/inviteToken'
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
  PauseCircle,
} from 'lucide-react'
import { EmployerHeader } from '@/components/employer/EmployerHeader'


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
  // One id at a time — a membership id when removing a teammate, an invite id
  // when revoking an invitation. They never collide (different id spaces).
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
  //
  // It points at the PUBLIC /invite/<token> landing page, not the old protected
  // accept screen: the invitee usually has no account yet, and the old route
  // bounced them to /login and dropped the token on the floor.
  const inviteLink = lastInvite
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}${invitePath(lastInvite.token)}`
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
      // Localized via the shared invite error map — the BE's messages are English
      // only, and an owner running the app in Hindi should not be told "That email
      // is registered as a job seeker" in English.
      setInviteError(t(inviteErrorKey(err)))
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

  /** Remove an ACCEPTED teammate. Takes a MEMBERSHIP id — never an invite id. */
  const handleRemoveMember = async (membershipId: string) => {
    setRemovingId(membershipId)
    setRemoveError('')
    try {
      await teamAPI.removeMember(membershipId)
      await load()
    } catch (err) {
      // Surface inline — do NOT use the page-level `error` (that gate would
      // blank the whole roster/usage/invite view on a transient failure).
      setRemoveError(t(inviteErrorKey(err)))
    } finally {
      setRemovingId(null)
    }
  }

  /** Cancel a PENDING invitation. Takes an INVITE id — never a membership id. */
  const handleRevokeInvite = async (inviteId: string) => {
    setRemovingId(inviteId)
    setRemoveError('')
    try {
      await teamAPI.revokeInvite(inviteId)
      // The revoked token is dead — stop offering its link for copying.
      if (lastInvite?.inviteId === inviteId) setLastInvite(null)
      await load()
    } catch (err) {
      setRemoveError(t(inviteErrorKey(err)))
    } finally {
      setRemovingId(null)
    }
  }

  const seatsFull = team ? team.seatsFree <= 0 : false
  const isOwner = team?.me.role === 'OWNER'
  const seatSuspended = team?.me.seatStatus === 'SUSPENDED'
  // The owner is inside members[] (role OWNER). REMOVED rows are history, not roster.
  const roster = team ? team.members.filter((m) => m.status !== 'REMOVED') : []

  return (
    <div className="min-h-screen bg-[#f7fbfd] flex flex-col">
      <EmployerHeader />

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
              {/* Your own seat is over the cap — a plan lapsed and the BE suspended
                  the newest seats. Read still works; posting and unlocking 402. */}
              {seatSuspended && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-[12px]">
                  <PauseCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-900">{t('employer:team.suspendedBannerTitle')}</p>
                    <p className="text-amber-800">{t('employer:team.suspendedBannerBody')}</p>
                  </div>
                </div>
              )}

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

              {/* Roster — everyone who HOLDS a seat, owner included. */}
              <div className="bg-white border border-[#dddddd] rounded-[12px] p-5">
                <h2 className="text-lg font-semibold text-black mb-4">{t('employer:team.roster')}</h2>
                <ul className="divide-y divide-[#eee]">
                  {roster.map((member) => {
                    const isOwnerRow = member.role === 'OWNER'
                    const isSuspended = member.status === 'SUSPENDED'
                    return (
                      <li key={member.id} className="flex items-center gap-3 py-3">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                            isOwnerRow ? 'bg-[#a9e5ff] text-[#236987]' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          <Users className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          {member.name && (
                            <p className="text-sm font-medium text-black truncate">{member.name}</p>
                          )}
                          <p className={`truncate ${member.name ? 'text-xs text-[#717182]' : 'text-sm font-medium text-black'}`}>
                            {member.email}
                          </p>
                        </div>

                        {isOwnerRow ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-primary-50/10 text-primary-50 text-xs font-medium whitespace-nowrap">
                            {t('employer:team.owner')}
                          </span>
                        ) : (
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                              isSuspended ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
                            }`}
                            title={isSuspended ? t('employer:team.statusSuspendedHint') : undefined}
                          >
                            {isSuspended ? t('employer:team.statusSuspended') : t('employer:team.statusActive')}
                          </span>
                        )}

                        {/* The owner cannot be removed (the BE refuses too), and
                            only the owner may remove anyone. */}
                        {isOwner && !isOwnerRow && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(member.id)}
                            disabled={removingId === member.id}
                            aria-label={t('employer:team.removeMemberAria', { email: member.email })}
                            className="p-1.5 text-gray-400 hover:text-red-600 disabled:opacity-40"
                          >
                            {removingId === member.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>

                {/* Pending invites — a separate population. Nobody is behind these
                    yet, but they hold a seat until accepted, revoked or expired. */}
                {team.invites.length > 0 && (
                  <>
                    <h3 className="text-sm font-semibold text-black mt-6 mb-2">
                      {t('employer:team.pendingInvitesTitle')}
                    </h3>
                    <ul className="divide-y divide-[#eee]">
                      {team.invites.map((invite) => (
                        <li key={invite.id} className="flex items-center gap-3 py-3">
                          <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center text-amber-700 flex-shrink-0">
                            <Mail className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-black truncate">{invite.email}</p>
                            <p className="text-xs text-[#717182]">
                              {t('employer:team.expires', { date: formatShortDate(invite.expiresAt) })}
                            </p>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium whitespace-nowrap">
                            {t('employer:team.statusPending')}
                          </span>
                          {isOwner && (
                            <button
                              type="button"
                              onClick={() => handleRevokeInvite(invite.id)}
                              disabled={removingId === invite.id}
                              aria-label={t('employer:team.revokeInviteAria', { email: invite.email })}
                              className="p-1.5 text-gray-400 hover:text-red-600 disabled:opacity-40"
                            >
                              {removingId === invite.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {removeError && (
                  <div className="flex items-start gap-2 text-red-600 text-sm mt-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /><span>{removeError}</span>
                  </div>
                )}
              </div>

              {/* Invite — owner only. A MEMBER can read the roster but not change it
                  (the BE gates every mutation on requireOwner), so don't show them a
                  form that can only 403. */}
              {!isOwner ? (
                <div className="bg-white border border-[#dddddd] rounded-[12px] p-5">
                  <h2 className="text-lg font-semibold text-black mb-2">{t('employer:team.inviteTitle')}</h2>
                  <p className="text-sm text-[#717182]">{t('employer:team.memberViewNote')}</p>
                </div>
              ) : (
              <div className="bg-white border border-[#dddddd] rounded-[12px] p-5">
                <h2 className="text-lg font-semibold text-black mb-4">{t('employer:team.inviteTitle')}</h2>

                {seatsFull ? (
                  <div className="text-sm text-[#717182]">
                    <p className="mb-3">{t('employer:team.inviteFull')}</p>
                    <Link href="/employer/plans" className="inline-flex px-5 py-2.5 bg-primary-50 text-primary-100 rounded-lg text-sm hover:bg-primary-60 transition-colors">
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
                        className="h-11 px-5 bg-primary-50 text-primary-100 rounded-lg text-sm font-medium hover:bg-primary-60 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
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
              )}
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
