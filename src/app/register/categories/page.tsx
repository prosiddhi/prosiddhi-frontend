'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { RegistrationProgress } from '@/components/auth/RegistrationProgress'
import { ChevronRight, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSeekerRegistration } from '../SeekerRegistrationContext'
import { TaxonomyPicker } from '@/components/taxonomy/TaxonomyPicker'
import type { TaxonomyTriple } from '@/lib/api'
import { SELECT_ONLY_CHEVRON_CLS } from '@/components/form/selectChevron'

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
        <div className="hidden lg:block w-[45%] xl:w-1/2 bg-primary-50 relative flex-shrink-0 lg:sticky lg:top-0 lg:h-screen self-start">
          <div className="relative h-full flex flex-col">
            <div className="px-10 pt-12">
              <h2 className="text-[30px] font-bold text-white leading-[1.2] max-w-[448px]">
                {t('auth:categories.panelHeading')}
              </h2>
            </div>
            <div className="flex-1 flex items-center justify-center px-10 pb-10">
              <div className="relative w-full max-w-[480px] aspect-[3/2]">
                <Image src="/assets/421.svg" alt="Illustration" fill className="object-contain" priority />
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 bg-white overflow-auto">
          <div className="w-full lg:min-h-screen lg:flex lg:flex-col max-w-[1400px] lg:max-w-[560px] mx-auto px-4 lg:px-6 py-6 lg:py-5">
            <div className="flex items-start justify-between lg:mt-auto mb-6">
              <div className="relative w-[160px] lg:w-[180px] h-[44px] lg:h-[50px]">
                <Image src="/assets/prosiddhi-logo-horizontal.png" alt="Logo" fill className="object-contain object-left" priority />
              </div>
              <Link href="/" className="flex items-center gap-2 bg-error-500 text-white px-3 lg:px-5 py-2 lg:py-3 rounded-lg hover:bg-error-600">
                <span className="text-sm lg:text-base">{t('auth:register.close')}</span>
                <X className="w-4 h-4 lg:w-5 lg:h-5" />
              </Link>
            </div>

            <RegistrationProgress
              step="categories"
              includeEmailStep={!!data.email}
              onBack={handleBack}
              className="mb-6 lg:mb-8"
            />

            <div className="lg:mb-auto max-w-[640px]">
              <div className="mb-6 lg:mb-8 lg:[@media(max-height:800px)]:mb-4">
                <h1 className="text-2xl lg:text-[36px] font-bold text-black leading-tight mb-3 lg:[@media(max-height:800px)]:mb-2">{t('auth:categories.title')}</h1>
                <p className="text-base lg:text-lg text-[#767676]">{t('auth:categories.subtitle')}</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600">{error}</p>
                </div>
              )}

              <TaxonomyPicker
                value={triple}
                onChange={handleTripleChange}
                required
                className="space-y-6 lg:[@media(max-height:800px)]:space-y-5 mb-8 lg:[@media(max-height:800px)]:mb-6"
                labelClassName="text-base font-medium text-black mb-2 block"
                selectClassName={`w-full h-12 px-3 border border-[#b5b5b5] rounded-[10px] text-base bg-white disabled:opacity-50 disabled:cursor-not-allowed ${SELECT_ONLY_CHEVRON_CLS}`}
              />

              <div className="flex justify-end">
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 min-h-[48px] bg-primary-50 text-primary-100 px-8 lg:px-10 py-3 rounded-lg hover:bg-primary-60"
                >
                  <span className="text-base">{t('buttons.next')}</span>
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
