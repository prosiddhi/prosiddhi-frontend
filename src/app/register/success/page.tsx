'use client'

import { useTranslation } from 'react-i18next'
import { CheckCircle, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SEEKER_HOME_ROUTE } from '@/lib/routes'

export default function RegisterSuccessPage() {
  const router = useRouter()
  const { t } = useTranslation()

  const handleStartExplore = () => {
    // The seeker is authenticated by now — the password step registered the
    // account and logged straight in. Land on the seeker home.
    router.push(SEEKER_HOME_ROUTE)
  }

  return (
    <div className="relative min-h-screen bg-white">
      {/* Desktop Layout */}
      <div className="hidden lg:flex min-h-screen">
        {/* Left Side - Blue Section (Fixed Width) */}
        <div className="w-[527px] bg-primary-50 relative flex-shrink-0">
          <div className="relative h-full flex flex-col">
            <div className="px-12 pt-20">
              <h2 className="text-[40px] font-bold text-white leading-[1.2] max-w-[448px]">
                {t('auth:success.panelHeading')}
              </h2>
            </div>

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

        {/* Right Side - Success Content */}
        <div className="flex-1 bg-white overflow-auto">
          <div className="max-w-[1400px] mx-auto px-16 py-16">
            <div className="flex items-start justify-between mb-24">
              <div className="relative w-[236px] h-[66px]">
                <Image
                  src="/assets/prosiddhi-logo-horizontal.png"
                  alt={t('app.name')}
                  fill
                  className="object-contain object-left"
                  priority
                />
              </div>

              <Link
                href="/"
                className="flex items-center gap-2 bg-error-500 hover:bg-error-600 text-white px-5 py-3 rounded-lg transition-colors"
              >
                <span className="text-[18px]">{t('auth:register.close')}</span>
                <X className="w-5 h-5" />
              </Link>
            </div>

            <div className="flex flex-col items-center justify-center min-h-[600px]">
              <h1 className="text-[48px] font-semibold text-black text-center mb-16 leading-tight">
                {t('auth:success.title')}
              </h1>

              <div className="mb-24">
                <CheckCircle className="w-[213px] h-[213px] text-primary-50" strokeWidth={1.5} />
              </div>

              <button
                onClick={handleStartExplore}
                className="bg-primary-50 hover:bg-primary-60 text-primary-100 px-12 py-3 rounded-lg transition-colors"
              >
                <span className="text-[20px]">{t('auth:success.startExplore')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile & Tablet Layout */}
      <div className="lg:hidden min-h-screen flex flex-col">
        <div className="bg-white px-4 py-4 flex items-center justify-between border-b border-gray-200">
          <div className="relative w-[140px] h-[40px]">
            <Image
              src="/assets/prosiddhi-logo-horizontal.png"
              alt={t('app.name')}
              fill
              className="object-contain object-left"
              priority
            />
          </div>

          <Link
            href="/"
            className="flex items-center gap-2 bg-error-500 hover:bg-error-600 text-white px-3 py-2 rounded-lg transition-colors"
          >
            <span className="text-sm">{t('auth:register.close')}</span>
            <X className="w-4 h-4" />
          </Link>
        </div>

        <div className="flex-1 bg-white px-4 py-8 overflow-auto flex flex-col items-center justify-center">
          <h1 className="text-3xl sm:text-4xl font-semibold text-black text-center mb-12 leading-tight">
            {t('auth:success.title')}
          </h1>

          <div className="mb-16">
            <CheckCircle className="w-32 h-32 sm:w-40 sm:h-40 text-primary-50" strokeWidth={1.5} />
          </div>

          <button
            onClick={handleStartExplore}
            className="w-full max-w-xs bg-primary-50 hover:bg-primary-60 text-primary-100 px-8 py-3 rounded-lg transition-colors"
          >
            <span className="text-lg">{t('auth:success.startExplore')}</span>
          </button>
        </div>

        <div className="bg-primary-50 py-8 px-4">
          <h2 className="text-2xl font-bold text-white text-center leading-tight">
            {t('auth:success.panelHeading')}
          </h2>
        </div>
      </div>
    </div>
  )
}
