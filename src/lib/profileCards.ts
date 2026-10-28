/**
 * What each card of the seeker profile sends to PUT /jobseekers/profile.
 *
 * The profile page saves with one button, but every field belongs to exactly one card and the
 * endpoint takes a partial body, so each card's part of the request is built here, on its own,
 * from plain values. `profileSavePatch` joins the five parts: the same body the page has always sent.
 *
 * Pure on purpose (no React, no network): scripts/verify-profile-cards.mjs runs this real source.
 *
 * ⚠️ Empty values keep their old meaning. An emptied name, bio, date of birth, gender, category,
 * sector, job title or language goes out as `undefined`, which the BE reads as "leave it as it
 * is", so none of them can be cleared from here. That is existing behaviour and is not changed.
 */
import type { ProfileWorkExperience, SeekerProfileUpdate, TaxonomyTriple } from '@/lib/api'
import { isAtLeast18 } from '@/lib/dateInput'
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
      endDate: r.currentlyWorking ? undefined : r.endDate || undefined,
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

/** The body of the page-wide Save: the five cards' parts, joined. */
export function profileSavePatch(d: ProfileDraft): SeekerProfileUpdate {
  return {
    ...aboutPatch(d),
    ...homePatch(d),
    ...workCitiesPatch(d.preferredCities, d.savedPreferredIds),
    ...jobPatch(d.triple, d.language),
    ...experiencePatch(d.experiences),
  }
}
