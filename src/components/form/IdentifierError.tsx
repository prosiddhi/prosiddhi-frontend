// The message under a GST / registration number input. Pairs with
// `useIdentifierErrors().inputProps`, which points the input at this id.

import type { BusinessIdentifierField } from '@/lib/api'

export function IdentifierError({ field, message }: { field: BusinessIdentifierField; message?: string }) {
  if (!message) return null
  return (
    <p id={`${field}-error`} role="alert" className="mt-1.5 text-sm text-red-600">
      {message}
    </p>
  )
}

export default IdentifierError
