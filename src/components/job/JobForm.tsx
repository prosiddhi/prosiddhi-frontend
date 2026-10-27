'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { categoryLabel } from '@/lib/categoryLabel'
import { useController, useForm, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  type JobFields,
  type PostJobData,
  type UpdateJobData,
  type JobTypeValue,
  type TaxonomyTriple,
} from '@/lib/api'
import { StateCitySelect, type SelectedCity } from '@/components/location/StateCitySelect'
import { TaxonomyPicker } from '@/components/taxonomy/TaxonomyPicker'
import { Field } from '@/components/form/Field'
import { INVALID_CLS } from '@/components/form/FieldError'
import { humanizeJobType, formatSalary, initials, jobPlaceTags } from '@/lib/jobFormat'
import {
  JOB_TYPES,
  PAYMENT_TYPES,
  URGENCY_LEVELS,
  buildJobFormSchema,
  MAX_JOB_CITIES,
  parseSkills,
  type JobFormValues,
} from '@/lib/validation/jobSchema'
import { Clock, Briefcase, MapPin, IndianRupee, Loader2, AlertCircle } from 'lucide-react'

interface JobFormBaseProps {
  /** The job's saved fields. Cities come separately (`initialCities`), as ids alone cannot draw a chip. */
  initial?: Partial<JobFields>
  /**
   * The job's current cities for the picker, each with its state's name (the BE
   * sends `cities[].city.state.name`). Leave out for a new post.
   */
  initialCities?: SelectedCity[]
  /**
   * Edit only, and ONLY for a job that has no cities because it was posted before
   * they existed: its saved `location` text. Its presence is what makes this a
   * legacy edit — no city is required, the text is shown read-only, and
   * `cityIds` is left out of what is sent unless cities are picked. Never pass it
   * for a job that has cities.
   */
  legacyLocation?: string
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
  /**
   * New post only: a company name to put in the empty Company Name box (the employer's
   * saved one, which can arrive after the form is shown). Used once, and never if the
   * employer has already typed in the box. Ignored on an edit.
   */
  companyNameSuggestion?: string
}

/**
 * A new post sends `PostJobData` (a city is required); an edit sends
 * `UpdateJobData`, where `cityIds` may be absent. The pairing is typed so the
 * create page cannot be handed a payload without cities.
 */
type JobFormProps = JobFormBaseProps &
  (
    | { mode?: 'create'; onSubmit: (data: PostJobData) => void }
    | { mode: 'edit'; onSubmit: (data: UpdateJobData) => void }
  )

