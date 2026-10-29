/**
 * What each card of the seeker profile sends to PUT /jobseekers/profile.
 *
 * Each card of the profile page is edited, saved and cancelled on its own, and every field belongs
 * to exactly one card. The endpoint takes a partial body, so each card's part of the request is
 * built here, on its own, from plain values. The page-wide Save that joined the five parts is gone;
 * scripts/verify-profile-cards.mjs joins them again, in the test, to compare them with the old body.
 *
 * Pure on purpose (no React, no network): scripts/verify-profile-cards.mjs runs this real source.
 *
 * ⚠️ Empty values keep their old meaning. An emptied name, bio, date of birth, gender, category,
 * sector, job title or language goes out as `undefined`, which the BE reads as "leave it as it
 * is", so none of them can be cleared from here. That is existing behaviour and is not changed.
 */
import type { ProfileWorkExperience, SeekerProfile, SeekerProfileUpdate, TaxonomyTriple } from '@/lib/api'
import { isAtLeast18, toDateInput } from '@/lib/dateInput'
import { nameProblem } from '@/lib/nameValidation'

/** A city as these helpers see it: only its id is ever sent. */
interface CityRef {
  id: string
}

export type ProfileGender = '' | 'MALE' | 'FEMALE' | 'OTHER'

// ---- About me ---------------------------------------------------------------------------------

export interface AboutDraft {
  fullName: string
  bio: string
  /** yyyy-mm-dd, or '' */
  dateOfBirth: string
  gender: ProfileGender
}

export function aboutPatch(d: AboutDraft): Pick<SeekerProfileUpdate, 'fullName' | 'bio' | 'dateOfBirth' | 'gender'> {
  return {
    fullName: d.fullName.trim() || undefined,
    bio: d.bio.trim() || undefined,
    // Already yyyy-mm-dd (the <input type="date"> format), which is exactly what dateOfBirthSchema
    // expects. Sent as undefined, never '', so clearing the field doesn't 400 against a value the
    // BE requires.
    dateOfBirth: d.dateOfBirth || undefined,
    gender: d.gender || undefined,
  }
}

export type AboutProblem = 'nameTooShort' | 'nameNotAName' | 'dobUnder18'

/**
 * Why About me cannot be saved yet, or null. The name is judged first.
 *
 * Registration rejects a numeric name (DEF-030); without the same guard here the rule is one edit
 * away from being undone. Only on an EDIT, though: validating the value the server sent would lock
 * out any account whose stored name predates the rule, and those exist (the BE mirror is still
 * open). Such a user could not save ANY profile change, not even their bio, and the error would
 * point at a field they never touched. `originalFullName` is the stored name, trimmed.
 *
 * The BE refuses an under-18 date with a bare "Validation failed", so it is caught here. An empty
 * date is skipped: it is sent as undefined, so accounts with no DOB can still save.
 */
export function aboutProblem(
  d: Pick<AboutDraft, 'fullName' | 'dateOfBirth'>,
  originalFullName: string
): AboutProblem | null {
  if (d.fullName.trim() !== originalFullName) {
    const problem = nameProblem(d.fullName)
    if (problem) return problem === 'tooShort' ? 'nameTooShort' : 'nameNotAName'
  }
  if (d.dateOfBirth && !isAtLeast18(d.dateOfBirth)) return 'dobUnder18'
  return null
}

// ---- Where I live -----------------------------------------------------------------------------

export interface HomeDraft {
  homeCity: CityRef | null
  /** The home city the server holds. */
  savedHomeCity: CityRef | null
  /** The seeker pressed "Remove my saved city". Only this clears the city on the server. */
  homeCityRemoved: boolean
}

/**
 * Whether the home city goes out. It does only when the seeker changed it, so an unrelated save (a
 * new bio, a switched language) can neither rewrite the home city nor wipe the legacy text.
 *
 * An EMPTY picker is not by itself a request to clear the city (see homeCityRemoved): changing the
 * State select empties it too. So an empty home city counts as a change only after the remove.
 */
