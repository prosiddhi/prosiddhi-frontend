'use client'

import Link from 'next/link'
import { Trans, useTranslation } from 'react-i18next'
import { LegalPage, LegalSection, LegalList } from '@/components/legal/LegalPage'

/**
 * Delete account — information only, and public.
 *
 * Google Play needs a web page that explains how to delete an account, and the
 * reader may be signed out. The deletion itself stays in Settings, behind a
 * password / Google re-check (DELETE /me). There is deliberately no form here:
 * a signed-out "request deletion" endpoint does not exist yet.
 *
 * The 30 days is the backend's DELETION_RETENTION_DAYS default (me.service.ts).
 * Deletion is a soft delete, so there is no self-service undo — only an admin
 * restore inside the window.
 */
export default function DeleteAccountPage() {
  const { t } = useTranslation('legal')

  const list = (key: string) => t(key, { returnObjects: true }) as string[]
  const linkClass = 'text-primary-50 underline'

  return (
    <LegalPage
      title={t('deleteAccount.title')}
      intro={t('deleteAccount.intro')}
      showLastUpdated={false}
    >
      <LegalSection title={t('deleteAccount.how.title')}>
        <ol className="list-decimal pl-5 space-y-2">
          {list('deleteAccount.how.steps').map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
        <Link
          href="/settings"
          className="inline-flex items-center min-h-[48px] px-6 bg-primary-50 text-primary-100 rounded-lg hover:bg-primary-60 transition-colors"
        >
          {t('deleteAccount.how.cta')}
        </Link>
      </LegalSection>

      <LegalSection title={t('deleteAccount.what.title')}>
        <LegalList items={list('deleteAccount.what.items')} />
      </LegalSection>

      <LegalSection title={t('deleteAccount.window.title')}>
        <p>{t('deleteAccount.window.body')}</p>
      </LegalSection>

      <LegalSection title={t('deleteAccount.kept.title')}>
        <p>{t('deleteAccount.kept.body')}</p>
      </LegalSection>

      <LegalSection title={t('deleteAccount.stuck.title')}>
        <p>
          <Trans
            i18nKey="legal:deleteAccount.stuck.body"
            components={{
              help: <Link href="/help" className={linkClass} />,
              contact: <Link href="/contact" className={linkClass} />,
            }}
          />
        </p>
      </LegalSection>
    </LegalPage>
  )
}
