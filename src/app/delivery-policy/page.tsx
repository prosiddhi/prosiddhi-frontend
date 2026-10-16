'use client'

import Link from 'next/link'
import { Trans, useTranslation } from 'react-i18next'
import { LegalPage, LegalSection, LegalList } from '@/components/legal/LegalPage'
import { DELIVERY_LAST_UPDATED, SUPPORT_EMAIL } from '@/lib/legal'

/**
 * Delivery Policy — the payment gateway asks for a shipping/delivery page; for a
 * digital service it says how and when the purchase reaches the account.
 */
export default function DeliveryPolicyPage() {
  const { t } = useTranslation('legal')
  const list = (key: string) => t(key, { returnObjects: true }) as string[]

  return (
    <LegalPage title={t('delivery.title')} intro={t('delivery.intro')} lastUpdated={DELIVERY_LAST_UPDATED}>
      <LegalSection title={t('delivery.how.title')}>
        <LegalList items={list('delivery.how.items')} />
      </LegalSection>

      <LegalSection title={t('delivery.shipping.title')}>
        <p>{t('delivery.shipping.body')}</p>
      </LegalSection>

      <LegalSection title={t('delivery.problem.title')}>
        <p>
          <Trans
            i18nKey="legal:delivery.problem.body"
            values={{ email: SUPPORT_EMAIL }}
            components={{ refund: <Link href="/refund-policy" className="text-primary-90 underline" /> }}
          />
        </p>
      </LegalSection>
    </LegalPage>
  )
}
