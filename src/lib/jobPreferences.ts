import { ApiError, type AuthUser, type SeekerProfile } from '@/lib/api'
import { JOB_PREFERENCES_ROUTE } from '@/lib/routes'

// A seeker with no home city, sector or job title. The BE sends the flag beside `user` in a
// login reply, so it has to be copied onto the stored user or it is lost the moment login()
// runs. Pure on purpose — scripts/verify-job-preferences.mjs runs this file as it is.
//
// OPEN BACKEND QUESTIONS (prosiddhi-backend @ 0faacd3; unresolved, nobody asked yet):
//  1. The BE flag is true when cityId, preferredSector or preferredJobTitle is missing. It does
//     NOT look at preferredCategory, though register now requires one. Is that intended? This
//     portal always sends all three names, so it is not affected either way.
//  2. PUT /jobseekers/profile does not run validateTriple on category/sector/jobTitle (the
//     comment on the schema says it does). Any strings clear the flag. The portal sends only
//     names picked from GET /categories, which form a valid path, but the BE would not catch a
//     bad one.

/**
 * The user to hand to login(): the reply's `user`, plus its `needsJobPreferences` when the
 * reply carries one (an older BE, and the register reply, do not).
 */
export function sessionUserFrom(result: { user: AuthUser; needsJobPreferences?: boolean }): AuthUser {
  return typeof result.needsJobPreferences === 'boolean'
    ? { ...result.user, needsJobPreferences: result.needsJobPreferences }
    : result.user
}

/**
 * What a fresh GET /jobseekers/profile adds to the stored session user, for updateUser().
 *
 * Merges and never replaces: only the flag, the account status, and the name and photo the
 * header shows, are read, and a field the reply leaves out is left as it was. The flag is written only when
 * the reply carries a real boolean, so a reply without one (an older BE) never turns a
 * stored `true` into "no". A FAILED request has no reply and so never gets here.
 */
export function seekerSessionPatch(current: AuthUser, profile: SeekerProfile): Partial<AuthUser> {
  const patch: Partial<AuthUser> = {}
  if (typeof profile.needsJobPreferences === 'boolean') {
    patch.needsJobPreferences = profile.needsJobPreferences
  }
  // The server's account status wins over the stored one. The stored one is only ever written
  // by this browser's own phone bind, so a bind finished on another device would leave it at
  // PENDING_OTP_VERIFICATION for good, and the gate (which stands down for that status) with it.
  if (typeof profile.accountStatus === 'string' && profile.accountStatus !== '') {
    patch.accountStatus = profile.accountStatus
  }
  const seeker = profile.jobSeeker
  if (seeker && (seeker.fullName !== undefined || seeker.profilePhoto !== undefined)) {
    patch.profile = {
      ...current.profile,
      ...(seeker.fullName !== undefined && { fullName: seeker.fullName }),
      ...(seeker.profilePhoto !== undefined && { profilePhoto: seeker.profilePhoto }),
    }
  }
  return patch
}

/**
 * Where the re-read of a seeker's profile stands (AuthContext `profileSync`).
 * - 'loading': a seeker whose flag has not been confirmed yet this page load.
 * - 'ready': confirmed, by this load's login or by GET /jobseekers/profile.
 * - 'failed': the read failed. The stored flag is untouched, and a failure is NOT "no".
 * - 'idle': nothing to confirm: still hydrating, signed out, an employer, or a forced
 *   password change pending (the BE would refuse the read; it runs once that is done).
 */
export type ProfileSync = 'idle' | 'loading' | 'ready' | 'failed'

/** Whose profile read has settled this page load, and how. null = nobody's has. */
export type ProfileSyncRecord = { id: string; status: 'ready' | 'failed' } | null

export function profileSyncStatus(args: {
  isLoading: boolean
  hasToken: boolean
  user: AuthUser | null
  sync: ProfileSyncRecord
}): ProfileSync {
  const { isLoading, hasToken, user, sync } = args
  if (isLoading || !hasToken || !user || user.role !== 'JOB_SEEKER' || user.mustChangePassword) return 'idle'
  // A record for someone else (signed out, another account signed in) says nothing about this user.
  return sync?.id === user.id ? sync.status : 'loading'
}

/**
 * How a profile read that SUCCEEDED settles: 'ready' only when the reply carries the flag as a
 * real boolean. The contract says it always does, so a reply without one (an older BE, a broken
 * deploy) has not confirmed anything, and is 'failed'. Never read as "no".
 */
