# Portal task list — 2026-09-15

**Repo:** `prosiddhi-frontend` (the portal — seeker + employer web app).
**Written from:** the 2026-09-15 status sync — `docs/STATUS.md` §4 rows 29–47,
`docs/teardown-fix-list.md` and `docs/qa/defect-log.csv`.
**Code as of:** portal `d3d923c`, backend `c413dc0`.

---

## How to use this document

### For the person handing out work

Give Claude **one task at a time**. Paste this, and change the task ID:

```
Read .claude/CLAUDE.md, then docs/tasks/portal-2026-09-15.md.
Do task P-01 only. Follow "Rules for every task".
Plan first, and show me the plan before you change any code.
```

Tasks in group **E** are decisions. Do not hand them to Claude until Nazir has
decided.

### For Claude

Each task stands on its own. It has these parts:

- **Problem** — what a user sees today, with an example.
- **Cause** — why it happens, with file and line.
- **Backend contract** — what the API does. **Confirm it in
  `../prosiddhi-backend/src` before you code.** Do not trust this file for paths.
- **Done when** — checks that must all pass.
- **Steps** — a suggested path. If you find a better one, say so in your plan.
- **Watch out** — traps, and what not to touch.
- **Test** — how to prove it works.

File:line references were right on 2026-09-15. Lines move. If a line does not
match, search for the quoted code instead of trusting the number.

---

## Rules for every task

1. Read `.claude/CLAUDE.md` first. Its hard rules win over this file.
2. **Plan first.** Show the plan. Wait for a yes before changing more than one file.
3. Use the `api.ts` client. Never a raw `fetch`.
4. Confirm every API path, method and field against
   `../prosiddhi-backend/src/routes` and its validators.
5. New or changed text goes into **all 10 locale files**
   (`src/locales/<lang>/*.json`). Use the `i18n-translator` agent for the nine
   non-English languages. Never leave English text in a non-English file.
6. **Stay inside the task.** If you find another problem, write it in your
   report. Do not fix it in the same commit.
7. Before you commit, all of these must pass:
   - `npm run type-check`
   - `npm run lint`
   - `node scripts/verify-locales.mjs` (when copy changed)
   - `/code-review` — `high` for logic, `medium` for copy-only
   - `/simplify` on the diff
8. **One commit per task.** Conventional message with the task ID. Example:
   `fix(employer): read isBookmarked for the Bookmarked tab (P-01)`.
   **No `Co-Authored-By` line.**
9. When done, update the task's row in `docs/STATUS.md` §4 (✅ + the commit).
   If the task names a register row, update `docs/qa/defect-log.csv` too:
   status → "Fixed <date> - awaiting retest". **Never "Closed"** — only a retest
   closes a row.
10. **Report back:** what changed, how you tested it, and what you could not test.

**Local stack for testing:** see `scripts/smoke/README.md` (read its traps
before running two dev servers).

---

## Task index

| ID | Task | Group | Source |
|---|---|---|---|
| P-01 | Bookmarked tab and bookmark button | A | STATUS §4 bug 43 |
| P-02 | "Awaiting review" on a new job | A | bug 44 |
| P-03 | Ask before Activate spends a credit | A | bug 38 |
| P-04 | A job that is no longer live | A | bug 45 |
| P-05 | Fix the DEF-023 check in the retest script | A | bug 42 |
| P-06 | Password maximum: 64, not 128 | B | bug 29 |
| P-07 | GST and registration number checks | B | bug 46, DEF-018 |
| P-08 | Application status chip colour | B | bug 34 |
| P-09 | Job card pay period and posted date | B | bug 35 |
| P-10 | Employer job page error link | B | bug 41 |
| P-11 | Update the signed-in user after an email or phone change | C | bug 31 |
| P-12 | Ledger "To" date keeps the whole day | C | bug 36 |
| P-13 | Ledger: members, translation, readable reasons | C | bug 37 |
| P-14 | 18+ check on the profile date of birth | C | bug 33 |
| P-15 | Remove dead status values | C | bug 47 |
| P-16 | Show rejected job posts | C | employer review, 2026-09-15 |
| P-17 | Job feed: jobs on the first screen | D | TD-15 |
| P-18 | Header: every page reachable on a phone | D | bug 39 |
| P-19 | Job feed: role follows department | D | bug 40 |
| P-20 | Tap targets at least 44 px | D | TD-20 |
| P-21 | ⛔ Decision: GST fields for Individual employers | E | bug 32 |
| P-22 | ⛔ Decision: phone password reset | E | bug 30 |
| P-23 | Clean-up | F | review notes |

