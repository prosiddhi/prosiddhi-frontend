import type { ReactNode } from 'react'
import { fieldLabelCls } from './profileStyles'

// A label + value pair for view mode, shared by the Employer and Job Seeker
// profile pages. `notProvided` and `breakWords` are passed by the caller
// rather than hardcoded, so each page keeps its own copy namespace and its
// own original wrapping behaviour (only the employer page's fields broke
// long words).
export function ReadOnlyField({
  label,
  value,
  full,
  notProvided,
  breakWords,
}: {
  label: string
  value?: ReactNode
  full?: boolean
  notProvided: string
  breakWords?: boolean
}) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <p className={fieldLabelCls}>{label}</p>
      <p className={`text-sm sm:text-base font-medium text-black whitespace-pre-line${breakWords ? ' break-words' : ''}`}>
        {value || notProvided}
      </p>
    </div>
  )
}
