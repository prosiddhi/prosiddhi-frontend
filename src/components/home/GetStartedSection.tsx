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
    // pt-5/7 rather than py-6/10: this section and the hero are one thought, so
    // the seam between them is 48px at `lg` instead of 72. The bottom keeps its
    // room, because what follows it is the footer, and that IS a page break.
    <section className="pt-5 sm:pt-6 lg:pt-7 pb-8 sm:pb-10 lg:pb-12 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-[636px] mx-auto flex flex-col items-center">
          {/* One step up from text-2xl at `lg`. Under a 60px headline a 24px
              question read as a caption, which is part of why the space above it
              looked like dead air rather than a deliberate gap. */}
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-black text-center tracking-tight mb-2">
            {t('home.roleTitle')}
          </h2>
          {/* gray-500 (#6B7280, 4.83:1) rather than #767676 — one neutral for
              muted copy across the page instead of three near-identical greys. */}
          <p className="text-xs sm:text-sm text-gray-500 text-center mb-5 sm:mb-6">
            {t('home.roleDescription')}
          </p>

          {/* The two cards. `<button>` rather than a radio pair: there is nothing
              to submit, so a chosen-but-not-confirmed state would be a state
              with no purpose.
              ⚠️ No `px-4` here. The wrapper above already pads to 16px on a
              phone; this added a second 16 (and the dropdown below carried an
              `mx-4` to cancel it back out again), so the cards rendered 32px in
              from each edge of a 390px screen. */}
          <div className="w-full max-w-[530px] grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-7">
            {roles.map(({ type, Icon, title, subtitle }) => (
              <button
                key={type}
                onClick={() => choose(type)}
                // `border-2 #b5b5b5` was a heavy mid-grey box — the two cards
                // read as form fields rather than as the primary choice on the
                // page. A hairline in the auth card's grey with a resting shadow
                // separates them from the background just as well, and leaves
                // somewhere for the hover state to GO: sky border, deeper shadow,
                // a 2px lift. `focus-visible`, not `focus`, so the ring is for
                // keyboard users and not for everyone who clicks.
                className="group min-h-[128px] px-5 py-6 border border-[#dedede] rounded-[10px] bg-white shadow-sm flex flex-col items-center text-center gap-2.5 transition-all duration-200 hover:border-primary-50 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-50 focus-visible:ring-offset-2"
              >
                <div className="w-12 h-12 rounded-full bg-primary-10 flex items-center justify-center transition-colors group-hover:bg-primary-20">
                  <Icon className="w-6 h-6 text-primary-80" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-black leading-snug">
                  {title}
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 leading-snug">{subtitle}</p>
              </button>
            ))}
          </div>

          {/* The language switch. Beside the choice, not in front of it — and
              deliberately quieter than the cards, because it is a preference
              rather than the question this page is asking.

              The hairline above it is what ties it to the cards: without one the
              control floated in the gradient with no relationship to anything
              above it, which re-raised the "is this part of the form?" question
              the old wizard layout left behind. */}
          <div className="w-full max-w-[340px] pt-5 sm:pt-6 border-t border-gray-100">
            <div className="relative">
              <label
                className="block text-xs sm:text-sm text-gray-500 text-center mb-2"
                htmlFor="home-language"
              >
                {t('home.languageTitle')}
              </label>
              {/* h-12 / border-[#b5b5b5] / rounded-lg is the auth pages' text
                  input, which is the control this actually is. */}
              <button
                id="home-language"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                // A disclosure button (`aria-expanded`) and NOT `role="listbox"`
                // + `role="option"`, which is what this looks like it wants to
                // be. Those roles promise a screen-reader user arrow-key
                // navigation and a roving tabstop; this control has neither, so
                // claiming them would describe it less accurately than saying
                // nothing. As a plain <ul> of buttons it announces "list, 10
                // items" and Tab reaches every one, which is true.
                aria-expanded={isDropdownOpen}
                className="w-full h-12 px-4 border border-[#b5b5b5] rounded-lg flex items-center justify-between gap-2 bg-white hover:border-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-50 focus-visible:ring-offset-2 transition-colors"
              >
                <span className="text-base text-text-body truncate">{selectedLang?.label}</span>
                <ChevronDown
                  className={`w-4 h-4 text-gray-600 transition-transform flex-shrink-0 ${
                    isDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isDropdownOpen && (
                <ul
                  className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-[#dedede] rounded-lg shadow-lg max-h-[250px] overflow-y-auto z-10"
                >
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <li key={lang.value}>
                      <button
                        // Carries the "this is the one you are on" signal that
                        // the tint conveys visually, and is valid on any element
                        // — unlike `aria-selected`, which needs `role="option"`.
                        aria-current={language === lang.value}
                        onClick={() => {
                          // Switches the whole app immediately — the next thing
                          // they see is translated, including the cards above.
                          setLanguage(lang.value)
                          setIsDropdownOpen(false)
                        }}
                        className={`w-full px-4 py-2.5 min-h-[44px] text-left text-sm hover:bg-primary-10 transition-colors ${
                          language === lang.value
                            ? 'bg-primary-10 text-primary-70 font-medium'
                            : 'text-text-body'
                        }`}
                      >
                        {lang.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default GetStartedSection
