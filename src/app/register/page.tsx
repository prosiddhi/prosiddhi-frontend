'use client'

import { useState } from 'react'
import { ChevronRight, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { RegistrationProgress } from '@/components/auth/RegistrationProgress'
import { VoiceButton } from '@/components/feedback/VoiceButton'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSeekerRegistration } from './SeekerRegistrationContext'
import {
  useLanguagePreference,
  type SupportedLanguage,
} from '@/hooks/useLanguagePreference'

/**
 * Only the languages we actually SHIP.
 *
 * This list used to offer ten — Tamil, Kannada, Malayalam, Marathi, Gujarati,
 * Odia, Telugu, Bengali — none of which have translations (PRODUCT.md: EN + HI are
 * complete, the other eight are post-MVP). A Tamil speaker picked தமிழ் on the very
 * first screen of registration and got an English app, permanently. Offering a
 * language we cannot render is a promise we break immediately, to precisely the
 * low-literacy user this screen exists to serve.
 *
 * Add a language here only when its translation file lands.
 */
const languages: { value: SupportedLanguage; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिंदी' },
]

export default function RegisterPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { data, update } = useSeekerRegistration()
  const { setLanguage } = useLanguagePreference()
  const [selectedLanguage, setSelectedLanguage] = useState(data.language)

  const handleLanguageSelect = (value: SupportedLanguage) => {
    setSelectedLanguage(value)
    // Apply it IMMEDIATELY. This screen asked "which language do you want?" and
    // then ignored the answer: it only stashed the value in the registration
    // context, so the rest of registration — and the whole app — stayed English.
    // Switching here means the very next screen is already in their language.
    setLanguage(value)
  }

  const handleNext = () => {
    // Still carried into the registration payload so the BE stores it on the
    // account (preferredLanguage), not just in this browser.
    update({ language: selectedLanguage })
    router.push('/register/phone')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
      {/* Register Modal */}
      <div className="relative bg-white border border-[#dedede] rounded-[10px] w-full max-w-[900px] px-6 sm:px-10 py-8 sm:py-10 shadow-xl overflow-auto max-h-[90vh]">
        {/* Close Button */}
        <Link
          href="/"
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded transition-colors"
          aria-label={t('auth:register.close')}
        >
          <X className="w-6 h-6 text-gray-600" />
        </Link>

        {/* Content */}
        <div className="w-full">
          <RegistrationProgress step="language" className="mb-8" />

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-black mb-3 leading-tight">
              {t('auth:register.welcomeGuest')}
            </h1>
            <p className="text-base sm:text-lg text-[#767676]">
              {t('auth:register.subtitle')}
            </p>
          </div>

          {/* Language Selection */}
          <div className="mb-8">
            {/* Label with Audio Icon */}
            <div className="flex items-center gap-2 mb-4">
              <label className="text-base sm:text-lg font-medium text-black">
                {t('auth:register.selectLanguage')}
              </label>
              <VoiceButton label={t('auth:register.selectLanguageVoice')} iconClassName="w-5 h-5 text-gray-600" className="p-1" />
            </div>

            {/* Language Grid - Responsive */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {languages.map((language) => (
                <button
                  key={language.value}
                  onClick={() => handleLanguageSelect(language.value)}
                  className={`h-14 sm:h-16 rounded-lg border transition-all ${
                    selectedLanguage === language.value
                      ? 'border-primary-50 bg-primary-10'
                      : 'border-[#b5b5b5] hover:border-primary-40'
                  }`}
                >
                  <div className="flex items-center h-full px-3 sm:px-4">
                    {/* Radio Button */}
                    <div
                      className={`flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center mr-2 sm:mr-3 ${
                        selectedLanguage === language.value
                          ? 'border-primary-50 bg-primary-50'
                          : 'border-gray-400'
                      }`}
                    >
                      {selectedLanguage === language.value && (
                        <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-white"></div>
                      )}
                    </div>

                    {/* Language Text */}
                    <span
                      className={`text-sm sm:text-base lg:text-lg ${
                        selectedLanguage === language.value
                          ? 'text-primary-70 font-medium'
                          : 'text-black'
                      }`}
                    >
                      {language.label}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Next Button */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
            <button
              onClick={handleNext}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary-50 hover:bg-primary-60 text-white px-8 py-3 rounded-lg transition-colors order-2 sm:order-1"
            >
              <span className="text-base font-medium">{t('buttons.next')}</span>
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Sign In Link */}
            <div className="text-center order-1 sm:order-2">
              <p className="text-sm sm:text-base">
                <span className="text-black">{t('auth:register.alreadyHaveAccount')}</span>
                <Link
                  href="/login"
                  className="text-primary-70 font-semibold hover:text-primary-80 transition-colors"
                >
                  {t('auth:register.signInHere')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