export function profileReadOutcome(
  profile: Pick<SeekerProfile, 'needsJobPreferences'> | null | undefined
): 'ready' | 'failed' {
  // `?.`: the API client resolves a 204, or a body that is `null`, to undefined/null. No profile
  // at all is an unusable read, like one without the flag, and must not throw.
  return typeof profile?.needsJobPreferences === 'boolean' ? 'ready' : 'failed'
}

/**
 * What a login leaves in the record. A login reply carries the flag, so it is as fresh as a
 * profile read; one without it (the register reply, an older BE) is confirmed by the read.
 */
export function syncAfterLogin(user: AuthUser): ProfileSyncRecord {
  return typeof user.needsJobPreferences === 'boolean' ? { id: user.id, status: 'ready' } : null
}

/**
 * The seeker-only areas the job-preferences gate guards. A list of what is guarded rather than
 * of what is exempt, so a public page (landing, terms, help, delete-account), /login, /register,
 * /change-password and /settings keep working for someone who has not finished: they can always
 * read the legal pages, sign out or delete the account.
 *
 * Every entry must be a page behind ProtectedRoute. /employee is NOT one: it is the public
 * landing and job-search page (PUBLIC_JOBS_PATH, the category tiles), open to everyone including
 * a signed-in seeker who has not finished, so it stays off this list.
 * verify-job-preferences.mjs fails if an entry has no ProtectedRoute page.
 */
export const SEEKER_GATED_PREFIXES = [
  '/home',
  '/job-feed',
  '/job-details',
  '/my-applications',
  '/my-interviews',
  '/saved-jobs',
  '/messages',
  '/profile',
] as const

