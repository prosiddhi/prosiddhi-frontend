'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useState, useEffect, useLayoutEffect, useRef, useCallback, type ChangeEvent } from 'react'
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
import { CardControls, ProfileCard } from '@/components/profile/ProfileCard'
import {
  seekerInputCls,
  seekerLabelCls,
  seekerSharedFieldsCls,
  seekerCityChipsCls,
} from '@/components/profile/profileStyles'
import { useAuth } from '@/contexts/AuthContext'
import {
  PROFILE_READ_TIMEOUT_MS,
  PROFILE_WRITE_TIMEOUT_MS,
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
import { saveFailureKind } from '@/lib/jobPreferences'
import { nearestCityNote, useNearestCity } from '@/hooks/useNearestCity'
import { UseMyLocation } from '@/components/location/UseMyLocation'
import {
  StateCitySelect,
  cityDisplayName,
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
  Home,
  MapPin,
  Briefcase,
  Building2,
  FileWarning,
  Phone,
  Mail,
  FileText,
  Sparkles,
} from 'lucide-react'
import { COMPANY_NAME_MAX_LENGTH, WORK_POSITION_MAX_LENGTH } from '@/lib/businessIdentifiers'
import { NAME_MAX_LENGTH } from '@/lib/nameValidation'
import {
  CARD_IDS,
  aboutProblem,
  experienceProblem,
  bodyLanded,
  cardActivity,
  cardDirty,
  cardPatch,
  draftFromProfile,
  focusTargetAfter,
  idleCardUi,
  isCardLocked,
  patchIsEmpty,
  rebaseCards,
  sameCardDraft,
  slicesToApply,
  type AboutProblem,
  type ExperienceProblem,
  type CardId,
  type CardUi,
  type DraftValues,
  type FocusOutcome,
  type FocusTarget,
  type SavedValues,
} from '@/lib/profileCards'
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

// What aboutProblem found, as the copy this page has always shown for it.
const ABOUT_PROBLEM_KEY: Record<AboutProblem, string> = {
  nameTooShort: 'auth:profile.errorName',
  nameNotAName: 'auth:profile.errorNameLetters',
  dobUnder18: 'profile:seeker.errorDobAge',
}
// What experienceProblem found, as the copy for it (the row number goes into the text).
const EXPERIENCE_PROBLEM_KEY: Record<ExperienceProblem, string> = {
  position: 'profile:seeker.experienceProblem.position',
  startDate: 'profile:seeker.experienceProblem.startDate',
  endDate: 'profile:seeker.experienceProblem.endDate',
}

// SUSPENDED is the only other state a seeker who can reach this page could
// realistically be in — every PENDING_* status blocks login before this point.
// A value outside both is shown verbatim rather than guessed at.
const ACCOUNT_STATUS_LABEL_KEY: Record<string, string> = {
  ACTIVE: 'profile:seeker.accountStatus.ACTIVE',
  SUSPENDED: 'profile:seeker.accountStatus.SUSPENDED',
}

// Where each focus target is found inside its card's section, most wanted first. A selector that
// matches only disabled controls is skipped, so a picker still loading falls through to the next.
const FOCUS_SELECTORS: Record<FocusTarget, string[]> = {
  edit: ['[data-focus="edit"]'],
  save: ['[data-focus="save"]'],
  checkAgain: ['[data-focus="checkAgain"]'],
  name: ['[data-focus="name"]'],
  dateOfBirth: ['#profile-about-dob'],
  first: ['fieldset input:not([type="hidden"]), fieldset select, fieldset textarea', '[data-focus="add"]', 'fieldset button'],
}
// Targets that move focus INTO a field on purpose; every other target must not pull it out of one.
const FOCUS_INTO_FIELD: FocusTarget[] = ['first', 'name', 'dateOfBirth']

function usableElement(section: Element, selector: string): HTMLElement | null {
  for (const el of section.querySelectorAll<HTMLElement>(selector)) {
    if (!(el as HTMLButtonElement).disabled && el.getAttribute('aria-disabled') !== 'true') return el
  }
  return null
}

// How settleCard ended, for focus: applied (the server's values are shown), notApplied (a write that
// did not land), keptDraft (the seeker kept typing while the request was out) or none.
type SettleResult = 'applied' | 'notApplied' | 'keptDraft' | 'none'

// Each card's title as plain text, for a button's accessible name.
const CARD_TITLE: Record<CardId, string> = {
  about: 'profile:seeker.cards.aboutMeTitle',
  home: 'profile:seeker.cards.homeTitle',
  workCities: 'profile:seeker.preferredCities',
  job: 'profile:seeker.cards.jobTitle',
  experience: 'profile:seeker.workExperience',
}

function SeekerProfileContent() {
  const { t, i18n } = useTranslation()
  const { user, updateUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  // Each card's own edit mode and save status. Photo, Documents and Skills persist immediately
  // per-action and stay interactive. `cardUiRef` is the truth and setCardState writes it
  // synchronously, so code that runs after an await (a refresh, a save) reads the value as of now,
  // not as of the last render. `cardUi` is the same value for rendering.
  const cardUiRef = useRef(idleCardUi())
  const [cardUi, setCardUi] = useState(idleCardUi)
  // One write at a time: a card save or the actively-looking switch. Taken synchronously before the
  // request starts and released in a finally. Both have time limits, so a stalled request cannot
  // hold it for good.
  const writeLockRef = useRef(false)
  // The same fact for rendering (a Save that cannot start is shown disabled).
  const [writeBusy, setWriteBusy] = useState(false)
  // What was sent for a card whose write has an unconfirmed outcome, kept so that "Check again" can
  // compare it with what the server holds. The write itself is never repeated.
  const unknownBodyRef = useRef<Partial<Record<CardId, SeekerProfileUpdate>>>({})
  // Keyboard focus. A handler never calls .focus(): when an action ends it leaves
  // the card and the target here, and a layout effect moves focus once the render has committed.
  // The counter is bumped when a card's action starts; an end that carries an older number is stale
  // (a newer action took over) and leaves nothing.
  const focusIntentRef = useRef<{ card: CardId; target: FocusTarget } | null>(null)
  const focusTokenRef = useRef<Record<CardId, number>>({ about: 0, home: 0, workCities: 0, job: 0, experience: 0 })
  // Counts the writes that have finished. A profile read that started before one finished may
  // predate it, so refreshProfile looks at this around its request.
  const writeGenRef = useRef(0)

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
  // Why the last photo was refused. Its own message under the avatar: a card's
  // save error sits in that card, and the camera button works any time.
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
  // separate things with two separate saves. `savedValues` is what the server holds; a field is
  // sent only when it differs from that, because the BE replaces the whole preferred list when
  // the key is present and rewrites location + coordinates when `cityId` is.
  const [homeCity, setHomeCity] = useState<SelectedCity | null>(null)
  // The one saved snapshot, written only by commitSaved: a full load, a refresh, or one card's
  // successful save. Null until the first load, and nothing can be edited before that.
  const [savedValues, setSavedValues] = useState<SavedValues | null>(null)
  // The same value, written in the same call, for code that runs after an await.
  const savedRef = useRef<SavedValues | null>(null)
  const savedHomeCity = savedValues?.homeCity ?? null
  // The seeker pressed "Remove my saved city". Only this clears the city on the server: the
  // picker also empties the city by itself whenever the State select changes, and someone just
  // looking at another state must not lose the city they saved.
  const [homeCityRemoved, setHomeCityRemoved] = useState(false)
  const [preferredCities, setPreferredCities] = useState<SelectedCity[]>([])
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
  // What a finished "Use my location" lookup does. While the home card is saving, being read back or
  // held, its draft is what a request is judging, so a late answer is not put into it.
  const onLookupFound = useCallback(
    (city: SelectedCity) => {
      if (isCardLocked(cardUiRef.current.home.status)) return
      applyHomeCity(city)
    },
    [applyHomeCity]
  )
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
  } = useNearestCity(onLookupFound)
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
  // value the server sent us. See aboutProblem.
  const originalFullName = useRef('')

  // What the seeker is editing, as the card functions take it. Rebuilt every render.
  const draft: DraftValues = {
    fullName,
    bio,
    dateOfBirth,
    gender,
    homeCity,
    homeCityRemoved,
    preferredCities,
    triple,
    language,
    experiences,
  }
  // The latest draft, for code that runs after an await and so would otherwise read the values of
  // the render that started it. A layout effect runs inside the commit, so there is no gap between
  // a render and the ref holding it for a response to land in.
  const draftRef = useRef<DraftValues | null>(null)
  useLayoutEffect(() => {
    draftRef.current = draft
  })

  const commitSaved = useCallback((next: SavedValues) => {
    savedRef.current = next
    setSavedValues(next)
  }, [])
  // Every card back to view mode with nothing in flight or held (a full load replaces them all).
  const resetCards = useCallback(() => {
    cardUiRef.current = idleCardUi()
    setCardUi(cardUiRef.current)
    unknownBodyRef.current = {}
  }, [])

  // Everything on the page that is not one of the five cards' fields.
  const hydrateShell = useCallback((p: SeekerProfile) => {
    const js = p.jobSeeker
    setJobSeekerId(js?.id ?? null)
    setEmail(p.email ?? '')
    setEmailVerified(p.emailVerified ?? false)
    setPhoneNumber(p.phoneNumber ?? '')
    setPhoneVerified(p.phoneVerified ?? false)
    setDocumentVerificationStatus(js?.documentVerificationStatus ?? null)
    setPhoto(js?.profilePhoto ?? null)
    setProfileUpdatedAt(js?.updatedAt ?? null)
    setAccountStatus(p.accountStatus ?? null)
    // While the switch's own save is running it owns the value: a re-fetch that was read
    // before that save committed would otherwise flip it back to the old one.
    if (!lookingBusyRef.current) setActivelyLooking(js?.isActivelyLooking ?? false)
  }, [])

  // One card's fields, set from `s`. The form gets copies: the snapshot is the baseline and must
  // not change when a field does.
  const applyCardValues = useCallback(
    (card: CardId, s: SavedValues) => {
      switch (card) {
        case 'about':
          setFullName(s.fullName)
          originalFullName.current = s.fullName.trim()
          setBio(s.bio)
          setDateOfBirth(s.dateOfBirth)
          setGender(s.gender)
          break
        case 'home':
          setLocation(s.location)
          setHomeCity(s.homeCity && { ...s.homeCity })
          setHomeCityRemoved(false)
          // A lookup belongs to the edit session that started it, not to the record just loaded.
          cancelLocate()
          break
        case 'workCities':
          setPreferredCities(s.preferredCities.map((c) => ({ ...c })))
          break
        case 'job':
          setTriple({ ...s.triple })
          setLanguage(s.language)
          break
        case 'experience':
          setExperiences(s.experiences.map((w) => ({ key: newKey(), ...w })))
          break
      }
    },
    [cancelLocate]
  )

  // The whole form from a profile: the first load, and a refresh before anything has loaded.
  const hydrate = useCallback(
    (p: SeekerProfile) => {
      // The server's values as the form's fields: one mapping, shared with the per-card code.
      const saved = draftFromProfile(p)
      hydrateShell(p)
      commitSaved(saved)
      for (const card of CARD_IDS) applyCardValues(card, saved)
      resetCards()
    },
    [hydrateShell, applyCardValues, commitSaved, resetCards]
  )

  // A profile fetched while the seeker may be editing. The page-wide fields are
  // always replaced. A card takes the new values only if it is not in edit mode, has no changes and
  // is not saving; the others keep their draft and the snapshot they are judged against.
  const refreshCards = (p: SeekerProfile) => {
    const saved = savedRef.current
    const current = draftRef.current
    // Nothing loaded yet, so nothing to protect.
    if (!saved || !current) {
      hydrate(p)
      return
    }
    const fresh = draftFromProfile(p)
    // Asked of the snapshot the seeker has been editing from, before the fresh one replaces it.
    const apply = slicesToApply(cardActivity(cardUiRef.current, current, saved))
    hydrateShell(p)
    for (const card of apply) applyCardValues(card, fresh)
    commitSaved(rebaseCards(saved, fresh, apply))
  }

  // ---- One card's Edit, Save and Cancel. ----
  const acquireWrite = () => {
    if (writeLockRef.current) return false
    writeLockRef.current = true
    setWriteBusy(true)
    return true
  }
  const releaseWrite = () => {
    writeLockRef.current = false
    writeGenRef.current++
    setWriteBusy(false)
  }
  const setCardState = (card: CardId, patch: Partial<CardUi>) => {
    cardUiRef.current = { ...cardUiRef.current, [card]: { ...cardUiRef.current[card], ...patch } }
    setCardUi(cardUiRef.current)
  }
  const beginFocusAction = (card: CardId) => ++focusTokenRef.current[card]
  const focusAfter = (card: CardId, token: number, outcome: FocusOutcome) => {
    if (focusTokenRef.current[card] !== token) return
    focusIntentRef.current = { card, target: focusTargetAfter(outcome) }
  }
  const cardBusy = (card: CardId) => isCardLocked(cardUi[card].status)

  // Back to the card's saved values. The other cards' drafts are not touched. A card whose write is
  // in flight, being read back, or not confirmed is left alone: the write may still land.
  const cancelCard = (card: CardId, token = beginFocusAction(card)) => {
    const saved = savedRef.current
    if (!saved || isCardLocked(cardUiRef.current[card].status)) return
    applyCardValues(card, saved)
    setCardState(card, { editing: false, status: 'idle', error: '', note: '' })
    focusAfter(card, token, { kind: 'cancel' })
  }

  // The outcome of a write is not known. Hold the card (no Save, no Cancel, no refresh) with the
  // body that was sent; only a read of the server settles it.
  const holdUnknown = (card: CardId, body: SeekerProfileUpdate, token = beginFocusAction(card)) => {
    unknownBodyRef.current[card] = body
    setCardState(card, { status: 'unknown', error: t('profile:seeker.saveUnknown'), note: '', held: true })
    focusAfter(card, token, { kind: 'save', outcome: 'unknown' })
  }

  // Takes what the server holds for ONE card: its baseline moves to the server's values and the
  // page-wide fields follow; no other card changes. With `sent` (a write that was not confirmed) the
  // server's values are first compared with it: if they match the write landed and the card shows
  // them; if not, the write did not land (or was changed since), so the seeker's draft stays for
  // another try.
  const settleCard = (
    card: CardId,
    fresh: SeekerProfile,
    done: {
      status: 'saved' | 'idle'
      note?: string
      sent?: SeekerProfileUpdate
      shell?: boolean
      /** The draft when the request started: a newer one is the seeker's and is kept. */
      started: DraftValues
      /** The write counter when a read started: a write that finished since makes it stale. */
      readGen?: number
    }
  ): SettleResult => {
    const base = savedRef.current
    if (!base) return 'none'
    const values = draftFromProfile(fresh)
    // The page-wide fields follow this read only if no write is in flight and none
    // finished while it was out (the card save that just finished holds the lock, and says so with
    // `shell`).
    if (done.shell ?? (!writeLockRef.current && (done.readGen === undefined || done.readGen === writeGenRef.current))) {
      hydrateShell(fresh)
    }
    commitSaved(rebaseCards(base, values, [card]))
    if (done.sent && !bodyLanded(done.sent, values)) {
      setCardState(card, { status: 'error', error: t('profile:seeker.saveNotApplied'), note: '' })
      return 'notApplied'
    }
    if (card === 'about') {
      updateUser({
        profile: {
          ...user?.profile,
          fullName: fresh.jobSeeker?.fullName,
          profilePhoto: fresh.jobSeeker?.profilePhoto,
        },
      })
    }
    // Edited since the request started: the baseline is now what the server confirmed, and the newer
    // draft stays as the seeker's unsaved change (the card is still being edited, not "saved").
    const current = draftRef.current
    if (current && !sameCardDraft(card, current, done.started)) {
      if (card === 'about') originalFullName.current = values.fullName.trim()
      setCardState(card, { editing: true, status: 'idle', error: '', note: '' })
      return 'keptDraft'
    }
    applyCardValues(card, values)
    setCardState(card, { editing: false, status: done.status, error: '', note: done.note ?? '' })
    return 'applied'
  }

  // A card with nothing changed sends nothing: its draft may be older than the server's, and a save
  // of the whole card (the experience list, the About fields) would write the old copy over it.
  // Read the profile instead and show what the server holds.
  const syncCard = async (card: CardId, note = '', token = beginFocusAction(card)) => {
    setCardState(card, { status: 'checking', error: '', note: '' })
    if (card === 'home') cancelLocate()
    const readGen = writeGenRef.current
    try {
      const fresh = await jobSeekerAPI.getProfile({ timeoutMs: PROFILE_READ_TIMEOUT_MS })
      const result = settleCard(card, fresh, { status: 'idle', note, started: draft, readGen })
      if (result === 'applied') focusAfter(card, token, { kind: 'save', outcome: 'saved' })
    } catch (err) {
      setCardState(card, { status: 'error', error: err instanceof Error ? err.message : t('profile:seeker.loadError') })
      focusAfter(card, token, { kind: 'save', outcome: 'error' })
    }
  }

  // "Check again" for a card whose write is not confirmed: a read only, never the write again.
  const checkCard = async (card: CardId) => {
    const sent = unknownBodyRef.current[card]
    if (!savedRef.current || !sent || cardUiRef.current[card].status !== 'unknown') return
    const token = beginFocusAction(card)
    setCardState(card, { status: 'checking', error: '', note: '' })
    if (card === 'home') cancelLocate()
    const readGen = writeGenRef.current
    try {
      const fresh = await jobSeekerAPI.getProfile({ timeoutMs: PROFILE_READ_TIMEOUT_MS })
      const result = settleCard(card, fresh, { status: 'saved', sent, started: draft, readGen })
      unknownBodyRef.current[card] = undefined
      setCardState(card, { held: undefined })
      if (result === 'applied') focusAfter(card, token, { kind: 'check', outcome: 'landed' })
      else if (result === 'notApplied') focusAfter(card, token, { kind: 'check', outcome: 'notApplied' })
    } catch {
      setCardState(card, { status: 'unknown', error: t('profile:seeker.saveUnknown') })
      focusAfter(card, token, { kind: 'check', outcome: 'readFailed' })
    }
  }

  // Sends this card's part of the body, judged against the saved snapshot, and on
  // success moves only this card's baseline. A definite refusal leaves the draft and the baseline as
  // they were. A write whose outcome is unknown (a timeout, no answer, a gateway error, or an
  // accepted write that cannot be read back) is not repeated: the card waits for checkCard.
  const saveCard = async (card: CardId) => {
    const saved = savedRef.current
    if (!saved || isCardLocked(cardUiRef.current[card].status)) return
    const token = beginFocusAction(card)
    if (!cardDirty(card, draft, saved)) {
      // The city picker emptied without Remove is "unchanged": the saved city stays, and the seeker is told.
      const cityKept = card === 'home' && !!saved.homeCity && !draft.homeCity && !draft.homeCityRemoved
      await syncCard(card, cityKept ? t('profile:seeker.homeCityKept') : '', token)
      return
    }
    if (card === 'about') {
      const problem = aboutProblem(draft, originalFullName.current)
      if (problem) {
        setCardState(card, { status: 'error', error: t(ABOUT_PROBLEM_KEY[problem]) })
        focusAfter(card, token, { kind: 'save', outcome: 'invalid', problem })
        return
      }
    }
    if (card === 'experience') {
      // A row that is filled in only in part would be dropped from the body, and the list replaces the saved
      // one, so it is refused here instead. The draft stays for the seeker to finish. A saved row left alone
      // is not asked for an end date it never had.
      const found = experienceProblem(draft.experiences, saved.experiences)
      if (found) {
        setCardState(card, { status: 'error', error: t(EXPERIENCE_PROBLEM_KEY[found.problem], { row: found.row }) })
        focusAfter(card, token, { kind: 'save', outcome: 'invalid' })
        return
      }
    }
    const body = cardPatch(card, draft, saved)
    if (patchIsEmpty(body)) {
      // Changed, but nothing the server accepts (a cleared category, say): the saved value stands.
      cancelCard(card, token)
      return
    }
    if (!acquireWrite()) return
    setCardState(card, { status: 'saving', error: '', note: '' })
    if (card === 'home') cancelLocate()
    try {
      try {
        await jobSeekerAPI.updateProfile(body, { timeoutMs: PROFILE_WRITE_TIMEOUT_MS })
      } catch (err) {
        const kind = saveFailureKind(err)
        if (kind === 'consent') {
          // Nothing was written. ConsentGate asks the person to accept; the draft stays for a retry.
          setCardState(card, { status: 'idle', error: '' })
        } else if (kind === 'definite') {
          setCardState(card, { status: 'error', error: err instanceof Error ? err.message : t('profile:seeker.saveError') })
          focusAfter(card, token, { kind: 'save', outcome: 'error' })
        } else {
          holdUnknown(card, body, token)
        }
        return
      }
      // The server accepted the write. From here a failure is only about reading it back.
      let fresh: SeekerProfile
      try {
        fresh = await jobSeekerAPI.getProfile({ timeoutMs: PROFILE_READ_TIMEOUT_MS })
      } catch {
        holdUnknown(card, body, token)
        return
      }
      try {
        const result = settleCard(card, fresh, { status: 'saved', shell: true, started: draft })
        if (result === 'applied') focusAfter(card, token, { kind: 'save', outcome: 'saved' })
      } catch {
        // The write was accepted but what came back could not be applied, so what the server holds
        // is not known here: hold the card for "Check again" (never leave it in "saving").
        holdUnknown(card, body, token)
      }
    } finally {
      releaseWrite()
    }
  }

  useEffect(() => {
    let ignore = false
    const run = async () => {
      setLoading(true)
      setLoadError('')
      try {
        const p = await jobSeekerAPI.getProfile()
        if (!ignore) {
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
  const blankExp = (): ExpRow => ({ key: newKey(), position: '', companyName: '', startDate: '', endDate: '', currentlyWorking: false, description: '' })
  const addExp = () => setExperiences((rows) => [...rows, blankExp()])
  const removeExp = (key: string) => setExperiences((rows) => rows.filter((r) => r.key !== key))

  // Only the one key goes out. On failure the switch goes back to what it was.
  const toggleActivelyLooking = async (next: boolean) => {
    if (lookingBusyRef.current || !acquireWrite()) return
    const previous = activelyLooking
    lookingBusyRef.current = true
    setLookingBusy(true)
    setActivelyLooking(next)
    try {
      await jobSeekerAPI.updateProfile({ isActivelyLooking: next }, { timeoutMs: PROFILE_WRITE_TIMEOUT_MS })
      showToast(t('profile:seeker.saved'), 'success')
    } catch {
      setActivelyLooking(previous)
      showToast(t('settings.notifications.updateFailed'), 'error')
    } finally {
      lookingBusyRef.current = false
      setLookingBusy(false)
      releaseWrite()
    }
  }

  // Called by EmailVerifyModal / PhoneVerifyModal after a successful change. The
  // BE call that got us here does not return the full profile shape, so refetch
  // rather than patch local state.
  const refreshProfile = async () => {
    const gen = writeGenRef.current
    let fresh = await jobSeekerAPI.getProfile()
    // A card save or the switch can finish while this request is out, and what it read may
    // predate that write. That write is done now, so one more read is current.
    if (writeGenRef.current !== gen) fresh = await jobSeekerAPI.getProfile()
    refreshCards(fresh)
    return fresh
  }

  // The session user keeps the email/phone it was given at login, so push the new
  // ones there too — Settings, checkout and the invite page read them from it.
  const handleContactChanged = async () => {
    const fresh = await refreshProfile()
    updateUser({ email: fresh.email, phoneNumber: fresh.phoneNumber })
  }

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

  const cardEditing = (card: CardId) => cardUi[card].editing

  // Opens one card for editing. This is the "next edit" that clears a lingering Saved or note.
  const startEdit = (card: CardId) => {
    if (!savedRef.current || isCardLocked(cardUiRef.current[card].status)) return
    const token = beginFocusAction(card)
    // An empty Work Experience card opens on one blank row, so its fields are there to fill in. The row
    // is not a change until something is typed in it, and Cancel drops it with the rest of the draft.
    if (card === 'experience' && experiences.length === 0) setExperiences([blankExp()])
    setCardState(card, { editing: true, status: 'idle', error: '', note: '' })
    focusAfter(card, token, { kind: 'edit' })
  }

  // Moves keyboard focus once an action has ended and its render has committed. Every action leaves
  // an intent (focusAfter); this is the only place that calls .focus(). It does nothing when the card
  // is gone, when focus has gone to another card or control on purpose, or when the target is
  // missing or disabled.
  useLayoutEffect(() => {
    const intent = focusIntentRef.current
    if (!intent) return
    focusIntentRef.current = null
    const section = document.querySelector(`[data-profile-card="${intent.card}"]`)
    if (!section) return
    const active = document.activeElement
    if (active && active !== document.body) {
      // Focus is on something else: another card, or the page. Leave it there.
      if (!section.contains(active)) return
      // Focus is in a field of this card (the seeker is typing): only a move INTO a field may take it.
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(active.tagName) && !FOCUS_INTO_FIELD.includes(intent.target)) return
    }
    for (const selector of FOCUS_SELECTORS[intent.target]) {
      const el = usableElement(section, selector)
      if (el) {
        el.focus()
        return
      }
    }
  }, [cardUi])

  // The header button that opens a card (view mode only). A card with nothing in it yet offers
  // "+ Add" instead of "Edit"; both open the same edit mode.
  const editAction = (card: CardId, empty = false) =>
    !cardUi[card].editing ? (
      <button
        key="edit"
        type="button"
        data-focus="edit"
        onClick={() => startEdit(card)}
        disabled={!savedValues || isCardLocked(cardUi[card].status)}
        aria-label={t(empty ? 'profile:seeker.addSection' : 'profile:seeker.editSection', { section: t(CARD_TITLE[card]) })}
        className="inline-flex items-center gap-1.5 min-h-[44px] px-2 text-sm font-medium text-primary-50 hover:text-primary-60 disabled:opacity-60"
      >
        {empty ? <Plus className="w-4 h-4" /> : <Pencil className="w-4 h-4" />} {t(empty ? 'profile:seeker.add' : 'profile:seeker.edit')}
      </button>
    ) : undefined

  // Save, Cancel, Check again and the status line, below the card's fields (outside its fieldset).
  const cardFooter = (card: CardId) => {
    const ui = cardUi[card]
    return (
      <CardControls
        card={card}
        editing={ui.editing}
        status={ui.status}
        error={ui.error}
        note={ui.note}
        canCheck={ui.held === true}
        saveDisabled={writeBusy || lookingBusy}
        labels={{
          save: t('buttons.saveChanges'),
          saving: t('profile:seeker.saving'),
          cancel: t('profile:seeker.cancel'),
          checkAgain: t('profile:seeker.checkAgain'),
          checking: t('profile:seeker.checking'),
          saved: t('profile:seeker.saved'),
        }}
        onSave={saveCard}
        onCancel={cancelCard}
        onCheck={checkCard}
      />
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <EmployeeHeader />

      <main className="flex-1 pt-[clamp(16px,5.33px_+_1.67vw,32px)] pb-[clamp(24px,8px_+_2.5vw,48px)]">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px]">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-[clamp(16px,8px_+_1.25vw,28px)]">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-bold leading-snug text-black">{t('profile:seeker.heading')}</h1>
              <p className="text-sm leading-relaxed text-[#717182] mt-2">{t('profile:seeker.subtitle')}</p>
              {profileUpdatedAt && (
                <p className="text-xs leading-relaxed text-[#a3a3a3] mt-1.5">
                  {t('profile:seeker.lastUpdated', { date: formatUpdatedAt(profileUpdatedAt) })}
                </p>
              )}
            </div>
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
              {/* Profile summary sidebar — avatar, name, phone, email, document-verification status.
                  A row on a phone (small photo beside the text) so it does not push every card
                  a screen down; the tall centred column from `sm` up. */}
              <aside className="bg-white border border-[#dddddd] rounded-xl p-4 sm:p-6 flex flex-col items-center text-center">
                <div className="flex w-full items-center gap-4 sm:flex-col sm:gap-0">
                  <div className="relative w-20 h-20 sm:w-32 sm:h-32 flex-shrink-0">
                    <div className="w-full h-full rounded-full bg-[#a9e5ff] overflow-hidden flex items-center justify-center">
                      {photo ? (
                        // unoptimized: the BE may return an absolute GCS/CDN photo URL outside images.remotePatterns.
                        <Image src={resolveMediaUrl(photo)} alt="Profile photo" fill unoptimized className="object-cover" />
                      ) : (
                        <span className="text-3xl sm:text-4xl font-semibold text-[#236987]">
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
                      className="absolute -bottom-2 -right-2 sm:bottom-0 sm:right-0 w-11 h-11 sm:w-9 sm:h-9 rounded-full bg-white text-primary-50 flex items-center justify-center border border-[#dddddd] shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-60"
                    >
                      {photoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col items-start text-left sm:items-center sm:text-center sm:flex-none sm:w-full">
                    <p className="text-xl font-semibold text-black sm:mt-5 break-words">
                      {fullName || t('profile:seeker.fullNamePlaceholder')}
                    </p>
                    <AccountStatusIndicator
                      label={accountStatus ? (ACCOUNT_STATUS_LABEL_KEY[accountStatus] ? t(ACCOUNT_STATUS_LABEL_KEY[accountStatus]) : accountStatus) : null}
                      dotClassName={accountStatus ? (ACCOUNT_STATUS_DOT[accountStatus] ?? 'bg-gray-400') : 'bg-gray-400'}
                    />
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 sm:mt-2.5 sm:justify-center text-sm text-[#717182] max-w-full">
                      {phoneNumber && (
                        <span className="inline-flex items-center gap-1.5 flex-shrink-0">
                          <Phone className="w-3.5 h-3.5" /> {phoneNumber}
                        </span>
                      )}
                      {phoneNumber && email && <span className="hidden sm:inline text-[#dddddd]">|</span>}
                      {email && (
                        <Tooltip content={email}>
                          <span className="inline-flex items-center gap-1.5 min-w-0 max-w-full">
                            <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate min-w-0">{email}</span>
                          </span>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </div>
                {photoError && photoError.lang === i18n.language && (
                  <p role="alert" className="mt-3 flex items-start gap-1.5 text-sm text-red-600 text-left">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{photoError.message}</span>
                  </p>
                )}
                <div className="w-full mt-4 pt-4 sm:mt-6 sm:pt-5 border-t border-[#eee] text-left sm:text-center">
                  <DocStatusBadge status={documentVerificationStatus} />
                </div>
              </aside>

              <div className="space-y-4 sm:space-y-6 min-w-0">
              <section className="bg-white border border-[#dddddd] rounded-[10px] px-5 sm:px-6">
                <ToggleSwitch
                  label={t('profile:seeker.activelyLooking.title')}
                  description={t('profile:seeker.activelyLooking.description')}
                  checked={activelyLooking}
                  busy={lookingBusy || writeBusy}
                  onChange={toggleActivelyLooking}
                />
              </section>

              {/* About me */}
              <ProfileCard
                icon={User}
                title={t('profile:seeker.cards.aboutMeTitle')}
                help={t('profile:seeker.cards.aboutMeHelp')}
                busy={cardBusy('about')}
                cardId="about"
                legend={t('profile:seeker.cards.aboutMeTitle')}
                footer={cardFooter('about')}
                action={editAction('about')}
              >
                {cardEditing('about') ? (
                  <>
                    <div className={`grid sm:grid-cols-2 gap-x-6 gap-y-5 ${seekerSharedFieldsCls}`}>
                      <Field label={t('profile:seeker.fullName')} className={seekerLabelCls}>
                        <input value={fullName} data-focus="name" onChange={(e) => setFullName(e.target.value)} maxLength={NAME_MAX_LENGTH} placeholder={t('profile:seeker.fullNamePlaceholder')} className={seekerInputCls} />
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
                      <Field label={t('profile:seeker.dateOfBirth')} className={seekerLabelCls}>
                        <DatePicker
                          id="profile-about-dob"
                          value={dateOfBirth}
                          defaultMonth={yearsAgoISO(18)}
                          disabled={cardBusy('about')}
                          onChange={setDateOfBirth}
                          className={seekerInputCls}
                        />
                      </Field>
                      <Field label={t('profile:seeker.gender')} className={seekerLabelCls}>
                        <select
                          value={gender}
                          onChange={(e) => setGender(e.target.value as typeof gender)}
                          className={seekerInputCls}
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
                    <div className="mt-5 pt-5 border-t border-[#eee]">
                      <Field label={t('profile:seeker.aboutYou')} className={seekerLabelCls}>
                        <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} rows={3} placeholder={t('profile:seeker.aboutYouPlaceholder')} className="w-full px-3 py-2 border border-[#b5b5b5] rounded-lg text-base sm:text-sm text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all resize-none" />
                      </Field>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={`grid sm:grid-cols-2 gap-x-6 gap-y-5 ${seekerSharedFieldsCls}`}>
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
                      <ReadOnlyField label={t('profile:seeker.dateOfBirth')} value={formatDateOfBirth(dateOfBirth)} notProvided={t('profile:seeker.notProvided')} />
                      <ReadOnlyField label={t('profile:seeker.gender')} value={genderLabel(t, gender)} notProvided={t('profile:seeker.notProvided')} />
                    </div>
                    <div className={`mt-5 pt-5 border-t border-[#eee] ${seekerSharedFieldsCls}`}>
                      <ReadOnlyField label={t('profile:seeker.aboutYou')} value={bio} notProvided={t('profile:seeker.notProvided')} />
                    </div>
                  </>
                )}
              </ProfileCard>

              {/* Where I live. Home city: where the seeker LIVES. Not the same thing as the
                  cities they want to work in, which is the next card. */}
              <ProfileCard
                icon={Home}
                title={t('profile:seeker.cards.homeTitle')}
                help={t('profile:seeker.cards.homeHelp')}
                busy={cardBusy('home')}
                cardId="home"
                legend={t('profile:seeker.cards.homeTitle')}
                footer={cardFooter('home')}
                action={editAction('home')}
              >
                {cardEditing('home') ? (
                  <div>
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
                      selectClassName={seekerInputCls}
                      labelClassName={seekerLabelCls}
                    />
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <UseMyLocation onLocated={locate} onRequest={beginLocate} disabled={locating} />
                      {/* The only way to clear a saved city: emptying the picker is not one,
                          because changing the State select empties it too. */}
                      {savedHomeCity && !homeCityRemoved && (
                        <button
                          type="button"
                          onClick={removeHomeCity}
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
                      className={`text-sm mt-1.5 ${locationNote ? (locationNote.ok ? 'text-green-700' : 'text-red-600') : 'text-[#717182]'}`}
                      role="status"
                    >
                      {locating
                        ? t('profile:seeker.locationLookingUp')
                        : (locationNote?.text ?? t('profile:seeker.locationHint'))}
                    </p>
                  </div>
                ) : (
                  // "City, State" once a city is picked; the legacy text until then.
                  <p className="text-base font-medium text-black break-words">
                    {(homeCity ? cityDisplayName(homeCity) : location) || t('profile:seeker.notProvided')}
                  </p>
                )}
              </ProfileCard>

              {/* Where I want to work. Preferred work cities: where the seeker WANTS to work.
                  Employers see these, never the home city above. */}
              <ProfileCard
                icon={MapPin}
                title={t('profile:seeker.preferredCities')}
                help={cardEditing('workCities') ? t('profile:seeker.preferredCitiesHint') : undefined}
                busy={cardBusy('workCities')}
                cardId="workCities"
                legend={t('profile:seeker.preferredCities')}
                footer={cardFooter('workCities')}
                action={editAction('workCities', preferredCities.length === 0)}
              >
                {cardEditing('workCities') ? (
                  <StateCitySelect
                    multiple
                    max={3}
                    value={preferredCities}
                    onChange={setPreferredCities}
                    className={seekerCityChipsCls}
                    selectClassName={seekerInputCls}
                    labelClassName={seekerLabelCls}
                  />
                ) : preferredCities.length > 0 ? (
                  <ul className="flex flex-wrap gap-2">
                    {preferredCities.map((city) => (
                      <li
                        key={city.id}
                        className="inline-flex items-center min-h-11 rounded-full bg-[#eaf6fd] px-4 text-base text-black"
                      >
                        {cityDisplayName(city)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-base font-medium text-black">{t('profile:seeker.notProvided')}</p>
                )}
              </ProfileCard>

              {/* The job I want. Category → Sector → JobTitle (PJP-112). */}
              <ProfileCard
                icon={Briefcase}
                title={t('profile:seeker.cards.jobTitle')}
                help={t('profile:seeker.cards.jobHelp')}
                busy={cardBusy('job')}
                cardId="job"
                legend={t('profile:seeker.cards.jobTitle')}
                footer={cardFooter('job')}
                action={editAction('job')}
              >
                {cardEditing('job') ? (
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-5">
                    {/* `contents` drops the picker's own wrapper from layout so its
                        three fields fall into THIS grid directly, alongside Preferred
                        Language — Category/Sector on row one, JobTitle/Language on
                        row two, instead of the picker claiming a full-width row of
                        its own. The cascade logic inside TaxonomyPicker is untouched. */}
                    <TaxonomyPicker
                      value={triple}
                      onChange={setTriple}
                      className="contents"
                      selectClassName={seekerInputCls}
                      labelClassName={seekerLabelCls}
                    />
                    <Field label={t('profile:seeker.preferredLanguage')} className={seekerLabelCls}>
                      <select value={language} onChange={(e) => setLanguage(e.target.value)} className={seekerInputCls}>
                        {LANGUAGES.map((l) => (
                          <option key={l.value} value={l.value}>
                            {l.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                ) : (
                  <div className={`grid sm:grid-cols-2 gap-x-6 gap-y-5 ${seekerSharedFieldsCls}`}>
                    <ReadOnlyField label={t('taxonomy:category')} value={triple.category && categoryLabel(t, triple.category)} notProvided={t('profile:seeker.notProvided')} />
                    <ReadOnlyField label={t('taxonomy:sector')} value={triple.sector} notProvided={t('profile:seeker.notProvided')} />
                    <ReadOnlyField label={t('taxonomy:jobTitle')} value={triple.jobTitle} notProvided={t('profile:seeker.notProvided')} />
                    <ReadOnlyField label={t('profile:seeker.preferredLanguage')} value={LANGUAGES.find((l) => l.value === language)?.label} notProvided={t('profile:seeker.notProvided')} />
                  </div>
                )}
              </ProfileCard>

              {/* Work experience */}
              <ProfileCard
                icon={Building2}
                title={
                  <>
                    {t('profile:seeker.workExperience')}
                    <VoiceButton label={t('profile:seeker.workExperienceVoiceLabel')} iconClassName="w-4 h-4 text-gray-500" className="p-1" />
                  </>
                }
                action={
                  cardEditing('experience') ? (
                    <button key="add" type="button" data-focus="add" onClick={addExp} disabled={cardBusy('experience')} className="inline-flex items-center gap-1.5 min-h-[44px] px-2 text-sm font-medium text-primary-50 hover:text-primary-60 disabled:opacity-60">
                      <Plus className="w-4 h-4" /> {t('profile:seeker.add')}
                    </button>
                  ) : (
                    editAction('experience', experiences.length === 0)
                  )
                }
                busy={cardBusy('experience')}
                cardId="experience"
                legend={t('profile:seeker.workExperience')}
                footer={cardFooter('experience')}
              >
                {experiences.length === 0 ? (
                  <p className="text-sm text-[#717182]">{t('profile:seeker.noExperience')}</p>
                ) : cardEditing('experience') ? (
                  <div className="space-y-5">
                    {experiences.map((exp) => (
                      <div key={exp.key} className="border border-[#eee] rounded-lg p-4">
                        <div className="flex justify-end -mt-2 -mr-2">
                          <button
                            type="button"
                            onClick={() => removeExp(exp.key)}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-gray-400 hover:text-red-500"
                            aria-label={t('profile:seeker.removeExperience')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-x-4 gap-y-4">
                          <Field label={t('profile:seeker.position')} className={seekerLabelCls}>
                            <input value={exp.position} onChange={(e) => setExp(exp.key, 'position', e.target.value)} maxLength={WORK_POSITION_MAX_LENGTH} placeholder={t('profile:seeker.positionPlaceholder')} className={seekerInputCls} />
                          </Field>
                          <Field label={t('profile:seeker.company')} className={seekerLabelCls}>
                            <input value={exp.companyName ?? ''} onChange={(e) => setExp(exp.key, 'companyName', e.target.value)} maxLength={COMPANY_NAME_MAX_LENGTH} placeholder={t('profile:seeker.companyPlaceholder')} className={seekerInputCls} />
                          </Field>
                          <Field label={t('profile:seeker.startDate')} className={seekerLabelCls}>
                            <DatePicker value={exp.startDate ?? ''} disabled={cardBusy('experience')} onChange={(v) => setExp(exp.key, 'startDate', v)} className={seekerInputCls} />
                          </Field>
                          <Field label={t('profile:seeker.endDate')} className={seekerLabelCls}>
                            <DatePicker
                              value={exp.endDate ?? ''}
                              disabled={exp.currentlyWorking || !!cardBusy('experience')}
                              onChange={(v) => setExp(exp.key, 'endDate', v)}
                              className={`${seekerInputCls} disabled:bg-gray-100`}
                            />
                          </Field>
                        </div>
                        <label className="flex items-center gap-3 mt-3 min-h-11 text-sm text-[#4d4d4d]">
                          <input
                            type="checkbox"
                            checked={!!exp.currentlyWorking}
                            onChange={(e) => setExp(exp.key, 'currentlyWorking', e.target.checked)}
                            className="w-5 h-5 accent-primary-50"
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
                        <p className="text-base font-medium text-black">
                          {exp.position}
                          {exp.companyName ? ` — ${exp.companyName}` : ''}
                        </p>
                        <p className="text-sm text-[#2b6f8c] mt-0.5">
                          {monthYear(exp.startDate)} – {exp.currentlyWorking ? t('profile:seeker.present') : monthYear(exp.endDate) || t('profile:seeker.present')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {cardEditing('experience') && <p className="text-sm text-[#717182] mt-3">{t('profile:seeker.experienceHint')}</p>}
              </ProfileCard>

              {/* Documents */}
              <ProfileCard icon={FileText} title={t('profile:seeker.documents')}>
                <DocumentsSection
                  allowedTypes={[...SEEKER_DOC_TYPES]}
                  accept=".pdf,.jpg,.jpeg,.png"
                  list={jobSeekerAPI.listDocuments}
                  upload={jobSeekerAPI.uploadDocument}
                  remove={jobSeekerAPI.deleteDocument}
                />
              </ProfileCard>

              {/* Skills */}
              <ProfileCard icon={Sparkles} title={t('profile:seeker.skills')}>
                {jobSeekerId === null ? (
                  <p className="text-sm text-[#717182]">{t('profile:seeker.skillsLocked')}</p>
                ) : (
                  <SkillsSection />
                )}
              </ProfileCard>
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
