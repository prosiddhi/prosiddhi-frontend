'use client'

import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Footer } from '@/components/home/Footer'
import { LanguageSwitcher } from '@/components/navigation/LanguageSwitcher'
import { TERMS_LAST_UPDATED } from '@/lib/legal'

/**
 * Shared shell for the public legal pages (/privacy, /terms, /contact).
 *
 * Deliberately PUBLIC — a visitor must be able to read the privacy policy and
 * terms before creating an account, so these must never sit behind ProtectedRoute.
 */
export function LegalPage({
  title,
  intro,
  showLastUpdated = true,
  lastUpdated = TERMS_LAST_UPDATED,
  children,
}: {
  title: string
  intro?: string
  showLastUpdated?: boolean
  /** Effective date shown under the title. Defaults to the Terms date. */
  lastUpdated?: string
  children: ReactNode
}) {
  // 'legal' holds this page's own copy; 'common' holds the app name for the logo.
  const { t } = useTranslation(['legal', 'common'])
  const router = useRouter()

  // These pages are public and often opened straight from a link (Google Play,
  // an email), where there is no previous page to go back to — send them home.
  const goBack = () => (window.history.length > 1 ? router.back() : router.push('/'))

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-white shadow-[10px_10px_50px_0px_rgba(0,0,0,0.05)] sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[119px] h-[65px] sm:h-[75px] flex items-center justify-between">
          <Link href="/" className="flex items-center min-h-[44px]">
            <div className="relative w-[100px] sm:w-[120px] lg:w-[142px] h-[28px] sm:h-[33px] lg:h-[39px]">
              <Image
                src="/assets/prosiddhi-logo-horizontal.png"
                alt={t('common:app.name')}
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>
          <LanguageSwitcher />
        </div>
      </header>

      <main className="flex-1 pt-6 sm:pt-8 pb-10 sm:pb-14">
        <article className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[119px]">
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-2 min-h-[44px] -mt-2.5 text-black hover:text-primary-50 transition-colors mb-2"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>{t('common:buttons.back')}</span>
          </button>
          <h1 className="text-3xl sm:text-4xl font-bold text-primary-100 mb-3">{title}</h1>
          {showLastUpdated && (
            <p className="text-sm text-[#717182] mb-6">
              {t('legal:lastUpdated', { date: lastUpdated })}
            </p>
          )}
          {intro && (
            <p className="max-w-[900px] text-base text-black leading-relaxed mb-8">{intro}</p>
          )}
          <div className="space-y-8">{children}</div>
        </article>
      </main>

      <Footer />
    </div>
  )
}

/** One titled section of a policy, with its paragraphs/lists as children. */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xl sm:text-2xl font-semibold text-black mb-3">{title}</h2>
      <div className="max-w-[900px] space-y-3 text-base text-[#333] leading-relaxed">{children}</div>
    </section>
  )
}

/** A plain bulleted list. `items` are already-translated strings. */
export function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc pl-5 space-y-2">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}
