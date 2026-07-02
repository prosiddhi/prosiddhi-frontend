'use client'

// In-memory state holder for the multi-step seeker registration flow.
//
// Q-FE-01 (2026-06-13) — registration state lives in React context (mounted by
// src/app/register/layout.tsx), NOT localStorage. This is deliberate: the BE
// flow can only mint a JWT after register → set-password → email-verify → login,
// so the password must survive across steps — but PJP-81's acceptance criteria
// forbid persisting any plaintext password to localStorage (audit §2.4). Keeping
// the whole flow in memory satisfies that. Trade-off: a hard refresh mid-flow
// resets it (each step guards on prerequisites and redirects to the start).

import { createContext, useContext, useState, ReactNode } from 'react'
import type { SeekerWorkExperience } from '@/lib/api'

export interface SeekerRegistrationState {
  language: string
  phoneNumber: string // E.164, e.g. +9198xxxxxxxx
  phoneVerified: boolean
  fullName: string
  email: string
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
  // BE echoes the email OTP in non-production for dev/QA convenience.
  devEmailOtp?: string
}

const defaultState: SeekerRegistrationState = {
  language: 'en',
  phoneNumber: '',
  phoneVerified: false,
  fullName: '',
  email: '',
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
