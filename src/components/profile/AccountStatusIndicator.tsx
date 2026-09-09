// The root account status (dot + text) — a caption under the name, not a
// pill, since this is background information rather than a call to act.
// Shared rendering shell only: each profile page keeps its own
// status→label / status→dot-color maps (the Employer page has more states
// than the Job Seeker page) and passes the resolved values down.
export function AccountStatusIndicator({
  label,
  dotClassName,
}: {
  label: string | null
  dotClassName: string
}) {
  if (!label) return null
  return (
    <p className="inline-flex items-center gap-1.5 mt-1.5 text-xs text-[#717182]">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClassName}`} />
      {label}
    </p>
  )
}
