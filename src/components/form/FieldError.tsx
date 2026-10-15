// The message under a form control. Pair it with `aria-invalid` and
// `aria-describedby={id}` on the control (Field does both).
//
// No role="alert" on purpose. A failed Submit on a form with five bad fields
// would otherwise announce five interrupting alerts at once. The form announces
// ONE summary instead, and focus moves to the first bad field, where this text is
// read through aria-describedby. Renders nothing while there is no message.

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className="mt-1 text-xs text-red-600">
      {message}
    </p>
  )
}

export default FieldError

// Appended to an input's own classes when it has a problem. Important (`!`) because
// the hosts' base classes set `border-gray-300` and `focus:border-transparent`, and
// which of two utilities wins is decided by Tailwind's stylesheet order, not by
// their order in the class string.
export const INVALID_CLS = '!border-red-500 focus:!border-red-500 focus:!ring-red-500'
