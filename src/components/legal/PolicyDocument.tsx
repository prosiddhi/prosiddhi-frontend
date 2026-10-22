'use client'

import Link from 'next/link'
import type { ReactElement } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { LegalSection } from '@/components/legal/LegalPage'
import {
  CIN,
  COMPANY_LEGAL_NAME,
  GRIEVANCE_OFFICER,
  GSTIN,
  REGISTERED_OFFICE,
  SUPPORT_EMAIL,
  SUPPORT_PHONE_TEXT,
} from '@/lib/legal'

/**
 * Renders a policy that lives in the `legal` locale as an ordered list of sections:
 *
 *   "<doc>": { "sections": [ { "id", "title", "blocks": [ { "p" } | { "list": [] } |
 *                                                         { "company": true } | { "grievance": true } ] } ] }
 *
 * The text is the document; this file only lays it out. So a policy change is a
 * text change in ten locale files and a version bump — never a code change — and
 * every language gets the same sections in the same order.
 *
 * Every paragraph and list item goes through <Trans>, so any of them may use these
 * links and values without code knowing which one does. Only what the text uses is
 * listed; verify-locales checks that every translation keeps English's tags.
 */
type Block = { p?: string; list?: string[]; company?: boolean; grievance?: boolean }
type Section = { id: string; title: string; blocks: Block[] }

const linkClass = 'text-primary-90 underline'
const LINKS: Record<string, ReactElement> = {
  privacy: <Link href="/privacy" className={linkClass} />,
  terms: <Link href="/terms" className={linkClass} />,
  contact: <Link href="/contact" className={linkClass} />,
  refund: <Link href="/refund-policy" className={linkClass} />,
  delivery: <Link href="/delivery-policy" className={linkClass} />,
  delete: <Link href="/delete-account" className={linkClass} />,
  gac: <a href="https://gac.gov.in" target="_blank" rel="noopener noreferrer" className={linkClass} />,
  strong: <strong className="font-semibold text-black" />,
}

const VALUES = {
  company: COMPANY_LEGAL_NAME,
  email: SUPPORT_EMAIL,
  phone: SUPPORT_PHONE_TEXT,
}

// legal.ts leaves a value empty while it is unconfirmed; print only what is set.
const companyIds = [CIN && `CIN: ${CIN}`, GSTIN && `GSTIN: ${GSTIN}`].filter(Boolean).join(' · ')

export function PolicyDocument({ doc }: { doc: 'privacy' | 'terms' }) {
  const { t } = useTranslation('legal')
  const sections = t(`${doc}.sections`, { returnObjects: true }) as Section[]
  if (!Array.isArray(sections)) return null

  const text = (key: string) => (
    <Trans i18nKey={`legal:${key}`} values={VALUES} components={LINKS} />
  )

  return (
    <>
      {sections.map((section, s) => (
        <div key={section.id} id={section.id} className="scroll-mt-24">
          <LegalSection title={`${s + 1}. ${section.title}`}>
            {section.blocks.map((block, b) => {
              const base = `${doc}.sections.${s}.blocks.${b}`
              if (block.list) {
                return (
                  <ul key={b} className="list-disc pl-5 space-y-2">
                    {block.list.map((_, i) => (
                      <li key={i}>{text(`${base}.list.${i}`)}</li>
                    ))}
                  </ul>
                )
              }
              if (block.company) {
                return (
                  <div key={b} className="space-y-1">
                    <p className="font-medium text-black">{COMPANY_LEGAL_NAME}</p>
                    {REGISTERED_OFFICE && <p className="whitespace-pre-line">{REGISTERED_OFFICE}</p>}
                    {companyIds && <p>{companyIds}</p>}
                  </div>
                )
              }
              if (block.grievance) {
                return (
                  <div key={b} className="space-y-1 border-l-4 border-primary-20 pl-4">
                    <p className="font-medium text-black">
                      {GRIEVANCE_OFFICER.name}, {GRIEVANCE_OFFICER.designation}
                    </p>
                    <p>
                      <a href={`mailto:${GRIEVANCE_OFFICER.email}`} className={linkClass}>
                        {GRIEVANCE_OFFICER.email}
                      </a>
                    </p>
                  </div>
                )
              }
              return <p key={b}>{text(`${base}.p`)}</p>
            })}
          </LegalSection>
        </div>
      ))}
    </>
  )
}