export function homeCityChanged(d: HomeDraft): boolean {
  return d.homeCity ? d.homeCity.id !== d.savedHomeCity?.id : d.savedHomeCity !== null && d.homeCityRemoved
}

/**
 * `location`, `latitude` and `longitude` are never sent from here: picking a city makes the BE
 * write all three from it, and the legacy text must survive every other save. `null` (the seeker
 * removed the city) drops the link and keeps the text.
 */
export function homePatch(d: HomeDraft): Pick<SeekerProfileUpdate, 'cityId'> {
  return homeCityChanged(d) ? { cityId: d.homeCity?.id ?? null } : {}
}

// ---- Where I want to work ---------------------------------------------------------------------

/** The BE replaces the whole preferred list when the key is present, so it goes out only on a change. */
export function workCitiesChanged(cities: CityRef[], savedIds: string[]): boolean {
  return cities.length !== savedIds.length || cities.some((c) => !savedIds.includes(c.id))
}

/** `[]` is sent only for a list the seeker emptied on purpose: the BE replaces the lot. */
export function workCitiesPatch(cities: CityRef[], savedIds: string[]): Pick<SeekerProfileUpdate, 'preferredCityIds'> {
  return workCitiesChanged(cities, savedIds) ? { preferredCityIds: cities.map((c) => c.id) } : {}
}

// ---- The job I want ---------------------------------------------------------------------------

/**
 * The three taxonomy names go out together, with the language. The BE does not check the path on
 * this route (the pickers keep it valid), so they are never sent piecemeal by design.
 */
export function jobPatch(
  triple: TaxonomyTriple,
  language: string
): Pick<SeekerProfileUpdate, 'preferredCategory' | 'preferredSector' | 'preferredJobTitle' | 'preferredLanguage'> {
  return {
    preferredCategory: triple.category || undefined,
    preferredSector: triple.sector || undefined,
    preferredJobTitle: triple.jobTitle || undefined,
    preferredLanguage: language || undefined,
  }
}

// ---- Work experience --------------------------------------------------------------------------

/**
 * A current job has no end date: its field is disabled while "currently working" is ticked and a
 * save drops it. This is the one place that says so; the save body and the "has the seeker changed
 * this row" check both read the end date through it, so they cannot disagree.
 */
const endDateOf = (r: ProfileWorkExperience): string => (r.currentlyWorking ? '' : (r.endDate ?? ''))

/**
 * Only rows with BOTH a position and a start date go out: the BE requires both. The list
 * FULL-REPLACES the server's, so the key is always present, `[]` when no row qualifies.
 */
export function experiencePatch(rows: ProfileWorkExperience[]): Pick<SeekerProfileUpdate, 'workExperiences'> {
  const workExperiences: ProfileWorkExperience[] = []
  for (const r of rows) {
    if (!r.position.trim() || !r.startDate) continue
    workExperiences.push({
      position: r.position.trim(),
      companyName: r.companyName?.trim() || undefined,
      startDate: r.startDate,
      endDate: endDateOf(r) || undefined,
      currentlyWorking: !!r.currentlyWorking,
      description: r.description?.trim() || undefined,
    })
  }
  return { workExperiences }
}

// ---- The whole page ---------------------------------------------------------------------------

export interface ProfileDraft extends AboutDraft, HomeDraft {
  preferredCities: CityRef[]
  /** The preferred-city ids the server holds. */
  savedPreferredIds: string[]
  triple: TaxonomyTriple
  language: string
  experiences: ProfileWorkExperience[]
}

// ---- Per-card editing: the pure logic ---------------------------------------------------------
// Nothing here reads or writes the page. It is what the page asks when each card is edited,
// saved and cancelled on its own.

export const CARD_IDS = ['about', 'home', 'workCities', 'job', 'experience'] as const
export type CardId = (typeof CARD_IDS)[number]

/**
 * What the seeker is editing. A ProfileDraft is this plus its own `savedHomeCity` and
 * `savedPreferredIds`: copies of the server's values that can go stale. The page keeps no such
 * copies; every function here takes the one saved snapshot as an argument.
 */
