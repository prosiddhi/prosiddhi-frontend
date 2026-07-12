'use client'

import { useTranslation } from 'react-i18next'
import { LegalPage, LegalSection, LegalList } from '@/components/legal/LegalPage'
import { COMPANY_LEGAL_NAME, SUPPORT_EMAIL } from '@/lib/legal'

export default function TermsPage() {
  const { t } = useTranslation('legal')

  const list = (key: string) => t(key, { returnObjects: true }) as string[]

  return (
    <LegalPage
      title={t('terms.title')}
      intro={t('terms.intro', { company: COMPANY_LEGAL_NAME })}
    >
      <LegalSection title={t('terms.eligibility.title')}>
        <p>{t('terms.eligibility.body')}</p>
      </LegalSection>

      <LegalSection title={t('terms.account.title')}>
        <p>{t('terms.account.body')}</p>
      </LegalSection>

      <LegalSection title={t('terms.whatWeAre.title')}>
        <p>{t('terms.whatWeAre.body')}</p>
        <LegalList items={list('terms.whatWeAre.items')} />
      </LegalSection>

      {/* The single most important promise on this page for a low-literacy
          worker: we never touch wages, and nobody may charge them for a job. */}
      <LegalSection title={t('terms.noWages.title')}>
        <p className="font-medium text-black">{t('terms.noWages.body')}</p>
      </LegalSection>

      <LegalSection title={t('terms.seekers.title')}>
        <p>{t('terms.seekers.body')}</p>
      </LegalSection>

      <LegalSection title={t('terms.employers.title')}>
        <p>{t('terms.employers.intro')}</p>
        <LegalList items={list('terms.employers.items')} />
      </LegalSection>

      <LegalSection title={t('terms.credits.title')}>
        <LegalList items={list('terms.credits.items')} />
      </LegalSection>

      <LegalSection title={t('terms.conduct.title')}>
        <p>{t('terms.conduct.intro')}</p>
        <LegalList items={list('terms.conduct.items')} />
      </LegalSection>

      <LegalSection title={t('terms.moderation.title')}>
        <p>{t('terms.moderation.body')}</p>
      </LegalSection>

      <LegalSection title={t('terms.content.title')}>
        <p>{t('terms.content.body')}</p>
      </LegalSection>

      <LegalSection title={t('terms.availability.title')}>
        <p>{t('terms.availability.body')}</p>
      </LegalSection>

      <LegalSection title={t('terms.changes.title')}>
        <p>{t('terms.changes.body')}</p>
      </LegalSection>

      <LegalSection title={t('terms.law.title')}>
        <p>{t('terms.law.body')}</p>
      </LegalSection>

      <LegalSection title={t('terms.contact.title')}>
        <p>{t('terms.contact.body', { email: SUPPORT_EMAIL })}</p>
      </LegalSection>
    </LegalPage>
  )
}
