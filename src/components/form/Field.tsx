'use client'

import { Children, cloneElement, isValidElement, useId, type ReactNode } from 'react'
import { FieldError } from '@/components/form/FieldError'

/**
 * A labelled form field: the label, and the control it names.
 *
 * **It links them.** That is the whole reason this exists rather than a `<div>`
 * with a `<label>` in it. A `<label>` sitting NEXT to a control names nothing —
 * the association needs `htmlFor`/`id`, a wrapping `<label>`, or an `aria-label`
 * — so a screen reader reached the seeker profile's language dropdown and
 * announced "combo box" with no field name at all (TD-39). An `<input>` at least
 * falls back to its placeholder; a `<select>` has nothing.
 *
 * The id is generated with `useId` and attached to the first element child, so
 * callers write ordinary JSX and get the association for free. Two reasons it is
 * done here rather than by passing ids in at each call site:
 *
 * 1. **Repeated rows.** The seeker profile renders four of these per work
 *    experience, inside a `.map`. Any literal id would be duplicated the moment
 *    someone adds a second job, and duplicate ids bind every label to the FIRST
 *    matching control — which reads as correct and is not.
 * 2. **Multi-child fields.** The location field is an input, a datalist, a
 *    button and a status line. Only the first is the control being named.
 *
 * A child that already carries its own `id` keeps it, and the label follows it.
 *
 * ⚠️ If the first element child is not the control (a wrapper `<div>`, say),
 * the label points at the wrapper and names nothing. That is caught rather than
 * trusted: `scripts/smoke/smoke-td39.js` asserts that every control on this page
 * resolves to a non-empty accessible name in the browser's own role tree.
 *
 * Shared because it was duplicated byte-for-byte in the seeker and employer
 * profiles, which is why both carried the same defect.
 */
export function Field({
  label,
  children,
  full,
  className = 'text-sm font-medium text-black mb-1.5 block',
  required,
  optionalLabel,
  error,
}: {
  label: ReactNode
  children: ReactNode
  /** Span both columns of the parent grid. */
  full?: boolean
  /** Overridable so each host form keeps its own label styling. */
  className?: string
  /** Adds the red `*` and `aria-required` on the control. */
  required?: boolean
  /** Already-translated "(Optional)" text, shown after the label. Ignored when `required`. */
  optionalLabel?: string
  /**
   * Already-translated error text. Shows under the control, and sets
   * `aria-invalid` and `aria-describedby` on it. The red border is the caller's:
   * only the caller knows its own input classes. `required` and `error` assume the
   * first child is the native control; a composite control (like TaxonomyPicker)
   * should render its own FieldError.
   */
  error?: string
}) {
  const generatedId = useId()
  let controlId: string | undefined
  let linked = false

  const labelled = Children.map(children, (child) => {
    if (linked || !isValidElement(child)) return child
    linked = true
    const existing = (child.props as { id?: string }).id
    controlId = existing ?? generatedId
    // Only the props this field actually sets, so an aria attribute the child
    // already carries is never overwritten with undefined.
    const control = cloneElement(child as React.ReactElement<Record<string, unknown>>, {
      id: controlId,
      ...(required && { 'aria-required': true }),
      ...(error && { 'aria-invalid': true, 'aria-describedby': `${controlId}-error` }),
    })
    // The message goes straight under the control, ahead of any hint or counter the
    // caller put after it.
    return (
      <>
        {control}
        <FieldError id={`${controlId}-error`} message={error} />
      </>
    )
  })

  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className={className} htmlFor={controlId}>
        {label}
        {required && (
          <span className="text-red-500" aria-hidden="true">
            {' '}
            *
          </span>
        )}
        {!required && optionalLabel && <span className="text-gray-400 font-normal"> {optionalLabel}</span>}
      </label>
      {labelled}
    </div>
  )
}

export default Field
