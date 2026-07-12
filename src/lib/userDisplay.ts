// Display identity for the signed-in user, derived from the auth session.
//
// The BE nests the role profile inside the login payload (`user.jobSeeker ||
// user.employer`), so the name lives at `user.profile`, not on `user` itself:
//   - JOB_SEEKER          → profile.fullName (required in the DB)
//   - EMPLOYER_BUSINESS   → profile.companyName (the trading identity), else fullName
//   - EMPLOYER_INDIVIDUAL → profile.fullName (a person hiring a maid), else companyName
//
// Both employer name fields are nullable, so every path degrades to the email
// local-part rather than to a placeholder. There is no hardcoded fallback name.

import type { AuthUser } from './api'

export function displayName(user?: AuthUser | null): string {
  if (!user) return ''

  const profile = user.profile
  const fullName = profile?.fullName?.trim() || ''
  const companyName = profile?.companyName?.trim() || ''

  const preferred =
    user.role === 'EMPLOYER_BUSINESS'
      ? companyName || fullName
      : fullName || companyName

  if (preferred) return preferred

  // Last resort — never show a fake name. The email local-part is at least
  // genuinely the user's own.
  return user.email?.split('@')[0] || ''
}

/** The stored profile photo path, if any. Callers resolve it via `resolveMediaUrl`. */
export function profilePhoto(user?: AuthUser | null): string {
  return user?.profile?.profilePhoto?.trim() || ''
}
