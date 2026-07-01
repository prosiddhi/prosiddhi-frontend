// Shared formatters for job cards/details (used by job-feed + job-details).

export function humanizeJobType(t?: string): string {
  if (!t) return ''
  return t
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

export function formatSalary(min?: number | null, max?: number | null): string {
  const fmt = (n: number) => n.toLocaleString('en-IN')
  if (min != null && max != null) return `${fmt(min)} - ${fmt(max)}`
  if (min != null) return `From ${fmt(min)}`
  if (max != null) return `Up to ${fmt(max)}`
  return 'Negotiable'
}

export function relativeTime(iso?: string): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const mins = Math.floor((Date.now() - then) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
  const days = Math.floor(hrs / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

// Human date like "Mon, 16 Jun 2026" from an ISO string. Empty on invalid input.
export function formatDate(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function initials(name?: string | null): string {
  if (!name) return 'JB'
  return name.trim().slice(0, 2).toUpperCase()
}
