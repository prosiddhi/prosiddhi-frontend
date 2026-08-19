'use client'

// State holder for the multi-step seeker registration flow.
//
// Q-FE-01 (2026-06-13) — the PASSWORD lives in React context (mounted by
// src/app/register/layout.tsx) and NOWHERE else. PJP-81's acceptance criteria
// forbid persisting a plaintext password to any web storage (audit §2.4), and
// that constraint is the reason this context exists at all.
//
// Everything else is non-secret progress and MAY be persisted, which is what
// makes a mid-flow refresh survivable (see the sessionStorage layer below).
// Both contact verifications now live on the SERVER — the client only records
// that they happened — so restoring progress cannot forge a verification.

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { SeekerWorkExperience } from '@/lib/api'

const STORAGE_KEY = 'prosiddhi.register.seeker'

export interface SeekerRegistrationState {
  language: string
  phoneNumber: string // E.164, e.g. +9198xxxxxxxx
  phoneVerified: boolean
  fullName: string
  /**
   * OPTIONAL. Empty string means "this seeker has no email" — a real and
   * common case (PRODUCT.md §2), not a missing value. It is never sent as '' to
   * the register call; the key is omitted entirely.
   */
  email: string
  /**
   * Whether `email` has been verified under purpose REGISTRATION. The mark
   * lives on the SERVER and does not expire, so this is just a local record of
   * "we already did that" — it stops the flow re-sending a code when the user
   * walks back and forward through the form. Reset it whenever `email` changes.
   */
  emailVerified: boolean
  // BR-1. Collected as required on the profile step and sent with register.
  // dateOfBirth is YYYY-MM-DD; gender is the BE Gender enum (MALE/FEMALE/OTHER).
  // The BE enforces age >= 18 on dateOfBirth — it is the only minimum-age check
  // in the product, so it must actually be sent.
  dateOfBirth: string
  gender: string
  // BR-3 — 3-level taxonomy (Category → Sector → JobTitle). preferredCategory is
  // optional on the BE register schema but collected here so the full valid path
  // is sent (validateTriple checks parent-child consistency).
  preferredCategory: string
  preferredSector: string
  preferredJobTitle: string
  workExperiences: SeekerWorkExperience[]
  profilePic?: File
  document?: File
  documentName: string
  // In-memory ONLY — never written to storage.
  password: string
  // BE echoes the OTPs in non-production for dev/QA convenience. Without these,
  // QA cannot complete registration at all: there is no SMS/email sender wired.
  devEmailOtp?: string
  devPhoneOtp?: string
}

const defaultState: SeekerRegistrationState = {
  language: 'en',
  phoneNumber: '',
  phoneVerified: false,
  fullName: '',
  email: '',
  emailVerified: false,
  dateOfBirth: '',
  gender: '',
  preferredCategory: '',
  preferredSector: '',
  preferredJobTitle: '',
  workExperiences: [],
  documentName: '',
  password: '',
}

/**
 * What is safe to write to sessionStorage — an ALLOWLIST, deliberately.
 *
 * A denylist would silently start persisting any field added later, which is
 * how a secret ends up in storage by accident. Three things are kept out:
 *
 *  - `password` — NEVER persisted, anywhere, under any condition. This is the
 *    whole reason the context exists (PJP-81 AC / audit §2.4).
 *  - `profilePic` / `document` — File handles; they do not survive JSON, and a
 *    half-restored File is worse than none.
 *  - `devPhoneOtp` / `devEmailOtp` — live one-time codes. Dev-only, but writing
 *    a credential to storage to save a click is not a trade worth making; the
 *    resend button covers it.
 *
 * Everything left is non-secret progress. Both verifications live on the SERVER
 * — these flags only record that they happened — so restoring them cannot forge
 * a verification: the register call re-checks with the backend regardless.
 */
const PERSISTED_KEYS = [
  'language',
  'phoneNumber',
  'phoneVerified',
  'fullName',
  'email',
  'emailVerified',
  'dateOfBirth',
  'gender',
  'preferredCategory',
  'preferredSector',
  'preferredJobTitle',
  'workExperiences',
  'documentName',
] as const satisfies readonly (keyof SeekerRegistrationState)[]

type PersistedState = Pick<
  SeekerRegistrationState,
  (typeof PERSISTED_KEYS)[number]
>

function toPersisted(data: SeekerRegistrationState): PersistedState {
  return PERSISTED_KEYS.reduce((acc, key) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(acc as any)[key] = data[key]
    return acc
  }, {} as PersistedState)
}

/**
 * What a reset flow serialises to. Compared against on every persist so an
 * emptied flow drops its storage key instead of leaving a blank object behind.
 * Computed once — `toPersisted` walks a fixed key list, so this never changes.
 */
const EMPTY_PERSISTED = JSON.stringify(toPersisted(defaultState))

interface SeekerRegistrationContextValue {
  data: SeekerRegistrationState
  update: (patch: Partial<SeekerRegistrationState>) => void
  reset: () => void
  /**
   * False until the sessionStorage read has happened.
   *
   * Every step guard MUST wait for this. They run on mount, and before
   * hydration the state is still the empty default — so a guard that checks
   * immediately bounces a refreshing user back to the start. That was defect 8
   * ("the last step asks for my mobile number again"), and persistence alone
   * does not fix it.
   */
  hydrated: boolean
}

const SeekerRegistrationContext =
  createContext<SeekerRegistrationContextValue | null>(null)

export function SeekerRegistrationProvider({
  children,
}: {
  children: ReactNode
}) {
  const [data, setData] = useState<SeekerRegistrationState>(defaultState)
  // Starts false on the server AND on the first client render, so the markup
  // matches and React does not report a hydration mismatch.
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as Partial<PersistedState>
        setData((prev) => ({ ...prev, ...saved }))
      }
    } catch {
      // Corrupt JSON or storage disabled — start clean rather than trap the
      // user on a screen that cannot restore.
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      const serialised = JSON.stringify(toPersisted(data))
      // Clearing has to happen HERE, not in reset(). reset() called
      // removeItem, but changing `data` re-runs this effect on the very next
      // render, which wrote the blank default straight back under the same key
      // — so the key survived every "reset" with an empty object in it.
      if (serialised === EMPTY_PERSISTED) window.sessionStorage.removeItem(STORAGE_KEY)
      else window.sessionStorage.setItem(STORAGE_KEY, serialised)
    } catch {
      // Private mode / quota. The flow still works in-memory for this tab.
    }
  }, [data, hydrated])

  const update = (patch: Partial<SeekerRegistrationState>) =>
    setData((prev) => ({ ...prev, ...patch }))

  // Both clears are deliberate. The persist effect above is what makes the
  // removal stick (it used to write the blank default straight back), but it
  // runs on the NEXT render — and the provider can unmount in the same
  // navigation that follows a reset. If the effect never runs, a key holding
  // phoneVerified: true survives, and the next registration in that tab would
  // skip OTP send on an already-consumed mark. The synchronous call costs
  // nothing and closes that window.
  const reset = () => {
    setData(defaultState)
    try {
      window.sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      // Private mode — the in-memory reset above is what matters.
    }
  }

  return (
    <SeekerRegistrationContext.Provider value={{ data, update, reset, hydrated }}>
      {children}
    </SeekerRegistrationContext.Provider>
  )
}

export function useSeekerRegistration() {
  const ctx = useContext(SeekerRegistrationContext)
  if (!ctx) {
    throw new Error(
      'useSeekerRegistration must be used within SeekerRegistrationProvider'
    )
  }
  return ctx
}
