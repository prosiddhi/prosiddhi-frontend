'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useState, useEffect, useRef, useCallback, ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import Image from 'next/image'
import Link from 'next/link'
import { DocumentsSection } from '@/components/profile/DocumentsSection'
import { useAuth } from '@/contexts/AuthContext'
import { verificationStatusLabel } from '@/lib/applicationStatus'
import {
  employerAPI,
  resolveMediaUrl,
  type EmployerProfile,
  type EmployerProfileUpdate,
  type CompanySize,
} from '@/lib/api'
import { Camera, Loader2, AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'
import { HeaderActions } from '@/components/navigation/HeaderActions'
import { nameProblem } from '@/lib/nameValidation'

const EMPLOYER_DOC_TYPES = [
  { value: 'GST_CERTIFICATE', label: 'GST Certificate' },
  { value: 'COMPANY_REGISTRATION', label: 'Company Registration' },
  { value: 'OTHER', label: 'Other' },
] as const

const COMPANY_SIZES: { value: CompanySize; label: string }[] = [
  { value: 'SIZE_1_10', label: '1–10 employees' },
  { value: 'SIZE_11_50', label: '11–50 employees' },
  { value: 'SIZE_51_200', label: '51–200 employees' },
  { value: 'SIZE_201_500', label: '201–500 employees' },
  { value: 'SIZE_501_1000', label: '501–1000 employees' },
  { value: 'SIZE_1000_PLUS', label: '1000+ employees' },
]

const inputCls =
  'w-full h-11 px-3 border border-[#b5b5b5] rounded-lg text-sm text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all'

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="text-sm font-medium text-black mb-1.5 block">{label}</label>
      {children}
    </div>
  )
}

