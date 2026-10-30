/**
 * The public job list on the seeker landing page (`/employee`), and the way into
 * it from everywhere else.
 *
 * Anyone can browse jobs without an account — `GET /jobs` and `GET /jobs/:id`
 * are public on the backend. Only applying (and saving) needs a login.
 *
 * The URL is the list's only state, so a category tile on the home page, the
 * landing page's own search bar and a shared link all land the same way:
 *
 *   /employee?search=welder&category=Logistics%20%26%20Mobility&stateCode=28#jobs
 *
 * The location part reuses jobLocationParams.ts, so it reads and writes exactly
 * like the signed-in Job Feed.
 */

import { parseJobLocation, setJobLocationParams, type JobLocation } from '@/lib/jobLocationParams'
import { loginHref } from '@/lib/routes'

const PUBLIC_JOBS_PATH = '/employee'

/** The id of the job list section on /employee — the `#` every link here jumps to. */
export const PUBLIC_JOBS_ANCHOR = 'jobs'

export interface PublicJobQuery {
  search: string
  /** A backend category name, as GET /categories returns it. Empty = any. */
  category: string
  location: JobLocation
}

/** A link to the public job list, already filtered. */
export function publicJobsHref({
  search = '',
  category = '',
  location,
}: Partial<PublicJobQuery> = {}): string {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  if (category) params.set('category', category)
  if (location) setJobLocationParams(params, location)
  const qs = params.toString()
  return `${PUBLIC_JOBS_PATH}${qs ? `?${qs}` : ''}#${PUBLIC_JOBS_ANCHOR}`
}

/** What a public job list URL asks for. A malformed location is dropped, not guessed. */
export function parsePublicJobQuery(params: Pick<URLSearchParams, 'get'>): PublicJobQuery {
  return {
    search: params.get('search')?.trim() ?? '',
    category: params.get('category')?.trim() ?? '',
    location: parseJobLocation(params),
  }
}

/**
 * A job as a logged-out visitor opens it from the public list. `from=employee` is part
 * of it, so the job's Back link still returns to the public list once they are signed
 * in. Apply, the header's Login and the header's Register all return to this path.
 */
export function publicJobPath(jobId: string): string {
  return `/job-details/${jobId}?from=employee`
}

/**
 * Where a logged-out visitor goes when they press Apply or Save on a job: the
 * login page, which then opens that job.
 */
export function loginForJobHref(jobId: string): string {
  return loginHref(publicJobPath(jobId))
}