**Groups:**
- **A** — broken for users. Do these first, in order.
- **B** — small, clear fixes.
- **C** — wrong data.
- **D** — layout and regressions.
- **E** — decisions. **Do not start.**
- **F** — clean-up, only alongside a task that already touches the file.

---

## A. Broken for users — do first, in order

### P-01 · Make the Bookmarked tab and the bookmark button work

Group A · STATUS §4 bug 43 · backend drift

**Problem.** An employer bookmarks a candidate. The **Bookmarked** tab on
Candidates stays empty. On the candidate's page the bookmark icon never fills,
and for some candidates the button is missing.

**Cause.** The backend changed how a bookmark is stored. It used to be an
application **status**, `BOOKMARKED`. Since 2026-09-10 it is a separate yes/no
field, `isBookmarked`, and the status stays what it was (PENDING, SHORTLISTED…).
The portal still uses the old status:

- The tab filters on `status: 'BOOKMARKED'` — `src/app/employer/candidates/page.tsx:28`.
  The backend answers that filter with an **empty list and a 200**, so nothing errors.
- The button only shows for PENDING, REVIEWED or BOOKMARKED —
  `src/app/employer/candidates/[applicationId]/page.tsx:171` (`const canBookmark =`).
- The filled state reads `status` — same file, around `:349-350`.
- `EmployerApplicationItem` in `src/lib/api.ts` (around `:1495-1515`) has no
  `isBookmarked` field.

**Backend contract (confirm first).**
- `PUT /api/applications/:id/bookmark` flips `isBookmarked`. It works from any
  status. Response: `{ message, application }` — there is **no** top-level
  `status` any more; read `application.isBookmarked`.
  (`application.service.ts`, around `:1301-1331`.)
- Employer-side application objects include `isBookmarked: boolean`. Seeker-side
  ones leave it out on purpose.
- `GET /api/applications/employer/stats` → `bookmarked` counts `isBookmarked`.
- There is **no** `?isBookmarked=` filter on the application list routes.

**Done when.**
- [ ] Bookmark a candidate → the icon fills, and they appear under Bookmarked.
- [ ] Un-bookmark → the icon empties, and they leave Bookmarked.
- [ ] The button shows for every status, as the backend allows.
- [ ] A bookmarked candidate who is then shortlisted shows under **both**
      Shortlisted and Bookmarked.
- [ ] The tab count matches `stats.bookmarked`.

**Steps.**
1. Add `isBookmarked: boolean` to `EmployerApplicationItem` and to the bookmark
   response type.
2. Candidate page: remove the status gate, read `isBookmarked`, and after a
   toggle use `application.isBookmarked` from the response.
3. Bookmarked tab — choose one and say which in your plan:
   - **(a)** ask Asrar for an `?isBookmarked=true` filter (a small backend
     change — coordinate before anyone commits to the backend), or
   - **(b)** for now, filter on `isBookmarked` in the page. This is wrong once an
     employer has more than one page of applicants — say so in the report.
4. Search the portal for any other `'BOOKMARKED'` and fix it (see also P-15).

**Watch out.** Commit `57f8c74` hid **Shortlist** for a BOOKMARKED application,
so shortlisting would not wipe the bookmark. That reason is gone — a status
change can no longer destroy a bookmark. Re-check the Shortlist button's
conditions and explain any change.

**Test.** Local stack, as an employer with at least one applicant: bookmark,
switch tabs, refresh, un-bookmark, shortlist a bookmarked candidate.

---

### P-02 · Show "Awaiting review" on a new job

Group A · STATUS §4 bug 44 · backend drift

**Problem.** An employer posts a job and lands on My Jobs. The job sits under
Active with an "Inactive" pill and an **Activate** button. Pressing Activate
shows an error. Nothing tells the employer that the job is waiting for an admin,
or that seekers cannot see it yet.

**Cause.** Pre-moderation (backend, 2026-09-03). Every new job starts as
`status: INACTIVE`, `moderationStatus: PENDING_REVIEW`, `liveUntil: null`, and
goes live only when an admin approves it. A **material edit** to a live job
sends it back to review too. The portal has never heard of `moderationStatus` —
it is not in `src/lib/api.ts`.

- Post-job redirect: `src/app/employer/jobs/new/page.tsx:41-42`.
- My Jobs pill and Activate: `src/app/employer/jobs/page.tsx:189-190`, `:228`.
- Edit page: `src/app/employer/jobs/[id]/edit/page.tsx`.

