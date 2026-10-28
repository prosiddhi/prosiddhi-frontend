'use client'

import Link from 'next/link'
import { Trans, useTranslation } from 'react-i18next'
import { LegalPage, LegalSection } from '@/components/legal/LegalPage'

/** Grouped by who the question is for. Credits, posting and unlocks are employer-only, so they stay out of general and seeker. */
const SECTIONS = [
  { key: 'general', faqs: ['forgotPassword', 'deleteAccount', 'support'] },
  { key: 'seekers', faqs: ['signUpNoEmail', 'findAndApply', 'costAndContact'] },
  { key: 'employers', faqs: ['register', 'credits', 'postJob', 'findCandidates'] },
] as const

const linkClass = 'text-primary-90 underline'
const LINKS = {
  contact: <Link href="/contact" className={linkClass} />,
  privacy: <Link href="/privacy" className={linkClass} />,
  delete: <Link href="/delete-account" className={linkClass} />,
}

/**
 * Help — plain answers, no contact details of its own.
 *
 * The support address and phone are still unconfirmed (PJP-241), so this page
 * only points at /contact, which already owns whatever contact info we publish.
 * Once PJP-241 confirms them, show them in the `support` answer by passing them
 * to <Trans values> — do not hardcode them into the locale strings.
 * Public on purpose: Google Play links to it and the visitor may not be signed in.
 */
export default function HelpPage() {
  const { t } = useTranslation('legal')

  return (
    <LegalPage title={t('help.title')} intro={t('help.intro')} showLastUpdated={false}>
      {/* English-only for now: no locale keys, so the default text shows in every language. */}
      <LegalSection title={t('help.moreHelp.title', { defaultValue: 'Questions and guides' })}>
        <p>
          {t('help.moreHelp.body', {
            defaultValue: 'Quick answers and step-by-step guides (English only for now):',
          })}
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <Link href="/faq/employee" className={linkClass}>
              {t('help.moreHelp.employee', { defaultValue: 'Job Seeker FAQ' })}
            </Link>
          </li>
          <li>
            <Link href="/faq/employer" className={linkClass}>
              {t('help.moreHelp.employer', { defaultValue: 'Employer FAQ' })}
            </Link>
          </li>
        </ul>
      </LegalSection>

      {SECTIONS.map(({ key, faqs }) => (
        <LegalSection key={key} title={t(`help.${key}.title`)}>
          {faqs.map((faq) => (
            <div key={faq} className="pt-3 first:pt-0">
              <h3 className="text-lg font-semibold text-black mb-1">{t(`help.${key}.${faq}.q`)}</h3>
              <p>
                <Trans i18nKey={`legal:help.${key}.${faq}.a`} components={LINKS} />
              </p>
            </div>
          ))}
        </LegalSection>
      ))}

      <LegalSection title={t('help.safety.title')}>
        <p>{t('help.safety.body')}</p>
      </LegalSection>

      <LegalSection title={t('help.stuck.title')}>
        <p>
          <Trans i18nKey="legal:help.stuck.body" components={LINKS} />
        </p>
      </LegalSection>
    </LegalPage>
  )
}
