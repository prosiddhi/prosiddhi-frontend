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

import { createContext, useContext, useState, ReactNode } from 'react'
import type { CompanySize } from '@/lib/api'

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
