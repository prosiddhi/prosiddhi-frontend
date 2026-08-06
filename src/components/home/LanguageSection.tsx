'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Briefcase, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { VoiceButton } from '@/components/feedback/VoiceButton'
import {
  useLanguagePreference,
  type SupportedLanguage,
} from '@/hooks/useLanguagePreference'

/**
 * Only the languages we actually SHIP — defect 2.
 *
 * This list offered ten. Eight of them have no translations at all (PRODUCT.md:
 * EN + HI are complete, the rest are post-MVP), so a Tamil speaker could pick
 * தமிழ் on the home page and get an English app. Offering a language we cannot
 * render is a promise broken immediately, to precisely the low-literacy user
 * this section exists to serve.
 *
 * Matches src/app/register/page.tsx, which already ships the honest list. Add a
 * language here only when its translation file lands.
 */
const languages: { value: SupportedLanguage; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिंदी (Hindi)' },
]

export function LanguageSection() {
  const router = useRouter()
  const { t } = useTranslation()
  // The selection was written to a `selectedLanguage` localStorage key that
  // NOTHING reads — i18next keys off its own storage entry — so choosing a
  // language here changed nothing at all. `useLanguagePreference` is the one
  // place that actually switches the app (and syncs it to the account when
  // signed in), so the choice now takes effect immediately.
  const { language, setLanguage } = useLanguagePreference()
  const [step, setStep] = useState<'language' | 'userType'>('language')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [selectedUserType, setSelectedUserType] = useState<'employee' | 'employer' | null>(null)

  const selectedLang = languages.find((lang) => lang.value === language)

  const handleLanguageContinue = () => {
    setStep('userType')
    // Scroll to top of section when moving to next step
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleUserTypeSelect = (type: 'employee' | 'employer') => {
    setSelectedUserType(type)
  }

  const handleGetStarted = () => {
    if (!selectedUserType) return
    // The language is already applied by setLanguage; only the role choice
    // needs remembering here.
    localStorage.setItem('userType', selectedUserType)
    router.push(selectedUserType === 'employee' ? '/employee' : '/employer/welcome')
  }

  const handleBack = () => {
    setStep('language')
    setSelectedUserType(null)
    // Scroll to top of section
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <section className="py-4 sm:py-6 lg:py-8 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-[636px] mx-auto">
          {step === 'language' ? (
            <div className="flex flex-col items-center">
              {/* Video/Image */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 lg:w-32 lg:h-32 mb-3">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover rounded-lg"
                >
                  <source src="/assets/language.mp4" type="video/mp4" />
                  {/* Fallback image */}
                  <img 
                    src="/assets/language-fallback.png" 
                    alt="Language selection" 
                    className="w-full h-full object-cover rounded-lg"
                  />
                </video>
              </div>

              {/* Title with Audio Icon */}
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-black text-center">
                  {t('home.languageTitle')}
                </h2>
                <VoiceButton label={t('home.languageTitleVoice')} iconClassName="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-gray-600" className="p-1 sm:p-1.5" />
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-[#767676] text-center max-w-[457px] mb-4 px-4">
                {t('home.languageDescription')}
              </p>

              {/* Language Dropdown */}
              <div className="relative w-full max-w-[530px] mb-4 px-4 sm:px-0">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full h-11 sm:h-12 lg:h-14 px-3 sm:px-4 lg:px-6 py-2 sm:py-3 border-2 border-[#b5b5b5] rounded-[10px] flex items-center justify-between hover:border-primary-50 transition-colors bg-white"
                >
                  <span className="text-sm sm:text-base lg:text-lg text-text-body font-normal">
                    {selectedLang?.label}
                  </span>
                  <ChevronDown 
                    className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-600 transition-transform flex-shrink-0 ${
                      isDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-[#b5b5b5] rounded-[10px] shadow-lg max-h-[250px] overflow-y-auto z-10 mx-4 sm:mx-0">
                    {languages.map((lang) => (
                      <button
                        key={lang.value}
                        onClick={() => {
                          // Switches the whole app immediately — the point of
                          // the fix. The next thing they see is translated.
                          setLanguage(lang.value)
                          setIsDropdownOpen(false)
                        }}
                        className={`w-full px-3 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm lg:text-base hover:bg-primary-10 transition-colors ${
                          language === lang.value
                            ? 'bg-primary-10 text-primary-70'
                            : 'text-text-body'
                        }`}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Continue Button */}
              <button
                onClick={handleLanguageContinue}
                className="bg-primary-50 hover:bg-primary-60 text-white px-8 sm:px-12 lg:px-14 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base lg:text-lg font-normal transition-colors shadow-md hover:shadow-lg"
              >
                {t('buttons.continue')}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {/* Title with Audio Icon */}
              <div className="flex items-center justify-center gap-2 mb-2 px-4">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-black text-center">
                  {t('home.roleTitle')}
                </h2>
                <VoiceButton label={t('home.roleTitleVoice')} iconClassName="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-gray-600" className="p-1 sm:p-1.5" />
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-[#767676] text-center mb-4 px-4">
                {t('home.roleDescription')}
              </p>

              {/* User Type Options */}
              <div className="w-full max-w-[530px] space-y-2.5 sm:space-y-3 mb-4 px-4 sm:px-0">
                {/* Employee Option */}
                <button
                  onClick={() => handleUserTypeSelect('employee')}
                  className={`w-full h-auto min-h-[70px] sm:min-h-[80px] px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-2 rounded-[10px] flex items-center gap-2.5 sm:gap-3 lg:gap-4 transition-all ${
                    selectedUserType === 'employee'
                      ? 'border-primary-50 bg-primary-10'
                      : 'border-[#b5b5b5] hover:border-primary-40 bg-white'
                  }`}
                >
                  <div className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${
                    selectedUserType === 'employee' ? 'bg-primary-50' : 'bg-gray-100'
                  }`}>
                    <Briefcase className={`w-5 h-5 sm:w-6 sm:h-6 ${
                      selectedUserType === 'employee' ? 'text-white' : 'text-gray-600'
                    }`} />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <h3 className={`text-sm sm:text-base lg:text-lg font-semibold mb-0.5 ${
                      selectedUserType === 'employee' ? 'text-primary-70' : 'text-black'
                    }`}>
                      {t('home.seekerTitle')}
                    </h3>
                    <p className="text-xs text-[#767676]">
                      {t('home.seekerSubtitle')}
                    </p>
                  </div>
                  <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedUserType === 'employee'
                      ? 'border-primary-50 bg-primary-50'
                      : 'border-gray-400'
                  }`}>
                    {selectedUserType === 'employee' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                    )}
                  </div>
                </button>

                {/* Employer Option */}
                <button
                  onClick={() => handleUserTypeSelect('employer')}
                  className={`w-full h-auto min-h-[70px] sm:min-h-[80px] px-3 sm:px-4 lg:px-6 py-3 sm:py-4 border-2 rounded-[10px] flex items-center gap-2.5 sm:gap-3 lg:gap-4 transition-all ${
                    selectedUserType === 'employer'
                      ? 'border-primary-50 bg-primary-10'
                      : 'border-[#b5b5b5] hover:border-primary-40 bg-white'
                  }`}
                >
                  <div className={`flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${
                    selectedUserType === 'employer' ? 'bg-primary-50' : 'bg-gray-100'
                  }`}>
                    <Users className={`w-5 h-5 sm:w-6 sm:h-6 ${
                      selectedUserType === 'employer' ? 'text-white' : 'text-gray-600'
                    }`} />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <h3 className={`text-sm sm:text-base lg:text-lg font-semibold mb-0.5 ${
                      selectedUserType === 'employer' ? 'text-primary-70' : 'text-black'
                    }`}>
                      {t('home.employerTitle')}
                    </h3>
                    <p className="text-xs text-[#767676]">
                      {t('home.employerSubtitle')}
                    </p>
                  </div>
                  <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedUserType === 'employer'
                      ? 'border-primary-50 bg-primary-50'
                      : 'border-gray-400'
                  }`}>
                    {selectedUserType === 'employer' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-white"></div>
                    )}
                  </div>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="w-full max-w-[530px] flex flex-col sm:flex-row gap-2.5 sm:gap-3 px-4 sm:px-0">
                <button
                  onClick={handleBack}
                  className="w-full sm:flex-1 bg-white border-2 border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base lg:text-lg font-normal transition-colors shadow-md order-2 sm:order-1"
                >
                  {t('buttons.back')}
                </button>
                <button
                  onClick={handleGetStarted}
                  disabled={!selectedUserType}
                  className="w-full sm:flex-1 bg-primary-50 hover:bg-primary-60 text-white px-6 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base lg:text-lg font-normal transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg order-1 sm:order-2"
                >
                  {t('buttons.getStarted')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
