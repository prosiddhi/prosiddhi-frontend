import type { ReactNode } from 'react'
import { LegalSection } from '@/components/legal/LegalPage'

export type FaqItem = { q: string; a: ReactNode }
export type FaqGroup = { title: string; items: FaqItem[] }

/**
 * Grouped questions and answers for the public FAQ pages.
 *
 * Uses the browser's own <details>/<summary>, so it opens and closes with the
 * keyboard and is announced by screen readers without any script.
 */
export function FaqAccordion({ groups }: { groups: FaqGroup[] }) {
  return (
    <>
      {groups.map(group => (
        <LegalSection key={group.title} title={group.title}>
          <div className="space-y-2">
            {group.items.map(item => (
              <details
                key={item.q}
                className="group rounded-lg border border-gray-200 bg-white open:bg-gray-50"
              >
                <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 font-semibold text-black [&::-webkit-details-marker]:hidden">
                  <span>{item.q}</span>
                  <span
                    aria-hidden="true"
                    className="text-xl leading-none text-primary-90 transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <div className="space-y-3 px-4 pb-4 text-base leading-relaxed text-[#333]">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </LegalSection>
      ))}
    </>
  )
}
