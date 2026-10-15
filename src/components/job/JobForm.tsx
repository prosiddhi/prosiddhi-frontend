'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useController, useForm, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  type PostJobData,
  type JobTypeValue,
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
import { Field } from '@/components/form/Field'
import { INVALID_CLS } from '@/components/form/FieldError'
import { humanizeJobType, formatSalary, initials, canonicalLocation } from '@/lib/jobFormat'
import {
  JOB_TYPES,
  PAYMENT_TYPES,
  URGENCY_LEVELS,
  jobFormSchema,
  parseSkills,
  type JobFormValues,
} from '@/lib/validation/jobSchema'
import { Clock, Briefcase, MapPin, IndianRupee, Loader2, AlertCircle } from 'lucide-react'

interface JobFormProps {
  initial?: Partial<PostJobData>
  submitLabel: string
  submitting: boolean
  error?: string
  /**
   * The BE's field-level validation errors from the last failed save (the parent
   * passes `fieldErrorsByPath(err)`). Each one is shown at its field; the entered
   * values are untouched. A field the form does not have is ignored, and the
   * parent's `error` text still covers it.
   */
  serverFieldErrors?: Record<string, string[]>
  onSubmit: (data: PostJobData) => void
}

function buildInitialState(initial?: Partial<PostJobData>): JobFormValues {
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

// Which fields get the `*` (DEF-024): title, category, description, location,
// jobType - exactly what createJobSchema requires with no default
// (prosiddhi-backend/src/validators/job.validator.ts). Everything else posts fine
// empty. Salary, skills, requirements, company name, sector and job title say
// "(Optional)". Pay period, urgency and positions say neither: they always hold a
// value because the form supplies a default.

// The order the fields appear on the page. On a failed Submit focus goes to the
// first one with a problem in THIS order, not in the order react-hook-form
// happened to register them (the category control registers first, above the
// title it sits under).
const FIELD_ORDER: (keyof JobFormValues)[] = [
  'title',
  'category',
  'companyName',
  'location',
  'description',
  'salaryMin',
  'salaryMax',
  'requirements',
  'skills',
  'jobType',
  'numberOfPositions',
]

/** The form field a BE error path belongs to, if the form has one. Only skills is named differently. */
function formFieldForServerPath(path: string) {
  const root = path.split('.')[0]
  return FIELD_ORDER.find((f) => f === (root === 'skillsRequired' ? 'skills' : root))
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

type LocationHint = {
  key: string
  city?: string
  tone: 'good' | 'warn'
  /** Offer "remove the saved location" — only where a stored pin is the problem. */
  clearable?: boolean
} | null

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
 * `pinned` is the sharp one. Edit a job's location from "Bangalore" to somewhere
 * we cannot place and the stored pin STAYS — the job goes on showing to
 * Bangalore seekers at 0 km and never reaches the new town.
 *
 * It used to be unfixable: the backend fields were `.optional()` and not
 * nullable, so no client could clear a coordinate and this warning was the only
 * honest thing available. `9dbb470` made the two update schemas nullish, so the
 * warning now carries a way out — `clearable` — and the employer can remove the
 * pin instead of only being told about it.
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
      ? { key: 'employer:jobForm.locationPinned', city: translate(stuckIn), tone: 'warn', clearable: true }
      : { key: 'employer:jobForm.locationPinnedUnnamed', tone: 'warn', clearable: true }
  }
  return { key: 'employer:jobForm.locationUnknown', tone: 'warn' }
}

