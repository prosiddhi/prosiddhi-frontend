'use client'

import Link from 'next/link'
import { Trans, useTranslation } from 'react-i18next'
import { LegalPage, LegalSection, LegalList } from '@/components/legal/LegalPage'
import { REFUND_LAST_UPDATED, SUPPORT_EMAIL } from '@/lib/legal'

/**
 * Refund & Cancellation Policy for employer purchases (MONETIZATION.md §4: no refunds,
 * no cancellation, the 24-hour job-post return). Plus the refunds we must always make —
 * failed, duplicate and undelivered payments — which a "no refunds" rule cannot
 * override (RBI Payment Aggregator Directions 2025 10(f): to the original method).
 * Must say the same as the Terms' "Credits, tax, and refunds" section.
 */
export default function RefundPolicyPage() {
  const { t } = useTranslation('legal')
  const list = (key: string) => t(key, { returnObjects: true }) as string[]
  const contactLink = <Link href="/contact" className="text-primary-90 underline" />

  return (
    <LegalPage title={t('refund.title')} intro={t('refund.intro')} lastUpdated={REFUND_LAST_UPDATED}>
      <LegalSection title={t('refund.what.title')}>
        <p>{t('refund.what.body')}</p>
      </LegalSection>

      <LegalSection title={t('refund.cancel.title')}>
        <LegalList items={list('refund.cancel.items')} />
      </LegalSection>

      <LegalSection title={t('refund.always.title')}>
        <p>{t('refund.always.intro')}</p>
        <LegalList items={list('refund.always.items')} />
      </LegalSection>

      <LegalSection title={t('refund.jobPost.title')}>
        <p>{t('refund.jobPost.body')}</p>
      </LegalSection>

      <LegalSection title={t('refund.how.title')}>
        <p>{t('refund.how.body', { email: SUPPORT_EMAIL })}</p>
      </LegalSection>

      <LegalSection title={t('refund.when.title')}>
        <p>{t('refund.when.body')}</p>
      </LegalSection>

      <LegalSection title={t('refund.help.title')}>
        <p>
          <Trans i18nKey="legal:refund.help.body" components={{ contact: contactLink }} />
        </p>
      </LegalSection>
    </LegalPage>
  )
}
