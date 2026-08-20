'use client'

import { useState, useRef, useEffect, ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { RegistrationProgress } from '@/components/auth/RegistrationProgress'
import { ChevronRight, ChevronLeft, X, Upload, Plus, Trash2 } from 'lucide-react'
import { VoiceButton } from '@/components/feedback/VoiceButton'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSeekerRegistration } from '../SeekerRegistrationContext'

interface Experience {
  id: string
  designation: string
  fromYear: string
  toYear: string
}

export default function RegisterExperiencePage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { data, update, hydrated } = useSeekerRegistration()
  const [experiences, setExperiences] = useState<Experience[]>(
    data.workExperiences.length
      ? data.workExperiences.map((e, i) => ({ id: String(i + 1), ...e }))
      : [{ id: '1', designation: '', fromYear: '', toYear: '' }]
  )
  const [document, setDocument] = useState<File | null>(data.document ?? null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Guard: must have chosen a sector (categories step) first. Waits for the
  // sessionStorage restore before judging.
  useEffect(() => {
    if (!hydrated) return
    if (!data.preferredSector) router.replace('/register/phone')
  }, [hydrated, data.preferredSector, router])

  // Seed the rows from restored progress once, unless something was typed here.
  useEffect(() => {
    if (!hydrated || !data.workExperiences.length) return
    setExperiences((prev) =>
      prev.some((e) => e.designation || e.fromYear || e.toYear)
        ? prev
        : data.workExperiences.map((e, i) => ({ id: String(i + 1), ...e }))
    )
    // One-shot on hydrate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated])

  const handleAddExperience = () => {
    const newExperience: Experience = {
      id: Date.now().toString(),
      designation: '',
      fromYear: '',
      toYear: ''
    }
    setExperiences([...experiences, newExperience])
  }

  /**
   * Remove a row — defect 7. "Add Experiences" existed with no way back, so a
   * mistyped or accidental row was permanent for the rest of registration.
   *
   * The last row is never removed, only cleared: the section is optional, and
   * an empty form with no visible fields and only an "Add" link reads as
   * broken. Clearing leaves them exactly where they started.
   */
  const handleRemoveExperience = (id: string) => {
    setExperiences((prev) =>
      prev.length === 1
        ? [{ id: prev[0].id, designation: '', fromYear: '', toYear: '' }]
        : prev.filter((exp) => exp.id !== id)
    )
  }

  const handleExperienceChange = (id: string, field: keyof Omit<Experience, 'id'>, value: string) => {
    setExperiences(experiences.map(exp =>
      exp.id === id ? { ...exp, [field]: value } : exp
    ))
  }

  const handleDocumentUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      if (validTypes.includes(file.type)) {
        setDocument(file)
      } else {
        alert(t('auth:experience.invalidDocument'))
      }
    }
  }

  const handleDocumentClick = () => {
    fileInputRef.current?.click()
  }

  const handleNext = () => {
    // Experience is optional — keep only rows with a designation (BE stores
    // workExperiences as {designation, fromYear, toYear}; drop the local id).
    const validExperiences = experiences
      .filter((exp) => exp.designation.trim())
      .map(({ designation, fromYear, toYear }) => ({ designation, fromYear, toYear }))

    update({
      workExperiences: validExperiences,
      document: document ?? undefined,
      documentName: document?.name ?? '',
    })

    // Password is the final input step; account creation fires there.
    router.push('/register/password')
  }

  const handleBack = () => {
    router.push('/register/categories')
  }

  return (
    <div className="relative min-h-screen bg-white">
      {/* Desktop Layout */}
      <div className="hidden lg:flex min-h-screen">
        {/* Left Side - Blue Section (Fixed Width) */}
        <div className="w-[527px] bg-primary-50 relative flex-shrink-0">
          <div className="relative h-full flex flex-col">
            {/* Text Content */}
            <div className="px-12 pt-20">
              <h2 className="text-[40px] font-bold text-white leading-[1.2] max-w-[448px]">
                {t('auth:experience.panelHeading')}
              </h2>
            </div>

            {/* Illustration at Bottom */}
            <div className="absolute bottom-0 left-0 w-full">
              <div className="relative w-[522px] h-[348px]">
                <Image
                  src="/assets/421.svg"
                  alt=""
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form Section */}
        <div className="flex-1 bg-white overflow-auto">
          <div className="max-w-[1400px] mx-auto px-16 py-16">
            {/* Header */}
            <div className="flex items-start justify-between mb-12">
              {/* Logo */}
              <div className="relative w-[236px] h-[66px]">
                <Image
                  src="/assets/prosiddhi-logo-horizontal.png"
                  alt={t('app.name')}
                  fill
                  className="object-contain object-left"
                  priority
                />
              </div>

              {/* Close Button */}
              <Link
                href="/"
                className="flex items-center gap-2 bg-error-500 hover:bg-error-600 text-white px-5 py-3 rounded-lg transition-colors"
              >
                <span className="text-[18px]">{t('auth:register.close')}</span>
                <X className="w-5 h-5" />
              </Link>
            </div>

            {/* Main Content */}
            <div className="max-w-[1200px]">
              {/* Page Title */}
              <div className="mb-8">
                <h1 className="text-[56px] font-bold text-black mb-4 leading-tight">
                  {t('auth:experience.title')}
                </h1>
                <p className="text-[24px] text-[#767676]">
                  {t('auth:experience.subtitle')}
                </p>
              </div>

              <RegistrationProgress step="experience" includeEmailStep={!!data.email} className="mb-16" />

              {/* Work Experiences Section */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-[28px] font-medium text-black">
                    {t('auth:experience.workHeading')}
                  </h2>
                  <VoiceButton label={t('auth:experience.workVoice')} iconClassName="w-[22px] h-[22px] text-gray-600" className="p-1" />
                </div>

                {/* Experience Entries */}
                <div className="space-y-6 mb-4">
                  {experiences.map((exp, index) => (
                    // Fractional columns, not the fixed 434/265/265 this had
                    // (DEF-031). Those add up to 1036px before the Remove
                    // column and the three 24px gaps, but this pane is only
                    // 785px wide at 1440 and 625px at 1280 — so "To Year" ran
                    // off the right and was CLIPPED, not scrollable, which put
                    // it out of reach entirely. It only fitted at 1920.
                    // minmax(0,…) lets the inputs actually shrink; without it
                    // the default `auto` minimum keeps the overflow.
                    <div
                      key={exp.id}
                      className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-6"
                    >
                      {/* Designation */}
                      <div>
                        <label className="text-[20px] font-medium text-black mb-4 block">
                          {t('auth:experience.designationLabel')}
                        </label>
                        <input
                          type="text"
                          value={exp.designation}
                          onChange={(e) => handleExperienceChange(exp.id, 'designation', e.target.value)}
                          placeholder={t('auth:experience.designationPlaceholder')}
                          className="w-full h-[69px] px-3 border border-[#b5b5b5] rounded-[10px] text-[20px] text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all"
                        />
                      </div>

                      {/* From Year */}
                      <div>
                        <label className="text-[20px] font-medium text-black mb-4 block">
                          {t('auth:experience.fromYearLabel')}
                        </label>
                        <input
                          type="text"
                          value={exp.fromYear}
                          onChange={(e) => handleExperienceChange(exp.id, 'fromYear', e.target.value)}
                          placeholder={t('auth:experience.fromYearPlaceholder')}
                          className="w-full h-[69px] px-3 border border-[#b5b5b5] rounded-[10px] text-[20px] text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all"
                        />
                      </div>

                      {/* To Year */}
                      <div>
                        <label className="text-[20px] font-medium text-black mb-4 block">
                          {t('auth:experience.toYearLabel')}
                        </label>
                        <input
                          type="text"
                          value={exp.toYear}
                          onChange={(e) => handleExperienceChange(exp.id, 'toYear', e.target.value)}
                          placeholder={t('auth:experience.toYearPlaceholder')}
                          className="w-full h-[69px] px-3 border border-[#b5b5b5] rounded-[10px] text-[20px] text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all"
                        />
                      </div>

                      {/* Remove — defect 7. Aligned to the inputs, not the labels. */}
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveExperience(exp.id)}
                          aria-label={t('auth:experience.removeRowAria', { number: index + 1 })}
                          className="h-[69px] w-[69px] flex items-center justify-center rounded-[10px] border border-[#b5b5b5] text-[#767676] hover:border-error-500 hover:text-error-500 transition-colors"
                        >
                          <Trash2 className="w-6 h-6" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Experience Button */}
                <button
                  onClick={handleAddExperience}
                  className="flex items-center gap-2 text-[20px] font-medium text-[#4d4d4d] hover:text-primary-70 transition-colors"
                >
                  <Plus className="w-6 h-6" />
                  <span>{t('auth:experience.addExperiences')}</span>
                </button>
              </div>

              {/* Document Upload Section */}
              <div className="mb-20">
                <div className="flex items-center gap-3 mb-6">
                  <label className="text-[20px] font-medium text-black">
                    {t('auth:experience.uploadHeading')}
                  </label>
                  <VoiceButton label={t('auth:experience.uploadVoice')} iconClassName="w-[22px] h-[22px] text-gray-600" className="p-1" />
                </div>

                {/* Upload Area */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.doc,.docx"
                  onChange={handleDocumentUpload}
                  className="hidden"
                />
                
                <button
                  onClick={handleDocumentClick}
                  className="w-full max-w-[1006px] h-[142px] border border-[#b5b5b5] rounded-[10px] bg-white hover:bg-gray-50 transition-colors flex flex-col items-center justify-center"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Upload className="w-6 h-6 text-black" />
                    <span className="text-[20px] font-medium text-black">{t('auth:experience.upload')}</span>
                  </div>
                  
                  <p className="text-[16px] text-black mb-1">
                    {document ? document.name : t('auth:experience.uploadHint')}
                  </p>
                  
                  <p className="text-[12px] font-medium text-[#4d4d4d]">
                    {t('auth:experience.uploadAccepted')}
                  </p>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between max-w-[1006px] mb-16">
                {/* Back Button */}
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 border border-secondary-70 hover:bg-secondary-10 text-black px-5 py-3 rounded-lg transition-colors h-[50px]"
                >
                  <ChevronLeft className="w-6 h-6" />
                  <span className="text-[18px]">{t('buttons.back')}</span>
                </button>

                {/* Next Button */}
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 bg-primary-50 hover:bg-primary-60 text-primary-100 px-12 py-3 rounded-lg transition-colors"
                >
                  <span className="text-[20px]">{t('buttons.next')}</span>
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>

              {/* Sign In Link */}
              <div className="text-center max-w-[1006px]">
                <p className="text-[20px]">
                  <span className="text-black">{t('auth:experience.alreadyHaveAccount')}</span>
                  <Link
                    href="/login"
                    className="text-primary-70 font-semibold hover:text-primary-80 transition-colors"
                  >
                    {t('auth:experience.signInHere')}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile & Tablet Layout */}
      <div className="lg:hidden min-h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white px-4 py-4 flex items-center justify-between border-b border-gray-200">
          {/* Logo */}
          <div className="relative w-[140px] h-[40px]">
            <Image
              src="/assets/prosiddhi-logo-horizontal.png"
              alt={t('app.name')}
              fill
              className="object-contain object-left"
              priority
            />
          </div>

          {/* Close Button */}
          <Link
            href="/"
            className="flex items-center gap-2 bg-error-500 hover:bg-error-600 text-white px-3 py-2 rounded-lg transition-colors"
          >
            <span className="text-sm">{t('auth:register.close')}</span>
            <X className="w-4 h-4" />
          </Link>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white px-4 py-8 overflow-auto">
          {/* Page Title */}
          <div className="mb-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-black mb-2">
              {t('auth:experience.title')}
            </h1>
            <p className="text-base text-[#767676]">
              {t('auth:experience.subtitle')}
            </p>
          </div>

          <RegistrationProgress step="experience" includeEmailStep={!!data.email} className="mb-8" />

          {/* Work Experiences Section */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-medium text-black">
                {t('auth:experience.workHeading')}
              </h2>
              <VoiceButton label={t('auth:experience.workVoice')} iconClassName="w-5 h-5 text-gray-600" className="p-1" />
            </div>

            {/* Experience Entries */}
            <div className="space-y-6 mb-4">
              {experiences.map((exp, index) => (
                <div key={exp.id} className="space-y-4 pb-4 border-b border-gray-100 last:border-b-0">
                  {/* Designation */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-base font-medium text-black">
                        {t('auth:experience.designationLabel')}
                      </label>
                      {/* Remove — defect 7 */}
                      <button
                        type="button"
                        onClick={() => handleRemoveExperience(exp.id)}
                        aria-label={t('auth:experience.removeRowAria', { number: index + 1 })}
                        className="flex items-center gap-1 min-h-[44px] px-2 text-sm text-[#767676] hover:text-error-500 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                        <span>{t('auth:experience.removeRow')}</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={exp.designation}
                      onChange={(e) => handleExperienceChange(exp.id, 'designation', e.target.value)}
                      placeholder={t('auth:experience.designationPlaceholder')}
                      className="w-full h-14 px-3 border border-[#b5b5b5] rounded-[10px] text-base text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Year Inputs */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* From Year */}
                    <div>
                      <label className="text-base font-medium text-black mb-2 block">
                        {t('auth:experience.fromYearLabel')}
                      </label>
                      <input
                        type="text"
                        value={exp.fromYear}
                        onChange={(e) => handleExperienceChange(exp.id, 'fromYear', e.target.value)}
                        placeholder={t('auth:experience.fromYearPlaceholder')}
                        className="w-full h-14 px-3 border border-[#b5b5b5] rounded-[10px] text-base text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all"
                      />
                    </div>

                    {/* To Year */}
                    <div>
                      <label className="text-base font-medium text-black mb-2 block">
                        {t('auth:experience.toYearLabel')}
                      </label>
                      <input
                        type="text"
                        value={exp.toYear}
                        onChange={(e) => handleExperienceChange(exp.id, 'toYear', e.target.value)}
                        placeholder={t('auth:experience.toYearPlaceholder')}
                        className="w-full h-14 px-3 border border-[#b5b5b5] rounded-[10px] text-base text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Experience Button */}
            <button
              onClick={handleAddExperience}
              className="flex items-center gap-2 text-base font-medium text-[#4d4d4d] hover:text-primary-70 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>{t('auth:experience.addExperiences')}</span>
            </button>
          </div>

          {/* Document Upload Section */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <label className="text-base font-medium text-black">
                {t('auth:experience.uploadHeading')}
              </label>
              <VoiceButton label={t('auth:experience.uploadVoice')} iconClassName="w-5 h-5 text-gray-600" className="p-1" />
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.doc,.docx"
              onChange={handleDocumentUpload}
              className="hidden"
            />
            
            <button
              onClick={handleDocumentClick}
              className="w-full h-32 border border-[#b5b5b5] rounded-[10px] bg-white hover:bg-gray-50 transition-colors flex flex-col items-center justify-center"
            >
              <div className="flex items-center gap-2 mb-1">
                <Upload className="w-5 h-5 text-black" />
                <span className="text-base font-medium text-black">{t('auth:experience.upload')}</span>
              </div>
              
              <p className="text-sm text-black mb-1 px-4 text-center">
                {document ? document.name : t('auth:experience.uploadHintMobile')}
              </p>
              
              <p className="text-xs font-medium text-[#4d4d4d]">
                {t('auth:experience.uploadAcceptedMobile')}
              </p>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 mb-8">
            {/* Next Button */}
            <button
              onClick={handleNext}
              className="w-full flex items-center justify-center gap-2 bg-primary-50 hover:bg-primary-60 text-primary-100 px-6 py-3 rounded-lg transition-colors"
            >
              <span className="text-lg">{t('buttons.next')}</span>
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Back Button */}
            <button
              onClick={handleBack}
              className="w-full flex items-center justify-center gap-2 border border-secondary-70 hover:bg-secondary-10 text-black px-6 py-3 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-lg">{t('buttons.back')}</span>
            </button>
          </div>

          {/* Sign In Link */}
          <div className="text-center">
            <p className="text-base">
              <span className="text-black">{t('auth:experience.alreadyHaveAccount')}</span>
              <Link
                href="/login"
                className="text-primary-70 font-semibold hover:text-primary-80 transition-colors"
              >
                {t('auth:experience.signInHere')}
              </Link>
            </p>
          </div>
        </div>

        {/* Blue Decorative Section at Bottom */}
        <div className="bg-primary-50 py-8 px-4">
          <h2 className="text-2xl font-bold text-white text-center leading-tight">
            {t('auth:experience.panelHeading')}
          </h2>
        </div>
      </div>
    </div>
  )
}
