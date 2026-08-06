'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { RegistrationProgress } from '@/components/auth/RegistrationProgress'
import { ChevronRight, ChevronLeft, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSeekerRegistration } from '../SeekerRegistrationContext'
import { TaxonomyPicker } from '@/components/taxonomy/TaxonomyPicker'
import type { TaxonomyTriple } from '@/lib/api'

export default function RegisterCategoriesPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { data, update, hydrated } = useSeekerRegistration()
  const [triple, setTriple] = useState<TaxonomyTriple>({
    category: data.preferredCategory || undefined,
    sector: data.preferredSector || undefined,
    jobTitle: data.preferredJobTitle || undefined,
  })
  const [error, setError] = useState('')

  // Guard: a verified phone, plus a verified email IF one was given. Email
  // itself is no longer a prerequisite — it is optional — so this can no longer
  // key on its presence the way it used to.
  useEffect(() => {
    if (!hydrated) return
    if (!data.phoneVerified) router.replace('/register/phone')
    else if (data.email && !data.emailVerified) router.replace('/register/verify-email')
  }, [hydrated, data.phoneVerified, data.email, data.emailVerified, router])

  // Restored progress lands after the first render — seed the picker from it
  // once, without overwriting a choice already made on this screen.
  useEffect(() => {
    if (!hydrated) return
    setTriple((prev) =>
      prev.category || prev.sector || prev.jobTitle
        ? prev
        : {
            category: data.preferredCategory || undefined,
            sector: data.preferredSector || undefined,
            jobTitle: data.preferredJobTitle || undefined,
          }
    )
    // One-shot on hydrate; the taxonomy fields would re-run it on every change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated])

  const handleTripleChange = (next: TaxonomyTriple) => {
    setTriple(next)
    if (error) setError('')
  }

  const handleNext = () => {
    if (!triple.category) {
      setError(t('auth:categories.errorCategory'))
      return
    }
    if (!triple.sector) {
      setError(t('auth:categories.errorSector'))
      return
    }
    if (!triple.jobTitle) {
      setError(t('auth:categories.errorJob'))
      return
    }
    update({
      preferredCategory: triple.category,
      preferredSector: triple.sector,
      preferredJobTitle: triple.jobTitle,
    })
    router.push('/register/experience')
  }

  const handleBack = () => router.push('/register/profile')

  return (
    <div className="relative min-h-screen bg-white">
      <div className="flex min-h-screen">
        {/* Left blue panel (desktop) */}
        <div className="hidden lg:block w-[527px] bg-primary-50 relative flex-shrink-0">
          <div className="relative h-full flex flex-col">
            <div className="px-12 pt-20">
              <h2 className="text-[40px] font-bold text-white leading-[1.2] max-w-[448px]">
                {t('auth:categories.panelHeading')}
              </h2>
            </div>
            <div className="absolute bottom-0 left-0 w-full">
              <div className="relative w-[522px] h-[348px]">
                <Image src="/assets/421.svg" alt="Illustration" fill className="object-contain" priority />
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 bg-white overflow-auto">
          <div className="max-w-[1400px] mx-auto px-4 lg:px-16 py-8 lg:py-16">
            <div className="flex items-start justify-between mb-10 lg:mb-24">
              <div className="relative w-[160px] lg:w-[236px] h-[44px] lg:h-[66px]">
                <Image src="/assets/logo.png" alt="Logo" fill className="object-contain object-left" priority />
              </div>
              <Link href="/" className="flex items-center gap-2 bg-error-500 text-white px-3 lg:px-5 py-2 lg:py-3 rounded-lg hover:bg-error-600">
                <span className="text-sm lg:text-[18px]">{t('auth:register.close')}</span>
                <X className="w-4 h-4 lg:w-5 lg:h-5" />
              </Link>
            </div>

            <RegistrationProgress
              step="categories"
              includeEmailStep={!!data.email}
              onBack={handleBack}
              className="mb-10 lg:mb-16"
            />

            <div className="max-w-[953px]">
              <div className="mb-10 lg:mb-16">
                <h1 className="text-3xl lg:text-[56px] font-bold text-black leading-tight mb-4">{t('auth:categories.title')}</h1>
                <p className="text-base lg:text-[24px] text-[#767676]">{t('auth:categories.subtitle')}</p>
              </div>

              {error && (
                <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600">{error}</p>
                </div>
              )}

              <TaxonomyPicker
                value={triple}
                onChange={handleTripleChange}
                required
                className="space-y-8 mb-12"
                labelClassName="text-base lg:text-[20px] font-medium text-black mb-4 lg:mb-6 block"
                selectClassName="w-full h-14 lg:h-[69px] px-3 border border-[#b5b5b5] rounded-[10px] text-base lg:text-[20px] bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              />

              <div className="flex justify-end">
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 min-h-[48px] bg-primary-50 text-white px-8 lg:px-12 py-3 rounded-lg hover:bg-primary-60"
                >
                  <span className="text-base lg:text-[20px]">{t('buttons.next')}</span>
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
