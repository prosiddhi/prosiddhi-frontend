'use client'

import Link from 'next/link'
import { Trans, useTranslation } from 'react-i18next'
import { LegalPage, LegalSection } from '@/components/legal/LegalPage'
import { useAuth } from '@/contexts/AuthContext'

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
 * Only the "FAQs and guidelines" links are role-gated: the FAQs and guidelines are for
 * signed-in users of that role (see the pages under /faq and /guides).
 */
export default function HelpPage() {
  const { t } = useTranslation('legal')
  const { user, isLoading } = useAuth()
  // The FAQ and Guidelines are for their own role only. Logged-out visitors, and
  // everyone while the session is still loading, see neither.
  const showSeekerFaq = !isLoading && user?.role === 'JOB_SEEKER'
  const showEmployerFaq = !isLoading && !!user?.role?.startsWith('EMPLOYER')

  return (
    <LegalPage title={t('help.title')} intro={t('help.intro')} showLastUpdated={false}>
      {(showSeekerFaq || showEmployerFaq) && (
        <LegalSection title={t('help.moreHelp.title')}>
          <p>{t('help.moreHelp.body')}</p>
          <ul className="list-disc pl-5 space-y-2">
            {showSeekerFaq && (
              <>
                <li>
                  <Link href="/faq/employee" className={linkClass}>
                    {t('footer.faqEmployee')}
                  </Link>
                </li>
                <li>
                  <Link href="/guides/employee" className={linkClass}>
                    {t('footer.guidelinesEmployee')}
                  </Link>
                </li>
              </>
            )}
            {showEmployerFaq && (
              <>
                <li>
                  <Link href="/faq/employer" className={linkClass}>
                    {t('footer.faqEmployer')}
                  </Link>
                </li>
                <li>
                  <Link href="/guides/employer" className={linkClass}>
                    {t('footer.guidelinesEmployer')}
                  </Link>
                </li>
              </>
            )}
          </ul>
        </LegalSection>
      )}

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
