'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type PostJobData,
  type JobTypeValue,
  type PaymentTypeValue,
  type UrgencyLevelValue,
  type TaxonomyTriple,
} from '@/lib/api'
import {
  CITY_KEYS,
  cityContaining,
  cityLabelKey,
  coordsToWrite,
  type CoordDecision,
  type Coords,
} from '@/lib/cities'
import { UseMyLocation } from '@/components/location/UseMyLocation'
import { TaxonomyPicker } from '@/components/taxonomy/TaxonomyPicker'
import { humanizeJobType, formatSalary, initials, canonicalLocation } from '@/lib/jobFormat'
import { Clock, Briefcase, MapPin, IndianRupee, Loader2, AlertCircle } from 'lucide-react'

const JOB_TYPES: JobTypeValue[] = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERNSHIP']
const PAYMENT_TYPES: PaymentTypeValue[] = ['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'FIXED']
const URGENCY_LEVELS: UrgencyLevelValue[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

interface JobFormProps {
  initial?: Partial<PostJobData>
  submitLabel: string
  submitting: boolean
  error?: string
  onSubmit: (data: PostJobData) => void
}

interface FormState {
  title: string
  companyName: string
  category: string
  sector: string
  jobTitle: string
  description: string
  requirements: string
  skills: string
  location: string
  salaryMin: string
  salaryMax: string
  paymentType: PaymentTypeValue
  jobType: JobTypeValue | ''
  urgencyLevel: UrgencyLevelValue
  numberOfPositions: string
}

function buildInitialState(initial?: Partial<PostJobData>): FormState {
  return {
    title: initial?.title ?? '',
    companyName: initial?.companyName ?? '',
    category: initial?.category ?? '',
    sector: initial?.sector ?? '',
    jobTitle: initial?.jobTitle ?? '',
    description: initial?.description ?? '',
    requirements: initial?.requirements ?? '',
    skills: (initial?.skillsRequired ?? []).join(', '),
    location: initial?.location ?? '',
    salaryMin: initial?.salaryMin != null ? String(initial.salaryMin) : '',
    salaryMax: initial?.salaryMax != null ? String(initial.salaryMax) : '',
    paymentType: initial?.paymentType ?? 'MONTHLY',
    jobType: initial?.jobType ?? '',
    urgencyLevel: initial?.urgencyLevel ?? 'MEDIUM',
    numberOfPositions: initial?.numberOfPositions != null ? String(initial.numberOfPositions) : '1',
  }
}

const labelCls = 'block text-sm font-medium text-black mb-1'
const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent'
const sectionTitleCls = 'text-base font-semibold text-black'

// Required-field marker (DEF-024). The form gave no sign which fields were
// mandatory, so the first thing an employer learned about it was a validation
// error after pressing Post.
//
// These five are exactly what `validate()` below enforces, which is in turn
// exactly what createJobSchema requires with no default
// (prosiddhi-backend/src/validators/job.validator.ts): title, category,
// description, location, jobType. Nothing else is marked - salary, skills,
// requirements, company name, urgency and positions all post fine empty, and
// claiming otherwise would just be a different kind of wrong.
//
// aria-hidden on the star; `aria-required` on the control is what a screen
// reader actually reads.
function Req() {
  return (
    <span className="text-red-500" aria-hidden="true">
      {' '}
      *
    </span>
  )
}

/**
 * A fix → the two payload fields, or nothing at all.
 *
 * Named rather than spread inline because the property names differ (`lat`/`lon`
 * vs `latitude`/`longitude`), so `...fix` would look right and send neither.
 */
function coordinateFields(fix: Coords | undefined) {
  return fix ? { latitude: fix.lat, longitude: fix.lon } : {}
}

type LocationHint = { key: string; city?: string; tone: 'good' | 'warn' } | null

/**
 * What this form will do with the location, said out loud (TD-41).
 *
 * A coordinate has no visible representation, so before this the employer got
 * nothing: press "Use my current location" and the button just stops spinning;
 * type "Nagpur" and nothing hints that the job will be invisible in every
 * seeker's Nearby list.
 *
 * It DESCRIBES `coordsToWrite`'s decision rather than reaching its own. Deciding
 * twice is the drift `coordsToWrite` was extracted into `lib/cities` to prevent,
 * and the first draft of this function proved the point by disagreeing on the
 * one case the rule exists for — see the switch below.
 *
 * The seeker's copy cannot be borrowed. `profile:seeker.locationOn` reads "You
 * will see jobs near you", which is backwards on a screen where the reader is
 * the one being found.
 *
 * `pinned` is the sharp one, and it exists because of TD-42: latitude and
 * longitude are `.optional()` and not `.nullable()` on the backend schema, so no
 * client can clear a stored coordinate. Edit a job's location from "Bangalore"
 * to somewhere we cannot place, and it KEEPS the Bangalore pin — it goes on
 * showing to Bangalore seekers at 0 km and never reaches the new town. That is
 * invisible today. Until Asrar makes the fields nullable, the honest thing is to
 * say so rather than let the employer believe the job moved.
 */
function locationHint(args: {
  decision: CoordDecision
  saved: Coords | null
  text: string
  translate: (key: string) => string
}): LocationHint {
  const { decision, saved, text, translate } = args

  // Read off `coordsToWrite`'s own verdict — never re-derived from the same
  // inputs. Working it out a second time is what made the first draft lie in
  // precisely the case the rule exists for: a fix taken in Pune, then
  // "Bangalore" typed, writes the Bangalore centroid while the screen said
  // "Location captured".
  switch (decision.reason) {
    case 'fix':
      return { key: 'employer:jobForm.locationCaptured', tone: 'good' }
    // 'keep' means the stored pin already sits in the city just typed, so from
    // the employer's side it is the same good news as writing one.
    case 'city':
    case 'keep':
      return {
        key: 'employer:jobForm.locationCity',
        city: decision.cityKey ? translate(decision.cityKey) : '',
        tone: 'good',
      }
  }

  // reason === 'none': we could not place the text at all.
  // Nothing typed yet — say nothing rather than warn about an empty box.
  if (!text.trim()) return null
  // Whether that is merely useless or actively misleading depends entirely on
  // whether a pin is already stored.
  if (saved) {
    // A stored pin need not sit in any of the ten. Press the location button at
    // a Devanahalli warehouse and the fix lands 35 km from the Bangalore
    // centroid — outside its 30 km radius — so `cityContaining` returns ''. The
    // named message would then render "stays pinned to  and will keep showing",
    // a broken sentence in ten languages, in the one state this whole ticket
    // exists to expose. Hence a second wording with no city in it.
    const stuckIn = cityContaining(saved)
    return stuckIn
      ? { key: 'employer:jobForm.locationPinned', city: translate(stuckIn), tone: 'warn' }
      : { key: 'employer:jobForm.locationPinnedUnnamed', tone: 'warn' }
  }
  return { key: 'employer:jobForm.locationUnknown', tone: 'warn' }
}

export function JobForm({ initial, submitLabel, submitting, error, onSubmit }: JobFormProps) {
  const { t } = useTranslation()
  const [f, setF] = useState<FormState>(() => buildInitialState(initial))
  const [validationError, setValidationError] = useState('')
  // TD-03.
  const [gpsFix, setGpsFix] = useState<Coords | null>(null)
  // Which came last, the typed text or the fix. See coordsToWrite.
  const [textIsNewer, setTextIsNewer] = useState(false)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setF((prev) => ({ ...prev, [key]: value }))

  // The pin the server already holds. Read from `initial`, not FormState —
  // nothing on this form edits it directly; only the location button replaces
  // it. Rebuilt each render, which is two null checks feeding pure functions.
  const savedPin =
    initial?.latitude != null && initial?.longitude != null
      ? { lat: initial.latitude, lon: initial.longitude }
      : null
  const translateCity = (key: string) => t(cityLabelKey(key))
  // ONE decision, used twice: `handleSubmit` sends `decision.coords` and the
  // line under the input describes `decision.reason`. What the employer is told
  // and what is actually written cannot drift apart, because they are the same
  // call.
  //
  // NOT memoised on `f`. `set()` clones the whole FormState on every keystroke in
  // every field, so a memo keyed on `f` never hits — it would read as an
  // optimisation while rebuilding this on each character typed into the salary
  // box (docs/location-plan.md flags exactly that trap). Keyed on `f.location` it
  // would be a real memo and still not worth one: a lookup over ten cities.
  const decision = coordsToWrite({
    gpsFix,
    saved: savedPin,
    text: f.location,
    textIsNewer,
    translate: translateCity,
  })
  // Debounced, and only for the LINE — `decision` above is undebounced because
  // it feeds the payload, which must reflect the box exactly at submit time.
  //
  // Without this the amber "will not appear in Nearby" fires on the "B" of
  // "Bangalore" and again on every letter until the word resolves, and because
  // the line is a `role="status"` live region a screen reader reads each one
  // out. Warning someone mid-word about a word they have not finished typing is
  // noise at best.
  const [settledLocation, setSettledLocation] = useState(f.location)
  useEffect(() => {
    const timer = window.setTimeout(() => setSettledLocation(f.location), 600)
    return () => window.clearTimeout(timer)
  }, [f.location])

  const hint = locationHint({
    // Recomputed against the settled text so the words and the verdict agree;
    // the fix/none branches do not depend on the text and are unaffected.
    decision: coordsToWrite({
      gpsFix,
      saved: savedPin,
      text: settledLocation,
      textIsNewer,
      translate: translateCity,
    }),
    saved: savedPin,
    text: settledLocation,
    translate: translateCity,
  })

  // The cascading picker emits the full triple; mirror it into the flat form
  // fields (empty levels come back as undefined → stored as '').
  const setTaxonomy = (next: TaxonomyTriple) =>
    setF((prev) => ({
      ...prev,
      category: next.category ?? '',
      sector: next.sector ?? '',
      jobTitle: next.jobTitle ?? '',
    }))

  const skillsArray = f.skills
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const validate = (): string => {
    if (f.title.trim().length < 5) return t('employer:jobForm.validation.titleMin')
    if (f.category.trim().length < 2) return t('employer:jobForm.validation.categoryRequired')
    if (f.description.trim().length < 50) return t('employer:jobForm.validation.descriptionMin')
    if (f.location.trim().length < 3) return t('employer:jobForm.validation.locationRequired')
    if (!f.jobType) return t('employer:jobForm.validation.jobTypeRequired')
    const min = f.salaryMin ? Number(f.salaryMin) : undefined
    const max = f.salaryMax ? Number(f.salaryMax) : undefined
    if (min != null && max != null && max < min) return t('employer:jobForm.validation.salaryRange')
    return ''
  }

  const handleSubmit = () => {
    const err = validate()
    if (err) {
      setValidationError(err)
      return
    }
    setValidationError('')
    const data: PostJobData = {
      title: f.title.trim(),
      description: f.description.trim(),
      category: f.category.trim(),
      // Canonicalised, not raw — see canonicalLocation. A job stored under a
      // translated city name is a job that only matches seekers in that one
      // language.
      location: canonicalLocation(f.location),
      jobType: f.jobType as JobTypeValue,
      paymentType: f.paymentType,
      urgencyLevel: f.urgencyLevel,
      numberOfPositions: f.numberOfPositions ? Number(f.numberOfPositions) : 1,
      ...(f.companyName.trim() ? { companyName: f.companyName.trim() } : {}),
      ...(f.sector ? { sector: f.sector } : {}),
      ...(f.jobTitle ? { jobTitle: f.jobTitle } : {}),
      ...(f.requirements.trim() ? { requirements: f.requirements.trim() } : {}),
      ...(skillsArray.length ? { skillsRequired: skillsArray } : {}),
      ...(f.salaryMin ? { salaryMin: Number(f.salaryMin) } : {}),
      ...(f.salaryMax ? { salaryMax: Number(f.salaryMax) } : {}),
      // TD-03 — the job's coordinates. Without these `getNearbyForSeeker` drops
      // the job on a null check before any distance maths runs, and the 20-point
      // location score cannot fire: it needs the JOB's pair as well as the
      // seeker's.
      //
      // `decision` is computed once in the render body and shared with the hint
      // line under the location input (TD-41), so what the employer was told and
      // what is sent are the same verdict rather than two derivations of it.
      //
      // It moved into the render body FOR that reason. An older note here argued
      // the opposite — compute it in the submit handler, because nothing on the
      // screen displayed it. Something does now.
      ...coordinateFields(decision.coords),
    }
    onSubmit(data)
  }

  const shownError = validationError || error

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
      {/* Form */}
      <div className="space-y-6">
        <p className="text-xs text-[#717182]">
          <span className="text-red-500">*</span> {t('status.required')}
        </p>

        {/* Section: Basics */}
        <section className="space-y-4">
          <h2 className={sectionTitleCls}>{t('employer:jobForm.sectionBasics')}</h2>

          <div>
            <label className={labelCls} htmlFor="job-title">{t('employer:jobForm.jobTitleLabel')}<Req /></label>
            <input id="job-title" aria-required className={inputCls} value={f.title} onChange={(e) => set('title', e.target.value)} placeholder={t('employer:jobForm.jobTitlePlaceholder')} />
          </div>

          {/* category only: sector and jobTitle are optional server-side. */}
          <TaxonomyPicker
            required={['category']}
            value={{
              category: f.category || undefined,
              sector: f.sector || undefined,
              jobTitle: f.jobTitle || undefined,
            }}
            onChange={setTaxonomy}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            selectClassName={inputCls}
            labelClassName={labelCls}
          />

          <div>
            <label className={labelCls} htmlFor="job-company">{t('employer:jobForm.companyNameLabel')}</label>
            <input className={inputCls} id="job-company" value={f.companyName} onChange={(e) => set('companyName', e.target.value)} placeholder={t('employer:jobForm.companyNamePlaceholder')} />
          </div>

          <div>
            <label className={labelCls} htmlFor="job-location">{t('employer:jobForm.locationLabel')}<Req /></label>
            {/* Free text with a datalist, NOT a select. A seeker outside our ten
                cities loses Near By; an employer outside them could not post the
                job at all, and that is a product call rather than a form
                decision. The list still nudges everyone towards a canonical
                spelling, which is what the cold-start recommendation's substring
                match needs (TD-34). Swapping to a <select> is one edit if the
                product ever restricts it. */}
            <input
              id="job-location"
              aria-required
              list="job-location-cities"
              className={inputCls}
              value={f.location}
              onChange={(e) => {
                set('location', e.target.value)
                setTextIsNewer(true)
              }}
              placeholder={t('employer:jobForm.locationPlaceholder')}
            />
            {/* `value` is the ENGLISH name, `label` the reader's own. Picking an
                option inserts the value, so a Tamil-speaking employer sees
                "பெங்களூரு" but the job stores "Bangalore".
                That matters because `location` is not only display text: the
                cold-start recommendation does a case-insensitive substring
                match of a seeker's location against it. Store the translated
                label and the text is canonical only WITHIN one language, so a
                Tamil employer's job stops matching a Hindi seeker in the same
                city — the opposite of what a fixed city list is for (TD-06 §4,
                TD-34). English is always loaded, so `lng: 'en'` never misses. */}
            <datalist id="job-location-cities">
              {CITY_KEYS.map((key) => (
                <option key={key} value={t(cityLabelKey(key), { lng: 'en' })} label={t(cityLabelKey(key))} />
              ))}
            </datalist>
            <UseMyLocation
              onLocated={(c) => {
                setGpsFix(c)
                setTextIsNewer(false)
              }}
              className="mt-2"
            />
            {/* TD-41. The coordinate is invisible, so this line is the only
                feedback there is — and it must never call an unsaved capture
                saved.

                ALWAYS RENDERED, empty when there is nothing to say. A live
                region has to be in the DOM before the text arrives: mount the
                element and its first message in the same commit and screen
                readers generally announce nothing, which would silently lose the
                one case this is here for — pressing the location button on a
                blank form, where the button itself just stops spinning. */}
            <p
              role="status"
              className={`text-xs mt-1.5 ${
                !hint ? 'sr-only' : hint.tone === 'warn' ? 'text-amber-700' : 'text-green-700'
              }`}
            >
              {hint ? t(hint.key, { city: hint.city }) : ''}
            </p>
          </div>

          <div>
            <label className={labelCls} htmlFor="job-description">{t('employer:jobForm.descriptionLabel')} <span className="text-gray-400 font-normal">{t('employer:jobForm.descriptionHint')}</span><Req /></label>
            <textarea id="job-description" aria-required className={inputCls} rows={5} maxLength={5000} value={f.description} onChange={(e) => set('description', e.target.value)} placeholder={t('employer:jobForm.descriptionPlaceholder')} />
            <p className="text-xs text-gray-400 mt-0.5">{f.description.trim().length}/5000</p>
          </div>
        </section>

        {/* Section: Pay */}
        <section className="space-y-4 border-t border-gray-100 pt-6">
          <h2 className={sectionTitleCls}>{t('employer:jobForm.sectionPay')}</h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls} htmlFor="job-salary-min">{t('employer:jobForm.minSalaryLabel')}</label>
              <input type="number" min={0} className={inputCls} id="job-salary-min" value={f.salaryMin} onChange={(e) => set('salaryMin', e.target.value)} placeholder={t('employer:jobForm.optional')} />
            </div>
            <div>
              <label className={labelCls} htmlFor="job-salary-max">{t('employer:jobForm.maxSalaryLabel')}</label>
              <input type="number" min={0} className={inputCls} id="job-salary-max" value={f.salaryMax} onChange={(e) => set('salaryMax', e.target.value)} placeholder={t('employer:jobForm.optional')} />
            </div>
            <div>
              <label className={labelCls} htmlFor="job-pay-period">{t('employer:jobForm.payPeriodLabel')}</label>
              <select className={inputCls} id="job-pay-period" value={f.paymentType} onChange={(e) => set('paymentType', e.target.value as PaymentTypeValue)}>
                {PAYMENT_TYPES.map((p) => (
                  <option key={p} value={p}>{t(`employer:jobForm.paymentType.${p}`)}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Section: Details */}
        <section className="space-y-4 border-t border-gray-100 pt-6">
          <h2 className={sectionTitleCls}>{t('employer:jobForm.sectionDetails')}</h2>

          <div>
            <label className={labelCls} htmlFor="job-requirements">{t('employer:jobForm.requirementsLabel')}</label>
            <textarea className={inputCls} rows={3} maxLength={3000} id="job-requirements" value={f.requirements} onChange={(e) => set('requirements', e.target.value)} placeholder={t('employer:jobForm.requirementsPlaceholder')} />
          </div>

          <div>
            <label className={labelCls} htmlFor="job-skills">{t('employer:jobForm.skillsLabel')} <span className="text-gray-400 font-normal">{t('employer:jobForm.skillsHint')}</span></label>
            <input className={inputCls} id="job-skills" value={f.skills} onChange={(e) => set('skills', e.target.value)} placeholder={t('employer:jobForm.skillsPlaceholder')} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls} htmlFor="job-type">{t('employer:jobForm.jobTypeLabel')}<Req /></label>
              <select id="job-type" aria-required className={inputCls} value={f.jobType} onChange={(e) => set('jobType', e.target.value as JobTypeValue)}>
                <option value="">{t('employer:jobForm.selectPlaceholder')}</option>
                {JOB_TYPES.map((jt) => (
                  <option key={jt} value={jt}>{humanizeJobType(jt)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="job-urgency">{t('employer:jobForm.urgencyLabel')}</label>
              <select className={inputCls} id="job-urgency" value={f.urgencyLevel} onChange={(e) => set('urgencyLevel', e.target.value as UrgencyLevelValue)}>
                {URGENCY_LEVELS.map((u) => (
                  <option key={u} value={u}>{t(`employer:jobForm.urgency.${u}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="job-positions">{t('employer:jobForm.positionsLabel')}</label>
              <input type="number" min={1} className={inputCls} id="job-positions" value={f.numberOfPositions} onChange={(e) => set('numberOfPositions', e.target.value)} />
            </div>
          </div>

          {/* Duration, "Expires On" and the two contact toggles used to sit here.
              The backend dropped all four columns in fe246f1 (2026-08-06), so the
              form was collecting input the server discarded — and the expiry date
              was never real anyway: a job lives `liveUntil`, 30 days per POST
              credit, whatever date the employer picked. Employer contact is now
              always shown to seekers, by product decision, so there is nothing
              left to toggle. */}
        </section>

        {shownError && (
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{shownError}</span>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full px-6 py-3 bg-primary-50 text-white rounded-lg text-base font-medium hover:bg-primary-60 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
          {submitting ? t('employer:jobForm.saving') : submitLabel}
        </button>
      </div>

      {/* Live Preview — renders as the seeker will see the card */}
      <div className="lg:sticky lg:top-24 self-start">
        <p className="text-sm font-medium text-[#717182] mb-3">{t('employer:jobForm.previewLabel')}</p>
        <div className="bg-white border border-[#dddddd] rounded-[10px] p-4 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="w-[52px] h-[51px] bg-[#a9e5ff] rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-[24px] font-semibold text-[#236987]">{initials(f.companyName || f.title)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg sm:text-xl font-semibold mb-1">{f.title || t('employer:jobForm.previewJobTitle')}</h3>
              <p className="text-sm text-black mb-3">{f.companyName || t('employer:jobForm.previewCompany')}</p>
              <div className="flex items-center gap-1 mb-3">
                <IndianRupee className="w-4 h-4" />
                <span className="text-sm">
                  {formatSalary(f.salaryMin ? Number(f.salaryMin) : null, f.salaryMax ? Number(f.salaryMax) : null)}
                  {' / '}
                  {t(`employer:jobForm.paymentType.${f.paymentType}`)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {f.jobType && (
                  <div className="bg-[#efefef] px-3 py-1 rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#3386a9]" />
                    <span className="text-xs text-black">{humanizeJobType(f.jobType)}</span>
                  </div>
                )}
                {f.category && (
                  <div className="bg-[#efefef] px-3 py-1 rounded-full flex items-center gap-1">
                    <Briefcase className="w-3 h-3 text-[#3386a9]" />
                    <span className="text-xs text-black">{f.category}</span>
                  </div>
                )}
                {f.location && (
                  <div className="bg-[#efefef] px-3 py-1 rounded-full flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#3386a9]" />
                    <span className="text-xs text-black">{f.location}</span>
                  </div>
                )}
              </div>
              {f.description && (
                <p className="text-sm text-[#444] whitespace-pre-line line-clamp-6">{f.description}</p>
              )}
              {skillsArray.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {skillsArray.map((s) => (
                    <span key={s} className="bg-[#e3f5ff] text-[#236987] px-3 py-1 rounded-full text-xs">{s}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
