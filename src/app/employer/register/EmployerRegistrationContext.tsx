'use client'

// In-memory state holder for the multi-step employer registration flow.
// Same rationale as the seeker flow (SeekerRegistrationContext): the BE only
// mints a JWT after register → set-password → email-verify → login, so the
// password must survive across steps — but it must never be persisted to
// localStorage (PJP-81 AC / audit §2.4). State lives in React context mounted
// by src/app/employer/register/layout.tsx; a hard refresh restarts the flow.

import { createContext, useContext, useState, ReactNode } from 'react'
import type { CompanySize } from '@/lib/api'

export type EmployerType = 'individual' | 'corporate' | ''

export interface EmployerRegistrationState {
  companyType: EmployerType
  phoneNumber: string // E.164
  phoneVerified: boolean
  // Account (both types)
  email: string
  password: string // in-memory ONLY
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
  // BE echoes the email OTP in non-production for dev/QA convenience.
  devEmailOtp?: string
}

const defaultState: EmployerRegistrationState = {
  companyType: '',
  phoneNumber: '',
  phoneVerified: false,
  email: '',
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

interface EmployerRegistrationContextValue {
  data: EmployerRegistrationState
  update: (patch: Partial<EmployerRegistrationState>) => void
  reset: () => void
}

const EmployerRegistrationContext =
  createContext<EmployerRegistrationContextValue | null>(null)

export function EmployerRegistrationProvider({
  children,
}: {
  children: ReactNode
}) {
  const [data, setData] = useState<EmployerRegistrationState>(defaultState)
  const update = (patch: Partial<EmployerRegistrationState>) =>
    setData((prev) => ({ ...prev, ...patch }))
  const reset = () => setData(defaultState)
  return (
    <EmployerRegistrationContext.Provider value={{ data, update, reset }}>
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
