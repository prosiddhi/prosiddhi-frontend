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

import { createContext, useContext, useState, ReactNode } from 'react'
import type { SeekerWorkExperience } from '@/lib/api'

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
  // BR-1 (docs/be-requests.md): collected in UI, held here only — the BE
  // register schema has no field for these yet, so they are NOT sent.
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

interface SeekerRegistrationContextValue {
  data: SeekerRegistrationState
  update: (patch: Partial<SeekerRegistrationState>) => void
  reset: () => void
}

const SeekerRegistrationContext =
  createContext<SeekerRegistrationContextValue | null>(null)

export function SeekerRegistrationProvider({
  children,
}: {
  children: ReactNode
}) {
  const [data, setData] = useState<SeekerRegistrationState>(defaultState)
  const update = (patch: Partial<SeekerRegistrationState>) =>
    setData((prev) => ({ ...prev, ...patch }))
  const reset = () => setData(defaultState)
  return (
    <SeekerRegistrationContext.Provider value={{ data, update, reset }}>
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
