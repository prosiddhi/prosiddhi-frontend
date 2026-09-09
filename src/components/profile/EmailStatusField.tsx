import { fieldLabelCls } from './profileStyles'
import type { EmailVerifyMode } from './EmailVerifyModal'

// Email is never a plain editable field (has its own Add/Change/Verify action
// via the shared EmailVerifyModal), so it gets its own field in both view and
// edit mode. Shared by the Employer and Job Seeker profile pages — all copy is
// passed in by the caller so each page keeps its own translation namespace.
// The Add/Change/Verify action only renders in edit mode.
export function EmailStatusField({
  label,
  email,
  verified,
  editing,
  notProvided,
  verifiedText,
  unverifiedText,
  addLabel,
  changeLabel,
  verifyLabel,
  onAction,
}: {
  label: string
  email: string | null
  verified: boolean
  editing: boolean
  notProvided: string
  verifiedText: string
  unverifiedText: string
  addLabel: string
  changeLabel: string
  verifyLabel: string
  onAction: (mode: EmailVerifyMode) => void
}) {
  return (
    <div>
      <p className={fieldLabelCls}>{label}</p>
      <p className="text-sm sm:text-base font-medium text-black break-all">
        {email || notProvided}
      </p>
      {email && (
        <p className={`text-xs mt-0.5 ${verified ? 'text-green-600' : 'text-amber-600'}`}>
          {verified ? verifiedText : unverifiedText}
        </p>
      )}
      {editing && (
        <button
          type="button"
          onClick={() => onAction(!email ? 'add' : verified ? 'change' : 'verify')}
          className="mt-1.5 text-sm font-medium text-primary-50 hover:text-primary-60"
        >
          {!email ? addLabel : verified ? changeLabel : verifyLabel}
        </button>
      )}
    </div>
  )
}
