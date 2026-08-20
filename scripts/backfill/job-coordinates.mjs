// TD-40 — give the jobs that already exist a coordinate.
//
// TD-03 writes a coordinate whenever a job is posted or edited. It does nothing
// for the jobs already in the table, and both `getJobs` and `getNearbyForSeeker`
// drop any job whose latitude is null BEFORE the distance maths runs. So without
// this, DEF-035 still reproduces on live data after the deploy — Near By and the
// city filter look broken to anyone testing with today's jobs, while
// smoke-td03.js passes happily on a job it just created.
//
// This script WRITES NOTHING. It reads the job list, matches each location
// string with the application's own matcher, and prints SQL for a human to read
// and run. That is deliberate:
//
//   * the frontend has no database credentials and should not grow any
//   * the backend is Asrar's to commit to (.claude/CLAUDE.md)
//   * a coordinate written onto the wrong city is worse than no coordinate, so
//     the UPDATE statements should be read by someone before they run
//   * TD-42: a coordinate cannot be cleared through any API, only replaced. A
//     wrong one written here would need more hand-SQL to undo
//
// It imports `src/lib/cities.ts` directly rather than copying the rules. A
// backfill with its own copy of the matcher is a backfill that writes
// coordinates the app would never have chosen — the first version of this file
// did exactly that and silently lost alias support, so "Bengaluru" matched
// nothing. That is why cities.ts is kept free of i18n and React.
//
//   npx tsx scripts/backfill/job-coordinates.mjs                  # local
//   API=https://api.prosiddhi.com/api npx tsx scripts/backfill/job-coordinates.mjs
//   … > backfill.sql
import { CITY_COORDS, cityKeyFromText } from '../../src/lib/cities.ts'

const API = process.env.API || 'http://localhost:5000/api'
const PAGE = 100

// Every JobStatus in prisma/schema.prisma. `getJobs` defaults its WHERE to
// `status = 'ACTIVE'`, so asking for the list without a status shows only a
// slice of the table — and a DRAFT or INACTIVE job that an employer reactivates
// next month would be DEF-035 all over again, on a row this script had reported
// as covered. Ask for each status by name instead.
const STATUSES = ['DRAFT', 'ACTIVE', 'INACTIVE', 'CLOSED', 'FILLED', 'CANCELLED']

// No `translate` argument, deliberately: that half of the matcher resolves city
// names written in the reader's own script, and it needs a loaded locale. Stored
// legacy text is Latin, and guessing at a language for a row in a database is
// not something a backfill should do.

// An ALLOWLIST, not an escape. The only value interpolated into a statement is a
// job id, and a job id is a UUID — so assert that shape and refuse anything else,
// rather than escaping a string and trusting the escape.
//
// Escaping was the original approach and it worked, but the safety then rested on
// `replace(/'/g, "''")` being right and on nobody later pointing the same helper
// at `job.location`. Checked empirically: an employer CAN store a location
// containing a real newline and `'; DROP TABLE "Job"; --`, and the generator does
// emit it — inside a `--` comment, via JSON.stringify, which renders the newline
// as the two characters \ and n so the comment cannot be closed. That holds, but
// it is one careless edit away from not holding. This is not.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
function jobIdLiteral(id) {
  if (!UUID.test(String(id))) {
    throw new Error(`refusing to emit SQL: job id is not a UUID: ${JSON.stringify(id)}`)
  }
  return `'${id}'`
}

async function jobsWithStatus(status) {
  const out = []
  for (let page = 1; ; page++) {
    const res = await fetch(`${API}/jobs?status=${status}&page=${page}&limit=${PAGE}`)
    if (!res.ok) throw new Error(`GET /jobs?status=${status} failed: ${res.status}`)
    const jobs = (await res.json())?.data?.jobs ?? []
    out.push(...jobs)
    if (jobs.length < PAGE) return out
  }
}

// One row per job id — a job cannot hold two statuses, but a defensive dedupe
// keeps the SQL free of duplicate UPDATEs if the API ever overlaps them.
const byId = new Map()
for (const status of STATUSES) {
  for (const job of await jobsWithStatus(status)) byId.set(job.id, job)
}

const missing = [...byId.values()].filter((j) => j.latitude == null || j.longitude == null)
const matched = []
const unmatched = []
for (const job of missing) {
  const key = cityKeyFromText(job.location)
  if (key) matched.push({ job, key })
  else unmatched.push(job)
}

console.log(`-- TD-40 job-coordinate backfill
-- source:   ${API}
-- statuses: ${STATUSES.join(', ')}
--
-- ${byId.size} job(s) seen; ${missing.length} without a coordinate;
-- ${matched.length} matched a known city, ${unmatched.length} did not.
--
-- Every statement names the job id and the text it matched, so this can be read
-- before it is run. The WHERE clause re-checks that the coordinate is still
-- null, so re-running is safe and a job that gained one meanwhile is left alone.
`)

if (matched.length) {
  console.log('BEGIN;')
  for (const { job, key } of matched) {
    const coords = CITY_COORDS[key]
    console.log(`-- ${JSON.stringify(job.location)} -> ${key}`)
    console.log(
      `UPDATE "Job" SET latitude = ${coords.lat}, longitude = ${coords.lon} ` +
        `WHERE id = ${jobIdLiteral(job.id)} AND latitude IS NULL;`,
    )
  }
  console.log('COMMIT;')
} else {
  console.log('-- nothing to write.')
}

if (unmatched.length) {
  // Grouped by the text, with the ids, so whoever reviews this can decide
  // "yes, that Nagpur one is really Nagpur" without re-running or querying.
  const byText = new Map()
  for (const job of unmatched) {
    const text = job.location || '(no location text)'
    byText.set(text, [...(byText.get(text) ?? []), job.id])
  }
  console.log(`
-- LEFT ALONE — no city we know. A wrong coordinate is worse than none, so these
-- are for TD-34 (data cleanup) or a human, not for this script:`)
  for (const [text, ids] of [...byText].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`--   ${String(ids.length).padStart(4)} x ${text}`)
    for (const id of ids) console.log(`--          ${id}`)
  }
}