// ISO datetime → yyyy-mm-dd for <input type="date">.
function toDateInput(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

const SIZE_KEYS: Record<CompanySize, string> = {
  SIZE_1_10: 'profile:employer.size_1_10',
  SIZE_11_50: 'profile:employer.size_11_50',
  SIZE_51_200: 'profile:employer.size_51_200',
  SIZE_201_500: 'profile:employer.size_201_500',
  SIZE_501_1000: 'profile:employer.size_501_1000',
  SIZE_1000_PLUS: 'profile:employer.size_1000_plus',
}

function EmployerProfileContent() {
  const { t } = useTranslation()
  const { user, updateUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)

  const [employerType, setEmployerType] = useState<string>('')
  const [verificationStatus, setVerificationStatus] = useState<string>('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)

  // Individual fields
  const [fullName, setFullName] = useState('')
  const [designation, setDesignation] = useState('')
  // Business fields
  const [companyName, setCompanyName] = useState('')
  const [companyEmail, setCompanyEmail] = useState('')
  const [companyAddress, setCompanyAddress] = useState('')
  const [companyFoundedDate, setCompanyFoundedDate] = useState('')
  const [companySize, setCompanySize] = useState<CompanySize | ''>('')
  const [gstNumber, setGstNumber] = useState('')
  const [registrationNumber, setRegistrationNumber] = useState('')

  // Original name — so the DEF-030 rule fires only on an edit, never on a legacy
  // value loaded from the server.
  const originalFullName = useRef('')
  // Original GST/CIN — to detect a change that triggers BE re-verification.
  const originalGst = useRef('')
  const originalReg = useRef('')

  const isBusiness = employerType === 'BUSINESS'

  const hydrate = useCallback((p: EmployerProfile) => {
    const e = p.employer
    setEmployerType(e?.employerType ?? '')
    setVerificationStatus(e?.verificationStatus ?? '')
    setPhoto(e?.profilePhoto ?? null)
    setFullName(e?.fullName ?? '')
    setDesignation(e?.designation ?? '')
    setCompanyName(e?.companyName ?? '')
    setCompanyEmail(e?.companyEmail ?? '')
    setCompanyAddress(e?.companyAddress ?? '')
    setCompanyFoundedDate(toDateInput(e?.companyFoundedDate))
    setCompanySize((e?.companySize as CompanySize) ?? '')
    setGstNumber(e?.gstNumber ?? '')
    setRegistrationNumber(e?.registrationNumber ?? '')
    originalFullName.current = (e?.fullName ?? '').trim()
    originalGst.current = e?.gstNumber ?? ''
    originalReg.current = e?.registrationNumber ?? ''
  }, [])

  useEffect(() => {
    let ignore = false
    const run = async () => {
      setLoading(true)
      setLoadError('')
      try {
        const p = await employerAPI.getProfile()
        if (!ignore) hydrate(p)
      } catch (err) {
        if (!ignore) setLoadError(err instanceof Error ? err.message : t('profile:employer.loadError'))
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    run()
    return () => {
      ignore = true
    }
  }, [hydrate])

  const handlePhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (photoRef.current) photoRef.current.value = ''
    if (!file) return
    setPhotoUploading(true)
    setSaveError('')
    try {
      const res = await employerAPI.updateProfilePhoto(file)
      setPhoto(res.profilePhoto)
      // Keep the header avatar in step with the new photo.
      updateUser({ profile: { ...user?.profile, profilePhoto: res.profilePhoto } })
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('profile:employer.photoError'))
    } finally {
      setPhotoUploading(false)
    }
  }

  // A GST or CIN change re-flags the employer for admin review on the BE.
  const gstCinChanged =
    isBusiness &&
    ((gstNumber.trim() && gstNumber.trim() !== originalGst.current) ||
      (registrationNumber.trim() && registrationNumber.trim() !== originalReg.current))

  const handleSave = async () => {
    // Clear BOTH banners before validating. The "Saved ✓" confirmation lingers for
    // a few seconds, so a guard that returns early without clearing it leaves the
    // green tick sitting next to the new red error — the screen says the save both
    // worked and failed. This applies to the GST guard below too, which had the
    // same shape before this rule was added.
    setSaveError('')
    setSaved(false)

    // Same name rule as registration (DEF-030). Individual employers only — a
    // business's `companyName` is a different field with different rules.
    //
    // Only checked when the user actually EDITED the name. Validating whatever
    // the server sent would lock out any account whose stored name predates this
    // rule — and such accounts exist, because the backend mirror is still an open
    // ticket, so "Test User 1" is creatable through the API today. That user would
    // be unable to save ANY change, even to an unrelated field, and the error
    // would talk about their name while they were editing something else.
    const problem =
      !isBusiness && fullName.trim() !== originalFullName.current ? nameProblem(fullName) : null
    if (problem) {
      setSaveError(t(problem === 'tooShort' ? 'auth:profile.errorName' : 'auth:profile.errorNameLetters'))
      return
    }
    // BE requires GST to be exactly 15 chars; guard before the round-trip.
    if (isBusiness && gstNumber.trim() && gstNumber.trim().length !== 15) {
      setSaveError(t('profile:employer.gstLengthError'))
      return
    }
    if (gstCinChanged) {
      const ok = window.confirm(t('profile:employer.reverifyConfirm'))
      if (!ok) return
    }
    setSaving(true)
    setSaveError('')
    setSaved(false)
    try {
      const body: EmployerProfileUpdate = isBusiness
        ? {
            companyName: companyName.trim() || undefined,
            companyEmail: companyEmail.trim() || undefined,
            companyAddress: companyAddress.trim() || undefined,
            companyFoundedDate: companyFoundedDate || undefined,
            companySize: companySize || undefined,
            gstNumber: gstNumber.trim() || undefined,
            registrationNumber: registrationNumber.trim() || undefined,
          }
        : {
            fullName: fullName.trim() || undefined,
            designation: designation.trim() || undefined,
          }
      await employerAPI.updateProfile(body)
      // PUT returns the bare record; re-fetch the wrapped profile to refresh state.
      const fresh = await employerAPI.getProfile()
      hydrate(fresh)
      // The header reads its name from the session user — push the rename there
      // too, or the old company/person name sticks until the next login.
      updateUser({
        profile: {
          ...user?.profile,
          fullName: fresh.employer?.fullName,
          companyName: fresh.employer?.companyName,
          profilePhoto: fresh.employer?.profilePhoto,
        },
      })
      setSaved(true)
      window.setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('profile:employer.saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7fbfd] flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[119px] h-[65px] sm:h-[75px] flex items-center justify-between">
          <Link href="/employer" className="flex items-center">
            <div className="relative w-[100px] sm:w-[120px] lg:w-[142px] h-[28px] sm:h-[33px] lg:h-[39px]">
              <Image src="/assets/prosiddhi-logo-horizontal.png" alt={t('app.name')} fill className="object-contain" priority />
            </div>
          </Link>
          <HeaderActions />
        </div>
      </header>

      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px] pt-4">
        <Breadcrumbs />
      </div>


      <main className="flex-1 py-8 sm:py-10 lg:py-12">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6">
          <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-bold text-black mb-6 sm:mb-8">{t('profile:employer.heading')}</h1>

          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-[#717182]">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary-50" />
              <p>{t('profile:employer.loading')}</p>
            </div>
          )}

          {!loading && loadError && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
              <p className="text-red-600 max-w-md">{loadError}</p>
            </div>
          )}

          {!loading && !loadError && (
            <div className="space-y-6">
              {/* Details */}
              <section className="bg-white border border-[#dddddd] rounded-[10px] p-5 sm:p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative w-20 h-20 rounded-full bg-[#a9e5ff] overflow-hidden flex items-center justify-center flex-shrink-0">
                    {photo ? (
                      <Image src={resolveMediaUrl(photo)} alt="" fill className="object-cover" />
                    ) : (
                      <span className="text-2xl font-semibold text-[#236987]">
                        {(companyName || fullName || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handlePhoto} className="hidden" />
                    <button
                      type="button"
                      onClick={() => photoRef.current?.click()}
                      disabled={photoUploading}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-60"
                    >
                      {photoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                      {photoUploading ? t('profile:employer.uploading') : t('profile:employer.changeLogo')}
                    </button>
                    {verificationStatus && (
                      <p className="text-xs text-[#717182] mt-1">
                        {t('profile:employer.verification')} <span className="font-medium">{verificationStatusLabel(verificationStatus)}</span>
                      </p>
                    )}
                  </div>
                </div>

                {isBusiness ? (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label={t('profile:employer.companyName')}>
                      <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder={t('profile:employer.companyNamePlaceholder')} className={inputCls} />
                    </Field>
                    <Field label={t('profile:employer.companyEmail')}>
                      <input type="email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} placeholder={t('profile:employer.companyEmailPlaceholder')} className={inputCls} />
                    </Field>
                    <Field label={t('profile:employer.companyAddress')} full>
                      <input value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} placeholder={t('profile:employer.companyAddressPlaceholder')} className={inputCls} />
                    </Field>
                    <Field label={t('profile:employer.foundedDate')}>
                      <input type="date" value={companyFoundedDate} onChange={(e) => setCompanyFoundedDate(e.target.value)} className={inputCls} />
                    </Field>
                    <Field label={t('profile:employer.companySize')}>
                      <select value={companySize} onChange={(e) => setCompanySize(e.target.value as CompanySize)} className={inputCls}>
                        <option value="">{t('profile:employer.selectSize')}</option>
                        {COMPANY_SIZES.map((s) => (
                          <option key={s.value} value={s.value}>
                            {t(SIZE_KEYS[s.value])}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label={t('profile:employer.gstNumber')}>
                      <input value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} maxLength={15} placeholder={t('profile:employer.gstPlaceholder')} className={inputCls} />
                    </Field>
                    <Field label={t('profile:employer.registrationNumber')}>
                      <input value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} placeholder={t('profile:employer.registrationPlaceholder')} className={inputCls} />
                    </Field>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label={t('profile:employer.fullName')}>
                      <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t('profile:employer.fullNamePlaceholder')} className={inputCls} />
                    </Field>
                    <Field label={t('profile:employer.designation')}>
                      <input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder={t('profile:employer.designationPlaceholder')} className={inputCls} />
                    </Field>
                  </div>
                )}

                {gstCinChanged && (
                  <div className="flex items-start gap-2 mt-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{t('profile:employer.reverifyWarning')}</span>
                  </div>
                )}

                <div className="flex items-center gap-3 mt-6">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors disabled:opacity-60"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {saving ? t('profile:employer.saving') : t('buttons.saveChanges')}
                  </button>
                  {saved && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-green-700">
                      <CheckCircle2 className="w-4 h-4" /> {t('profile:employer.saved')}
                    </span>
                  )}
                  {saveError && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-red-600">
                      <AlertCircle className="w-4 h-4" /> {saveError}
                    </span>
                  )}
                </div>
              </section>

              {/* Documents */}
              <section className="bg-white border border-[#dddddd] rounded-[10px] p-5 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-black mb-1">{t('profile:employer.documents')}</h2>
                <p className="text-sm text-[#717182] mb-4">{t('profile:employer.documentsHint')}</p>
                <DocumentsSection
                  allowedTypes={[...EMPLOYER_DOC_TYPES]}
                  accept=".pdf,.jpg,.jpeg,.png"
                  minOne
                  list={employerAPI.listDocuments}
                  upload={employerAPI.uploadDocument}
                  remove={employerAPI.deleteDocument}
                />
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default function EmployerProfilePage() {
  return (
    <ProtectedRoute requiredRole="employer">
      <EmployerProfileContent />
    </ProtectedRoute>
  )
}
