'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useState, useEffect, useRef, useCallback, ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import Image from 'next/image'
import { DocumentsSection } from '@/components/profile/DocumentsSection'
import { EmailVerifyModal, type EmailVerifyMode } from '@/components/profile/EmailVerifyModal'
import { PhoneVerifyModal } from '@/components/profile/PhoneVerifyModal'
import { ReadOnlyField } from '@/components/profile/ReadOnlyField'
import { EmailStatusField } from '@/components/profile/EmailStatusField'
import { PhoneStatusField } from '@/components/profile/PhoneStatusField'
import { AccountStatusIndicator } from '@/components/profile/AccountStatusIndicator'
import { inputCls, fieldLabelCls, sectionHeadingCls, sectionHeadingIconCls } from '@/components/profile/profileStyles'
import { useAuth } from '@/contexts/AuthContext'
import { verificationStatusPill, verificationStatusIcon } from '@/lib/applicationStatus'
import { toDateInput } from '@/lib/dateInput'
import {
  employerAPI,
  resolveMediaUrl,
  type EmployerProfile,
  type EmployerProfileUpdate,
  type CompanySize,
} from '@/lib/api'
import { LANGUAGES } from '@/lib/jobCategories'
import { Tooltip } from '@/components/ui/Tooltip'
import {
  Camera,
  Pencil,
  Loader2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  User,
  Briefcase,
  FileText,
  Phone,
  Mail,
} from 'lucide-react'
import { nameProblem } from '@/lib/nameValidation'
import { Field } from '@/components/form/Field'
import { EmployerHeader } from '@/components/employer/EmployerHeader'

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

const DATE_DISPLAY_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

// yyyy-mm-dd (from toDateInput) → "04 Mar 1997", for the view-mode read-only
// display. Pinned to UTC — same reasoning as toDateInput — so a date-only value
// never drifts a day under a negative-offset timezone.
function formatDate(dateStr?: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ''
  return DATE_DISPLAY_FORMAT.format(d)
}

const SIZE_KEYS: Record<CompanySize, string> = {
  SIZE_1_10: 'profile:employer.size_1_10',
  SIZE_11_50: 'profile:employer.size_11_50',
  SIZE_51_200: 'profile:employer.size_51_200',
  SIZE_201_500: 'profile:employer.size_201_500',
  SIZE_501_1000: 'profile:employer.size_501_1000',
  SIZE_1000_PLUS: 'profile:employer.size_1000_plus',
}

// BE AccountStatus enum. A business employer legitimately sits in
// PENDING_DOCUMENTS while browsing/editing this page (Task A), so every real
// value gets a label — not just ACTIVE/SUSPENDED.
const ACCOUNT_STATUS_LABEL_KEY: Record<string, string> = {
  PENDING_EMAIL_VERIFICATION: 'profile:employer.accountStatusValues.PENDING_EMAIL_VERIFICATION',
  PENDING_OTP_VERIFICATION: 'profile:employer.accountStatusValues.PENDING_OTP_VERIFICATION',
  PENDING_DOCUMENTS: 'profile:employer.accountStatusValues.PENDING_DOCUMENTS',
  PENDING_ADMIN_APPROVAL: 'profile:employer.accountStatusValues.PENDING_ADMIN_APPROVAL',
  ACTIVE: 'profile:employer.accountStatusValues.ACTIVE',
  SUSPENDED: 'profile:employer.accountStatusValues.SUSPENDED',
  REJECTED: 'profile:employer.accountStatusValues.REJECTED',
}

const ACCOUNT_STATUS_DOT: Record<string, string> = {
  ACTIVE: 'bg-green-500',
  SUSPENDED: 'bg-red-500',
  REJECTED: 'bg-red-500',
  PENDING_EMAIL_VERIFICATION: 'bg-amber-500',
  PENDING_OTP_VERIFICATION: 'bg-amber-500',
  PENDING_DOCUMENTS: 'bg-amber-500',
  PENDING_ADMIN_APPROVAL: 'bg-amber-500',
}

