'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Briefcase, Users } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useLanguagePreference } from '@/hooks/useLanguagePreference'
import { LANGUAGE_OPTIONS } from '@/lib/jobCategories'

/**
 * "I'm a job seeker / I'm an employer", on the front page (TD-29).
 *
 * **Was `LanguageSection`, and was a two-step wizard.** The role cards existed
 * and were good — better than anything else on the site, and the same pair
 * mobile's welcome screen leads with — but they were step 2, behind a language
 * dropdown and a Continue button. A visitor had to answer a question about
 * language before being shown the question the site is actually asking. Nobody
 * scrolling the home page ever saw them.
 *
 * Now the role is the whole section and the language is a switch beside it, not
 * a door in front of it. Choosing a language still applies immediately — that is
 * `useLanguagePreference`, which is the one thing that actually re-renders the
 * app and syncs the choice to the account when signed in.
 *
 * **One tap, not select-then-confirm.** Mobile's welcome navigates on the tap;
 * the old wizard needed a second press of "Get Started". For a low-literacy
 * audience the extra confirmation step is a place to get stuck, not a safety
 * net — and the destination pages are ordinary marketing pages that anyone can
 * back out of.
 *
 * Renamed from `LanguageSection` because a component called "language" that is
 * mostly a role chooser is the kind of name people trust and then misread.
 */
export function GetStartedSection() {
  const router = useRouter()
  const { t } = useTranslation()
  const { language, setLanguage } = useLanguagePreference()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const selectedLang = LANGUAGE_OPTIONS.find((lang) => lang.value === language)

  const choose = (type: 'employee' | 'employer') => {
    // The language is already applied by setLanguage; only the role needs
    // remembering here.
    localStorage.setItem('userType', type)
    router.push(type === 'employee' ? '/employee' : '/employer/welcome')
  }

  const roles = [
    {
      type: 'employee' as const,
      Icon: Briefcase,
      title: t('home.seekerTitle'),
      subtitle: t('home.seekerSubtitle'),
    },
    {
      type: 'employer' as const,
      Icon: Users,
      title: t('home.employerTitle'),
      subtitle: t('home.employerSubtitle'),
    },
  ]

  return (
    <section className="py-6 sm:py-8 lg:py-10 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-[636px] mx-auto flex flex-col items-center">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-black text-center mb-2">
            {t('home.roleTitle')}
          </h2>
          <p className="text-xs sm:text-sm text-[#767676] text-center mb-5 px-4">
            {t('home.roleDescription')}
          </p>

          {/* The two cards. `<button>` rather than a radio pair: there is nothing
              to submit, so a chosen-but-not-confirmed state would be a state
              with no purpose. */}
          <div className="w-full max-w-[530px] grid sm:grid-cols-2 gap-3 mb-6 px-4 sm:px-0">
            {roles.map(({ type, Icon, title, subtitle }) => (
              <button
                key={type}
                onClick={() => choose(type)}
                className="min-h-[112px] px-4 py-5 border-2 border-[#b5b5b5] rounded-[10px] bg-white flex flex-col items-center text-center gap-2 transition-all hover:border-primary-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-50"
              >
                <div className="w-12 h-12 rounded-full bg-primary-10 flex items-center justify-center">
                  <Icon className="w-6 h-6 text-primary-80" />
                </div>
                <h3 className="text-sm sm:text-base font-semibold text-black">{title}</h3>
                <p className="text-xs text-[#767676]">{subtitle}</p>
              </button>
            ))}
          </div>

          {/* The language switch. Beside the choice, not in front of it — and
              deliberately quieter than the cards, because it is a preference
              rather than the question this page is asking. */}
          <div className="relative w-full max-w-[340px] px-4 sm:px-0">
            <label
              className="block text-xs text-[#767676] text-center mb-1.5"
              htmlFor="home-language"
            >
              {t('home.languageTitle')}
            </label>
            <button
              id="home-language"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              aria-expanded={isDropdownOpen}
              className="w-full min-h-[44px] px-4 py-2 border border-[#b5b5b5] rounded-lg flex items-center justify-between hover:border-primary-50 transition-colors bg-white"
            >
              <span className="text-sm text-text-body">{selectedLang?.label}</span>
              <ChevronDown
                className={`w-4 h-4 text-gray-600 transition-transform flex-shrink-0 ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {isDropdownOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-[#b5b5b5] rounded-lg shadow-lg max-h-[250px] overflow-y-auto z-10 mx-4 sm:mx-0">
                {LANGUAGE_OPTIONS.map((lang) => (
                  <button
                    key={lang.value}
                    onClick={() => {
                      // Switches the whole app immediately — the next thing they
                      // see is translated, including the cards above.
                      setLanguage(lang.value)
                      setIsDropdownOpen(false)
                    }}
                    className={`w-full px-4 py-2.5 min-h-[44px] text-left text-sm hover:bg-primary-10 transition-colors ${
                      language === lang.value ? 'bg-primary-10 text-primary-70' : 'text-text-body'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default GetStartedSection
