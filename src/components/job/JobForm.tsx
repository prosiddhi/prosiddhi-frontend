'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  type PostJobData,
  type JobTypeValue,
  type PaymentTypeValue,
  type UrgencyLevelValue,
} from '@/lib/api'
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
  subcategory: string
  description: string
  requirements: string
  skills: string
  location: string
  latitude: string
  longitude: string
  radius: string
  salaryMin: string
  salaryMax: string
  paymentType: PaymentTypeValue
  jobType: JobTypeValue | ''
  urgencyLevel: UrgencyLevelValue
  duration: string
  numberOfPositions: string
  expiresAt: string
  showEmailToSeekers: boolean
  showPhoneToSeekers: boolean
}

function buildInitialState(initial?: Partial<PostJobData>): FormState {
  return {
    title: initial?.title ?? '',
    companyName: initial?.companyName ?? '',
    category: initial?.category ?? '',
    subcategory: initial?.subcategory ?? '',
    description: initial?.description ?? '',
    requirements: initial?.requirements ?? '',
    skills: (initial?.skillsRequired ?? []).join(', '),
    location: initial?.location ?? '',
    latitude: initial?.latitude != null ? String(initial.latitude) : '',
    longitude: initial?.longitude != null ? String(initial.longitude) : '',
    radius: initial?.radius != null ? String(initial.radius) : '',
    salaryMin: initial?.salaryMin != null ? String(initial.salaryMin) : '',
    salaryMax: initial?.salaryMax != null ? String(initial.salaryMax) : '',
    paymentType: initial?.paymentType ?? 'MONTHLY',
    jobType: initial?.jobType ?? '',
    urgencyLevel: initial?.urgencyLevel ?? 'MEDIUM',
    duration: initial?.duration ?? '',
    numberOfPositions: initial?.numberOfPositions != null ? String(initial.numberOfPositions) : '1',
    // Render an ISO datetime back into a yyyy-mm-dd value for the date input.
    expiresAt: initial?.expiresAt ? initial.expiresAt.slice(0, 10) : '',
    showEmailToSeekers: initial?.showEmailToSeekers ?? false,
    showPhoneToSeekers: initial?.showPhoneToSeekers ?? false,
  }
}

const labelCls = 'block text-sm font-medium text-black mb-1'
const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent'