**Backend contract (confirm first).**
- `moderationStatus` is a column on `Job` — read the enum in
  `prisma/schema.prisma` (`PENDING_REVIEW`, `APPROVED`, `REJECTED`, …). Confirm
  that `GET /api/jobs/employer/me/jobs` and `GET /api/jobs/:id` (as the owner)
  return it.
- `POST /api/jobs/:id/activate` on an unapproved job → 400
  `This job is awaiting review and cannot be activated yet`
  (`job.service.ts`, around `:1760`).
- `PUT /api/jobs/:id` on an approved job: a material change sends it back to
  `INACTIVE` + `PENDING_REVIEW` (around `:677-703` — **read the field list
  there, don't guess it**). Two new 400s:
  `This job was rejected and can no longer be edited` and
  `This job has expired. Activate it first, then edit.`

**Done when.**
- [ ] After posting, the employer sees a clear message: the job has been sent for
      approval, and goes live once an admin approves it.
- [ ] My Jobs shows an **"Awaiting review"** pill on such jobs, with no Activate
      button.
- [ ] On the edit page, before saving a material change to a live job, the
      employer is told the job will go back to review.
- [ ] The two new edit errors show as readable, translated messages.
- [ ] After an admin approves, a refresh shows the job as live. (The bell already
      tells the employer: `JOB_APPROVED` is built.)

**Steps.** Add `moderationStatus` to the Job type → pill and hide Activate →
post-success message → edit-page warning → map the errors. Copy in 10 languages.

**Watch out.** Do not hide the job from My Jobs — the employer must still see it.

**Test.** Local stack. Post a job as an employer and check My Jobs. Approve it as
an admin (admin console, or `POST /api/admin/posts/:jobId/approve`), then refresh.

---

### P-03 · Ask before Activate spends a credit

Group A · STATUS §4 bug 38

**Problem.** On My Jobs → **Expired**, the only button left is **Activate**.
Pressing it re-lists the job for 30 days and **spends 1 job post credit** — with
no warning and no confirm. With no credit left, the employer gets a raw error
toast. The employer also can no longer open an expired job or its applicants
from this tab.

**Cause.** Backend: activating a job whose 30-day window has passed costs 1 POST
credit (`job.service.ts`, around `:1798-1845`). Portal:
`src/app/employer/jobs/page.tsx:226-233` calls activate directly, and errors go
to a toast at `:90`. Commit `c69b504` removed View, Edit, Delete and Candidates
from the Expired tab; its comment calls that temporary.

**Backend contract (confirm first).**
- `POST /api/jobs/:id/activate`:
  - window still running → free;
  - window passed → spends 1 POST credit and starts a new 30-day window;
  - no credit → **402**, `code: INSUFFICIENT_POST_CREDITS`,
    `error: { kind: "POST", cost: 1, balance }`;
  - not approved → 400 (see P-02).
- An expired job cannot be edited until it is activated (400).
- Wallet balance: `GET /api/employers/me/credits`.

**Done when.**
- [ ] Activate on an expired job opens a confirm, e.g. *"Re-list this job for 30
      days? This uses 1 job post credit. You have 3 left."*
- [ ] Confirm → the job is live again and the balance drops by 1.
- [ ] No credit → the existing top-up flow opens
      (`src/components/employer/TopUpModal.tsx` or `OutOfCreditsUpsell.tsx`), not
      a raw toast.
- [ ] From the Expired tab the employer can again **view** the job and **see its
      applicants**. Edit stays hidden (the backend refuses it). Delete: check what
      the backend allows, and restore it if allowed.

**Watch out.** Copy: never say "Renew" or "reactivate for free". The copy audit
(`docs/i18n/COPY-DEFECTS.md`) flagged exactly that wording.

**Test.** Local stack. Make a job expired by setting its `liveUntil` in the past
in the local database. Try Activate with credits, then with 0 POST credits.

---

### P-04 · A job that is no longer live

Group A · STATUS §4 bug 45 · backend drift

**Problem.** A seeker opens a job from **My Applications** or **Saved Jobs**. If
that job has expired, been deactivated or been rejected, the page shows an error
instead of the job.

**Cause.** Backend: `GET /api/jobs/:id` now returns **404** for any job that is
not ACTIVE — except to the employer who owns it, and to admins. Related jobs and
recruiter contact are ACTIVE-only too. Portal:
`src/components/job/JobDetailsView.tsx:123` and `:139` treat any failure as an
error page. Entry points: `src/app/my-applications/[id]/page.tsx:275` and
`src/app/saved-jobs/page.tsx:124-130`.

**Done when.**
- [ ] A 404 shows a calm "This job is no longer available" screen, with a link
      back to where the seeker came from (the page already reads `?from=`).
- [ ] The application details page (`my-applications/[id]`) still works for such
      a job.
- [ ] Saved Jobs lets the seeker remove a job that is no longer available.
- [ ] Other errors (network, 500) still show the normal error screen.

**Watch out.** Only a **404** becomes "no longer available". Do not swallow
other errors.

**Test.** Local stack. As a seeker, apply to a job and save another. As the
employer, deactivate both. As the seeker, open each from My Applications and
Saved Jobs.

---

### P-05 · Fix the DEF-023 check in the retest script

Group A · STATUS §4 bug 42 · blocks QA's production retest

**Problem.** QA's production retest runs `scripts/smoke/retest-register.js`. Its
DEF-023 check finds My Jobs' **View** link with `a[href^="/job-details/"]`
(`:168`). Since `6262372`, View links to `/employer/jobs/<id>`. So the check
always reports "HUMAN – no job rows", and DEF-023 can never be judged by the
script.

**Done when.**
- [ ] The check finds `a[href^="/employer/jobs/"]` but **not**
      `/employer/jobs/new` — the Post a Job button. An earlier version clicked
      that by mistake and reported a false PASS (see the comment at `:164-166`).
- [ ] It passes only if the page lands on `/employer/jobs/<id>` and shows the job.
- [ ] It also checks that an employer who opens `/job-details/<id>` is forwarded
      to `/employer/jobs/<id>`.
- [ ] Run it on the local stack and paste the DEF-023 verdict in your report.

**Watch out.** Read `scripts/smoke/README.md` first. **Prove the check can
fail:** break the link on purpose, see FAIL, then restore it. A check that can
only pass proves nothing.

---

## B. Small, clear fixes

### P-06 · Password maximum: 64, not 128

Group B · STATUS §4 bug 29

**Problem.** The password checklist accepts up to 128 characters; the backend
accepts at most 64. Example: a 70-character password turns every checklist item
green, then sign-up fails with a 400.

**Cause.** `src/lib/validation/passwordPolicy.ts:23` sets
`PASSWORD_MAX_LENGTH = 128`. The comment above it (`:20`) says it matches the
backend. It does not: the backend moved to 64 on 2026-09-11
(`src/validators/password.ts:28`, commit `2cbbe64`).

**Done when.**
- [ ] The maximum is 64 on every password screen: register, employer register,
      reset, settings.
- [ ] The help text says "8–64" in all 10 languages. Today "8–128" is in
      `common.json` (`:7`, `:59`), `auth.json` (`:116`, `:213`) and
      `employerRegister.json` (`:57`) — check every locale.
- [ ] The comment is correct.
- [ ] The rule is written **once**. Today the character checks are written twice
      in the same file — in the schema (`:115-122`) and in `passwordRuleChecks`
      (`:142-148`) — so they can drift. Make the checklist reuse the schema's
      checks.

---

### P-07 · Check GST and registration numbers the way the backend does

Group B · STATUS §4 bug 46 · register DEF-018

**Problem.** An employer can type a GST number in any shape. Example:
`7576567FTYR6756` passes the form, then the server rejects it with a generic
message. A number another employer already holds is also shown as generic text.

**Cause.** The portal checks GST for length only, and the registration number
only for being non-empty: `src/app/employer/register/company-details/page.tsx:118`
and `:122`; `src/app/employer/profile/page.tsx:299`. Since 2026-09-10 the
backend checks the format and blocks duplicates.

**Backend contract (confirm first).**
- `gstNumber` — trimmed, upper-cased, must match
  `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$`. Valid example: `29ABCDE1234F1Z5`.
- `registrationNumber` — 5 to 50 characters.
- A number another employer holds → **409**
  `{ reason: "DUPLICATE_BUSINESS_IDENTIFIER", field, value }`, on
  `POST /api/employers/register/business` and `PUT /api/employers/profile`.
  Confirm `reason` reaches the client in the response.

**Done when.**
- [ ] Both forms upper-case and check GST and the registration number with the
      same rules, and show a clear, translated message with a valid example.
- [ ] A 409 says which field clashed: "This GST number is already registered" /
      "This registration number is already registered" (use `field`).
- [ ] Register row DEF-018: add a note that the portal side is done. It stays
      "awaiting retest".

**Watch out.** Do not change who sees these fields — that is decision P-21.

---

### P-08 · Application status chip: the right colour

Group B · STATUS §4 bug 34

**Problem.** On My Applications every status chip is green. A **rejected**
application looks like good news.

**Cause.** `src/components/job/ApplicationCard.tsx:103` hard-codes green (its
comment says this is deliberate, pending a label change). The application
details page does the same. `src/lib/applicationStatus.ts` (`statusMeta`)
already holds a colour per status.

**Done when.**
- [ ] The chip colour comes from `statusMeta`, on the card and the details page.
- [ ] Checked for each status: PENDING, SHORTLISTED, ACCEPTED, REJECTED, WITHDRAWN.

**Watch out.** The comment mentions a deferred "PENDING → Applied" label change.
Do not do that here; mention it in your report.

---

### P-09 · Job card: the real pay period and the right posted date

Group B · STATUS §4 bug 35

**Problem.** Job cards always say **"/ Month"**. An hourly job reads as monthly
on Home, Job Feed and Saved Jobs, but "Hourly" on its detail page. A re-listed
job shows two different "posted" times.

**Cause.** `src/components/job/JobFeedCard.tsx:115` hard-codes the period.
`:47` uses `createdAt`, while the detail page uses `postedAt ?? createdAt`
(`JobDetailsView.tsx`, around `:361`). Shared helpers live in `src/lib/jobFormat.ts`.

**Done when.**
- [ ] The card shows the same pay period as the detail page, from the job's pay type.
- [ ] The card's posted time uses `postedAt ?? createdAt`.
- [ ] One helper in `jobFormat.ts` serves both, so they cannot disagree again.

---

### P-10 · Employer job page: the error link goes to the right place

Group B · STATUS §4 bug 41

**Problem.** On `/employer/jobs/<id>`, if the job fails to load, the error
screen's link goes to `/job-feed` — a seeker-only page — so the employer is
bounced.

**Cause.** `src/components/job/JobDetailsView.tsx:242`. The component is shared
by the seeker and employer pages.

**Done when.**
- [ ] Employer → the link goes to `/employer/jobs`. Seeker → `/job-feed`, as today.

---

## C. Wrong data

### P-11 · Update the signed-in user after an email or phone change

Group C · STATUS §4 bug 31

**Problem.** A user changes their email on Profile. Until they log in again, the
app keeps using the **old** email. Example: change `a@x.com` to `b@x.com`:
- Settings still shows `a@x.com` (`src/components/settings/SettingsView.tsx:143`);
- checkout pre-fills `a@x.com` (`CheckoutModal.tsx:106`);
- a team invite sent to `b@x.com` is compared with `a@x.com` and refused
  (`src/app/invite/[token]/page.tsx:89`).

**Cause.** After the change, the profile pages refresh their own data
(`src/app/profile/page.tsx:289`, `src/app/employer/profile/page.tsx:231`) but not
the user held in `AuthContext` and stored in `localStorage` (`auth_user`).

**Done when.**
- [ ] After an email or phone change, the stored user has the new value, with no
      re-login.
- [ ] Settings, checkout and the invite page all show the new value.

**Watch out.** Look for an existing way to update the user in
`src/contexts/AuthContext.tsx` before adding one. `AuthContext` refreshes the
route cache on an **identity change** (the DEF-025 fix) and handles a logout
race (`d3f0d36`). Check what counts as an identity change there — an email
change must not log the user out or loop.

---

### P-12 · Ledger: the "To" date keeps the whole day

Group C · STATUS §4 bug 36

**Problem.** On `/employer/ledger`, filtering **To: 15 Sep** hides most of
15 Sep. Setting From and To to the same day shows almost nothing.

**Cause.** The page sends `to=2026-09-15`. The backend reads that as midnight
UTC — 05:30 in India — and keeps rows up to that moment
(`src/validators/credit.validator.ts:27`, `credit.service.ts` around `:657`).

**Done when.**
- [ ] "To 15 Sep" includes everything on 15 Sep, India time.
- [ ] From = To shows that whole day.
- [ ] "From" starts at the start of the day, India time.

**Steps.** Fix it in the portal: send full ISO timestamps — `from` = start of the
day in India, `to` = end of the day in India. Confirm the validator accepts them
(it uses `z.coerce.date()`).

**Watch out.** The route is **strict**: an unknown query parameter is a 400. It
also shares a 20-per-minute rate limit with candidate unlocks, so do not send a
request on every keystroke.

---

### P-13 · Ledger: members, translation, readable reasons

Group C · STATUS §4 bug 37

**Problem.** Three things:
1. Every employer sees **Ledger** in the account menu. A team member (not the
   owner) who clicks it lands on a lock screen.
2. The whole ledger page is **English in the other nine languages** — its 23
   `ledger.*` keys were copied in English.
3. The **Reason** column shows raw backend words, and **Description** is English
   text built by the server.

**Cause.**
1. `src/components/navigation/UserDropdown.tsx:240` only checks "is an employer".
2. `src/locales/<lang>/employer.json` → `ledger`.
3. `src/app/employer/ledger/page.tsx:44-50` and `:257-258`. Dates only handle
   Hindi vs English (`:35`).

**Backend contract (confirm first).**
- `GET /api/employers/me/credits` returns `role` and `seatStatus` for the
  signed-in seat (`credit.controller.ts:58-59`).
- The ledger route is owner-only: a member gets 403 `NOT_OWNER`.

**Done when.**
- [ ] The Ledger menu item shows only for the **OWNER** seat.
- [ ] All 23 keys are translated in nine languages, and `verify-locales` no
      longer warns that they match English.
- [ ] Reason values map to translated labels, with a readable fallback for an
      unknown value.
- [ ] Dates format in the chosen language, not only English and Hindi.

**Watch out.** Description is server-built English. Do not machine-translate free
text: either show it as is, or build the sentence on the client from `kind`,
`reason` and `ref`. Say which in your plan. Keep column names plain — TD-10 moved
the wallet away from accounting words, so prefer "Type", "Credits" and "By" over
"Kind", "Credit change" and "Actor".

---

### P-14 · Profile date of birth: check 18+ before saving

Group C · STATUS §4 bug 33 · register DEF-015 (note only)

**Problem.** A seeker can set a date of birth under 18 on Profile. The backend
refuses, and the seeker sees the backend's untranslated message.

**Cause.** Date of birth became editable in `5c9c947`
(`src/app/profile/page.tsx:626-633`) with no age check. Registration already has
`isAtLeast18` (`src/app/register/profile/page.tsx:22`).

**Done when.**
- [ ] `isAtLeast18` moves to one shared helper (for example `src/lib/dateInput.ts`),
      used by registration and the profile.
- [ ] The date input's `max` is the date 18 years ago.
- [ ] A clear, translated message.

---

### P-15 · Remove dead status values

Group C · STATUS §4 bug 47 · backend drift

**Problem.** The code still expects statuses the backend can no longer send. The
employer dashboard shows a **Reviewed** tile that is always 0.

**Cause.** Backend: jobs are now `ACTIVE | INACTIVE | CANCELLED`; applications
are `PENDING | SHORTLISTED | REJECTED | ACCEPTED | WITHDRAWN`. `REVIEWED`,
`BOOKMARKED`, `DRAFT`, `CLOSED` and `FILLED` are gone. The backend keeps
`reviewed` and `reviewedCount` at 0 for old clients.

Portal places: `src/app/employer/jobs/page.tsx:35` (`EXPIRED_STATUSES`) and
`:58`; `src/lib/applicationStatus.ts:25`, `:30`, `:55`; the dashboard's Reviewed
tile (`src/app/employer/page.tsx`); the candidate page's status checks.

**Done when.**
- [ ] No portal code refers to the removed values — search for each one.
- [ ] The Reviewed tile is gone, and `reviewedCount` is no longer read.
- [ ] Locale keys for the removed statuses are deleted in all 10 languages.

**Watch out.** Do P-01 first — it also touches `BOOKMARKED`. Do **not** ask the
backend to drop `reviewed`: the mobile app still reads it.

---

### P-16 · Show rejected job posts

Group C · found in the 2026-09-15 employer review

**Problem.** When an admin rejects a job post, it disappears from My Jobs. The
employer can only reach it from the notification bell.

**Cause.** My Jobs has two tabs, Active and Expired. The backend has a third
list — `GET /api/jobs/employer/me/jobs?tab=cancelled` — that the portal never
asks for. Also, `getMyJobs` (`src/lib/api.ts:1675-1676`) sends no `tab` at all;
the backend's default is now `active` (it used to return every job).

**Done when.**
- [ ] A **Rejected** tab lists rejected posts, with the admin's reason if the
      backend returns one.
- [ ] A rejected post can be viewed, but not edited or activated (the backend
      refuses both).
- [ ] `getMyJobs` passes `tab` explicitly.

**Watch out.** Confirm what the backend returns for a rejected job before
designing the row. Check the tab name with Nazir if unsure.

---

## D. Layout and regressions

### P-17 · Job feed: jobs on the first screen

Group D · teardown TD-15 (regressed)

**Problem.** On a phone, a seeker opening the job feed sees a title, a subtitle
and a long filter panel before any job. TD-15 fixed this on 2026-08-19; the
2026-09-01/02 redesign brought it back.

**Cause.** `src/app/job-feed/page.tsx:343-344` (title and subtitle). The filter
sidebar renders above the results on small screens and cannot be folded away
(around `:384-386`).

**Done when.**
- [ ] On a 390 × 840 screen, the top of the first job card is within **300 px**
      of the top of the page.
- [ ] On a phone, filters open from a button (a sheet or a collapsible panel).
      Desktop keeps the sidebar.
- [ ] Search stays visible.

**Watch out.** Check the Figma file (`fzkZeIzkrU7MRLwunuYbTf`) for a mobile frame
before inventing a layout. TD-15's original notes are in
`docs/teardown-fix-list.md` §4.

**Test.** Measure in a browser at 390 × 840 (Playwright or devtools) and paste
the number in your report.

---

### P-18 · Header: every page reachable on a phone

Group D · STATUS §4 bug 39

**Problem.** On a phone an employer has no way to open **Team**. **Plans** and
**Invoices** are reachable only through the credit wallet on the dashboard.

**Cause.** `src/components/employer/EmployerHeader.tsx:77` hides Team under
768 px, and `:73` hides Find workers under 640 px. The account menu
(`UserDropdown.tsx`) has Ledger, but not Team, Plans or Invoices.

**Done when.**
- [ ] At 390 px, an employer can reach: Dashboard, My Jobs, Post a Job,
      Candidates, Find workers, Team, Plans, Invoices, Ledger, Messages,
      Settings and Profile.
- [ ] Owner-only items follow the same rule as P-13.

**Watch out.** Do not crowd the header — the account menu is the natural home
for links that hide on small screens. TD-28 (one header on every employer page)
must stay true.

---

### P-19 · Job feed: role follows department

Group D · STATUS §4 bug 40

**Problem.** On the job feed a seeker can pick a department, then a role from a
**different** department, and get zero results with no hint why.

**Cause.** The 2026-09-02 redesign made department and role two independent
pickers (`src/app/job-feed/page.tsx`; the taxonomy lists are built around
`:192-193`). TD-22 had untangled the old cascade; the redesign removed it.

**Done when.**
- [ ] The role list shows only roles in the chosen department.
- [ ] Changing the department clears a role that no longer fits.
- [ ] With no department chosen, role either shows every role or is disabled —
      pick one and say which.
- [ ] One pass over the taxonomy builds the lists (today `:192-193` walks it twice).

**Watch out.** First check which taxonomy level "department" and "role" map to.
The taxonomy is Category → Sector → JobTitle, and one JobTitle can sit in many
sectors. Read TD-22 and "How job filtering actually works" in
`docs/teardown-fix-list.md`. `scripts/smoke/smoke-td22.js` covers the old
behaviour — update it.

---

### P-20 · Tap targets at least 44 px

Group D · teardown TD-20

**Problem.** Some new controls are too small to tap reliably on a phone.

**Cause.**
- Job-feed filter checkboxes are 16 px, in rows about 20 px tall
  (`src/app/job-feed/page.tsx:83-96`).
- Employer landing nav links are 11 px text with no minimum height
  (`src/app/employer/welcome/page.tsx:128-136`), and Sign In / Sign Up use
  `py-1.5 text-xs` (`:156`).
- TD-20 fixed this across the app on 2026-08-20 (`8630d7d`).

**Done when.**
- [ ] Each control's tap area is at least 44 × 44 px — the whole row can be the
      target.
- [ ] Checked at 390 px wide.

**Watch out.** The product owner agreed a **40 px exception** for the login and
employer buttons in the home page header (`a8eace8`). Do not undo that one.

---

## E. Decisions — do not start

### P-21 · ⛔ Decision: GST fields for Individual employers

**Do not start. Nazir decides first.**

**What happens today.** The redesigned employer profile (`f3be0ed`) shows GST
and registration number to **Individual** employers too, and saves them. The
backend demotes any ACTIVE employer to `PENDING_ADMIN_APPROVAL` when GST or
registration number changes, whatever the employer type
(`employer.controller.ts`, around `:216-221` and `:282-286`). Posting a job
needs ACTIVE.

Example: an Individual employer types a GST number, and cannot post a job until
an admin re-approves them. The page does warn first.

**Options.**
- **(a)** Hide the fields for Individual employers again — the old behaviour.
- **(b)** Keep them, and make the warning clearer.
- **(c)** Treat entering a GST number as "switch to Business" — bigger; needs
  backend and admin work.

**Once decided,** the work is in `src/app/employer/profile/page.tsx`
(`gstCinChanged`, around `:267-269`; the fields around `:516-553`).

---

### P-22 · ⛔ Decision: phone password reset

**Do not start. Blocked on the backend, and on Nazir.**

**What happens today.** `/forgot-password` accepts a phone number. The backend
creates a code but **never sends it by SMS** — no SMS code exists for phone
OTPs. In production the code only appears in the API response
(`EXPOSE_OTP_IN_RESPONSE`), and the portal correctly hides it in a production
build (`src/app/forgot-password/page.tsx:37`). So a phone-only user waits for an
SMS that never comes. The same gap is part of a security problem — STATUS §4 bug 3.

**Options for the portal until SMS exists.**
- **(a)** Keep phone reset, and add "Didn't get a code? Contact support" with the
  support contact.
- **(b)** Hide phone reset until SMS exists, and tell phone-only users how to get
  help.

The real fix is backend work: building SMS delivery for phone OTPs.

---

## F. Clean-up

### P-23 · Clean-up — only alongside a task that touches the file

Not separate work. When a task already touches one of these files, tidy it in
the same branch as a **separate** commit:

- `src/app/forgot-password/page.tsx` draws its own six OTP boxes (`:116-165`,
  `:347-374`). Use `src/components/auth/OtpInput.tsx`.
- `src/components/navigation/Breadcrumbs.tsx` — nothing imports it. Delete it.
- `src/app/employee/page.tsx:510-531` — a commented-out card that told seekers
  they pay (seekers are free). Delete it, and the `feature3*` keys in all 10 locales.
- `src/app/employer/welcome/page.tsx:11-14` — unused icon imports. Eight landing
  locale keys are unused since `51ec9a9` (`emailLabel`, `passwordLabel`,
  `forgotPassword`, `noAccount`, `signUpHere`, `nav.postJob`, …) — delete them in
  all 10 locales.
- Stale comments: `src/lib/api.ts:541` (date of birth is editable now) and
  `:851-853` (old password rule); `src/app/login/page.tsx:775-781` (reset is no
  longer email-only); `src/app/forgot-password/page.tsx:28-35`;
  `src/components/employer/EmployerHeader.tsx:95-96`;
  `src/components/job/JobDetailsView.tsx:117` (says DEF-028; it is TD-24).
- `src/components/home/Footer.tsx` — `sm:grid-cols-3` is overridden by `sm:flex`.
- `src/app/employer/candidates/page.tsx` — the height animation can get stuck,
  and it ignores reduced-motion (`:64`, `:78`).

---

## Appendix — writing this document for another app

Use this file as the model for the admin console, the mobile app and the backend.

**File name:** `docs/tasks/<app>-<yyyy-mm-dd>.md`, in that app's own repo.
**Task IDs:** portal `P-`, admin `A-`, mobile `M-`, backend `B-`.

**Where tasks come from.** Only from checked sources: the status doc's bug list,
the defect register, the teardown list, or a code review. Every task names its
source. Never invent work to fill a list.

**Order.** A — broken for users · B — small, clear fixes · C — wrong data ·
D — layout and regressions · E — decisions · F — clean-up.

**Every task has the same parts, in the same order:**

```markdown
### X-00 · <short title that starts with a verb>

Group · source (doc + row) · type (bug / regression / backend drift / decision)

**Problem.** What a user sees today, in one or two sentences, with a concrete example.

**Cause.** Why it happens, with file:line. Name the commit that caused it, if known.

**Backend contract (confirm first).** Method, path, request, response and error
codes — only what this task needs.

**Done when.**
- [ ] A check a person can see, or a script can prove.

**Steps.** A suggested path, numbered. Optional.

**Watch out.** Traps, related tasks, and what not to change.

**Test.** How to prove it: which stack, which account, which screen.
```

**Writing rules.**
- Simple English. Short sentences. One concrete example per problem.
- A file:line for every claim — and quote the code when the line may move.
- "Done when" must be checkable. Never "works well" or "looks good".
- A decision task says **Do not start** at the top, and lists the options.
- When a nearby decision is open, say what **not** to change.
- No time estimates. They go stale, and Claude does not need them.
- Shared rules go once, at the top ("Rules for every task") — not in every task.
- Keep the hand-out prompt at the top, so anyone can start a task by pasting it.