function EmployerProfileContent() {
  const { t } = useTranslation()
  const { user, updateUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)

  // View/edit mode, same split as the seeker profile: only the Employer
  // Details fields (+ the Save/Cancel bar) are gated by this. Photo, email/
  // phone (their own modals) and Documents persist immediately in both modes.
  const [editing, setEditing] = useState(false)
  const lastProfileRef = useRef<EmployerProfile | null>(null)

  const [employerType, setEmployerType] = useState<string>('')
  const [verificationStatus, setVerificationStatus] = useState<string>('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)

  // Root account fields (common to both employer types).
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [emailVerified, setEmailVerified] = useState(false)
  const [phoneVerified, setPhoneVerified] = useState(false)
  const [preferredLanguage, setPreferredLanguage] = useState('')
  const [accountStatus, setAccountStatus] = useState('')
  const [emailModalMode, setEmailModalMode] = useState<EmailVerifyMode | null>(null)
  const [phoneModalOpen, setPhoneModalOpen] = useState(false)

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

  // Root account fields only — deliberately excludes the Personal/Business edit
  // fields below, so refreshing account info (email/phone verify) mid-edit never
  // clobbers text the employer has typed but not yet saved.
  const hydrateAccount = useCallback((p: EmployerProfile) => {
    const e = p.employer
    setEmployerType(e?.employerType ?? '')
    setVerificationStatus(e?.verificationStatus ?? '')
    setPhoto(e?.profilePhoto ?? null)
    setEmail(p.email ?? '')
    setPhoneNumber(p.phoneNumber ?? '')
    setEmailVerified(p.emailVerified ?? false)
    setPhoneVerified(p.phoneVerified ?? false)
    setPreferredLanguage(p.preferredLanguage ?? '')
    setAccountStatus(p.accountStatus ?? '')
  }, [])

  const hydrate = useCallback((p: EmployerProfile) => {
    hydrateAccount(p)
    const e = p.employer
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
  }, [hydrateAccount])

  useEffect(() => {
    let ignore = false
    const run = async () => {
      setLoading(true)
      setLoadError('')
      try {
        const p = await employerAPI.getProfile()
        if (!ignore) {
          lastProfileRef.current = p
          hydrate(p)
        }
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

  // Called by handleSave after a successful update — the PUT response doesn't
  // return the full wrapped profile shape, so this re-fetches and re-syncs
  // everything, including the Personal/Business fields just committed.
  const refreshProfile = useCallback(async () => {
    const fresh = await employerAPI.getProfile()
    lastProfileRef.current = fresh
    hydrate(fresh)
    return fresh
  }, [hydrate])

  // Called by EmailVerifyModal / PhoneVerifyModal after a successful change.
  // Deliberately uses hydrateAccount, not hydrate — these modals can be opened
  // mid-edit (their trigger buttons only render while editing), so a full
  // hydrate() here would silently overwrite whatever the employer had typed
  // into Personal/Business Info but not yet saved.
  const refreshAccountInfo = useCallback(async () => {
    const fresh = await employerAPI.getProfile()
    lastProfileRef.current = fresh
    hydrateAccount(fresh)
    return fresh
  }, [hydrateAccount])

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

  const handleCancel = () => {
    if (lastProfileRef.current) hydrate(lastProfileRef.current)
    setEditing(false)
    setSaveError('')
    setSaved(false)
  }

  // A GST or CIN change re-flags the employer for admin review on the BE — the
  // controller's reverify check (gstChanged || cinChanged) is not conditioned
  // on employerType, so this applies whether an individual is adding a GST
  // number for the first time or a business is changing an existing one.
  const gstCinChanged =
    (gstNumber.trim() && gstNumber.trim() !== originalGst.current) ||
    (registrationNumber.trim() && registrationNumber.trim() !== originalReg.current)

  const handleSave = async () => {
    // Clear BOTH banners before validating. The "Saved ✓" confirmation lingers for
    // a few seconds, so a guard that returns early without clearing it leaves the
    // green tick sitting next to the new red error — the screen says the save both
    // worked and failed. This applies to the GST guard below too, which had the
    // same shape before this rule was added.
    setSaveError('')
    setSaved(false)

    // Same name rule as registration (DEF-030). Applies to both employer
    // types — `fullName` is the account's own contact person either way,
    // separate from `companyName`, which has its own rules.
    //
    // Only checked when the user actually EDITED the name. Validating whatever
    // the server sent would lock out any account whose stored name predates this
    // rule — and such accounts exist, because the backend mirror is still an open
    // ticket, so "Test User 1" is creatable through the API today. That user would
    // be unable to save ANY change, even to an unrelated field, and the error
    // would talk about their name while they were editing something else.
    const problem =
      fullName.trim() !== originalFullName.current ? nameProblem(fullName) : null
    if (problem) {
      setSaveError(t(problem === 'tooShort' ? 'auth:profile.errorName' : 'auth:profile.errorNameLetters'))
      return
    }
    // BE requires GST to be exactly 15 chars; guard before the round-trip.
    // Applies to either type — Business Information is now the same optional
    // block for both.
    if (gstNumber.trim() && gstNumber.trim().length !== 15) {
      setSaveError(t('profile:employer.gstLengthError'))
      return
    }
    if (gstCinChanged) {
      const ok = window.confirm(t('profile:employer.reverifyConfirm'))
      if (!ok) return
    }
    setSaving(true)
    try {
      // Personal Details and Business Information are now the same optional
      // fields for both employer types — filling either in never changes
      // employerType, so both are always sent together.
      const body: EmployerProfileUpdate = {
        fullName: fullName.trim() || undefined,
        designation: designation.trim() || undefined,
        companyName: companyName.trim() || undefined,
        companyEmail: companyEmail.trim() || undefined,
        companyAddress: companyAddress.trim() || undefined,
        companyFoundedDate: companyFoundedDate || undefined,
        companySize: companySize || undefined,
        gstNumber: gstNumber.trim() || undefined,
        registrationNumber: registrationNumber.trim() || undefined,
      }
      await employerAPI.updateProfile(body)
      // PUT returns the bare record; re-fetch the wrapped profile to refresh state.
      const fresh = await refreshProfile()
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
      setEditing(false)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('profile:employer.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const displayName = (isBusiness ? companyName : fullName).trim() || email || t('profile:employer.notProvided')

  return (
    <div className="min-h-screen bg-[#f7fbfd] flex flex-col">
      <EmployerHeader />

      <main className="flex-1 py-8 sm:py-10 lg:py-12">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px]">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-bold text-black">{t('profile:employer.heading')}</h1>
              <p className="text-sm text-[#717182] mt-1">{t('profile:employer.subtitle')}</p>
            </div>
            {!loading && !loadError && !editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors"
              >
                <Pencil className="w-4 h-4" /> {t('profile:employer.editProfile')}
              </button>
            )}
          </div>

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
            <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6 sm:gap-8 items-start">
              {/* Identity summary — avatar, name, type, account status, contact, verification. */}
              <aside className="bg-white border border-[#dddddd] rounded-[10px] p-5 sm:p-6 flex flex-col items-center text-center">
                <div className="relative w-32 h-32 flex-shrink-0">
                  <div className="w-32 h-32 rounded-full bg-[#a9e5ff] overflow-hidden flex items-center justify-center">
                    {photo ? (
                      <Image src={resolveMediaUrl(photo)} alt="" fill className="object-cover" />
                    ) : (
                      <span className="text-4xl font-semibold text-[#236987]">
                        {((isBusiness ? companyName : fullName) || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handlePhoto} className="hidden" />
                  <button
                    type="button"
                    onClick={() => photoRef.current?.click()}
                    disabled={photoUploading}
                    aria-label={t('profile:employer.changePhoto')}
                    title={t('profile:employer.changePhoto')}
                    className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-white text-primary-50 flex items-center justify-center border border-[#dddddd] shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-60"
                  >
                    {photoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xl font-semibold text-black mt-5 break-words">{displayName}</p>
                {employerType && (
                  <p className="text-xs text-[#717182] mt-1">
                    {isBusiness ? t('profile:employer.typeBusiness') : t('profile:employer.typeIndividual')}
                  </p>
                )}
                <AccountStatusIndicator
                  label={accountStatus ? (ACCOUNT_STATUS_LABEL_KEY[accountStatus] ? t(ACCOUNT_STATUS_LABEL_KEY[accountStatus]) : accountStatus) : null}
                  dotClassName={ACCOUNT_STATUS_DOT[accountStatus] ?? 'bg-gray-400'}
                />
                <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 mt-2.5 text-sm text-[#717182] max-w-full">
                  {phoneNumber && (
                    <span className="inline-flex items-center gap-1.5 flex-shrink-0">
                      <Phone className="w-3.5 h-3.5" /> {phoneNumber}
                    </span>
                  )}
                  {phoneNumber && email && <span className="text-[#dddddd]">|</span>}
                  {email && (
                    <Tooltip content={email}>
                      <span className="inline-flex items-center gap-1.5 min-w-0 max-w-full">
                        <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate min-w-0">{email}</span>
                      </span>
                    </Tooltip>
                  )}
                </div>
                {verificationStatus && (
                  <div className="w-full mt-6 pt-5 border-t border-[#eee]">
                    <VerificationBadge status={verificationStatus} />
                  </div>
                )}
              </aside>

              <div className="space-y-6 sm:space-y-8 min-w-0">
                {/* Account Information */}
                <section className="bg-white border border-[#dddddd] rounded-[10px] p-5 sm:p-6">
                  <h2 className={sectionHeadingCls + ' mb-4'}>
                    <User className={sectionHeadingIconCls} /> {t('profile:employer.accountInfo')}
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-6">
                    <EmailStatusField
                      label={t('profile:employer.accountEmail')}
                      email={email || null}
                      verified={emailVerified}
                      editing={editing}
                      notProvided={t('profile:employer.notProvided')}
                      verifiedText={t('profile:employer.emailStatusVerified')}
                      unverifiedText={t('profile:employer.emailStatusUnverified')}
                      addLabel={t('profile:employer.addEmail')}
                      changeLabel={t('profile:employer.changeEmail')}
                      verifyLabel={t('profile:employer.verifyEmail')}
                      onAction={setEmailModalMode}
                    />
                    <PhoneStatusField
                      label={t('profile:employer.accountPhone')}
                      phoneNumber={phoneNumber}
                      verified={phoneVerified}
                      editing={editing}
                      notProvided={t('profile:employer.notProvided')}
                      verifiedText={t('profile:employer.phoneStatusVerified')}
                      changeLabel={t('profile:employer.changePhone')}
                      onChangeClick={() => setPhoneModalOpen(true)}
                    />
                    {/* Not editable here — PUT /employers/profile does not accept
                        preferredLanguage (confirmed against updateEmployerProfileSchema
                        on the BE), so it stays display-only in both view and edit mode. */}
                    <ReadOnlyField
                      label={t('profile:employer.preferredLanguage')}
                      value={LANGUAGES.find((l) => l.value === preferredLanguage)?.label || preferredLanguage}
                      notProvided={t('profile:employer.notProvided')}
                      breakWords
                    />
                  </div>
                </section>

                {/* Employer Details — Personal Details + Business Information,
                    the same optional fields for both employer types. Filling
                    either in never changes employerType. */}
                <section className="bg-white border border-[#dddddd] rounded-[10px] p-5 sm:p-6">
                  <div className="pb-6 mb-6 border-b border-[#eee]">
                    <h2 className={sectionHeadingCls + ' mb-4'}>
                      <User className={sectionHeadingIconCls} /> {t('profile:employer.personalDetailsHeading')}
                    </h2>
                    {editing ? (
                      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-6">
                        <Field label={t('profile:employer.fullName')} className={fieldLabelCls}>
                          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t('profile:employer.fullNamePlaceholder')} className={inputCls} />
                        </Field>
                        <Field label={t('profile:employer.designation')} className={fieldLabelCls}>
                          <input value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder={t('profile:employer.designationPlaceholder')} className={inputCls} />
                        </Field>
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-6">
                        <ReadOnlyField label={t('profile:employer.fullName')} value={fullName} notProvided={t('profile:employer.notProvided')} breakWords />
                        <ReadOnlyField label={t('profile:employer.designation')} value={designation} notProvided={t('profile:employer.notProvided')} breakWords />
                      </div>
                    )}
                  </div>

                  <div>
                    <h2 className={sectionHeadingCls + ' mb-4'}>
                      <Briefcase className={sectionHeadingIconCls} /> {t('profile:employer.businessInfoHeading')}
                    </h2>
                    {editing ? (
                      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-6">
                        <Field label={t('profile:employer.companyName')} className={fieldLabelCls}>
                          <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder={t('profile:employer.companyNamePlaceholder')} className={inputCls} />
                        </Field>
                        <Field label={t('profile:employer.companyEmail')} className={fieldLabelCls}>
                          <input type="email" value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} placeholder={t('profile:employer.companyEmailPlaceholder')} className={inputCls} />
                        </Field>
                        <Field label={t('profile:employer.companyAddress')} className={fieldLabelCls} full>
                          <input value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} placeholder={t('profile:employer.companyAddressPlaceholder')} className={inputCls} />
                        </Field>
                        <Field label={t('profile:employer.foundedDate')} className={fieldLabelCls}>
                          <input type="date" value={companyFoundedDate} onChange={(e) => setCompanyFoundedDate(e.target.value)} className={inputCls} />
                        </Field>
                        <Field label={t('profile:employer.companySize')} className={fieldLabelCls}>
                          <select value={companySize} onChange={(e) => setCompanySize(e.target.value as CompanySize)} className={inputCls}>
                            <option value="">{t('profile:employer.selectSize')}</option>
                            {COMPANY_SIZES.map((s) => (
                              <option key={s.value} value={s.value}>
                                {t(SIZE_KEYS[s.value])}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label={t('profile:employer.gstNumber')} className={fieldLabelCls}>
                          <input value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} maxLength={15} placeholder={t('profile:employer.gstPlaceholder')} className={inputCls} />
                        </Field>
                        <Field label={t('profile:employer.registrationNumber')} className={fieldLabelCls}>
                          <input value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} placeholder={t('profile:employer.registrationPlaceholder')} className={inputCls} />
                        </Field>
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-6">
                        <ReadOnlyField label={t('profile:employer.companyName')} value={companyName} notProvided={t('profile:employer.notProvided')} breakWords />
                        <ReadOnlyField label={t('profile:employer.companyEmail')} value={companyEmail} notProvided={t('profile:employer.notProvided')} breakWords />
                        <ReadOnlyField label={t('profile:employer.companyAddress')} value={companyAddress} full notProvided={t('profile:employer.notProvided')} breakWords />
                        <ReadOnlyField label={t('profile:employer.foundedDate')} value={formatDate(companyFoundedDate)} notProvided={t('profile:employer.notProvided')} breakWords />
                        <ReadOnlyField label={t('profile:employer.companySize')} value={companySize ? t(SIZE_KEYS[companySize]) : ''} notProvided={t('profile:employer.notProvided')} breakWords />
                        <ReadOnlyField label={t('profile:employer.gstNumber')} value={gstNumber} notProvided={t('profile:employer.notProvided')} breakWords />
                        <ReadOnlyField label={t('profile:employer.registrationNumber')} value={registrationNumber} notProvided={t('profile:employer.notProvided')} breakWords />
                      </div>
                    )}
                  </div>

                  {editing && gstCinChanged && (
                    <div className="flex items-start gap-2 mt-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{t('profile:employer.reverifyWarning')}</span>
                    </div>
                  )}
                </section>

                {/* Save bar */}
                {editing && (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors disabled:opacity-60"
                    >
                      {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                      {saving ? t('profile:employer.saving') : t('buttons.saveChanges')}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={saving}
                      className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
                    >
                      {t('profile:employer.cancel')}
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
                )}

                {/* Documents */}
                <section className="bg-white border border-[#dddddd] rounded-[10px] p-5 sm:p-6">
                  <h2 className={sectionHeadingCls + ' mb-1'}>
                    <FileText className={sectionHeadingIconCls} /> {t('profile:employer.documents')}
                  </h2>
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
            </div>
          )}
        </div>
      </main>

      <EmailVerifyModal
        isOpen={emailModalMode !== null}
        onClose={() => setEmailModalMode(null)}
        mode={emailModalMode ?? 'add'}
        currentEmail={email || null}
        onSuccess={async () => {
          await refreshAccountInfo()
        }}
      />

      <PhoneVerifyModal
        isOpen={phoneModalOpen}
        onClose={() => setPhoneModalOpen(false)}
        currentPhoneNumber={phoneNumber}
        onSuccess={async () => {
          await refreshAccountInfo()
        }}
      />
    </div>
  )
}

// ---- small presentational helpers, mirroring src/app/profile/page.tsx -----

// The employer's own verification pill, in the same slot and pill treatment
// as the seeker profile's DocStatusBadge at the foot of the identity card.
function VerificationBadge({ status }: { status: string }) {
  const { label, pill } = verificationStatusPill(status)
  const Icon = verificationStatusIcon(status)
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap ${pill}`}>
      <Icon className="w-3.5 h-3.5" /> {label}
    </span>
  )
}

export default function EmployerProfilePage() {
  return (
    <ProtectedRoute requiredRole="employer">
      <EmployerProfileContent />
    </ProtectedRoute>
  )
}
