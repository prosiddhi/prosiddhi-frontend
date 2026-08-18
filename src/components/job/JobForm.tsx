'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type PostJobData,
  type JobTypeValue,
  type PaymentTypeValue,
  type UrgencyLevelValue,
  type TaxonomyTriple,
} from '@/lib/api'
import { TaxonomyPicker } from '@/components/taxonomy/TaxonomyPicker'
import { humanizeJobType, formatSalary, initials } from '@/lib/jobFormat'
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

export function JobForm({ initial, submitLabel, submitting, error, onSubmit }: JobFormProps) {
  const { t } = useTranslation()
  const [f, setF] = useState<FormState>(() => buildInitialState(initial))
  const [validationError, setValidationError] = useState('')

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setF((prev) => ({ ...prev, [key]: value }))

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
      location: f.location.trim(),
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
    }
    onSubmit(data)
  }

  const shownError = validationError || error

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
      {/* Form */}
      <div className="space-y-6">
        {/* Section: Basics */}
        <section className="space-y-4">
          <h2 className={sectionTitleCls}>{t('employer:jobForm.sectionBasics')}</h2>

          <div>
            <label className={labelCls}>{t('employer:jobForm.jobTitleLabel')}</label>
            <input className={inputCls} value={f.title} onChange={(e) => set('title', e.target.value)} placeholder={t('employer:jobForm.jobTitlePlaceholder')} />
          </div>

          <TaxonomyPicker
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
            <label className={labelCls}>{t('employer:jobForm.companyNameLabel')}</label>
            <input className={inputCls} value={f.companyName} onChange={(e) => set('companyName', e.target.value)} placeholder={t('employer:jobForm.companyNamePlaceholder')} />
          </div>

          <div>
            <label className={labelCls}>{t('employer:jobForm.locationLabel')}</label>
            <input className={inputCls} value={f.location} onChange={(e) => set('location', e.target.value)} placeholder={t('employer:jobForm.locationPlaceholder')} />
          </div>

          <div>
            <label className={labelCls}>{t('employer:jobForm.descriptionLabel')} <span className="text-gray-400 font-normal">{t('employer:jobForm.descriptionHint')}</span></label>
            <textarea className={inputCls} rows={5} maxLength={5000} value={f.description} onChange={(e) => set('description', e.target.value)} placeholder={t('employer:jobForm.descriptionPlaceholder')} />
            <p className="text-xs text-gray-400 mt-0.5">{f.description.trim().length}/5000</p>
          </div>
        </section>

        {/* Section: Pay */}
        <section className="space-y-4 border-t border-gray-100 pt-6">
          <h2 className={sectionTitleCls}>{t('employer:jobForm.sectionPay')}</h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>{t('employer:jobForm.minSalaryLabel')}</label>
              <input type="number" min={0} className={inputCls} value={f.salaryMin} onChange={(e) => set('salaryMin', e.target.value)} placeholder={t('employer:jobForm.optional')} />
            </div>
            <div>
              <label className={labelCls}>{t('employer:jobForm.maxSalaryLabel')}</label>
              <input type="number" min={0} className={inputCls} value={f.salaryMax} onChange={(e) => set('salaryMax', e.target.value)} placeholder={t('employer:jobForm.optional')} />
            </div>
            <div>
              <label className={labelCls}>{t('employer:jobForm.payPeriodLabel')}</label>
              <select className={inputCls} value={f.paymentType} onChange={(e) => set('paymentType', e.target.value as PaymentTypeValue)}>
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
            <label className={labelCls}>{t('employer:jobForm.requirementsLabel')}</label>
            <textarea className={inputCls} rows={3} maxLength={3000} value={f.requirements} onChange={(e) => set('requirements', e.target.value)} placeholder={t('employer:jobForm.requirementsPlaceholder')} />
          </div>

          <div>
            <label className={labelCls}>{t('employer:jobForm.skillsLabel')} <span className="text-gray-400 font-normal">{t('employer:jobForm.skillsHint')}</span></label>
            <input className={inputCls} value={f.skills} onChange={(e) => set('skills', e.target.value)} placeholder={t('employer:jobForm.skillsPlaceholder')} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>{t('employer:jobForm.jobTypeLabel')}</label>
              <select className={inputCls} value={f.jobType} onChange={(e) => set('jobType', e.target.value as JobTypeValue)}>
                <option value="">{t('employer:jobForm.selectPlaceholder')}</option>
                {JOB_TYPES.map((jt) => (
                  <option key={jt} value={jt}>{humanizeJobType(jt)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t('employer:jobForm.urgencyLabel')}</label>
              <select className={inputCls} value={f.urgencyLevel} onChange={(e) => set('urgencyLevel', e.target.value as UrgencyLevelValue)}>
                {URGENCY_LEVELS.map((u) => (
                  <option key={u} value={u}>{t(`employer:jobForm.urgency.${u}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>{t('employer:jobForm.positionsLabel')}</label>
              <input type="number" min={1} className={inputCls} value={f.numberOfPositions} onChange={(e) => set('numberOfPositions', e.target.value)} />
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
