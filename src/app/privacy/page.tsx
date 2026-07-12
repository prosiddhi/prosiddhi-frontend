'use client'

import { useTranslation } from 'react-i18next'
import { LegalPage, LegalSection, LegalList } from '@/components/legal/LegalPage'
import { COMPANY_LEGAL_NAME, SUPPORT_EMAIL, REGISTERED_OFFICE } from '@/lib/legal'

export default function PrivacyPolicyPage() {
  const { t } = useTranslation('legal')

  // `returnObjects` gives us the translated array behind a list key.
  const list = (key: string) => t(key, { returnObjects: true }) as string[]

  return (
    <LegalPage title={t('privacy.title')} intro={t('privacy.intro')}>
      <LegalSection title={t('privacy.whoWeAre.title')}>
        <p>{t('privacy.whoWeAre.body', { company: COMPANY_LEGAL_NAME })}</p>
      </LegalSection>

      <LegalSection title={t('privacy.whatWeCollect.title')}>
        <p>{t('privacy.whatWeCollect.seekerIntro')}</p>
        <LegalList items={list('privacy.whatWeCollect.seeker')} />
        <p>{t('privacy.whatWeCollect.employerIntro')}</p>
        <LegalList items={list('privacy.whatWeCollect.employer')} />
      </LegalSection>

      <LegalSection title={t('privacy.noAadhaar.title')}>
        <p>{t('privacy.noAadhaar.body')}</p>
      </LegalSection>

      <LegalSection title={t('privacy.howWeUse.title')}>
        <LegalList items={list('privacy.howWeUse.items')} />
        <p className="font-medium text-black">{t('privacy.howWeUse.noSelling')}</p>
      </LegalSection>

      <LegalSection title={t('privacy.whoWeShare.title')}>
        <LegalList items={list('privacy.whoWeShare.items')} />
      </LegalSection>

      <LegalSection title={t('privacy.payments.title')}>
        <p>{t('privacy.payments.body')}</p>
      </LegalSection>

      <LegalSection title={t('privacy.storage.title')}>
        <p>{t('privacy.storage.body')}</p>
      </LegalSection>

      <LegalSection title={t('privacy.rights.title')}>
        <p>{t('privacy.rights.intro')}</p>
        <LegalList items={list('privacy.rights.items')} />
        <p>{t('privacy.rights.howTo')}</p>
      </LegalSection>

      <LegalSection title={t('privacy.deletion.title')}>
        <p>{t('privacy.deletion.body')}</p>
      </LegalSection>

      <LegalSection title={t('privacy.security.title')}>
        <p>{t('privacy.security.body')}</p>
      </LegalSection>

      <LegalSection title={t('privacy.children.title')}>
        <p>{t('privacy.children.body')}</p>
      </LegalSection>

      <LegalSection title={t('privacy.changes.title')}>
        <p>{t('privacy.changes.body')}</p>
      </LegalSection>

      <LegalSection title={t('privacy.contact.title')}>
        <p>
          {t('privacy.contact.body', {
            email: SUPPORT_EMAIL,
            company: COMPANY_LEGAL_NAME,
          })}
        </p>
        {/* Rendered only when the business has actually given us an address —
            never print a placeholder into a legal document. */}
        {REGISTERED_OFFICE && (
          <p className="whitespace-pre-line">{REGISTERED_OFFICE}</p>
        )}
      </LegalSection>
    </LegalPage>
  )
}
