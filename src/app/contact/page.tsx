'use client'

import Link from 'next/link'
import { Trans, useTranslation } from 'react-i18next'
import { Mail, ShieldAlert } from 'lucide-react'
import { LegalPage, LegalSection, LegalList } from '@/components/legal/LegalPage'
import { COMPANY_LEGAL_NAME, SUPPORT_EMAIL, REGISTERED_OFFICE } from '@/lib/legal'

/**
 * Contact — deliberately NOT a contact form.
 *
 * There is no backend endpoint that accepts a contact message, and a form that
 * silently drops what a user types is worse than no form at all. So this page
 * gives them a real mailto: they can actually send.
 */
export default function ContactPage() {
  const { t } = useTranslation('legal')

  const list = (key: string) => t(key, { returnObjects: true }) as string[]

  return (
    <LegalPage
      title={t('contact.title')}
      intro={t('contact.intro')}
      showLastUpdated={false}
    >
      <LegalSection title={t('contact.email.title')}>
        <p>{t('contact.email.body')}</p>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="inline-flex items-center gap-2 min-h-[48px] px-6 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors"
        >
          <Mail className="w-5 h-5" />
          {t('contact.email.cta', { email: SUPPORT_EMAIL })}
        </a>
      </LegalSection>

      <LegalSection title={t('contact.help.title')}>
        <p>{t('contact.help.intro')}</p>
        <LegalList items={list('contact.help.items')} />
      </LegalSection>

      <LegalSection title={t('contact.report.title')}>
        <p>{t('contact.report.body')}</p>
      </LegalSection>

      {/* Fraud warning — the audience is the group most likely to be targeted by
          a "pay me for a job" scam, so it gets visual weight, not fine print. */}
      <section className="border border-amber-300 bg-amber-50 rounded-xl p-5">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-amber-900 mb-2">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          {t('contact.scam.title')}
        </h2>
        <p className="text-base text-amber-900 leading-relaxed">
          {t('contact.scam.body')}
        </p>
      </section>

      <LegalSection title={t('contact.privacyRequests.title')}>
        <p>
          <Trans
            i18nKey="legal:contact.privacyRequests.body"
            components={{
              privacy: <Link href="/privacy" className="text-primary-50 underline" />,
            }}
          />
        </p>
      </LegalSection>

      <LegalSection title={t('contact.company.title')}>
        <p>{t('contact.company.operatedBy', { company: COMPANY_LEGAL_NAME })}</p>
        {REGISTERED_OFFICE && (
          <p className="whitespace-pre-line">{REGISTERED_OFFICE}</p>
        )}
      </LegalSection>
    </LegalPage>
  )
}
