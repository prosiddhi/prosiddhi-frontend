'use client'

import { useState } from 'react'
import { X, Volume2, ChevronDown, Briefcase, Users } from 'lucide-react'

interface LanguageModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (language: string, userType: 'employee' | 'employer') => void
}

const languages = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिंदी (Hindi)' },
  { value: 'ta', label: 'தமிழ் (Tamil)' },
  { value: 'te', label: 'తెలుగు (Telugu)' },
  { value: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
  { value: 'ml', label: 'മലയാളം (Malayalam)' },
  { value: 'mr', label: 'मराठी (Marathi)' },
  { value: 'gu', label: 'ગુજરાતી (Gujarati)' },
  { value: 'bn', label: 'বাংলা (Bengali)' },
  { value: 'pa', label: 'ਪੰਜਾਬੀ (Punjabi)' },
]

export function LanguageModal({ isOpen, onClose, onSave }: LanguageModalProps) {
  const [step, setStep] = useState<'language' | 'userType'>('language')
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [selectedUserType, setSelectedUserType] = useState<'employee' | 'employer' | null>(null)

  if (!isOpen) return null

  const selectedLang = languages.find(lang => lang.value === selectedLanguage)

  const handleLanguageContinue = () => {
    setStep('userType')
  }

  const handleUserTypeSelect = (type: 'employee' | 'employer') => {
    setSelectedUserType(type)
  }

  const handleFinalSave = () => {
    if (selectedUserType) {
      onSave(selectedLanguage, selectedUserType)
      onClose()
    }
  }

  const handleBack = () => {
    setStep('language')
    setSelectedUserType(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 backdrop-blur-[25px] bg-white/50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white border border-[#dedede] rounded-[10px] w-full max-w-[636px] mx-4 shadow-xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-lg transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-6 h-6 text-gray-600" />
        </button>

        {/* Content */}
        <div className="p-12 flex flex-col items-center">
          {step === 'language' ? (
            <>
              {/* Video/Image */}
              <div className="w-[198px] h-[198px] mb-8">
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                >
                  <source src="/assets/language.mp4" type="video/mp4" />
                  {/* Fallback image */}
                  <img 
                    src="/assets/language-fallback.png" 
                    alt="Language selection" 
                    className="w-full h-full object-cover"
                  />
                </video>
              </div>

              {/* Title with Audio Icon */}
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-31 font-bold text-black">
                  Select Your Native Language
                </h2>
                <button
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Play audio"
                >
                  <Volume2 className="w-[30px] h-[30px] text-gray-600" />
                </button>
              </div>

              {/* Description */}
              <p className="text-base text-[#767676] text-center max-w-[457px] mb-12">
                Please confirm your native or local language for your better the User Experience
              </p>

              {/* Language Dropdown */}
              <div className="relative w-full max-w-[530px] mb-16">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full h-[62px] px-3 py-3 border border-[#b5b5b5] rounded-[10px] flex items-center justify-between hover:border-primary-50 transition-colors"
                >
                  <span className="text-xl text-text-body font-normal">
                    {selectedLang?.label}
                  </span>
                  <ChevronDown 
                    className={`w-6 h-6 text-gray-600 transition-transform ${
                      isDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#b5b5b5] rounded-[10px] shadow-lg max-h-[300px] overflow-y-auto z-10">
                    {languages.map((lang) => (
                      <button
                        key={lang.value}
                        onClick={() => {
                          setSelectedLanguage(lang.value)
                          setIsDropdownOpen(false)
                        }}
                        className={`w-full px-6 py-4 text-left text-base hover:bg-primary-10 transition-colors ${
                          selectedLanguage === lang.value
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
                className="bg-primary-50 hover:bg-primary-60 text-white px-12 py-3 rounded-lg text-xl font-normal transition-colors"
              >
                Continue
              </button>
            </>
          ) : (
            <>
              {/* User Type Selection */}
              <div className="w-full max-w-[530px]">
                {/* Title with Audio Icon */}
                <div className="flex items-center justify-center gap-3 mb-4">
                  <h2 className="text-31 font-bold text-black text-center">
                    What are you looking for?
                  </h2>
                  <button
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Play audio"
                  >
                    <Volume2 className="w-[30px] h-[30px] text-gray-600" />
                  </button>
                </div>

                {/* Description */}
                <p className="text-base text-[#767676] text-center mb-12">
                  Please select your role to get started
                </p>

                {/* User Type Options */}
                <div className="space-y-4 mb-16">
                  {/* Employee Option */}
                  <button
                    onClick={() => handleUserTypeSelect('employee')}
                    className={`w-full h-auto min-h-[100px] px-6 py-6 border-2 rounded-[10px] flex items-center gap-4 transition-all ${
                      selectedUserType === 'employee'
                        ? 'border-primary-50 bg-primary-10'
                        : 'border-[#b5b5b5] hover:border-primary-40'
                    }`}
                  >
                    <div className={`flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center ${
                      selectedUserType === 'employee' ? 'bg-primary-50' : 'bg-gray-100'
                    }`}>
                      <Briefcase className={`w-8 h-8 ${
                        selectedUserType === 'employee' ? 'text-white' : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className={`text-25 font-semibold mb-2 ${
                        selectedUserType === 'employee' ? 'text-primary-70' : 'text-black'
                      }`}>
                        Looking for a Job
                      </h3>
                      <p className="text-base text-[#767676]">
                        I am a job seeker (Employee)
                      </p>
                    </div>
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedUserType === 'employee'
                        ? 'border-primary-50 bg-primary-50'
                        : 'border-gray-400'
                    }`}>
                      {selectedUserType === 'employee' && (
                        <div className="w-3 h-3 rounded-full bg-white"></div>
                      )}
                    </div>
                  </button>

                  {/* Employer Option */}
                  <button
                    onClick={() => handleUserTypeSelect('employer')}
                    className={`w-full h-auto min-h-[100px] px-6 py-6 border-2 rounded-[10px] flex items-center gap-4 transition-all ${
                      selectedUserType === 'employer'
                        ? 'border-primary-50 bg-primary-10'
                        : 'border-[#b5b5b5] hover:border-primary-40'
                    }`}
                  >
                    <div className={`flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center ${
                      selectedUserType === 'employer' ? 'bg-primary-50' : 'bg-gray-100'
                    }`}>
                      <Users className={`w-8 h-8 ${
                        selectedUserType === 'employer' ? 'text-white' : 'text-gray-600'
                      }`} />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className={`text-25 font-semibold mb-2 ${
                        selectedUserType === 'employer' ? 'text-primary-70' : 'text-black'
                      }`}>
                        Looking to Hire
                      </h3>
                      <p className="text-base text-[#767676]">
                        I am an employer
                      </p>
                    </div>
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      selectedUserType === 'employer'
                        ? 'border-primary-50 bg-primary-50'
                        : 'border-gray-400'
                    }`}>
                      {selectedUserType === 'employer' && (
                        <div className="w-3 h-3 rounded-full bg-white"></div>
                      )}
                    </div>
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={handleBack}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-8 py-3 rounded-lg text-xl font-normal transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleFinalSave}
                    disabled={!selectedUserType}
                    className="flex-1 bg-primary-50 hover:bg-primary-60 text-white px-8 py-3 rounded-lg text-xl font-normal transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Get Started
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
