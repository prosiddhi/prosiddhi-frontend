'use client'

import Link from 'next/link'
import { Trans, useTranslation } from 'react-i18next'
import { LegalPage, LegalSection, LegalList } from '@/components/legal/LegalPage'

/**
 * Help — plain answers, no contact details of its own.
 *
 * The support address and phone are still unconfirmed (PJP-241), so this page
 * only points at /contact, which already owns whatever contact info we publish.
 * Public on purpose: Google Play links to it and the visitor may not be signed in.
 */
export default function HelpPage() {
  const { t } = useTranslation('legal')

  const list = (key: string) => t(key, { returnObjects: true }) as string[]
  const linkClass = 'text-primary-50 underline'

  return (
    <LegalPage title={t('help.title')} intro={t('help.intro')} showLastUpdated={false}>
      <LegalSection title={t('help.seekers.title')}>
        <LegalList items={list('help.seekers.items')} />
      </LegalSection>

      <LegalSection title={t('help.employers.title')}>
        <LegalList items={list('help.employers.items')} />
      </LegalSection>

      <LegalSection title={t('help.account.title')}>
        <LegalList items={list('help.account.items')} />
      </LegalSection>

      <LegalSection title={t('help.delete.title')}>
        <p>
          <Trans
            i18nKey="legal:help.delete.body"
            components={{ delete: <Link href="/delete-account" className={linkClass} /> }}
          />
        </p>
      </LegalSection>

      <LegalSection title={t('help.safety.title')}>
        <p>{t('help.safety.body')}</p>
      </LegalSection>

      <LegalSection title={t('help.stuck.title')}>
        <p>
          <Trans
            i18nKey="legal:help.stuck.body"
            components={{ contact: <Link href="/contact" className={linkClass} /> }}
          />
        </p>
      </LegalSection>
    </LegalPage>
  )
}