export type DraftValues = Omit<ProfileDraft, 'savedHomeCity' | 'savedPreferredIds'>

/** The part of what the server holds that decides what a save sends: only the city ids matter. */
export interface SavedBaseline {
  homeCity: CityRef | null
  preferredCities: CityRef[]
}

// The one place a card's baseline is read. cardPatch and cardDirty both go through these two, so a
// card cannot be clean against one saved value and send a body built from another.
const homeOf = (draft: DraftValues, saved: SavedBaseline): HomeDraft => ({
  homeCity: draft.homeCity,
  savedHomeCity: saved.homeCity,
  homeCityRemoved: draft.homeCityRemoved,
})
export const savedIdsOf = (saved: SavedBaseline): string[] => saved.preferredCities.map((c) => c.id)

/**
 * One card's part of the save body, judged against `saved`: what the server holds. Only the two
 * city cards read it (a city goes out only when it differs from `saved`); the others ignore it.
 */
export function cardPatch(card: CardId, draft: DraftValues, saved: SavedBaseline): SeekerProfileUpdate {
  switch (card) {
    case 'about':
      return aboutPatch(draft)
    case 'home':
      return homePatch(homeOf(draft, saved))
    case 'workCities':
      return workCitiesPatch(draft.preferredCities, savedIdsOf(saved))
    case 'job':
      return jobPatch(draft.triple, draft.language)
    case 'experience':
      return experiencePatch(draft.experiences)
  }
}

// ---- Per-card editing: what the page tracks for each card -------------------------------------

/**
 * - saving: the write is in flight.
 * - checking: a read of the profile is in flight (Check again, or syncing an unchanged card).
 * - unknown: the write may or may not have been applied (a timeout, a dropped connection, a
 *   gateway error, or a write that was accepted but could not be read back). The card is held
 *   until the server has been read.
 */
export type CardStatus = 'idle' | 'saving' | 'checking' | 'unknown' | 'saved' | 'error'

/** The card's inputs, Save and Cancel are off, and a refreshed profile must leave it alone. */
export function isCardLocked(status: CardStatus): boolean {
  return status === 'saving' || status === 'checking' || status === 'unknown'
}

export interface CardUi {
  /** The card is in edit mode. */
  editing: boolean
  status: CardStatus
  /** Why the last save of the card failed, or is not confirmed; '' when it has not. */
  error: string
  /** A line to show beside the card that is not a failure (e.g. the city was kept); ''. */
  note: string
  /**
   * The last write of this card has an unconfirmed outcome and its body is kept for "Check again".
   * Absent means not held. Set with `status: 'unknown'` and cleared once a read has settled it.
   */
  held?: boolean
}

/** Every card in view mode with nothing in flight: how the page starts, and how a load leaves it. */
export function idleCardUi(): Record<CardId, CardUi> {
  const ui = {} as Record<CardId, CardUi>
  for (const card of CARD_IDS) ui[card] = { editing: false, status: 'idle', error: '', note: '' }
  return ui
}

/** A city as the pickers hold it (the same shape as StateCitySelect's SelectedCity). */
export interface SavedCity extends CityRef {
  name: string
  stateName?: string
}

/**
 * What the server holds, in the shape the page's fields have. It is the baseline, never a draft, so
 * it carries no `saved*` copies and no `homeCityRemoved`. `location` is the free text of a seeker
 * with no home city yet: shown, never edited, never sent.
 */
export interface SavedValues extends SavedBaseline {
  fullName: string
  bio: string
  location: string
  /** yyyy-mm-dd, or '' */
  dateOfBirth: string
  gender: ProfileGender
  homeCity: SavedCity | null
  preferredCities: SavedCity[]
  triple: TaxonomyTriple
  language: string
  experiences: ProfileWorkExperience[]
}

// The same three fields as toSelectedCity in components/location/StateCitySelect.tsx. Kept here
// because a lib file does not import a component; scripts/verify-profile-card-state.mjs runs both.
const savedCity = (city: { id: string; name: string; state: { name: string } }): SavedCity => ({
  id: city.id,
  name: city.name,
  stateName: city.state.name,
})