export function isSeekerGatedPath(pathname: string): boolean {
  return SEEKER_GATED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

/**
 * What JobPreferencesGate does on this page.
 * - 'none': nothing: not guarded, or not this person's business (see below).
 * - 'wait': not decided yet: show a loading screen, redirect nowhere.
 * - 'redirect': go to the job-preferences page.
 * - 'phone': a seeker still in PENDING_OTP_VERIFICATION: go to /login, which resumes the phone-bind
 *   step. Phone first, then job preferences, then Home.
 * - 'recover': the flag is unknown and cannot be confirmed: a screen with Retry and Log out.
 * - 'notice': let in, because the last known answer is "nothing missing", but the read failed:
 *   a small non-blocking note with a Try again button.
 *
 * Never reads an unknown flag as "no". Ordering matters:
 * a forced password change comes first, then a pending phone verification (a seeker who has not
 * bound a phone yet is sent to do that, never to the preferences page), then the preferences.
 */
export type PreferencesGate = 'none' | 'wait' | 'redirect' | 'phone' | 'recover' | 'notice'

export function preferencesGate(args: {
  isLoading: boolean
  hasToken: boolean
  user: AuthUser | null
  profileSync: ProfileSync
  pathname: string
}): PreferencesGate {
  const { isLoading, hasToken, user, profileSync, pathname } = args
  // The preferences page is not a guarded page, but a seeker who has not verified a phone yet must
  // not use it either: phone first. Only that one rule applies there.
  const onPreferencesPage = pathname === JOB_PREFERENCES_ROUTE
  if (!onPreferencesPage && !isSeekerGatedPath(pathname)) return 'none'
  // Storage not read yet: who this is, is not known. A signed-out visitor is passed on to
  // ProtectedRoute once it is. (The preferences page has its own ProtectedRoute spinner.)
  if (isLoading) return onPreferencesPage ? 'none' : 'wait'
  if (!hasToken || !user || user.role !== 'JOB_SEEKER') return 'none'
  if (user.mustChangePassword) return 'none'
  const pendingPhone = user.accountStatus === 'PENDING_OTP_VERIFICATION'
  if (onPreferencesPage && !pendingPhone) return 'none'
  // A stored PENDING_OTP_VERIFICATION may be stale (the bind was finished on another device), and
  // only the server read can say. Waiting for it keeps that seeker from seeing a page and then
  // being sent away.
  if (profileSync === 'loading') return 'wait'
  if (pendingPhone) {
    // Still pending after the read: phone verification comes first, before anything else here.
    if (profileSync === 'ready') return 'phone'
    // The read failed, which cannot tell a stale status from a real one: ask, never guess.
    return profileSync === 'failed' ? 'recover' : 'none'
  }

  const flag = user.needsJobPreferences
  switch (profileSync) {
    case 'ready':
    case 'failed': {
      // 'ready': a boolean was confirmed. 'failed': it could not be, so the last known answer
      // decides (true keeps them blocked, false lets them in) and with none, ask the user.
      // The same rule, since a confirmed flag is just the last known answer.
      if (flag === true) return 'redirect'
      if (flag === false) return profileSync === 'failed' ? 'notice' : 'none'
      return 'recover'
    }
    default:
      return 'none'
  }
}

/**
 * How a failed job-preferences SAVE (PUT /jobseekers/profile) should be treated.
 * - 'consent': the API client has already opened the consent dialog. Not a failed save.
 * - 'definite': the server answered with an error, so this request did not save. Say so, and
 *   leave the retry to the user.
 * - 'ambiguous': the request may or may not have been applied: it timed out, never got a reply
 *   (network), or a gateway (502/503/504) answered for a server that may have finished the write.
 *   NEVER repeat the PUT for the user: read the profile back and decide from what the server holds.
 */
export type SaveFailureKind = 'consent' | 'definite' | 'ambiguous'

const GATEWAY_STATUSES: readonly number[] = [502, 503, 504]

export function saveFailureKind(err: unknown): SaveFailureKind {
  // Anything that is not an HTTP answer (a timeout, "Can't reach the server", an abort) is unknown.
  if (!(err instanceof ApiError)) return 'ambiguous'
  if (err.code === 'CONSENT_REQUIRED') return 'consent'
  return GATEWAY_STATUSES.includes(err.status) ? 'ambiguous' : 'definite'
}

/** What reading the profile back after a save found: saved, still missing, or no usable answer. */
export type ReadBack = 'saved' | 'missing' | 'unsure'

/**
 * The read-back reply, as an answer. Only a real boolean is one: a reply without the flag is
 * 'unsure' (never "saved"), the same rule as profileReadOutcome.
 */
export function readBackResult(profile: Pick<SeekerProfile, 'needsJobPreferences'> | null | undefined): ReadBack {
  // A missing profile (null or undefined: see profileReadOutcome) is 'unsure', never a throw.
  if (typeof profile?.needsJobPreferences !== 'boolean') return 'unsure'
  return profile.needsJobPreferences ? 'missing' : 'saved'
}

/**
 * The read-back as the preferences page runs it: the answer, and the session is updated (through
 * `confirm`) ONLY for a usable one. A missing profile or a missing/invalid flag is 'unsure' and
 * `confirm` is never called, so nothing is stored and the page cannot be ended by it. Only a
 * boolean `false` yields 'saved'.
 */
export function settleReadBack(
  profile: SeekerProfile | null | undefined,
  confirm: (profile: SeekerProfile) => boolean
): ReadBack {
  const result = readBackResult(profile)
  if (result === 'unsure' || !profile || !confirm(profile)) return 'unsure'
  return result
}

/**
 * What the preferences page shows after a read-back.
 * - 'saved': nothing: the page moves on by itself once the stored flag is false.
 * - 'missing': still missing. After an AMBIGUOUS save that means it did not land, so the message
 *   is "could not save" and the user decides whether to save again. After a save that succeeded
 *   it means the server wants something else.
 * - 'unsure': no usable answer: an uncertainty message and a Try again that repeats only the read
 *   ('unsure' after an ambiguous save, 'confirm' after one that did land).
 */
export function afterReadBack(
  result: ReadBack,
  putWasAmbiguous: boolean
): { recheck: 'unsure' | 'confirm' | null; errorKey: string | null } {
  if (result === 'saved') return { recheck: null, errorKey: null }
  if (result === 'missing') {
    return {
      recheck: null,
      errorKey: putWasAmbiguous ? 'auth:completeProfile.errorSave' : 'auth:completeProfile.errorStillMissing',
    }
  }
  return { recheck: putWasAmbiguous ? 'unsure' : 'confirm', errorKey: null }
}

/**
 * Whether /login should show the phone-bind step to the signed-in user (a Google sign-up that
 * left before binding a phone, or one JobPreferencesGate sent here). Seekers only: an employer in
 * the same state is left as it was. Waits for the profile read, because a stored pending status
 * can be stale (the bind was finished on another device) and the read corrects it.
 */
export function shouldResumePhoneBind(args: {
  isLoading: boolean
  profileSync: ProfileSync
  user: AuthUser | null
}): boolean {
  const { isLoading, profileSync, user } = args
  return (
    !isLoading &&
    profileSync !== 'loading' &&
    !!user &&
    user.role === 'JOB_SEEKER' &&
    user.accountStatus === 'PENDING_OTP_VERIFICATION'
  )
}