export function JobForm({ initial, submitLabel, submitting, error, onSubmit }: JobFormProps) {
  const { t } = useTranslation()
  const [f, setF] = useState<FormState>(() => buildInitialState(initial))
  const [validationError, setValidationError] = useState('')

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setF((prev) => ({ ...prev, [key]: value }))

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
      ...(f.subcategory.trim() ? { subcategory: f.subcategory.trim() } : {}),
      ...(f.requirements.trim() ? { requirements: f.requirements.trim() } : {}),
      ...(skillsArray.length ? { skillsRequired: skillsArray } : {}),
      ...(f.salaryMin ? { salaryMin: Number(f.salaryMin) } : {}),
      ...(f.salaryMax ? { salaryMax: Number(f.salaryMax) } : {}),
      ...(f.latitude ? { latitude: Number(f.latitude) } : {}),
      ...(f.longitude ? { longitude: Number(f.longitude) } : {}),
      ...(f.radius ? { radius: Number(f.radius) } : {}),
      ...(f.duration.trim() ? { duration: f.duration.trim() } : {}),
      ...(f.expiresAt ? { expiresAt: new Date(f.expiresAt).toISOString() } : {}),
      showEmailToSeekers: f.showEmailToSeekers,
      showPhoneToSeekers: f.showPhoneToSeekers,
    }
    onSubmit(data)
  }

  const shownError = validationError || error

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
      {/* Form */}
      <div className="space-y-4">
        <div>
          <label className={labelCls}>{t('employer:jobForm.jobTitleLabel')}</label>
          <input className={inputCls} value={f.title} onChange={(e) => set('title', e.target.value)} placeholder={t('employer:jobForm.jobTitlePlaceholder')} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{t('employer:jobForm.categoryLabel')}</label>
            <input className={inputCls} value={f.category} onChange={(e) => set('category', e.target.value)} placeholder={t('employer:jobForm.categoryPlaceholder')} />
          </div>
          <div>
            <label className={labelCls}>{t('employer:jobForm.subcategoryLabel')}</label>
            <input className={inputCls} value={f.subcategory} onChange={(e) => set('subcategory', e.target.value)} placeholder={t('employer:jobForm.subcategoryPlaceholder')} />
          </div>
        </div>

        <div>
          <label className={labelCls}>{t('employer:jobForm.companyNameLabel')}</label>
          <input className={inputCls} value={f.companyName} onChange={(e) => set('companyName', e.target.value)} placeholder={t('employer:jobForm.companyNamePlaceholder')} />
        </div>

        <div>
          <label className={labelCls}>{t('employer:jobForm.descriptionLabel')} <span className="text-gray-400 font-normal">{t('employer:jobForm.descriptionHint')}</span></label>
          <textarea className={inputCls} rows={5} maxLength={5000} value={f.description} onChange={(e) => set('description', e.target.value)} placeholder={t('employer:jobForm.descriptionPlaceholder')} />
          <p className="text-xs text-gray-400 mt-0.5">{f.description.trim().length}/5000</p>
        </div>

        <div>
          <label className={labelCls}>{t('employer:jobForm.requirementsLabel')}</label>
          <textarea className={inputCls} rows={3} maxLength={3000} value={f.requirements} onChange={(e) => set('requirements', e.target.value)} placeholder={t('employer:jobForm.requirementsPlaceholder')} />
        </div>

        <div>
          <label className={labelCls}>{t('employer:jobForm.skillsLabel')} <span className="text-gray-400 font-normal">{t('employer:jobForm.skillsHint')}</span></label>
          <input className={inputCls} value={f.skills} onChange={(e) => set('skills', e.target.value)} placeholder={t('employer:jobForm.skillsPlaceholder')} />
        </div>

        <div>
          <label className={labelCls}>{t('employer:jobForm.locationLabel')}</label>
          <input className={inputCls} value={f.location} onChange={(e) => set('location', e.target.value)} placeholder={t('employer:jobForm.locationPlaceholder')} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>{t('employer:jobForm.latitudeLabel')}</label>
            <input type="number" className={inputCls} value={f.latitude} onChange={(e) => set('latitude', e.target.value)} placeholder={t('employer:jobForm.optional')} />
          </div>
          <div>
            <label className={labelCls}>{t('employer:jobForm.longitudeLabel')}</label>
            <input type="number" className={inputCls} value={f.longitude} onChange={(e) => set('longitude', e.target.value)} placeholder={t('employer:jobForm.optional')} />
          </div>
          <div>
            <label className={labelCls}>{t('employer:jobForm.radiusLabel')}</label>
            <input type="number" className={inputCls} value={f.radius} onChange={(e) => set('radius', e.target.value)} placeholder="5" />
          </div>
        </div>

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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>{t('employer:jobForm.durationLabel')}</label>
            <input className={inputCls} value={f.duration} onChange={(e) => set('duration', e.target.value)} placeholder={t('employer:jobForm.durationPlaceholder')} />
          </div>
          <div>
            <label className={labelCls}>{t('employer:jobForm.expiresOnLabel')}</label>
            <input type="date" className={inputCls} value={f.expiresAt} onChange={(e) => set('expiresAt', e.target.value)} />
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <label className="flex items-center gap-2 text-sm text-black cursor-pointer">
            <input type="checkbox" checked={f.showEmailToSeekers} onChange={(e) => set('showEmailToSeekers', e.target.checked)} />
            {t('employer:jobForm.showEmail')}
          </label>
          <label className="flex items-center gap-2 text-sm text-black cursor-pointer">
            <input type="checkbox" checked={f.showPhoneToSeekers} onChange={(e) => set('showPhoneToSeekers', e.target.checked)} />
            {t('employer:jobForm.showPhone')}
          </label>
        </div>

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
              <span className="text-[24px] font-semibold text-[#236987]">{initials(f.companyName || f.title || 'JB')}</span>
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
