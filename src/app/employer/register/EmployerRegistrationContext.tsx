'use client'

// State holder for the multi-step employer registration flow.
//
// Same rationale as SeekerRegistrationContext: the PASSWORD lives here and
// nowhere else. PJP-81's acceptance criteria forbid persisting a plaintext
// password to any web storage (audit §2.4), and that constraint is the reason
// this context exists. Everything else is non-secret progress and may be
// persisted so a mid-flow refresh does not restart the flow.
//
// Both contact verifications live on the SERVER now — the flags below only
// record that they happened, so restoring them cannot forge a verification.

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import type { CompanySize } from '@/lib/api'

const STORAGE_KEY = 'prosiddhi.register.employer'

export type EmployerType = 'individual' | 'corporate' | ''

export interface EmployerRegistrationState {
  companyType: EmployerType
  // Contacts — BOTH are mandatory for an employer and BOTH must be verified
  // before the register call, which consumes the marks.
  phoneNumber: string // E.164
  phoneVerified: boolean
  email: string
  emailVerified: boolean
  // In-memory ONLY — never written to storage.
  password: string
  // Individual only
  fullName: string
  designation: string
  // Corporate only
  companyName: string
  companyEmail: string
  companyAddress: string
  companyFoundedDate: string
  companySize: CompanySize | ''
  gstNumber: string
  registrationNumber: string
  // BE echoes the OTPs in non-production only. Absent in production — never
  // make a flow depend on them.
  devPhoneOtp?: string
  devEmailOtp?: string
}

const defaultState: EmployerRegistrationState = {
  companyType: '',
  phoneNumber: '',
  phoneVerified: false,
  email: '',
  emailVerified: false,
  password: '',
  fullName: '',
  designation: '',
  companyName: '',
  companyEmail: '',
  companyAddress: '',
  companyFoundedDate: '',
  companySize: '',
  gstNumber: '',
  registrationNumber: '',
}

/**
 * Safe to persist — an ALLOWLIST, so a field added later cannot leak into
 * storage by default. `password` is excluded permanently; the dev OTP echoes
 * are excluded because they are live one-time codes.
 *
 * The verified flags are safe to restore: the marks live on the SERVER and the
 * register call re-checks them, so a restored flag cannot forge anything.
 */
const PERSISTED_KEYS = [
  'companyType',
  'phoneNumber',
  'phoneVerified',
  'email',
  'emailVerified',
  'fullName',
  'designation',
  'companyName',
  'companyEmail',
  'companyAddress',
  'companyFoundedDate',
  'companySize',
  'gstNumber',
  'registrationNumber',
] as const satisfies readonly (keyof EmployerRegistrationState)[]

type PersistedState = Pick<
  EmployerRegistrationState,
  (typeof PERSISTED_KEYS)[number]
>

function toPersisted(data: EmployerRegistrationState): PersistedState {
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

interface EmployerRegistrationContextValue {
  data: EmployerRegistrationState
  update: (patch: Partial<EmployerRegistrationState>) => void
  reset: () => void
  /**
   * False until sessionStorage has been read. Step guards MUST wait for it —
   * they run on mount, when the state is still the empty default, and would
   * otherwise bounce a refreshing user back to the start (defect 8).
   */
  hydrated: boolean
}

const EmployerRegistrationContext =
  createContext<EmployerRegistrationContextValue | null>(null)

export function EmployerRegistrationProvider({
  children,
}: {
  children: ReactNode
}) {
  const [data, setData] = useState<EmployerRegistrationState>(defaultState)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as Partial<PersistedState>
        setData((prev) => ({ ...prev, ...saved }))
      }
    } catch {
      // Corrupt JSON or storage disabled — start clean.
    }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      const serialised = JSON.stringify(toPersisted(data))
      // Clearing has to happen HERE, not in reset(). reset() calls
      // removeItem, but changing `data` re-runs this effect on the very next
      // render, which wrote the blank default straight back under the same key
      // — so the key survived every "reset" with an empty object in it.
      if (serialised === EMPTY_PERSISTED) window.sessionStorage.removeItem(STORAGE_KEY)
      else window.sessionStorage.setItem(STORAGE_KEY, serialised)
    } catch {
      // Private mode / quota — in-memory still works for this tab.
    }
  }, [data, hydrated])

  const update = (patch: Partial<EmployerRegistrationState>) =>
    setData((prev) => ({ ...prev, ...patch }))

  // Both clears are deliberate. The persist effect above is what makes the
  // removal stick (it used to write the blank default straight back), but it
  // runs on the NEXT render — and the individual path pushes to /employer,
  // outside the register layout, so the provider can unmount in that same
  // navigation. If the effect never runs, a key holding phoneVerified /
  // emailVerified: true survives, and the next registration in that tab would
  // skip OTP send on already-consumed marks. The synchronous call costs
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
    <EmployerRegistrationContext.Provider value={{ data, update, reset, hydrated }}>
      {children}
    </EmployerRegistrationContext.Provider>
  )
}

export function useEmployerRegistration() {
  const ctx = useContext(EmployerRegistrationContext)
  if (!ctx) {
    throw new Error(
      'useEmployerRegistration must be used within EmployerRegistrationProvider'
    )
  }
  return ctx
}