function buildInitialState(
  initial?: Partial<JobFields>,
  initialCities?: SelectedCity[],
): JobFormValues {
  return {
    title: initial?.title ?? '',
    companyName: initial?.companyName ?? '',
    category: initial?.category ?? '',
    sector: initial?.sector ?? '',
    jobTitle: initial?.jobTitle ?? '',
    description: initial?.description ?? '',
    requirements: initial?.requirements ?? '',
    skills: (initial?.skillsRequired ?? []).join(', '),
    cities: initialCities ?? [],
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
// The shared fields' look, plus what a disabled <select> needs: the city list is disabled while it
// loads or after a failed load, and without these it would look like a live control.
const pickerSelectCls = `${inputCls} disabled:opacity-50 disabled:cursor-not-allowed`
const sectionTitleCls = 'text-base font-semibold text-black'

// Which fields get the `*` (DEF-024): title, description, cities,
// jobType - exactly what createJobSchema requires with no default
// (prosiddhi-backend/src/validators/job.validator.ts). Everything else posts fine
// empty. Salary, skills, requirements, company name, category, sector and job
// title say "(Optional)". Pay period, urgency and positions say neither: they
// always hold a value because the form supplies a default.

// The order the fields appear on the page. On a failed Submit focus goes to the
// first one with a problem in THIS order, not in the order react-hook-form
// happened to register them (the category control registers first, above the
// title it sits under).
const FIELD_ORDER: (keyof JobFormValues)[] = [
  'title',
  'category',
  'companyName',
  'cities',
  'description',
  'salaryMin',
  'salaryMax',
  'requirements',
  'skills',
  'jobType',
  'numberOfPositions',
]

/**
 * The form field a BE error path belongs to, if the form has one. Skills and cities
 * are named differently (`skillsRequired`, `cityIds`; the BE reports a bad entry as
 * `cityIds.2`, so only the root is looked at).
 */
const SERVER_PATH_TO_FIELD: Record<string, string> = { skillsRequired: 'skills', cityIds: 'cities' }
function formFieldForServerPath(path: string) {
  const root = path.split('.')[0]
  return FIELD_ORDER.find((f) => f === (SERVER_PATH_TO_FIELD[root] ?? root))
}

export function JobForm(props: JobFormProps) {
  const { initial, initialCities, legacyLocation, submitLabel, submitting, error, serverFieldErrors, companyNameSuggestion } = props
  const { t } = useTranslation()
  // A legacy edit (see JobFormBaseProps.legacyLocation) is the one case where no city is
  // required. Create and an edit of a job that already has cities both need 1 to 5.
  // Also false if the job does have cities, whatever the caller passed: a city must never be
  // optional for a job that already has them.
  const legacy = props.mode === 'edit' && legacyLocation !== undefined && (initialCities?.length ?? 0) === 0
  const schema = useMemo(() => buildJobFormSchema({ requireCities: !legacy }), [legacy])
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
    getValues,
    setValue,
    setError,
    trigger,
    setFocus,
    handleSubmit: validateAndSubmit,
    formState: { errors, touchedFields, submitCount },
  } = useForm<JobFormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    shouldFocusError: false,
    defaultValues: buildInitialState(initial, initialCities),
  })
  const f = watch()

  // Offer the suggested company name. It arrives once, and a re-run finds the box
  // filled, so no "done" flag is needed. `onChange` marks the box as the employer's
  // the moment they type, so a suggestion that lands later never replaces (or refills)
  // their text, even if they cleared it. `setValue` with no options leaves the box
  // neither dirty nor touched.
  const companyEditedRef = useRef(false)
  const isEdit = props.mode === 'edit'
  useEffect(() => {
    if (isEdit || !companyNameSuggestion) return
    if (!companyEditedRef.current && getValues('companyName') === '') {
      setValue('companyName', companyNameSuggestion)
    }
  }, [isEdit, companyNameSuggestion, getValues, setValue])

  // Category lives inside TaxonomyPicker, so it is wired through a controller
  // rather than `register`. Its ref is what lets a failed Submit focus it.
  const {
    field: { onChange: setCategory, onBlur: blurCategory, ref: categoryRef },
  } = useController({ control, name: 'category' })
  // Cities live inside StateCitySelect, so they are wired through a controller like
  // category. Its ref is what lets a failed Submit focus the city select.
  const { field: citiesField } = useController({ control, name: 'cities' })

  // A schema message is an i18n key; a server message is the BE's own text.
  const errorText = (name: keyof JobFormValues) => {
    const e = errors[name]
    if (!e?.message) return undefined
    return e.type === 'server' ? e.message : t(e.message)
  }
  const fieldCls = (name: keyof JobFormValues) => (errors[name] ? `${inputCls} ${INVALID_CLS}` : inputCls)
  const optionalLabel = `(${t('status.optional')})`

  // The cascading picker emits the full triple; mirror it into the flat form
  // fields (empty levels come back as undefined → stored as '').
  const setTaxonomy = (next: TaxonomyTriple) => {
    setCategory(next.category ?? '')
    setValue('sector', next.sector ?? '')
    setValue('jobTitle', next.jobTitle ?? '')
  }

  const skillsArray = parseSkills(f.skills)
  // The preview's place: the picked cities, or for a legacy job still without any, its saved text.
  const previewPlaces = jobPlaceTags({ cities: f.cities.map((c) => ({ city: c })), location: legacyLocation })

  // Salary Max carries the "max is below min" error, so it has to be re-checked
  // when Min changes - but only if Max has been looked at already; otherwise
  // editing Min first would flag a box the employer has not reached.
  const recheckSalaryMax = () => {
    if (touchedFields.salaryMax || errors.salaryMax || submitCount > 0) void trigger('salaryMax')
  }

  // The BE names a field by its payload key; the form's own key differs for skills and cities.
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
    const base = {
      title: values.title.trim(),
      description: values.description.trim(),
      jobType: values.jobType as JobTypeValue,
      paymentType: values.paymentType,
      urgencyLevel: values.urgencyLevel,
      numberOfPositions: values.numberOfPositions ? Number(values.numberOfPositions) : 1,
      ...(values.companyName.trim() ? { companyName: values.companyName.trim() } : {}),
      ...(values.category.trim() ? { category: values.category.trim() } : {}),
      ...(values.sector ? { sector: values.sector } : {}),
      ...(values.jobTitle ? { jobTitle: values.jobTitle } : {}),
      ...(values.requirements.trim() ? { requirements: values.requirements.trim() } : {}),
      ...(skillsArray.length ? { skillsRequired: skillsArray } : {}),
      ...(values.salaryMin ? { salaryMin: Number(values.salaryMin) } : {}),
      ...(values.salaryMax ? { salaryMax: Number(values.salaryMax) } : {}),
    }
    // Only the ids go to the BE; it writes `location` and the coordinates from them.
    const cityIds = values.cities.map((c) => c.id)
    if (props.mode === 'edit') {
      // A legacy job left without cities sends NO `cityIds` key at all: the BE then keeps
      // the job as it is. An empty list is not the same thing, it is a 400.
      props.onSubmit({ ...base, ...(cityIds.length > 0 ? { cityIds } : {}) })
    } else {
      props.onSubmit({ ...base, cityIds })
    }
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

          {/* Category, sector and job title are all optional. */}
          <TaxonomyPicker
            optional={['category', 'sector', 'jobTitle']}
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
            <input id="job-company" className={fieldCls('companyName')} placeholder={t('employer:jobForm.companyNamePlaceholder')} {...register('companyName', { onChange: () => { companyEditedRef.current = true } })} />
          </Field>

          <div>
            <StateCitySelect
              multiple
              max={MAX_JOB_CITIES}
              value={citiesField.value}
              onChange={citiesField.onChange}
              onBlur={citiesField.onBlur}
              cityRef={citiesField.ref}
              required={!legacy}
              error={errorText('cities')}
              selectClassName={pickerSelectCls}
              labelClassName={labelCls}
            />
            {/* A job posted before cities existed: its saved text, read-only. */}
            {legacy && legacyLocation && (
              <p className="text-xs mt-2 text-[#717182]">
                {t('employer:jobForm.locationLegacy', { location: legacyLocation })}
              </p>
            )}
          </div>

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
                    <span className="text-xs text-black">{categoryLabel(t, f.category)}</span>
                  </div>
                )}
                {previewPlaces.map((p) => (
                  <div key={p.key} className="bg-[#efefef] px-3 py-1 rounded-full flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[#3386a9]" />
                    <span className="text-xs text-black">{p.label}</span>
                  </div>
                ))}
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