/**
 * GET /jobseekers/profile as the page's fields: the one mapping from server to form, called by
 * hydrate() in the profile page. Contact and display values are not drafts and are not here. Rows
 * carry no `key` (the page adds its own).
 */
export function draftFromProfile(p: SeekerProfile): SavedValues {
  const js = p.jobSeeker
  const city = js?.city ? savedCity(js.city) : null
  const preferred = (js?.preferredCities ?? []).map((saved) => savedCity(saved.city))
  return {
    fullName: js?.fullName ?? '',
    bio: js?.bio ?? '',
    location: js?.location ?? '',
    dateOfBirth: toDateInput(js?.dateOfBirth),
    gender: js?.gender ?? '',
    homeCity: city,
    preferredCities: preferred,
    triple: {
      category: js?.preferredCategory || undefined,
      sector: js?.preferredSector || undefined,
      jobTitle: js?.preferredJobTitle || undefined,
    },
    language: p.preferredLanguage ?? 'en',
    experiences: (js?.workExperience ?? []).map((w) => ({
      position: w.position ?? '',
      companyName: w.companyName ?? '',
      startDate: toDateInput(w.startDate),
      endDate: toDateInput(w.endDate),
      currentlyWorking: w.currentlyWorking ?? false,
      description: w.description ?? '',
    })),
  }
}

interface RowView {
  position: string
  companyName: string
  startDate: string
  endDate: string
  currentlyWorking: boolean
  description: string
}

/** The rows the seeker has actually filled in. A row just added and left empty is not a change. */
function filledRows(rows: ProfileWorkExperience[]): RowView[] {
  const out: RowView[] = []
  for (const r of rows) {
    const v: RowView = {
      position: r.position.trim(),
      companyName: (r.companyName ?? '').trim(),
      startDate: r.startDate ?? '',
      endDate: endDateOf(r),
      currentlyWorking: !!r.currentlyWorking,
      description: (r.description ?? '').trim(),
    }
    if (v.position || v.companyName || v.startDate || v.endDate || v.currentlyWorking || v.description) out.push(v)
  }
  return out
}

function sameRows(a: ProfileWorkExperience[], b: ProfileWorkExperience[]): boolean {
  const x = filledRows(a)
  const y = filledRows(b)
  if (x.length !== y.length) return false
  for (let i = 0; i < x.length; i++) {
    const p = x[i]
    const q = y[i]
    if (
      p.position !== q.position ||
      p.companyName !== q.companyName ||
      p.startDate !== q.startDate ||
      p.endDate !== q.endDate ||
      p.currentlyWorking !== q.currentlyWorking ||
      p.description !== q.description
    ) {
      return false
    }
  }
  return true
}

/**
 * Whether the seeker has changed this card since `saved` (what the server holds), judged on what
 * they can see, not on what a save would send. So an emptied bio or category counts as a change
 * even though a save cannot clear it, and a half-filled work row counts even though it would be
 * dropped. Text is compared trimmed; an empty category and a missing one are the same.
 *
 * The two city cards follow the save's own rules: the home city changes only by picking another
 * city or by the explicit Remove (an emptied picker alone is not a change), and the preferred
 * cities are compared as a set. The baseline is `saved`, read through the same helpers as cardPatch;
 * the draft's own `savedHomeCity` / `savedPreferredIds` are never read.
 */
export function cardDirty(card: CardId, draft: DraftValues, saved: SavedValues): boolean {
  switch (card) {
    case 'about':
      return (
        draft.fullName.trim() !== saved.fullName.trim() ||
        draft.bio.trim() !== saved.bio.trim() ||
        draft.dateOfBirth !== saved.dateOfBirth ||
        draft.gender !== saved.gender
      )
    case 'home':
      return homeCityChanged(homeOf(draft, saved))
    case 'workCities':
      return workCitiesChanged(draft.preferredCities, savedIdsOf(saved))
    case 'job':
      return (
        (draft.triple.category || '') !== (saved.triple.category || '') ||
        (draft.triple.sector || '') !== (saved.triple.sector || '') ||
        (draft.triple.jobTitle || '') !== (saved.triple.jobTitle || '') ||
        draft.language !== saved.language
      )
    case 'experience':
      return !sameRows(draft.experiences, saved.experiences)
  }
}

