import { fieldLabelCls } from './profileStyles'

// Same rhythm as EmailStatusField — phone is mandatory at registration, so it
// is never blank, and its Change action only renders in edit mode. Shared by
// the Employer and Job Seeker profile pages — all copy is passed in by the
// caller so each page keeps its own translation namespace.
export function PhoneStatusField({
  label,
  phoneNumber,
  verified,
  editing,
  notProvided,
  verifiedText,
  changeLabel,
  onChangeClick,
}: {
  label: string
  phoneNumber: string
  verified: boolean
  editing: boolean
  notProvided: string
  verifiedText: string
  changeLabel: string
  onChangeClick: () => void
}) {
  return (
    <div>
      <p className={fieldLabelCls}>{label}</p>
      <p className="text-sm sm:text-base font-medium text-black">
        {phoneNumber || notProvided}
      </p>
      {phoneNumber && verified && (
        <p className="text-xs mt-0.5 text-green-600">{verifiedText}</p>
      )}
      {editing && (
        <button
          type="button"
          onClick={onChangeClick}
          className="mt-1.5 text-sm font-medium text-primary-50 hover:text-primary-60"
        >
          {changeLabel}
        </button>
      )}
    </div>
  )
}
