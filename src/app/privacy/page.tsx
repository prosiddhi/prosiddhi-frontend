'use client'

import { useTranslation } from 'react-i18next'
import { LegalPage } from '@/components/legal/LegalPage'
import { PolicyDocument } from '@/components/legal/PolicyDocument'
import { PRIVACY_LAST_UPDATED } from '@/lib/legal'

/**
 * Privacy Policy. The text is the `legal:privacy.sections` array — every statement in
 * it must match what the code does (data-minimisation pass, 16 Oct 2026). Changing it
 * in a way that matters means bumping PRIVACY_LAST_UPDATED here AND `PRIVACY` in
 * prosiddhi-backend src/config/legal.ts to the same date, which asks every user to
 * accept the new version (ConsentGate / the app's consent screen).
 */
export default function PrivacyPolicyPage() {
  const { t } = useTranslation('legal')
  return (
    <LegalPage title={t('privacy.title')} intro={t('privacy.intro')} lastUpdated={PRIVACY_LAST_UPDATED}>
      <PolicyDocument doc="privacy" />
    </LegalPage>
  )
}
