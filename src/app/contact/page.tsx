'use client'

import Link from 'next/link'
import { Trans, useTranslation } from 'react-i18next'
import { Mail, Phone, ShieldAlert, Scale } from 'lucide-react'
import { LegalPage, LegalSection, LegalList } from '@/components/legal/LegalPage'
import {
  CIN,
  COMPANY_LEGAL_NAME,
  GRIEVANCE_OFFICER,
  GSTIN,
  REGISTERED_OFFICE,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
} from '@/lib/legal'

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

      <LegalSection title={t('contact.phone.title')}>
        <p>{t('contact.phone.body', { phone: SUPPORT_PHONE })}</p>
        <a
          href={`tel:${SUPPORT_PHONE.replace(/\s/g, '')}`}
          className="inline-flex items-center gap-2 min-h-[48px] px-6 border border-primary-50 text-primary-90 rounded-lg hover:bg-primary-10 transition-colors"
        >
          <Phone className="w-5 h-5" />
          {SUPPORT_PHONE}
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
      <section className="max-w-[900px] border border-amber-300 bg-amber-50 rounded-xl p-5">
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
              privacy: <Link href="/privacy" className="text-primary-90 underline" />,
            }}
          />
        </p>
      </LegalSection>

      {/* Required on the site by the IT (Intermediary) Rules 2021 Rule 3(2) and the
          Consumer Protection (E-Commerce) Rules 2020 Rule 4: name, designation, contact,
          and how a complaint is handled. */}
      <section id="grievance" className="max-w-[900px] border border-primary-20 bg-primary-10/40 rounded-xl p-5 scroll-mt-24">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-primary-100 mb-2">
          <Scale className="w-5 h-5 flex-shrink-0" />
          {t('contact.grievance.title')}
        </h2>
        <div className="space-y-2 text-base text-black leading-relaxed">
          <p>{t('contact.grievance.body')}</p>
          <p className="font-medium">
            {t('contact.grievance.nameLine', {
              name: GRIEVANCE_OFFICER.name,
              designation: GRIEVANCE_OFFICER.designation,
            })}
          </p>
          <p>
            <a href={`mailto:${GRIEVANCE_OFFICER.email}`} className="text-primary-90 underline">
              {t('contact.grievance.emailLine', { email: GRIEVANCE_OFFICER.email })}
            </a>
          </p>
          <p>{t('contact.grievance.timeline')}</p>
          <p>
            <Trans
              i18nKey="legal:contact.grievance.appeal"
              components={{
                gac: <a href="https://gac.gov.in" target="_blank" rel="noopener noreferrer" className="text-primary-90 underline" />,
              }}
            />
          </p>
        </div>
      </section>

      <LegalSection title={t('contact.company.title')}>
        <p>{t('contact.company.operatedBy', { company: COMPANY_LEGAL_NAME })}</p>
        <p className="whitespace-pre-line">{REGISTERED_OFFICE}</p>
        <p>{t('contact.company.cin', { cin: CIN })}</p>
        <p>{t('contact.company.gstin', { gstin: GSTIN })}</p>
      </LegalSection>
    </LegalPage>
  )
}