export interface CardActivity {
  /** The card is in edit mode. */
  editing: boolean
  /** cardDirty for the card. */
  dirty: boolean
  /** A save of the card, or a read of the profile for it, is in flight. */
  saving: boolean
  /** A write of the card has an outcome nobody has confirmed. */
  unconfirmed: boolean
}

/**
 * The cards a freshly loaded profile may be applied to: only those the seeker is not editing, has
 * not changed, is not saving and whose last write is not waiting to be confirmed. Every other card keeps its draft exactly as it is. In card order.
 */
export function slicesToApply(activity: Record<CardId, CardActivity>): CardId[] {
  const out: CardId[] = []
  for (const card of CARD_IDS) {
    const a = activity[card]
    if (!a.editing && !a.dirty && !a.saving && !a.unconfirmed) out.push(card)
  }
  return out
}

/**
 * What each card is doing, for slicesToApply: its edit mode and save status from the page, and
 * whether the seeker has changed it, judged against `saved`. Pass the snapshot the seeker has been
 * editing from, i.e. the one that is still installed when a fresh profile arrives, never the fresh one.
 */
export function cardActivity(
  ui: Record<CardId, CardUi>,
  draft: DraftValues,
  saved: SavedValues
): Record<CardId, CardActivity> {
  const out = {} as Record<CardId, CardActivity>
  for (const card of CARD_IDS) {
    const status = ui[card].status
    out[card] = {
      editing: ui[card].editing,
      dirty: cardDirty(card, draft, saved),
      saving: status === 'saving' || status === 'checking',
      unconfirmed: status === 'unknown',
    }
  }
  return out
}

/**
 * The snapshot after a fresh profile has been applied to `cards`: those cards take `fresh`'s values
 * (as copies), every other card keeps `saved`'s, so a card the seeker still has changes in stays
 * judged against what it was edited from. `saved` and `fresh` are not changed.
 */
export function rebaseCards(saved: SavedValues, fresh: SavedValues, cards: readonly CardId[]): SavedValues {
  const next = { ...saved }
  for (const card of cards) {
    switch (card) {
      case 'about':
        next.fullName = fresh.fullName
        next.bio = fresh.bio
        next.dateOfBirth = fresh.dateOfBirth
        next.gender = fresh.gender
        break
      case 'home':
        next.homeCity = fresh.homeCity && { ...fresh.homeCity }
        next.location = fresh.location
        break
      case 'workCities':
        next.preferredCities = fresh.preferredCities.map((c) => ({ ...c }))
        break
      case 'job':
        next.triple = { ...fresh.triple }
        next.language = fresh.language
        break
      case 'experience':
        next.experiences = fresh.experiences.map((r) => ({ ...r }))
        break
    }
  }
  return next
}

/** A card's part of a save body with nothing in it to send: every value is undefined. */
export function patchIsEmpty(patch: SeekerProfileUpdate): boolean {
  return Object.values(patch).every((v) => v === undefined)
}

/**
 * Whether the server holds what a save body asked for: every value the body carries is the value
 * in `server`. Used to read back a write whose outcome is not known. Only the keys the body has
 * are compared, so a field a save cannot send (a cleared bio, say) is not held against it.
 */
