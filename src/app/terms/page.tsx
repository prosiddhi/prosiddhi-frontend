'use client'

import { useTranslation } from 'react-i18next'
import { LegalPage } from '@/components/legal/LegalPage'
import { PolicyDocument } from '@/components/legal/PolicyDocument'
import { COMPANY_LEGAL_NAME, TERMS_LAST_UPDATED } from '@/lib/legal'

/**
 * Terms & Conditions. The text is the `legal:terms.sections` array. Changing it in a
 * way that matters means bumping TERMS_LAST_UPDATED here AND `TERMS` in
 * prosiddhi-backend src/config/legal.ts to the same date, which asks every user to
 * accept the new version.
 */
export default function TermsPage() {
  const { t } = useTranslation('legal')
  return (
    <LegalPage
      title={t('terms.title')}
      intro={t('terms.intro', { company: COMPANY_LEGAL_NAME })}
      lastUpdated={TERMS_LAST_UPDATED}
    >
      <PolicyDocument doc="terms" />
    </LegalPage>
  )
}
