# Wireframes / Screen Inventory — ProSiddhi
### A screen-by-screen spec for the designer to wireframe

> **What this is:** I can't draw wireframes (that's Fayaz's job) — so this is the **inventory + spec** he wireframes *from*: every screen, its purpose, key elements, and the states it needs (empty / loading / error). Grounded in the real app; **[VERIFY IN APP]** = confirm exact screen against the live product.
> **Rule for every screen:** design the **empty, loading, and error** states, not just the happy path.

---

## A. Job Seeker Screens (Portal + Mobile)

| Screen | Purpose | Key elements | States |
|---|---|---|---|
| Register / OTP | Sign up | Phone field, OTP entry, email/Google options | Loading, invalid OTP, resend |
| Login | Return | Phone/email/Google | Error, forgot password |
| Profile builder | Tell employers who you are | Name, location, categories/skills (icon-first) | Empty, incomplete-nudge |
| Job feed | Discover jobs | Search bar, filters, tabs: **Nearby / Category / Recommended** | Empty, loading skeletons |
| Job details | Evaluate a job | Role, employer, location, **Apply** button | Applied state |
| Apply | Apply in one tap | Confirm apply | Success, already-applied |
| My Applications | Track applications | List + status pills | Empty |
| Saved Jobs | Bookmarked jobs | List, unsave | Empty |
| My Interviews | Upcoming interviews | List, details | Empty |
| Chat | Talk to employers | Text thread (polling), read receipts | Empty, sending, failed |
| Report a Job | Flag a bad post | Reason picker, submit | Success |
| Notifications | Alerts | List (interviews, messages, jobs) | Empty |
| Settings / Language | Preferences | **EN / HI** switch, account | — |

---

## B. Employer Screens (Portal + Mobile *(partial)*)

| Screen | Purpose | Key elements | States |
|---|---|---|---|
| Register / verify | Sign up + approval | Individual vs business, docs upload | Pending-approval, rejected |
| Dashboard | Overview | Jobs, applicants, wallet summary | Empty |
| Post a Job | Publish a vacancy | **Taxonomy triple** (Category→Sector→Job Title), details | Zero-credit gate (upsell) |
| Manage Jobs | Job list | Status, edit/close/delete | Empty |
| Applicants | Review applicants | Profiles, accept/reject/shortlist | Empty |
| Candidate Search | Search DB | Filters, **snippet cards** (contact hidden) | Empty, loading |
| Candidate Profile | Evaluate + unlock | Snippet → **Unlock confirm ("Use 1 credit?")** | Locked, unlocked |
| My Unlocked Candidates | Unlock history | List (re-view free) | Empty |
| Chat | Message candidates | Text thread | — |
| Interviews | Schedule | Date/time, calendar (.ics) invite | — |
| Pricing / Plans | Buy credits | 8 plans, compare | — |
| Checkout | Pay | Razorpay flow | Success, failure |
| Wallet | Credits | Post/unlock balances, expiry nudge | Zero-credit |
| Invoices | Tax docs | GST invoice list + PDF | Empty |
| Team | Manage recruiters | Roster (ACTIVE/SUSPENDED), invites, roles | Owner vs member view |
| Invite Landing (`/invite/<token>`) | Accept an invite | Peek company, sign-in/register, auto-accept | Invalid/expired, email-mismatch |
| Profile / Settings | Company details | Edit, language | — |

---

## C. Admin Console Screens

| Screen | Purpose | Key elements |
|---|---|---|
| Login / guard | Secure access | Auth |
| Dashboard | Overview | **Real revenue + 12-month trend + pending verifications** |
| Job-Seeker Management | Manage seekers | List, actions |
| Employer Management | Manage/approve employers | Approval queue |
| Document Verification | Verify docs | Approve/reject |
| Post Moderation | Moderate jobs | Manual actions + **content scan** (offending text) |
| Skills Catalog | Skills CRUD | Add/edit/delete |
| Taxonomy Management | Category/Sector/Job Title | CRUD, link/unlink, soft-delete tree |
| Monetization | Billing views | Payments · GST invoices · credits & seats (read-only) |
| Reports Queue | Handle reports | Open/Resolved, resolve-with-note |

---

## D. Key Flows (design as end-to-end journeys)

1. **Seeker apply flow:** register → profile → search → job details → apply → track.
2. **Employer post flow:** register → approval → buy credits → post (taxonomy) → applicants.
3. **Unlock flow:** search → snippet → unlock confirm → full profile → chat.
4. **Team invite flow:** owner invites → email link → `/invite/<token>` → sign-in/register → auto-accept → shared wallet.
5. **Checkout flow:** pricing → plan → Razorpay → wallet updated → GST invoice.

---

## E. Shared Components
Nav/header (role-aware) · search bar · filter panel · **credit-wallet widget** · unlock-confirm dialog · chat thread · notifications dropdown · toast system · empty/loading/error states · **EN/HI language switch**.

---

## 🎨 Designer Notes for Fayaz
- **Use this as your screen checklist** — one wireframe per row in A/B/C. Don't miss the admin set.
- **Design 3 states for every screen:** empty, loading (skeletons), error. These are half the real work and usually forgotten.
- **Mobile-first for seeker screens; desktop-first for admin.** Employer works on both.
- **Bilingual layouts:** leave room for Hindi (usually longer/short-different than English); test both.
- **Signature interactions to wireframe carefully:** the **unlock-confirm dialog**, the **taxonomy triple picker**, the **team roster (ACTIVE vs SUSPENDED)**, and the **invite landing page**.
- **Low-literacy seeker screens:** icon-first, large tap targets, minimal text.
- **[VERIFY IN APP]:** cross-check screen names and flows against the live portal/admin before finalising — some labels may differ.
- **Deliverable back to us:** low-fi wireframes first (structure), then hi-fi once flows are approved.
