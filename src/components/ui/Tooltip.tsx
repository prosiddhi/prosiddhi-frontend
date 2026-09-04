'use client'

import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react'

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right'
type TooltipAlign = 'center' | 'start' | 'end'

interface TooltipProps {
  /** Tooltip text/content shown on hover or keyboard focus. */
  content: ReactNode
  children: ReactNode
  position?: TooltipPosition
  /** Horizontal alignment for the 'top'/'bottom' positions. Ignored for 'left'/'right'. */
  align?: TooltipAlign
  /** Set to false when `children` is already focusable (a button/link) so the
   *  wrapper doesn't add a redundant tab stop — the child gets the
   *  `aria-describedby` link directly instead. Defaults to true so a plain,
   *  non-interactive child (text, an icon) is still reachable by Tab. */
  focusable?: boolean
  /** Force the tooltip off, e.g. while a dropdown menu anchored to the same
   *  trigger is open, so the two floating panels never stack. */
  disabled?: boolean
  className?: string
}

function getPositionClasses(position: TooltipPosition, align: TooltipAlign): string {
  if (position === 'left') return 'right-full top-1/2 -translate-y-1/2 mr-1.5'
  if (position === 'right') return 'left-full top-1/2 -translate-y-1/2 ml-1.5'

  const vertical = position === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
  const horizontal =
    align === 'start' ? 'left-0' : align === 'end' ? 'right-0' : 'left-1/2 -translate-x-1/2'
  return `${vertical} ${horizontal}`
}

/**
 * Generic hover/focus tooltip. Wrap any element and pass the tooltip text
 * via `content` — never the native `title` attribute, which some browsers
 * pair with their own delayed tooltip and produces two overlapping ones.
 */
export function Tooltip({
  content,
  children,
  position = 'top',
  align = 'center',
  focusable = true,
  disabled = false,
  className = '',
}: TooltipProps) {
  const tooltipId = useId()

  if (!content || disabled) {
    return <>{children}</>
  }

  const trigger =
    !focusable && isValidElement(children)
      ? cloneElement(children as ReactElement<{ 'aria-describedby'?: string }>, {
          'aria-describedby': tooltipId,
        })
      : children

  return (
    <span
      tabIndex={focusable ? 0 : undefined}
      aria-describedby={focusable ? tooltipId : undefined}
      className={`group relative inline-flex min-w-0 max-w-full outline-none ${className}`}
    >
      {trigger}
      <span
        id={tooltipId}
        role="tooltip"
        className={`pointer-events-none absolute z-50 hidden max-w-[240px] whitespace-normal break-words rounded-md bg-gray-900 px-2 py-1 text-xs leading-snug text-white opacity-0 transition-opacity group-hover:block group-hover:opacity-100 group-focus-within:block group-focus-within:opacity-100 ${getPositionClasses(position, align)}`}
      >
        {content}
      </span>
    </span>
  )
}
