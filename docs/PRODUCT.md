# ProSiddhi — The Product

**What we're building, who for, and the rules that are locked.** Updated **2026-08-06**.
For *build status* see [STATUS.md](STATUS.md). For *pricing/billing* see [MONETIZATION.md](MONETIZATION.md).

---

## 1. What it is

A **mobile-first, multilingual job portal connecting unskilled / blue-collar workers with employers in India.**

**Brand:** ProSiddhi (product) · **AZKASHINE SOFTWARE AND SERVICES PRIVATE LIMITED** (the legal entity; invoices issue under its GSTIN). ⚠️ `src/lib/legal.ts` still carries the wrong form ("Azkashine Software & Services Pvt. Ltd.") and an **empty GSTIN and registered office** — all three must be corrected before invoices go live.

**Three surfaces, one backend:**
- **Portal** (`prosiddhi-frontend`) — job seekers + employers, web.
- **Admin console** (`prosiddhi-admin`) — internal, web only.
- **Mobile app** (`prosiddhi-mobile-app`) — seeker + employer parity. **Flutter, ~85% built.** Missing the checkout and invoices; **never run on a device.**

## 2. Who it's for

- **Job seeker** — an unskilled worker, often **low-literacy**, on a basic Android phone. This is the design constraint that drives everything: icon-first, large tap targets, voice affordances, minimal typing.
- **Employer** — either an **individual** (a household hiring a maid; auto-approved) or a **business** (a company; must be **admin-approved** before it can post).
- **Admin** — internal staff who verify users and documents, and moderate job posts.

## 3. The core loop

```
Seeker registers → completes profile → browses jobs (recommended / nearby / search / category)
                 → applies → chats → interviews
Employer registers → buys credits → posts a job → reviews applicants
                   → (or) searches the candidate database and pays to unlock a candidate
                   → accepts / rejects / schedules an interview → chats
```

**Revenue is employer-side only. Job seekers are free forever.** See [MONETIZATION.md](MONETIZATION.md).

## 4. Key product rules (locked)

**Identity & auth**
- **Phone is the primary identity, and a verified phone is mandatory for every role.** *(Rebuilt 2026-08-03; see STATUS.md §3 item 3a.)*
  - **A job seeker may register with a phone alone — email is OPTIONAL for them.** This is deliberate: the seeker is often an unskilled, low-literacy worker with no email address (§2). They can add one later. Do not reintroduce a required-email check on the seeker flow.
  - **Both employer types must supply and verify an email.** Enforced in the UI *and* by the backend.
  - Both contacts are verified **before** the account exists, and the password arrives with it. There is no "set your password afterwards" step — that route was unauthenticated and is deleted.
- **Login:** email + password · phone + OTP · **phone + password** · Google OAuth. The third is the only password login a phone-only seeker has.
- **Minimum age 18.** Enforced on date of birth at registration, on the server *and* in the UI. A blue-collar job board in India cannot be casual about this.
- **No Aadhaar. Anywhere.** Not collected, not verified, not mocked. Permanently out of scope.

**Content & media**
- ⛔ **AUDIO IS REMOVED FROM THE PRODUCT** *(decided 2026-07-12)* — **no audio anywhere**: no voice message on a job application, no audio in chat. Not hidden, not feature-flagged — **removed**.
  - *This reverses the original plan* (2-min application audio + 60-sec chat audio, once a headline feature). The **portal had it built and working**; that UI is being **deleted**. **Mobile must not build it** (its audio UI is inert and is being removed). The **backend's audio accept-paths are being removed** too — the DB columns may remain (dropping them is a destructive migration with no benefit).
  - Do **not** reintroduce audio without an explicit product-owner decision.
- **Chat is polling-based and text-only.** (No WebSockets — that decision is final, not deferred.)
- Voice/TTS *playback* of the UI (the 🔊 icons) is **v2** — the icons exist but are intentionally inert.

**Jobs & taxonomy**
- Jobs are classified by a **3-level taxonomy: Category → Sector → Job Title**, validated as a triple. Job titles are marked `PORTABLE` (e.g. Helper — works across sectors) or `SECTOR_LOCKED` (e.g. Welder).
- A published job is live for **30 days**, independent of the employer's plan length.
- Employers **cannot** post until an admin approves them (business). An individual employer is ACTIVE at registration and receives the 14-day trial there.

**Languages**
- **All 10 ship: English · हिन्दी · தமிழ் · ಕನ್ನಡ · മലയാളം · मराठी · ગુજરાતી · ଓଡ଼ିଆ · తెలుగు · বাংলা**
  *(translated 2026-08-17; the list is locked — Odia is in, Punjabi is not).*
  The canonical list with native-script display names is `src/lib/jobCategories.ts`; what the UI is
  actually translated into is `src/i18n/languages.ts`. Keep the two in step.
- English and Hindi are **native-reviewed**. The other eight are **machine-translated and
  structurally validated, not yet read by a native speaker** — `scripts/verify-locales.mjs` proves
  key parity, placeholder integrity and correct script, which is not the same as proving the words
  are right. See `docs/i18n/GLOSSARY.md` for the per-language termbases and open review items.
- ⚠️ **Backend dependency:** `PATCH /api/me/language` still allow-lists only `en|hi`
  (`prosiddhi-backend/src/validators/me.validator.ts`). Until that enum is widened, a user on any
  other language keeps an English `preferredLanguage` server-side — so their **notifications stay
  English** even though the UI is not.

**Moderation & trust**
- Job posts are moderated **reactively** — seekers report; admins warn, flag violations, deactivate or delete.
- AI content-scanning **is built and live** in the admin console. It works **without** an OpenAI key, because the India scam-regex layer needs none; with no key the response says so explicitly, so a clean result is never mistaken for "OpenAI reviewed this".

## 5. Permanently OUT of scope

These are **gone** — not deferred, not "v2". Do not reintroduce them:
- **Aadhaar verification** of any kind.
- **Escrow / platform-handled payments** between worker and employer. We never touch wages; they settle directly. Revenue is subscription/credits only.
- **WebSockets** for chat (polling is final).
- **Voice message transcription.**
- ~~**`.ics` calendar invites** for interviews.~~ → **REVERSED 2026-07-16** (Nazir, PO): `.ics` interview invites are back **in scope**, attached to the interview email. This one use only — nothing else in this list is reopened. See `notifications`/email integration.

## 6. Deferred to v2 / later

TTS voice playback · skill assessment tests · job ratings & reviews · AI auto-moderation on every post · offline mode · multi-region infra.

*(The 8 additional languages left this list on 2026-08-17 — they are built and shipping.)*

## 7. The team

| Role | Person |
|---|---|
| Owner / Sponsor (product + pricing decisions) | **Shaik Ishaq** |
| Frontend + acting PM | **Nazir Hasan** |
| Backend | **Asrar** |
| Mobile | **Sailaja** *(since July 2026)* |
| QA | **Najeeb** (lead) · **Farhana** |
| Infra | **Nayan** |

## 8. History (short)

The product was scoped as a ~5-week MVP with a June QA-handover target. That date passed; the build continued and **grew well beyond the original MVP** — the employer monetization system (credits, Razorpay, GST invoices, a paid candidate database, team seats) and the 3-level taxonomy were all designed and shipped after the original plan.

Pricing was originally a provisional flat ₹999/month. **That is superseded** — the confirmed model is the 8-plan credits system in [MONETIZATION.md](MONETIZATION.md).

*Superseded planning docs (charter, sprint plans, scope-lock, decisions log, execution playbook) were consolidated into this file, STATUS.md and MONETIZATION.md on 2026-07-12. They remain in git history.*