export function bodyLanded(body: SeekerProfileUpdate, server: SavedValues): boolean {
  if (body.fullName !== undefined && server.fullName.trim() !== body.fullName) return false
  if (body.bio !== undefined && server.bio.trim() !== body.bio) return false
  if (body.dateOfBirth !== undefined && server.dateOfBirth !== body.dateOfBirth) return false
  if (body.gender !== undefined && server.gender !== body.gender) return false
  if (body.cityId !== undefined && (server.homeCity?.id ?? null) !== body.cityId) return false
  if (body.preferredCityIds !== undefined && workCitiesChanged(server.preferredCities, body.preferredCityIds)) return false
  if (body.preferredCategory !== undefined && (server.triple.category ?? '') !== body.preferredCategory) return false
  if (body.preferredSector !== undefined && (server.triple.sector ?? '') !== body.preferredSector) return false
  if (body.preferredJobTitle !== undefined && (server.triple.jobTitle ?? '') !== body.preferredJobTitle) return false
  if (body.preferredLanguage !== undefined && server.language !== body.preferredLanguage) return false
  // The BE returns the rows in no promised order, so the list is compared as a set of rows.
  if (body.workExperiences !== undefined) {
    const rowsOf = (rows: object[]) => rows.map((r) => JSON.stringify(r)).sort()
    const held = rowsOf(experiencePatch(server.experiences).workExperiences ?? [])
    const sent = rowsOf(body.workExperiences)
    if (held.length !== sent.length || held.some((r, i) => r !== sent[i])) return false
  }
  return true
}

/**
 * Whether two drafts hold the same values in one card's fields. Strict, unlike cardDirty: typing
 * something and undoing it is no change, but a trailing space is. Used to tell whether the seeker
 * kept editing a card while a request for it was out.
 */
export function sameCardDraft(card: CardId, a: DraftValues, b: DraftValues): boolean {
  switch (card) {
    case 'about':
      return a.fullName === b.fullName && a.bio === b.bio && a.dateOfBirth === b.dateOfBirth && a.gender === b.gender
    case 'home':
      return (a.homeCity?.id ?? null) === (b.homeCity?.id ?? null) && a.homeCityRemoved === b.homeCityRemoved
    case 'workCities':
      return a.preferredCities.length === b.preferredCities.length && a.preferredCities.every((c, i) => c.id === b.preferredCities[i].id)
    case 'job':
      return (
        (a.triple.category ?? '') === (b.triple.category ?? '') &&
        (a.triple.sector ?? '') === (b.triple.sector ?? '') &&
        (a.triple.jobTitle ?? '') === (b.triple.jobTitle ?? '') &&
        a.language === b.language
      )
    case 'experience': {
      // The page's rows carry a React `key` that is not a value.
      const valuesOf = (rows: ProfileWorkExperience[]) =>
        JSON.stringify(rows.map(({ key: _key, ...row }: ProfileWorkExperience & { key?: string }) => row))
      return valuesOf(a.experiences) === valuesOf(b.experiences)
    }
  }
}

// ---- Per-card editing: where keyboard focus goes -----------------------------------------------
// Pure, so the table can be tested without a page. The page turns an outcome into a target with
// this and moves focus once, after the render (see the layout effect in the profile page).

export type FocusTarget = 'edit' | 'save' | 'checkAgain' | 'first' | 'name' | 'dateOfBirth'

/** What just happened to a card, as far as focus is concerned. */
export type FocusOutcome =
  | { kind: 'edit' }
  | { kind: 'cancel' }
  /** saved: the card is back in view mode. error: a refusal, the draft is kept. invalid: a rule stopped the save. */
  | { kind: 'save'; outcome: 'saved' | 'error' | 'unknown' | 'invalid'; problem?: AboutProblem }
  | { kind: 'check'; outcome: 'landed' | 'notApplied' | 'readFailed' }

export function focusTargetAfter(event: FocusOutcome): FocusTarget {
  if (event.kind === 'edit') return 'first'
  if (event.kind === 'cancel') return 'edit'
  if (event.kind === 'check') return event.outcome === 'landed' ? 'edit' : event.outcome === 'notApplied' ? 'save' : 'checkAgain'
  if (event.outcome === 'saved') return 'edit'
  if (event.outcome === 'unknown') return 'checkAgain'
  if (event.outcome === 'invalid' && event.problem) return event.problem === 'dobUnder18' ? 'dateOfBirth' : 'name'
  return 'save'
}
