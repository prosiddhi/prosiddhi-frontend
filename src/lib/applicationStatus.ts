// Shared presentation for the BE ApplicationStatus enum
// (PENDING / REVIEWED / SHORTLISTED / REJECTED / ACCEPTED / WITHDRAWN / BOOKMARKED).
// Used by the My Applications list + detail screens.

export interface StatusMeta {
  label: string
  /** Tailwind classes for the status pill (bg + text). */
  pill: string
}

const STATUS_META: Record<string, StatusMeta> = {
  PENDING: { label: 'Applied', pill: 'bg-[#eef6ff] text-[#1d6fb8]' },
  REVIEWED: { label: 'Under Review', pill: 'bg-amber-50 text-amber-700' },
  SHORTLISTED: { label: 'Shortlisted', pill: 'bg-indigo-50 text-indigo-700' },
  ACCEPTED: { label: 'Accepted', pill: 'bg-green-50 text-green-700' },
  REJECTED: { label: 'Rejected', pill: 'bg-red-50 text-red-700' },
  WITHDRAWN: { label: 'Withdrawn', pill: 'bg-gray-100 text-gray-600' },
  BOOKMARKED: { label: 'Bookmarked', pill: 'bg-purple-50 text-purple-700' },
}

function humanize(status: string): string {
  return status
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function statusMeta(status?: string): StatusMeta {
  if (!status) return { label: 'Unknown', pill: 'bg-gray-100 text-gray-600' }
  return STATUS_META[status] ?? { label: humanize(status), pill: 'bg-gray-100 text-gray-600' }
}

// A seeker can withdraw only while the application is still in flight — the BE
// rejects withdraw of an ACCEPTED or already-WITHDRAWN application.
export function canWithdraw(status?: string): boolean {
  return status !== 'ACCEPTED' && status !== 'WITHDRAWN'
}
