import { useId, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { seekerCardCls } from './profileStyles'

// One card of the seeker profile: an icon, a title, an optional line saying what the card is for,
// and the card's content. The section is named by its title, so a screen reader lands on
// "Where I live" rather than on an anonymous block.
export function ProfileCard({
  icon: Icon,
  title,
  help,
  action,
  children,
}: {
  icon: LucideIcon
  title: ReactNode
  help?: string
  /** Sits at the right of the header, e.g. an "Add" button. */
  action?: ReactNode
  children: ReactNode
}) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className={seekerCardCls}>
      <div className="flex items-start justify-between gap-3 mb-4 sm:mb-5">
        <div className="flex items-start gap-3 min-w-0">
          <span
            aria-hidden="true"
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#eaf6fd] text-[#236987]"
          >
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 id={headingId} className="flex items-center gap-2 text-lg sm:text-xl font-semibold text-black">
              {title}
            </h2>
            {help && <p className="mt-0.5 text-sm text-gray-600">{help}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
