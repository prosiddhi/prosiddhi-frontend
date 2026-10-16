'use client'

import Link from 'next/link'
import { Trans, useTranslation } from 'react-i18next'
import { LegalPage, LegalSection, LegalList } from '@/components/legal/LegalPage'
import { CIN, COMPANY_LEGAL_NAME, GSTIN, REGISTERED_OFFICE } from '@/lib/legal'

/**
 * About us — who runs ProSiddhi and what it does. Public; one of the pages the
 * payment gateway (Razorpay) checks on the website before it activates live payments.
 */
export default function AboutPage() {
  const { t } = useTranslation('legal')
  const list = (key: string) => t(key, { returnObjects: true }) as string[]

  return (
    <LegalPage title={t('about.title')} intro={t('about.intro')} showLastUpdated={false}>
      <LegalSection title={t('about.who.title')}>
        <p>{t('about.who.body', { company: COMPANY_LEGAL_NAME })}</p>
      </LegalSection>

      <LegalSection title={t('about.what.title')}>
        <LegalList items={list('about.what.items')} />
      </LegalSection>

      <LegalSection title={t('about.promise.title')}>
        <LegalList items={list('about.promise.items')} />
      </LegalSection>

      <LegalSection title={t('about.company.title')}>
        <p className="font-medium text-black">{COMPANY_LEGAL_NAME}</p>
        <p>
          <span className="font-medium">{t('about.company.office')}:</span>
          <span className="block whitespace-pre-line">{REGISTERED_OFFICE}</span>
        </p>
        <p>{t('about.company.cin')}: {CIN}</p>
        <p>{t('about.company.gstin')}: {GSTIN}</p>
      </LegalSection>

      <p className="max-w-[900px] text-base">
        <Trans
          i18nKey="legal:about.contactLine"
          components={{ contact: <Link href="/contact" className="text-primary-90 underline" /> }}
        />
      </p>
    </LegalPage>
  )
}
