'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useState, useEffect, useRef, useCallback, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { categoryLabel } from '@/lib/categoryLabel'
import Image from 'next/image'
import { EmployeeHeader } from '@/components/navigation/EmployeeHeader'
import { Footer } from '@/components/home/Footer'
import { DocumentsSection } from '@/components/profile/DocumentsSection'
import { isProfilePhotoType, uploadErrorMessage } from '@/lib/uploadFile'
import { EmailVerifyModal, type EmailVerifyMode } from '@/components/profile/EmailVerifyModal'
import { PhoneVerifyModal } from '@/components/profile/PhoneVerifyModal'
import { ReadOnlyField } from '@/components/profile/ReadOnlyField'
import { EmailStatusField } from '@/components/profile/EmailStatusField'
import { PhoneStatusField } from '@/components/profile/PhoneStatusField'
import { AccountStatusIndicator } from '@/components/profile/AccountStatusIndicator'
import { inputCls, fieldLabelCls, sectionHeadingCls, sectionHeadingIconCls } from '@/components/profile/profileStyles'
import { useAuth } from '@/contexts/AuthContext'
import { isAtLeast18, toDateInput } from '@/lib/dateInput'
import {
  jobSeekerAPI,
  resolveMediaUrl,
  type SeekerProfile,
  type SeekerProfileUpdate,
  type ProfileWorkExperience,
  type JobSeekerSkillLink,
  type SkillCatalogItem,
  type TaxonomyTriple,
} from '@/lib/api'
import { LANGUAGES } from '@/lib/jobCategories'
import { nearestCityNote, useNearestCity } from '@/hooks/useNearestCity'
import { UseMyLocation } from '@/components/location/UseMyLocation'
import {
  StateCitySelect,
  cityDisplayName,
  toSelectedCity,
  type SelectedCity,
} from '@/components/location/StateCitySelect'
import { TaxonomyPicker } from '@/components/taxonomy/TaxonomyPicker'
import { VoiceButton } from '@/components/feedback/VoiceButton'
import { Tooltip } from '@/components/ui/Tooltip'
import { ToggleSwitch } from '@/components/settings/ToggleSwitch'
import { showToast } from '@/lib/toast'
import {
  Camera,
  Pencil,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Search,
  User,
  Briefcase,
  FileWarning,
  Phone,
  Mail,
  FileText,
  Sparkles,
} from 'lucide-react'
import { COMPANY_NAME_MAX_LENGTH, WORK_POSITION_MAX_LENGTH } from '@/lib/businessIdentifiers'
import { NAME_MAX_LENGTH, nameProblem } from '@/lib/nameValidation'
import { Field } from '@/components/form/Field'
import { DatePicker, yearsAgoISO } from '@/components/form/DatePicker'

// Local editable work-experience row (carries a stable key for the list).
interface ExpRow extends ProfileWorkExperience {
  key: string
}

const SEEKER_DOC_TYPES = [
  { value: 'IDENTITY_PROOF', label: 'Identity Proof' },
  { value: 'ADDRESS_PROOF', label: 'Address Proof' },
  { value: 'EDUCATION_CERTIFICATE', label: 'Education Certificate' },
  { value: 'SKILL_CERTIFICATE', label: 'Skill Certificate' },
  { value: 'OTHER', label: 'Other' },
] as const

let rowSeq = 0
const newKey = () => `row-${rowSeq++}`