export function JobForm({ initial, submitLabel, submitting, error, serverFieldErrors, onSubmit }: JobFormProps) {
  const { t } = useTranslation()
  // 'onTouched': a field is checked the first time it loses focus, and again on
  // every change after that - so a problem shows when the employer leaves the box,
  // and goes away the moment the value is right, without another Submit.
  //
  // shouldFocusError is off because react-hook-form would focus in registration
  // order, which is not page order; `onInvalid` below does it from FIELD_ORDER.
  const {
    register,
    control,
    watch,
    setValue,
    setError,
    trigger,
    setFocus,
    handleSubmit: validateAndSubmit,
    formState: { errors, touchedFields, submitCount },
  } = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    shouldFocusError: false,
    defaultValues: buildInitialState(initial),
  })
  const f = watch()
  // Category lives inside TaxonomyPicker, so it is wired through a controller
  // rather than `register`. Its ref is what lets a failed Submit focus it.
  const {
    field: { onChange: setCategory, onBlur: blurCategory, ref: categoryRef },
  } = useController({ control, name: 'category' })
  // TD-03.
  const [gpsFix, setGpsFix] = useState<Coords | null>(null)
  // TD-42 — the employer asked for the stored pin to be removed.
  //
  // ⚠️ Explicit, never inferred. Clearing whenever the typed text matches no
  // city would look tidier and would be wrong: "Whitefield" matches nothing, so
  // an employer NARROWING "Bangalore" to the area they are actually hiring in
  // would silently lose a perfectly good coordinate. Only a press means "remove
  // it".
  const [clearPin, setClearPin] = useState(false)
  // Which came last, the typed text or the fix. See coordsToWrite.
  const [textIsNewer, setTextIsNewer] = useState(false)

  // A schema message is an i18n key; a server message is the BE's own text.
  const errorText = (name: keyof JobFormValues) => {
    const e = errors[name]
    if (!e?.message) return undefined
    return e.type === 'server' ? e.message : t(e.message)
  }
  const fieldCls = (name: keyof JobFormValues) => (errors[name] ? `${inputCls} ${INVALID_CLS}` : inputCls)
  const optionalLabel = `(${t('status.optional')})`

  // The pin the server already holds. Read from `initial`, not the form values —
  // nothing on this form edits it directly; only the location button replaces
  // it. Rebuilt each render, which is two null checks feeding pure functions.
  const savedPin =
    initial?.latitude != null && initial?.longitude != null
      ? { lat: initial.latitude, lon: initial.longitude }
      : null
  const translateCity = (key: string) => t(cityLabelKey(key))
  // ONE decision, used twice: `onValid` sends `decision.coords` and the
  // line under the input describes `decision.reason`. What the employer is told
  // and what is actually written cannot drift apart, because they are the same
  // call.
  //
  // NOT memoised on `f`: `watch()` returns a new object on every keystroke in
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
  const setTaxonomy = (next: TaxonomyTriple) => {
    setCategory(next.category ?? '')
    setValue('sector', next.sector ?? '')
    setValue('jobTitle', next.jobTitle ?? '')
  }

  const skillsArray = parseSkills(f.skills)

  // Salary Max carries the "max is below min" error, so it has to be re-checked
  // when Min changes - but only if Max has been looked at already; otherwise
  // editing Min first would flag a box the employer has not reached.
  const recheckSalaryMax = () => {
    if (touchedFields.salaryMax || errors.salaryMax || submitCount > 0) void trigger('salaryMax')
  }

  // The BE names a field by its payload key; the form's own key differs only for skills.
  // setError's message stays until that field is edited and re-validated.
  useEffect(() => {
    if (!serverFieldErrors) return
    const failed = new Set<string>()
    for (const [path, messages] of Object.entries(serverFieldErrors)) {
      const name = formFieldForServerPath(path)
      if (!name) continue
      setError(name, { type: 'server', message: messages.join(' ') })
      failed.add(name)
    }
    const first = FIELD_ORDER.find((f) => failed.has(f))
    if (first) setFocus(first)
  }, [serverFieldErrors, setError, setFocus])

  // Failed Submit: put the cursor on the first problem, in page order (TD-45).
  // Every invalid field is already marked and explained; this picks where to start.
  const onInvalid = (invalid: FieldErrors<JobFormValues>) => {
    const first = FIELD_ORDER.find((name) => invalid[name])
    if (first) setFocus(first)
  }

  const onValid = (values: JobFormValues) => {
    const data: PostJobData = {
      title: values.title.trim(),
      description: values.description.trim(),
      category: values.category.trim(),
      // Canonicalised, not raw — see canonicalLocation. A job stored under a
      // translated city name is a job that only matches seekers in that one
      // language.
      location: canonicalLocation(values.location),
      jobType: values.jobType as JobTypeValue,
      paymentType: values.paymentType,
      urgencyLevel: values.urgencyLevel,
      numberOfPositions: values.numberOfPositions ? Number(values.numberOfPositions) : 1,
      ...(values.companyName.trim() ? { companyName: values.companyName.trim() } : {}),
      ...(values.sector ? { sector: values.sector } : {}),
      ...(values.jobTitle ? { jobTitle: values.jobTitle } : {}),
      ...(values.requirements.trim() ? { requirements: values.requirements.trim() } : {}),
      ...(skillsArray.length ? { skillsRequired: skillsArray } : {}),
      ...(values.salaryMin ? { salaryMin: Number(values.salaryMin) } : {}),
      ...(values.salaryMax ? { salaryMax: Number(values.salaryMax) } : {}),
      // TD-03 — the job's coordinates. Without these `getNearbyForSeeker` drops
      // the job on a null check before any distance maths runs, and the 20-point
      // location score cannot fire: it needs the JOB's pair as well as the
      // seeker's.
      //
      // `decision` is computed once in the render body and shared with the hint
      // line under the location input (TD-41), so what the employer was told and
      // what is sent are the same verdict rather than two derivations of it.
      // An explicit removal wins over everything the rule computed. It is only
      // ever reachable from the `pinned` states, where the stored pin is the
      // problem — see `clearPin`.
      ...(clearPin ? { latitude: null, longitude: null } : coordinateFields(decision.coords)),
    }
    onSubmit(data)
  }

  // Server messages for a field this form does not have (no input to hang them on).
  const unmappedServerErrors = Object.entries(serverFieldErrors ?? {})
    .filter(([path]) => !formFieldForServerPath(path))
    .flatMap(([, messages]) => messages)

  // After a failed Submit the summary says so; the per-field messages say what.
  // Server messages with no field to sit on are listed beside it so they are not
  // lost. The parent's general `error` is the fallback when there is neither -
  // it is skipped otherwise because it is only the generic "Validation failed"
  // that these messages already explain.
  const hasFieldErrors = submitCount > 0 && Object.keys(errors).length > 0
  const shownMessages = [
    ...new Set([
      ...(hasFieldErrors ? [t('employer:jobForm.validation.fixFields')] : []),
      ...unmappedServerErrors,
    ]),
  ]
  if (shownMessages.length === 0 && error) shownMessages.push(error)

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

          <Field label={t('employer:jobForm.jobTitleLabel')} className={labelCls} required error={errorText('title')}>
            <input id="job-title" className={fieldCls('title')} placeholder={t('employer:jobForm.jobTitlePlaceholder')} {...register('title')} />
          </Field>

          {/* Category is required; sector and jobTitle are optional server-side. */}
          <TaxonomyPicker
            required={['category']}
            optional={['sector', 'jobTitle']}
            value={{
              category: f.category || undefined,
              sector: f.sector || undefined,
              jobTitle: f.jobTitle || undefined,
            }}
            onChange={setTaxonomy}
            categoryError={errorText('category')}
            onCategoryBlur={blurCategory}
            categoryRef={categoryRef}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            selectClassName={inputCls}
            labelClassName={labelCls}
          />

          <Field label={t('employer:jobForm.companyNameLabel')} className={labelCls} optionalLabel={optionalLabel} error={errorText('companyName')}>
            <input id="job-company" className={fieldCls('companyName')} placeholder={t('employer:jobForm.companyNamePlaceholder')} {...register('companyName')} />
          </Field>

          <Field label={t('employer:jobForm.locationLabel')} className={labelCls} required error={errorText('location')}>
            {/* Free text with a datalist, NOT a select. A seeker outside our ten
                cities loses Near By; an employer outside them could not post the
                job at all, and that is a product call rather than a form
                decision. The list still nudges everyone towards a canonical
                spelling, which is what the cold-start recommendation's substring
                match needs (TD-34). Swapping to a <select> is one edit if the
                product ever restricts it. */}
            <input
              id="job-location"
              list="job-location-cities"
              className={fieldCls('location')}
              placeholder={t('employer:jobForm.locationPlaceholder')}
              {...register('location', { onChange: () => setTextIsNewer(true) })}
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
                // A fresh fix REPLACES the pin, so a pending removal is moot —
                // and leaving it set would send null alongside the new
                // coordinate.
                setClearPin(false)
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
            {/* TD-42. Offered ONLY where a stored pin is the problem, and only
                as a press — inferring a removal from unmatched text would wipe
                the coordinate of an employer narrowing "Bangalore" to
                "Whitefield", which matches no city and is not a move.

                Outside the live region above, so pressing it does not re-read
                the warning; the confirmation is the warning disappearing. */}
            {hint?.clearable && !clearPin && (
              <button
                type="button"
                onClick={() => setClearPin(true)}
                className="text-xs mt-1 underline text-amber-800 hover:no-underline min-h-[44px]"
              >
                {t('employer:jobForm.locationClear')}
              </button>
            )}
            {clearPin && (
              <p className="text-xs mt-1.5 text-[#717182]">
                {t('employer:jobForm.locationCleared')}
              </p>
            )}
          </Field>

          <Field
            label={<>{t('employer:jobForm.descriptionLabel')} <span className="text-gray-400 font-normal">{t('employer:jobForm.descriptionHint')}</span></>}
            className={labelCls}
            required
            error={errorText('description')}
          >
            <textarea id="job-description" className={fieldCls('description')} rows={5} placeholder={t('employer:jobForm.descriptionPlaceholder')} {...register('description')} />
            <p className={`text-xs mt-0.5 ${errors.description ? 'text-red-600' : 'text-gray-400'}`}>{f.description.trim().length}/5000</p>
          </Field>
        </section>

        {/* Section: Pay */}
        <section className="space-y-4 border-t border-gray-100 pt-6">
          <h2 className={sectionTitleCls}>{t('employer:jobForm.sectionPay')}</h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label={t('employer:jobForm.minSalaryLabel')} className={labelCls} optionalLabel={optionalLabel} error={errorText('salaryMin')}>
              <input type="number" min={0} id="job-salary-min" className={fieldCls('salaryMin')} {...register('salaryMin', { onChange: recheckSalaryMax })} />
            </Field>
            <Field label={t('employer:jobForm.maxSalaryLabel')} className={labelCls} optionalLabel={optionalLabel} error={errorText('salaryMax')}>
              <input type="number" min={0} id="job-salary-max" className={fieldCls('salaryMax')} {...register('salaryMax')} />
            </Field>
            <Field label={t('employer:jobForm.payPeriodLabel')} className={labelCls}>
              <select id="job-pay-period" className={inputCls} {...register('paymentType')}>
                {PAYMENT_TYPES.map((p) => (
                  <option key={p} value={p}>{t(`employer:jobForm.paymentType.${p}`)}</option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        {/* Section: Details */}
        <section className="space-y-4 border-t border-gray-100 pt-6">
          <h2 className={sectionTitleCls}>{t('employer:jobForm.sectionDetails')}</h2>

          <Field label={t('employer:jobForm.requirementsLabel')} className={labelCls} optionalLabel={optionalLabel} error={errorText('requirements')}>
            <textarea id="job-requirements" className={fieldCls('requirements')} rows={3} placeholder={t('employer:jobForm.requirementsPlaceholder')} {...register('requirements')} />
          </Field>

          <Field
            label={<>{t('employer:jobForm.skillsLabel')} <span className="text-gray-400 font-normal">{t('employer:jobForm.skillsHint')}</span></>}
            className={labelCls}
            optionalLabel={optionalLabel}
            error={errorText('skills')}
          >
            <input id="job-skills" className={fieldCls('skills')} placeholder={t('employer:jobForm.skillsPlaceholder')} {...register('skills')} />
          </Field>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Field label={t('employer:jobForm.jobTypeLabel')} className={labelCls} required error={errorText('jobType')}>
              <select id="job-type" className={fieldCls('jobType')} {...register('jobType')}>
                <option value="">{t('employer:jobForm.selectPlaceholder')}</option>
                {JOB_TYPES.map((jt) => (
                  <option key={jt} value={jt}>{humanizeJobType(jt)}</option>
                ))}
              </select>
            </Field>
            <Field label={t('employer:jobForm.urgencyLabel')} className={labelCls}>
              <select id="job-urgency" className={inputCls} {...register('urgencyLevel')}>
                {URGENCY_LEVELS.map((u) => (
                  <option key={u} value={u}>{t(`employer:jobForm.urgency.${u}`)}</option>
                ))}
              </select>
            </Field>
            <Field label={t('employer:jobForm.positionsLabel')} className={labelCls} error={errorText('numberOfPositions')}>
              <input type="number" min={1} id="job-positions" className={fieldCls('numberOfPositions')} {...register('numberOfPositions')} />
            </Field>
          </div>

          {/* Duration, "Expires On" and the two contact toggles used to sit here.
              The backend dropped all four columns in fe246f1 (2026-08-06), so the
              form was collecting input the server discarded — and the expiry date
              was never real anyway: a job lives `liveUntil`, 30 days per POST
              credit, whatever date the employer picked. Employer contact is now
              always shown to seekers, by product decision, so there is nothing
              left to toggle. */}
        </section>

        {/* TD-45. `role="alert"` so pressing Post ANNOUNCES the problem. Without
            it a screen-reader user pressed the button, heard nothing, and kept
            focus on the button with no idea the form had refused.

            ALWAYS RENDERED, empty when there is nothing wrong, for the reason
            TD-41 wrote down: a live region mounted together with its first
            message announces neither, and every one of these messages arrives
            exactly when the element would have been created. Rendering the
            container up front is what makes the announcement happen at all.

            `role="alert"` rather than `role="status"` — this one interrupts,
            because the employer has just pressed a button and nothing happened.
            The field that is wrong carries its own message (see Field). */}
        <div
          role="alert"
          className={
            shownMessages.length ? 'flex items-start gap-2 text-red-600 text-sm' : 'sr-only'
          }
        >
          {shownMessages.length > 0 && (
            <>
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                {shownMessages.map((message) => (
                  <p key={message}>{message}</p>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          onClick={validateAndSubmit(onValid, onInvalid)}
          disabled={submitting}
          className="w-full px-6 py-3 bg-primary-50 text-primary-100 rounded-lg text-base font-medium hover:bg-primary-60 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                    <span className="text-xs text-black">{humanizeJobType(f.jobType as JobTypeValue)}</span>
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
