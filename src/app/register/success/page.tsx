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
        <div className="w-[45%] xl:w-1/2 bg-primary-50 relative flex-shrink-0 lg:sticky lg:top-0 lg:h-screen self-start">
          <div className="relative h-full flex flex-col">
            <div className="px-10 pt-12">
              <h2 className="text-[30px] font-bold text-white leading-[1.2] max-w-[448px]">
                {t('auth:success.panelHeading')}
              </h2>
            </div>

            <div className="flex-1 flex items-center justify-center px-10 pb-10">
              <div className="relative w-full max-w-[480px] aspect-[3/2]">
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
          <div className="w-full min-h-screen flex flex-col max-w-[560px] mx-auto px-6 py-5">
            <div className="flex items-start justify-between mt-auto mb-6">
              <div className="relative w-[180px] h-[50px]">
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
                <span className="text-base">{t('auth:register.close')}</span>
                <X className="w-5 h-5" />
              </Link>
            </div>

            <div className="flex flex-col items-center justify-center min-h-[420px] mb-auto">
              <h1 className="text-[34px] font-semibold text-black text-center mb-8 leading-tight">
                {t('auth:success.title')}
              </h1>

              <div className="mb-8">
                <CheckCircle className="w-36 h-36 text-primary-50" strokeWidth={1.5} />
              </div>

              <button
                onClick={handleStartExplore}
                className="bg-primary-50 hover:bg-primary-60 text-primary-100 px-10 py-3 rounded-lg transition-colors"
              >
                <span className="text-base">{t('auth:success.startExplore')}</span>
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
          <h1 className="text-2xl sm:text-3xl font-semibold text-black text-center mb-8 leading-tight">
            {t('auth:success.title')}
          </h1>

          <div className="mb-10">
            <CheckCircle className="w-32 h-32 sm:w-40 sm:h-40 text-primary-50" strokeWidth={1.5} />
          </div>

          <button
            onClick={handleStartExplore}
            className="w-full max-w-xs bg-primary-50 hover:bg-primary-60 text-primary-100 px-8 py-3 rounded-lg transition-colors"
          >
            <span className="text-base">{t('auth:success.startExplore')}</span>
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