// yyyy-mm-dd → "Jan 2023", for the read-only work-experience list.
function monthYear(dateInput?: string | null): string {
  if (!dateInput) return ''
  const d = new Date(dateInput)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

// Fixed 3-letter abbreviations rather than toLocaleDateString's locale-driven
// short month — the browser's Intl data renders September as "Sept" in some
// locales/engines, which drifts from the exact format this ticket specifies.
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// jobSeeker.updatedAt (ISO timestamp) → "4 Sep, 2026", for the subtle
// "last updated" caption below the page heading.
function formatUpdatedAt(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}, ${d.getFullYear()}`
}

// jobSeeker.dateOfBirth (date-only, e.g. "1997-03-04") → "04 Mar 1997". Read
// with the UTC getters — same reasoning as toDateInput above — so a value with
// no time-of-day component never drifts a day.
function formatDateOfBirth(dateStr?: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return ''
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${day} ${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

const GENDER_LABEL_KEY: Record<string, string> = {
  MALE: 'auth:profile.genderMale',
  FEMALE: 'auth:profile.genderFemale',
  OTHER: 'auth:profile.genderOther',
}

// Reuses the registration form's gender strings (auth:profile.gender*) rather
// than duplicating a MALE/FEMALE/OTHER translation set that already exists
// and is already translated into all 10 shipped languages.
function genderLabel(t: (key: string) => string, gender: string | null): string | undefined {
  if (!gender) return undefined
  const key = GENDER_LABEL_KEY[gender]
  return key ? t(key) : gender
}

// SUSPENDED is the only other state a seeker who can reach this page could
// realistically be in — every PENDING_* status blocks login before this point.
// A value outside both is shown verbatim rather than guessed at.
const ACCOUNT_STATUS_LABEL_KEY: Record<string, string> = {
  ACTIVE: 'profile:seeker.accountStatus.ACTIVE',
  SUSPENDED: 'profile:seeker.accountStatus.SUSPENDED',
}

function SeekerProfileContent() {
  const { t, i18n } = useTranslation()
  const { user, updateUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)

  // View/edit mode. Only Basic Details + Work Experience are gated by this — they
  // already share one Save action (see handleSave). Photo, Documents and Skills
  // persist immediately per-action and stay interactive in both modes.
  const [editing, setEditing] = useState(false)
  // Last profile fetched from the server, so Cancel can revert to it via hydrate()
  // without a second copy of every field's state.
  const lastProfileRef = useRef<SeekerProfile | null>(null)

  // Profile fields
  const [jobSeekerId, setJobSeekerId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [emailVerified, setEmailVerified] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [phoneVerified, setPhoneVerified] = useState(false)
  // Which email flow the modal is running, or null when the modal is closed.
  const [emailModalMode, setEmailModalMode] = useState<EmailVerifyMode | null>(null)
  const [phoneModalOpen, setPhoneModalOpen] = useState(false)
  const [documentVerificationStatus, setDocumentVerificationStatus] = useState<string | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  // Why the last photo was refused. Its own message under the avatar: the save bar's
  // `saveError` is only on screen while editing, and the camera button works any time.
  // Kept with the language it was written in: the text is translated when the error happens, so
  // it is hidden once the user switches language (they get a fresh one in the new language).
  const [photoError, setPhotoError] = useState<{ message: string; lang: string } | null>(null)
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  // The free-text location of a seeker who has no structured home city yet (every seeker from
  // before cities existed). It is shown, never edited and never sent: only picking a city
  // replaces it, and the backend does that.
  const [location, setLocation] = useState('')
  // Home city (where the seeker lives) and preferred cities (where they want to work) are two
  // separate things with two separate saves. `saved*` is what the server holds; a field is sent
  // only when it differs from that, because the BE replaces the whole preferred list when the
  // key is present and rewrites location + coordinates when `cityId` is.
  const [homeCity, setHomeCity] = useState<SelectedCity | null>(null)
  const [savedHomeCity, setSavedHomeCity] = useState<SelectedCity | null>(null)
  // The seeker pressed "Remove my saved city". Only this clears the city on the server: the
  // picker also empties the city by itself whenever the State select changes, and someone just
  // looking at another state must not lose the city they saved.
  const [homeCityRemoved, setHomeCityRemoved] = useState(false)
  const [preferredCities, setPreferredCities] = useState<SelectedCity[]>([])
  const [savedPreferredIds, setSavedPreferredIds] = useState<string[]>([])
  // Every change of the home city that is not a plain picker pick, i.e. "Use my location" here.
  // Any city picked replaces an earlier removal; an empty picker leaves it as it was.
  //
  // A useCallback with no dependencies (state setters only): `changeHomeCity` below is the
  // picker's `onChange`, and a new function on each render would defeat its React.memo and
  // rebuild the city list on every keystroke in the bio or name.
  const applyHomeCity = useCallback((next: SelectedCity | null) => {
    setHomeCity(next)
    if (next) setHomeCityRemoved(false)
  }, [])
  // "Use my location": the nearest-city lookup in flight, and what it said. The hook aborts a
  // lookup when a newer one starts, when the form is reloaded (Cancel, or a refetch after
  // saving) and when the page unmounts, so a late answer can never put its city into a form it
  // does not belong to.
  const {
    locate,
    begin: beginLocate,
    cancel: cancelLocate,
    locating,
    outcome: locateOutcome,
  } = useNearestCity(applyHomeCity)
  // BR-1 — editable here (PUT /jobseekers/profile accepts both), same as at
  // registration. `dateOfBirth` is kept in <input type="date">'s own
  // yyyy-mm-dd format (via toDateInput) rather than the API's ISO timestamp,
  // same convention as the work-experience dates below.
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState<'' | 'MALE' | 'FEMALE' | 'OTHER'>('')
  const [profileUpdatedAt, setProfileUpdatedAt] = useState<string | null>(null)
  const [accountStatus, setAccountStatus] = useState<string | null>(null)
  const [triple, setTriple] = useState<TaxonomyTriple>({})
  const [language, setLanguage] = useState('en')
  const [experiences, setExperiences] = useState<ExpRow[]>([])
  // "Actively looking" saves on its own the moment it is flipped, outside the Save button.
  // The ref is the synchronous guard (a double tap can land before the next render); the
  // state only drives the busy look.
  const [activelyLooking, setActivelyLooking] = useState(false)
  const [lookingBusy, setLookingBusy] = useState(false)
  const lookingBusyRef = useRef(false)
  const photoRef = useRef<HTMLInputElement>(null)
  // Original name — the DEF-030 rule fires only on an edit, never on a legacy
  // value the server sent us. See the note in handleSave.
  const originalFullName = useRef('')

  const hydrate = useCallback((p: SeekerProfile) => {
    const js = p.jobSeeker
    setJobSeekerId(js?.id ?? null)
    setEmail(p.email ?? '')
    setEmailVerified(p.emailVerified ?? false)
    setPhoneNumber(p.phoneNumber ?? '')
    setPhoneVerified(p.phoneVerified ?? false)
    setDocumentVerificationStatus(js?.documentVerificationStatus ?? null)
    setPhoto(js?.profilePhoto ?? null)
    setFullName(js?.fullName ?? '')
    originalFullName.current = (js?.fullName ?? '').trim()
    setBio(js?.bio ?? '')
    setLocation(js?.location ?? '')
    setDateOfBirth(toDateInput(js?.dateOfBirth))
    setGender(js?.gender ?? '')
    setProfileUpdatedAt(js?.updatedAt ?? null)
    setAccountStatus(p.accountStatus ?? null)
    // Cities arrive with their state NAME, which is what StateCitySelect needs to pre-fill.
    const city = js?.city ? toSelectedCity(js.city) : null
    const preferred = (js?.preferredCities ?? []).map((saved) => toSelectedCity(saved.city))
    setHomeCity(city)
    setSavedHomeCity(city)
    setHomeCityRemoved(false)
    setPreferredCities(preferred)
    setSavedPreferredIds(preferred.map((c) => c.id))
    // A lookup belongs to the edit session that started it, not to the record just loaded.
    cancelLocate()
    setTriple({
      category: js?.preferredCategory || undefined,
      sector: js?.preferredSector || undefined,
      jobTitle: js?.preferredJobTitle || undefined,
    })
    setLanguage(p.preferredLanguage ?? 'en')
    // While the switch's own save is running it owns the value: a re-fetch that was read
    // before that save committed would otherwise flip it back to the old one.
    if (!lookingBusyRef.current) setActivelyLooking(js?.isActivelyLooking ?? false)
    setExperiences(
      (js?.workExperience ?? []).map((w) => ({
        key: newKey(),
        position: w.position ?? '',
        companyName: w.companyName ?? '',
        startDate: toDateInput(w.startDate),
        endDate: toDateInput(w.endDate),
        currentlyWorking: w.currentlyWorking ?? false,
        description: w.description ?? '',
      }))
    )
  }, [cancelLocate])

  useEffect(() => {
    let ignore = false
    const run = async () => {
      setLoading(true)
      setLoadError('')
      try {
        const p = await jobSeekerAPI.getProfile()
        if (!ignore) {
          lastProfileRef.current = p
          hydrate(p)
        }
      } catch (err) {
        if (!ignore) setLoadError(err instanceof Error ? err.message : t('profile:seeker.loadError'))
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    run()
    return () => {
      ignore = true
    }
    // `t` is only the load-error fallback text. Listing it would re-run this effect on
    // every language change, refetch, and hydrate() over any unsaved edits, so it is
    // deliberately left out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrate])

  const handlePhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (photoRef.current) photoRef.current.value = ''
    if (!file) return
    // Refuse a non-image here, in the open, before anything is uploaded.
    if (!isProfilePhotoType(file)) {
      setPhotoError({ message: t('common:uploadErrors.fileTypeNotAllowed'), lang: i18n.language })
      return
    }
    setPhotoUploading(true)
    setPhotoError(null)
    try {
      const res = await jobSeekerAPI.updateProfilePhoto(file)
      setPhoto(res.profilePhoto)
      // Keep the header avatar in step with the new photo.
      updateUser({ profile: { ...user?.profile, profilePhoto: res.profilePhoto } })
    } catch (err) {
      setPhotoError({ message: uploadErrorMessage(err, t, t('profile:seeker.photoError')), lang: i18n.language })
    } finally {
      setPhotoUploading(false)
    }
  }

  const setExp = (key: string, field: keyof ProfileWorkExperience, value: string | boolean) => {
    setExperiences((rows) =>
      rows.map((r) => (r.key === key ? { ...r, [field]: value } : r))
    )
  }
  const addExp = () =>
    setExperiences((rows) => [
      ...rows,
      { key: newKey(), position: '', companyName: '', startDate: '', endDate: '', currentlyWorking: false, description: '' },
    ])
  const removeExp = (key: string) => setExperiences((rows) => rows.filter((r) => r.key !== key))

  // Only the one key goes out. On failure the switch goes back to what it was.
  const toggleActivelyLooking = async (next: boolean) => {
    if (lookingBusyRef.current || saving) return
    const previous = activelyLooking
    lookingBusyRef.current = true
    setLookingBusy(true)
    setActivelyLooking(next)
    try {
      await jobSeekerAPI.updateProfile({ isActivelyLooking: next })
      // Keep Cancel's snapshot in step, or it would flip the switch back.
      const snapshot = lastProfileRef.current
      if (snapshot?.jobSeeker) {
        lastProfileRef.current = { ...snapshot, jobSeeker: { ...snapshot.jobSeeker, isActivelyLooking: next } }
      }
      showToast(t('profile:seeker.saved'), 'success')
    } catch {
      setActivelyLooking(previous)
      showToast(t('settings.notifications.updateFailed'), 'error')
    } finally {
      lookingBusyRef.current = false
      setLookingBusy(false)
    }
  }

  const handleCancel = () => {
    if (lastProfileRef.current) hydrate(lastProfileRef.current)
    setEditing(false)
    setSaveError('')
    setSaved(false)
  }

  // Called by EmailVerifyModal / PhoneVerifyModal after a successful change. The
  // BE call that got us here does not return the full profile shape, so refetch
  // rather than patch local state — same pattern handleSave already uses.
  const refreshProfile = async () => {
    const fresh = await jobSeekerAPI.getProfile()
    lastProfileRef.current = fresh
    hydrate(fresh)
    return fresh
  }

  // The session user keeps the email/phone it was given at login, so push the new
  // ones there too — Settings, checkout and the invite page read them from it.
  const handleContactChanged = async () => {
    const fresh = await refreshProfile()
    updateUser({ email: fresh.email, phoneNumber: fresh.phoneNumber })
  }

  // What this save sends for the two location fields. Each goes out only when the seeker
  // changed it, so an unrelated save (a new bio, a switched language) can neither rewrite the
  // home city, wipe the legacy text, nor replace the preferred list with what happened to load.
  //
  // An EMPTY picker is not by itself a request to clear the city (see homeCityRemoved), so an
  // empty home city counts as a change only after the explicit remove.
  const homeCityChanged = homeCity
    ? homeCity.id !== savedHomeCity?.id
    : savedHomeCity !== null && homeCityRemoved
  const preferredChanged =
    preferredCities.length !== savedPreferredIds.length ||
    preferredCities.some((c) => !savedPreferredIds.includes(c.id))

  // A hand-made change of the home city (the picker, or Remove) ends any lookup still running
  // (its answer would overwrite the choice) and drops the note about the last lookup, which no
  // longer describes the form. Stable between renders, for the picker's React.memo.
  const changeHomeCity = useCallback(
    (next: SelectedCity | null) => {
      cancelLocate()
      applyHomeCity(next)
    },
    [cancelLocate, applyHomeCity]
  )

  // What the last "Use my location" lookup says, if it has said anything.
  const locationNote = nearestCityNote(locateOutcome, t, 'profile:seeker.locationPicked')

  // The line shown while a saved city sits behind an empty picker: kept, or about to be removed.
  const savedCityKey = homeCityRemoved ? 'profile:seeker.savedHomeCityRemoving' : 'profile:seeker.savedHomeCity'
  const savedCityTone = homeCityRemoved ? 'text-amber-700' : 'text-black'

  const removeHomeCity = () => {
    changeHomeCity(null)
    setHomeCityRemoved(true)
  }

  const handleSave = async () => {
    // Clear BOTH banners before validating. The "Saved ✓" confirmation lingers for
    // a few seconds, so a guard that returns early without clearing it leaves the
    // green tick sitting next to the new red error — the screen says the save both
    // worked and failed.
    setSaveError('')
    setSaved(false)

    // Registration rejects a numeric name (DEF-030); without the same guard here
    // the rule is one edit away from being undone.
    //
    // Only on an EDIT. Validating the value the server sent would lock out any
    // account whose stored name predates this rule — and those exist, since the
    // backend mirror is still open, so "Test User 1" is creatable via the API
    // today. Such a user could not save ANY profile change, not even their bio,
    // and the error would point at a field they never touched.
    const problem = fullName.trim() !== originalFullName.current ? nameProblem(fullName) : null
    if (problem) {
      setSaveError(t(problem === 'tooShort' ? 'auth:profile.errorName' : 'auth:profile.errorNameLetters'))
      return
    }
    // The BE refuses an under-18 date with a bare "Validation failed" — catch it here.
    // An empty field is skipped: it is sent as undefined, so accounts with no DOB can still save.
    if (dateOfBirth && !isAtLeast18(dateOfBirth)) {
      setSaveError(t('profile:seeker.errorDobAge'))
      return
    }
    setSaving(true)
    try {
      // Only send rows with BOTH a position and a parseable startDate — the BE
      // requires both. workExperiences (when present) FULL-REPLACES server-side.
      const workExperiences = experiences
        .filter((r) => r.position.trim() && r.startDate)
        .map((r) => ({
          position: r.position.trim(),
          companyName: r.companyName?.trim() || undefined,
          startDate: r.startDate as string,
          endDate: r.currentlyWorking ? undefined : r.endDate || undefined,
          currentlyWorking: !!r.currentlyWorking,
          description: r.description?.trim() || undefined,
        }))

      // Each location field goes out only when the seeker changed it (see homeCityChanged).
      // `location`, `latitude` and `longitude` are never sent from here: picking a city makes
      // the BE write all three from it, and the legacy text must survive every other save.
      const locationPatch: Pick<SeekerProfileUpdate, 'cityId' | 'preferredCityIds'> = {}
      // `null` (the seeker cleared the city) drops the link and keeps the text.
      if (homeCityChanged) locationPatch.cityId = homeCity?.id ?? null
      // `[]` is sent only for a list the seeker emptied on purpose: the BE replaces the lot.
      if (preferredChanged) locationPatch.preferredCityIds = preferredCities.map((c) => c.id)

      await jobSeekerAPI.updateProfile({
        fullName: fullName.trim() || undefined,
        bio: bio.trim() || undefined,
        ...locationPatch,
        preferredCategory: triple.category || undefined,
        preferredSector: triple.sector || undefined,
        preferredJobTitle: triple.jobTitle || undefined,
        preferredLanguage: language || undefined,
        // Already yyyy-mm-dd (the <input type="date"> format), which is exactly
        // what dateOfBirthSchema expects — sent as undefined, never '', so
        // clearing the field doesn't 400 against a value the BE requires.
        dateOfBirth: dateOfBirth || undefined,
        gender: gender || undefined,
        workExperiences,
      })
      // PUT returns the bare record; re-fetch the wrapped profile to refresh state.
      const fresh = await jobSeekerAPI.getProfile()
      lastProfileRef.current = fresh
      hydrate(fresh)
      // The header reads the name from the session user, so a rename here has to
      // land there too — otherwise the old name sticks until the next login.
      updateUser({
        profile: {
          ...user?.profile,
          fullName: fresh.jobSeeker?.fullName,
          profilePhoto: fresh.jobSeeker?.profilePhoto,
        },
      })
      setEditing(false)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('profile:seeker.saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <EmployeeHeader />

      <main className="flex-1 pt-[clamp(16px,5.33px_+_1.67vw,32px)] pb-[clamp(24px,8px_+_2.5vw,48px)]">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px]">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-[clamp(16px,8px_+_1.25vw,28px)]">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-bold text-black">{t('profile:seeker.heading')}</h1>
              <p className="text-sm text-[#717182] mt-1">{t('profile:seeker.subtitle')}</p>
              {profileUpdatedAt && (
                <p className="text-xs text-[#a3a3a3] mt-1">
                  {t('profile:seeker.lastUpdated', { date: formatUpdatedAt(profileUpdatedAt) })}
                </p>
              )}
            </div>
            {!loading && !loadError && !editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors"
              >
                <Pencil className="w-4 h-4" /> {t('profile:seeker.editProfile')}
              </button>
            )}
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-[#717182]">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary-50" />
              <p>{t('profile:seeker.loading')}</p>
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
              {/* Profile summary sidebar — avatar, name, phone, email, document-verification status. */}
              <aside className="bg-white border border-[#dddddd] rounded-[10px] p-5 sm:p-6 flex flex-col items-center text-center">
                <div className="relative w-32 h-32 flex-shrink-0">
                  <div className="w-32 h-32 rounded-full bg-[#a9e5ff] overflow-hidden flex items-center justify-center">
                    {photo ? (
                      // unoptimized: the BE may return an absolute GCS/CDN photo URL outside images.remotePatterns.
                      <Image src={resolveMediaUrl(photo)} alt="Profile photo" fill unoptimized className="object-cover" />
                    ) : (
                      <span className="text-4xl font-semibold text-[#236987]">
                        {(fullName || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handlePhoto} className="hidden" />
                  <button
                    type="button"
                    onClick={() => photoRef.current?.click()}
                    disabled={photoUploading}
                    aria-label={t('profile:seeker.changePhoto')}
                    title={t('profile:seeker.changePhoto')}
                    className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-white text-primary-50 flex items-center justify-center border border-[#dddddd] shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-60"
                  >
                    {photoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  </button>
                </div>
                {photoError && photoError.lang === i18n.language && (
                  <p role="alert" className="mt-3 flex items-start gap-1.5 text-sm text-red-600 text-left">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{photoError.message}</span>
                  </p>
                )}
                <p className="text-xl font-semibold text-black mt-5 break-words">
                  {fullName || t('profile:seeker.fullNamePlaceholder')}
                </p>
                <AccountStatusIndicator
                  label={accountStatus ? (ACCOUNT_STATUS_LABEL_KEY[accountStatus] ? t(ACCOUNT_STATUS_LABEL_KEY[accountStatus]) : accountStatus) : null}
                  dotClassName={accountStatus ? (ACCOUNT_STATUS_DOT[accountStatus] ?? 'bg-gray-400') : 'bg-gray-400'}
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
                <div className="w-full mt-6 pt-5 border-t border-[#eee]">
                  <DocStatusBadge status={documentVerificationStatus} />
                </div>
              </aside>

              <div className="space-y-6 sm:space-y-8 min-w-0">
              <section className="bg-white border border-[#dddddd] rounded-[10px] px-5 sm:px-6">
                <ToggleSwitch
                  label={t('profile:seeker.activelyLooking.title')}
                  description={t('profile:seeker.activelyLooking.description')}
                  checked={activelyLooking}
                  busy={lookingBusy || saving}
                  onChange={toggleActivelyLooking}
                />
              </section>

              {/* Basic details */}
              <section className="bg-white border border-[#dddddd] rounded-[10px] p-5 sm:p-6">
                {/* Personal Information */}
                <div className="pb-6 mb-6 border-b border-[#eee]">
                  <h2 className={sectionHeadingCls + ' mb-4'}>
                    <User className={sectionHeadingIconCls} /> {t('profile:seeker.personalInformation')}
                  </h2>
                  {editing ? (
                    <>
                    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-6">
                      <Field label={t('profile:seeker.fullName')} className={fieldLabelCls}>
                        <input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={NAME_MAX_LENGTH} placeholder={t('profile:seeker.fullNamePlaceholder')} className={inputCls} />
                      </Field>
                      <EmailStatusField
                        label={t('profile:seeker.emailAddress')}
                        email={email || null}
                        verified={emailVerified}
                        editing
                        notProvided={t('profile:seeker.notProvided')}
                        verifiedText={t('profile:seeker.emailStatusVerified')}
                        unverifiedText={t('profile:seeker.emailStatusUnverified')}
                        addLabel={t('profile:seeker.addEmail')}
                        changeLabel={t('profile:seeker.changeEmail')}
                        verifyLabel={t('profile:seeker.verifyEmail')}
                        onAction={setEmailModalMode}
                      />
                      <PhoneStatusField
                        label={t('profile:seeker.phoneNumber')}
                        phoneNumber={phoneNumber}
                        verified={phoneVerified}
                        editing
                        notProvided={t('profile:seeker.notProvided')}
                        verifiedText={t('profile:seeker.phoneStatusVerified')}
                        changeLabel={t('profile:seeker.changePhone')}
                        onChangeClick={() => setPhoneModalOpen(true)}
                      />
                      {/* Home city: where the seeker LIVES. Not the same thing as the cities
                          they want to work in, which is the next block. */}
                      <div role="group" aria-labelledby="seeker-home-location" className="sm:col-span-2">
                        <p id="seeker-home-location" className={fieldLabelCls}>
                          {t('profile:seeker.location')}
                        </p>
                        {/* A seeker from before cities existed has only this text. It stays until
                            they pick a city, and picking one replaces it on the server. */}
                        {!homeCity && !savedHomeCity && location.trim() && (
                          <p className="mb-2 text-sm text-[#717182]">
                            {t('profile:seeker.locationLegacy', { text: location })}
                          </p>
                        )}
                        {/* The saved city stays on screen while the picker is empty, which it is
                            whenever the State select is changed. Saving then sends nothing,
                            unless the seeker pressed Remove, and the second sentence says what
                            that does not do: the BE keeps the old text and pin. */}
                        {!homeCity && savedHomeCity && (
                          <p className={`mb-2 text-sm ${savedCityTone}`} role="status">
                            {t(savedCityKey, { city: cityDisplayName(savedHomeCity) })}
                          </p>
                        )}
                        <StateCitySelect
                          value={homeCity}
                          onChange={changeHomeCity}
                          disabled={saving}
                          selectClassName={inputCls}
                          labelClassName={fieldLabelCls}
                        />
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          <UseMyLocation onLocated={locate} onRequest={beginLocate} disabled={saving || locating} />
                          {/* The only way to clear a saved city: emptying the picker is not one,
                              because changing the State select empties it too. */}
                          {savedHomeCity && !homeCityRemoved && (
                            <button
                              type="button"
                              onClick={removeHomeCity}
                              disabled={saving}
                              className="min-h-[44px] px-2 text-sm text-red-600 underline disabled:opacity-50"
                            >
                              {t('profile:seeker.removeHomeCity')}
                            </button>
                          )}
                        </div>
                        {/* The point is invisible, so this line is the only feedback there is.
                            It never calls an unsaved city saved: the city sits in the picker above
                            and goes out with Save. */}
                        <p
                          className={`text-xs mt-1.5 ${locationNote ? (locationNote.ok ? 'text-green-700' : 'text-red-600') : 'text-[#717182]'}`}
                          role="status"
                        >
                          {locating
                            ? t('profile:seeker.locationLookingUp')
                            : (locationNote?.text ?? t('profile:seeker.locationHint'))}
                        </p>
                      </div>
                      {/* Preferred work cities: where the seeker WANTS to work. Employers see
                          these, never the home city above. */}
                      <div role="group" aria-labelledby="seeker-preferred-cities" className="sm:col-span-2">
                        <p id="seeker-preferred-cities" className={fieldLabelCls}>
                          {t('profile:seeker.preferredCities')}
                        </p>
                        <p className="mb-2 text-xs text-[#717182]">{t('profile:seeker.preferredCitiesHint')}</p>
                        <StateCitySelect
                          multiple
                          max={3}
                          value={preferredCities}
                          onChange={setPreferredCities}
                          disabled={saving}
                          selectClassName={inputCls}
                          labelClassName={fieldLabelCls}
                        />
                      </div>
                      <Field label={t('profile:seeker.dateOfBirth')} className={fieldLabelCls}>
                        <DatePicker
                          value={dateOfBirth}
                          defaultMonth={yearsAgoISO(18)}
                          onChange={setDateOfBirth}
                          className={inputCls}
                        />
                      </Field>
                      <Field label={t('profile:seeker.gender')} className={fieldLabelCls}>
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value as typeof gender)}
                          className={inputCls}
                        >
                          <option value="">{t('auth:profile.genderSelect')}</option>
                          <option value="MALE">{t('auth:profile.genderMale')}</option>
                          <option value="FEMALE">{t('auth:profile.genderFemale')}</option>
                          <option value="OTHER">{t('auth:profile.genderOther')}</option>
                        </select>
                      </Field>
                    </div>
                    {/* About You gets its own full-width row, set off from the fields
                        above — it reads as a paragraph, not one more grid cell. */}
                    <div className="mt-6 pt-6 border-t border-[#eee]">
                      <Field label={t('profile:seeker.aboutYou')} className={fieldLabelCls}>
                        <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} rows={3} placeholder={t('profile:seeker.aboutYouPlaceholder')} className="w-full px-3 py-2 border border-[#b5b5b5] rounded-lg text-sm text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all resize-none" />
                      </Field>
                    </div>
                    </>
                  ) : (
                    <>
                    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-6">
                      <ReadOnlyField label={t('profile:seeker.fullName')} value={fullName} notProvided={t('profile:seeker.notProvided')} />
                      <EmailStatusField
                        label={t('profile:seeker.emailAddress')}
                        email={email || null}
                        verified={emailVerified}
                        editing={false}
                        notProvided={t('profile:seeker.notProvided')}
                        verifiedText={t('profile:seeker.emailStatusVerified')}
                        unverifiedText={t('profile:seeker.emailStatusUnverified')}
                        addLabel={t('profile:seeker.addEmail')}
                        changeLabel={t('profile:seeker.changeEmail')}
                        verifyLabel={t('profile:seeker.verifyEmail')}
                        onAction={setEmailModalMode}
                      />
                      <PhoneStatusField
                        label={t('profile:seeker.phoneNumber')}
                        phoneNumber={phoneNumber}
                        verified={phoneVerified}
                        editing={false}
                        notProvided={t('profile:seeker.notProvided')}
                        verifiedText={t('profile:seeker.phoneStatusVerified')}
                        changeLabel={t('profile:seeker.changePhone')}
                        onChangeClick={() => setPhoneModalOpen(true)}
                      />
                      {/* "City, State" once a city is picked; the legacy text until then. */}
                      <ReadOnlyField
                        label={t('profile:seeker.location')}
                        value={homeCity ? cityDisplayName(homeCity) : location}
                        notProvided={t('profile:seeker.notProvided')}
                      />
                      <ReadOnlyField
                        label={t('profile:seeker.preferredCities')}
                        value={preferredCities.map(cityDisplayName).join(' · ')}
                        notProvided={t('profile:seeker.notProvided')}
                      />
                      <ReadOnlyField label={t('profile:seeker.dateOfBirth')} value={formatDateOfBirth(dateOfBirth)} notProvided={t('profile:seeker.notProvided')} />
                      <ReadOnlyField label={t('profile:seeker.gender')} value={genderLabel(t, gender)} notProvided={t('profile:seeker.notProvided')} />
                    </div>
                    <div className="mt-6 pt-6 border-t border-[#eee]">
                      <ReadOnlyField label={t('profile:seeker.aboutYou')} value={bio} notProvided={t('profile:seeker.notProvided')} />
                    </div>
                    </>
                  )}
                </div>

                {/* Job Preferences */}
                <div>
                  <h2 className={sectionHeadingCls + ' mb-4'}>
                    <Briefcase className={sectionHeadingIconCls} /> {t('profile:seeker.jobPreferences')}
                  </h2>
                  {editing ? (
                    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-6">
                      {/* Preferred Category → Sector → JobTitle (PJP-112).
                          `contents` drops the picker's own wrapper from layout so its
                          three fields fall into THIS grid directly, alongside Preferred
                          Language — Category/Sector on row one, JobTitle/Language on
                          row two, instead of the picker claiming a full-width row of
                          its own. The cascade logic inside TaxonomyPicker is untouched. */}
                      <TaxonomyPicker
                        value={triple}
                        onChange={setTriple}
                        className="contents"
                        selectClassName={inputCls}
                        labelClassName={fieldLabelCls}
                      />
                      <Field label={t('profile:seeker.preferredLanguage')} className={fieldLabelCls}>
                        <select value={language} onChange={(e) => setLanguage(e.target.value)} className={inputCls}>
                          {LANGUAGES.map((l) => (
                            <option key={l.value} value={l.value}>
                              {l.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-6">
                      <ReadOnlyField label={t('taxonomy:category')} value={triple.category && categoryLabel(t, triple.category)} notProvided={t('profile:seeker.notProvided')} />
                      <ReadOnlyField label={t('taxonomy:sector')} value={triple.sector} notProvided={t('profile:seeker.notProvided')} />
                      <ReadOnlyField label={t('taxonomy:jobTitle')} value={triple.jobTitle} notProvided={t('profile:seeker.notProvided')} />
                      <ReadOnlyField label={t('profile:seeker.preferredLanguage')} value={LANGUAGES.find((l) => l.value === language)?.label} notProvided={t('profile:seeker.notProvided')} />
                    </div>
                  )}
                </div>
              </section>

              {/* Work experience */}
              <section className="bg-white border border-[#dddddd] rounded-[10px] p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className={sectionHeadingCls}>
                    <Briefcase className={sectionHeadingIconCls} /> {t('profile:seeker.workExperience')}
                    <VoiceButton label={t('profile:seeker.workExperienceVoiceLabel')} iconClassName="w-4 h-4 text-gray-500" className="p-1" />
                  </h2>
                  {editing && (
                    <button type="button" onClick={addExp} className="inline-flex items-center gap-1.5 min-h-[44px] text-sm text-primary-50 hover:text-primary-60">
                      <Plus className="w-4 h-4" /> {t('profile:seeker.add')}
                    </button>
                  )}
                </div>
                {experiences.length === 0 ? (
                  <p className="text-sm text-[#717182]">{t('profile:seeker.noExperience')}</p>
                ) : editing ? (
                  <div className="space-y-5">
                    {experiences.map((exp) => (
                      <div key={exp.key} className="border border-[#eee] rounded-lg p-4 relative">
                        <button
                          type="button"
                          onClick={() => removeExp(exp.key)}
                          className="absolute top-3 right-3 text-gray-400 hover:text-red-500"
                          aria-label={t('profile:seeker.removeExperience')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <Field label={t('profile:seeker.position')} className={fieldLabelCls}>
                            <input value={exp.position} onChange={(e) => setExp(exp.key, 'position', e.target.value)} maxLength={WORK_POSITION_MAX_LENGTH} placeholder={t('profile:seeker.positionPlaceholder')} className={inputCls} />
                          </Field>
                          <Field label={t('profile:seeker.company')} className={fieldLabelCls}>
                            <input value={exp.companyName ?? ''} onChange={(e) => setExp(exp.key, 'companyName', e.target.value)} maxLength={COMPANY_NAME_MAX_LENGTH} placeholder={t('profile:seeker.companyPlaceholder')} className={inputCls} />
                          </Field>
                          <Field label={t('profile:seeker.startDate')} className={fieldLabelCls}>
                            <DatePicker value={exp.startDate ?? ''} onChange={(v) => setExp(exp.key, 'startDate', v)} className={inputCls} />
                          </Field>
                          <Field label={t('profile:seeker.endDate')} className={fieldLabelCls}>
                            <DatePicker
                              value={exp.endDate ?? ''}
                              disabled={exp.currentlyWorking}
                              onChange={(v) => setExp(exp.key, 'endDate', v)}
                              className={`${inputCls} disabled:bg-gray-100`}
                            />
                          </Field>
                        </div>
                        <label className="flex items-center gap-2 mt-3 text-sm text-[#4d4d4d]">
                          <input
                            type="checkbox"
                            checked={!!exp.currentlyWorking}
                            onChange={(e) => setExp(exp.key, 'currentlyWorking', e.target.checked)}
                            className="w-4 h-4 accent-primary-50"
                          />
                          {t('profile:seeker.currentlyWorking')}
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {experiences.map((exp) => (
                      <div key={exp.key} className="bg-[#eaf6fd] rounded-lg p-4">
                        <p className="text-sm sm:text-base font-medium text-black">
                          {exp.position}
                          {exp.companyName ? ` — ${exp.companyName}` : ''}
                        </p>
                        <p className="text-xs text-[#3386a9] mt-0.5">
                          {monthYear(exp.startDate)} – {exp.currentlyWorking ? t('profile:seeker.present') : monthYear(exp.endDate) || t('profile:seeker.present')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {editing && <p className="text-xs text-[#717182] mt-3">{t('profile:seeker.experienceHint')}</p>}
              </section>

              {/* Save bar for profile + experience */}
              {editing && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving || lookingBusy}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors disabled:opacity-60"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {saving ? t('profile:seeker.saving') : t('buttons.saveChanges')}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={saving || lookingBusy}
                    className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-60"
                  >
                    {t('profile:seeker.cancel')}
                  </button>
                  {saved && (
                    <span className="inline-flex items-center gap-1.5 text-sm text-green-700">
                      <CheckCircle2 className="w-4 h-4" /> {t('profile:seeker.saved')}
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
                <h2 className={sectionHeadingCls + ' mb-4'}>
                  <FileText className={sectionHeadingIconCls} /> {t('profile:seeker.documents')}
                </h2>
                <DocumentsSection
                  allowedTypes={[...SEEKER_DOC_TYPES]}
                  accept=".pdf,.jpg,.jpeg,.png"
                  list={jobSeekerAPI.listDocuments}
                  upload={jobSeekerAPI.uploadDocument}
                  remove={jobSeekerAPI.deleteDocument}
                />
              </section>

              {/* Skills */}
              <section className="bg-white border border-[#dddddd] rounded-[10px] p-5 sm:p-6">
                <h2 className={sectionHeadingCls + ' mb-4'}>
                  <Sparkles className={sectionHeadingIconCls} /> {t('profile:seeker.skills')}
                </h2>
                {jobSeekerId === null ? (
                  <p className="text-sm text-[#717182]">{t('profile:seeker.skillsLocked')}</p>
                ) : (
                  <SkillsSection />
                )}
              </section>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer width="wide" />

      <EmailVerifyModal
        isOpen={emailModalMode !== null}
        onClose={() => setEmailModalMode(null)}
        mode={emailModalMode ?? 'add'}
        currentEmail={email || null}
        onSuccess={handleContactChanged}
      />

      <PhoneVerifyModal
        isOpen={phoneModalOpen}
        onClose={() => setPhoneModalOpen(false)}
        currentPhoneNumber={phoneNumber}
        onSuccess={handleContactChanged}
      />
    </div>
  )
}

// ---- Skills (my skills + catalog picker) ----------------------------------
function SkillsSection() {
  const { t } = useTranslation()
  const [mine, setMine] = useState<JobSeekerSkillLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [catalog, setCatalog] = useState<SkillCatalogItem[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadMine = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await jobSeekerAPI.getMySkills()
      setMine(Array.isArray(res) ? res : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : t('profile:seeker.skillsError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadMine()
  }, [loadMine])

  // Debounced catalog search while the picker is open.
  useEffect(() => {
    if (!showPicker) return
    let ignore = false
    setCatalogLoading(true)
    const t = window.setTimeout(async () => {
      try {
        const res = await jobSeekerAPI.getSkillsCatalog({ search: search.trim() || undefined, limit: 50 })
        if (!ignore) setCatalog(res.skills ?? [])
      } catch {
        if (!ignore) setCatalog([])
      } finally {
        if (!ignore) setCatalogLoading(false)
      }
    }, 300)
    return () => {
      ignore = true
      window.clearTimeout(t)
    }
  }, [search, showPicker])

  const mineSkillIds = new Set(mine.map((m) => m.skillId))

  const add = async (skillId: string) => {
    setBusyId(skillId)
    setError('')
    try {
      await jobSeekerAPI.addSkill(skillId)
      await loadMine()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('profile:seeker.addSkillError'))
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (link: JobSeekerSkillLink) => {
    setBusyId(link.id)
    setError('')
    try {
      await jobSeekerAPI.removeSkill(link.id)
      setMine((prev) => prev.filter((m) => m.id !== link.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('profile:seeker.removeSkillError'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      {error && (
        <div className="flex items-start gap-2 mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-[#717182] py-4">
          <Loader2 className="w-5 h-5 animate-spin" /> {t('profile:seeker.skillsLoading')}
        </div>
      ) : mine.length === 0 ? (
        <p className="text-sm text-[#717182] mb-3">{t('profile:seeker.noSkills')}</p>
      ) : (
        <div className="flex flex-wrap gap-2 mb-3">
          {mine.map((m) => (
            <span key={m.id} className="inline-flex items-center gap-1.5 bg-[#eaf6fd] text-[#236987] rounded-full pl-3 pr-2 py-1.5 text-sm">
              {m.skill?.name ?? t('profile:seeker.skillFallback')}
              <button
                type="button"
                onClick={() => remove(m)}
                disabled={busyId === m.id}
                aria-label={t('profile:seeker.removeSkill')}
                className="hover:text-red-600 disabled:opacity-50"
              >
                {busyId === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
              </button>
            </span>
          ))}
        </div>
      )}

      {!showPicker ? (
        <button type="button" onClick={() => setShowPicker(true)} className="inline-flex items-center gap-1.5 min-h-[44px] text-sm text-primary-50 hover:text-primary-60">
          <Plus className="w-4 h-4" /> {t('profile:seeker.addSkill')}
        </button>
      ) : (
        <div className="border border-[#eee] rounded-lg p-3 mt-2">
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('profile:seeker.searchSkills')}
                className="w-full h-10 pl-9 pr-3 border border-[#b5b5b5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-50"
              />
            </div>
            <button type="button" onClick={() => setShowPicker(false)} className="text-sm text-[#717182] hover:text-black px-2">
              {t('profile:seeker.done')}
            </button>
          </div>
          {catalogLoading ? (
            <div className="flex items-center gap-2 text-[#717182] py-3 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> {t('profile:seeker.searching')}
            </div>
          ) : catalog.length === 0 ? (
            <p className="text-sm text-[#717182] py-2">{t('profile:seeker.noSkillsFound')}</p>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-48 overflow-auto">
              {catalog.map((s) => {
                const already = mineSkillIds.has(s.id)
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={already || busyId === s.id}
                    onClick={() => add(s.id)}
                    className="inline-flex items-center gap-1.5 border border-gray-300 rounded-full px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {busyId === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    {s.name}
                    {already && <span className="text-xs text-[#717182]">{t('profile:seeker.added')}</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---- small presentational helpers -----------------------------------------

// The seeker's document-verification rollup (jobSeeker.documentVerificationStatus —
// distinct from a single document's own verificationStatus, shown per-row in
// DocumentsSection). Always renders a pill, including the not-submitted state, so
// the badge never silently disappears and never claims a status the account
// doesn't have.
const DOC_STATUS_STYLE: Record<string, string> = {
  NOT_SUBMITTED: 'bg-gray-100 text-gray-600',
  PENDING: 'bg-amber-50 text-amber-700',
  VERIFIED: 'bg-green-50 text-green-700',
  REJECTED: 'bg-red-50 text-red-700',
}

// The account-level status (root `accountStatus`, distinct from the document
// rollup below). Deliberately subtler than DocStatusBadge's pill — a dot plus
// text, sitting under the name rather than fighting the doc-status badge for
// attention — since a seeker who can reach this page is active the vast
// majority of the time and this is background information, not a call to act.
const ACCOUNT_STATUS_DOT: Record<string, string> = {
  ACTIVE: 'bg-green-500',
  SUSPENDED: 'bg-red-500',
}

function DocStatusBadge({ status }: { status: string | null }) {
  const { t } = useTranslation()
  const key = status && status in DOC_STATUS_STYLE ? status : 'NOT_SUBMITTED'
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap ${DOC_STATUS_STYLE[key]}`}>
      {key === 'VERIFIED' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <FileWarning className="w-3.5 h-3.5" />}
      {t(`profile:seeker.documentStatus.${key}`)}
    </span>
  )
}

export default function SeekerProfilePage() {
  return (
    <ProtectedRoute requiredRole="seeker">
      <SeekerProfileContent />
    </ProtectedRoute>
  )
}
