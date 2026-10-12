// URLs for the employer's Candidates list, so the tab, page and job filter live in the
// address bar (refresh, Back and Forward land where the employer was).
//
// The search text is deliberately NOT here: it can be a name, an email or a phone number,
// and a URL ends up in browser history and server logs. The page keeps it in
// sessionStorage instead.

const CANDIDATES_PATH = '/employer/candidates'

/** The list's tabs. The page's own tab table is typed against this, so they cannot drift. */
export const CANDIDATE_TABS = ['all', 'accepted', 'shortlisted', 'rejected', 'bookmarked'] as const
export type CandidateTab = (typeof CANDIDATE_TABS)[number]

// Past any real list, but small enough that the BE is never asked for an absurd offset.
// A page beyond the end just lands on the last real page (see the list's correction).
const MAX_PAGE = 10_000

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** The tab a `?tab=` value names. Anything else is All. */
export function parseCandidateTab(value: string | null): CandidateTab {
  const wanted = value?.toLowerCase()
  return CANDIDATE_TABS.find((tab) => tab === wanted) ?? 'all'
}

/** The page a `?page=` value names: a whole number from 1 up, otherwise page 1. */
export function parseCandidatePage(value: string | null): number {
  const page = Number.parseInt(value ?? '', 10)
  return page > 0 ? Math.min(page, MAX_PAGE) : 1
}

/**
 * The job a `?jobId=` value names, or undefined. The BE answers 400 to anything that is
 * not a UUID, so a value of any other shape is dropped here instead of being sent: the
 * list then shows every job, and the next link built from it leaves the bad value out.
 */
export function parseCandidateJobId(value: string | null): string | undefined {
  return value && UUID.test(value) ? value : undefined
}

/** `/employer/candidates` for a tab, page and job, leaving out whatever is already the default. */
export function candidatesUrl({
  tab = 'all',
  page = 1,
  jobId,
}: { tab?: CandidateTab; page?: number; jobId?: string } = {}): string {
  const qs = new URLSearchParams()
  if (jobId) qs.set('jobId', jobId)
  if (tab !== 'all') qs.set('tab', tab)
  if (page > 1) qs.set('page', String(page))
  const query = qs.toString()
  return query ? `${CANDIDATES_PATH}?${query}` : CANDIDATES_PATH
}
