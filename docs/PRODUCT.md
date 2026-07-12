# ProSiddhi — The Product

**What we're building, who for, and the rules that are locked.** Updated **2026-07-12**.
For *build status* see [STATUS.md](STATUS.md). For *pricing/billing* see [MONETIZATION.md](MONETIZATION.md).

---

## 1. What it is

A **mobile-first, multilingual job portal connecting unskilled / blue-collar workers with employers in India.**

**Brand:** ProSiddhi (product) · Azkashine Software & Services Pvt Ltd (the company; invoices issue under its GSTIN).

**Three surfaces, one backend:**
- **Portal** (`prosiddhi-frontend`) — job seekers + employers, web.
- **Admin console** (`prosiddhi-admin`) — internal, web only.
- **Mobile app** (`prosiddhi-mobile-app`) — seeker + employer parity. *Not started.*

## 2. Who it's for

- **Job seeker** — an unskilled worker, often **low-literacy**, on a basic Android phone. This is the design constraint that drives everything: icon-first, large tap targets, voice affordances, minimal typing.
- **Employer** — either an **individual** (a household hiring a maid; auto-approved) or a **business** (a company; must be **admin-approved** before it can post).
- **Admin** — internal staff who verify users and documents, and moderate job posts.

## 3. The core loop

```
Seeker registers → completes profile → browses jobs (recommended / nearby / search / category)
                 → applies (optionally with a 2-min voice message) → chats → interviews
Employer registers → buys credits → posts a job → reviews applicants
                   → (or) searches the candidate database and pays to unlock a candidate
                   → accepts / rejects / schedules an interview → chats
```

**Revenue is employer-side only. Job seekers are free forever.** See [MONETIZATION.md](MONETIZATION.md).

## 4. Key product rules (locked)

**Identity & auth**
- **Phone OTP is the only registration identity.** Login also supports **email + password** and **Google OAuth** — same three options for seekers and employers.
- **No Aadhaar. Anywhere.** Not collected, not verified, not mocked. Permanently out of scope.

**Content & media**
- **Voice is a first-class feature:** a seeker may attach a **2-minute** audio message to an application; chat supports **60-second** audio messages.
- **Chat is polling-based.** (No WebSockets — that decision is final, not deferred.)
- Voice/TTS *playback* of the UI (the 🔊 icons) is **v2** — the icons exist but are intentionally inert.

**Jobs & taxonomy**
- Jobs are classified by a **3-level taxonomy: Category → Sector → Job Title**, validated as a triple. Job titles are marked `PORTABLE` (e.g. Helper — works across sectors) or `SECTOR_LOCKED` (e.g. Welder).
- A published job is live for **30 days**, independent of the employer's plan length.
- Employers **cannot** post until an admin approves them (business) or they verify their email (individual).

**Languages**
- **English + Hindi are complete.** Eight more Indian languages are planned (soft-launch, post-MVP).

**Moderation & trust**
- Job posts are moderated **reactively** — seekers report; admins warn, flag violations, deactivate or delete.
- AI content-scanning (OpenAI) is **specified but not built** — the admin's "Scan Content" button is honestly disabled.

## 5. Permanently OUT of scope

These are **gone** — not deferred, not "v2". Do not reintroduce them:
- **Aadhaar verification** of any kind.
- **Escrow / platform-handled payments** between worker and employer. We never touch wages; they settle directly. Revenue is subscription/credits only.
- **WebSockets** for chat (polling is final).
- **Voice message transcription.**
- **`.ics` calendar invites** for interviews.

## 6. Deferred to v2 / later

TTS voice playback · skill assessment tests · job ratings & reviews · the 8 additional languages · AI auto-moderation on every post · offline mode · multi-region infra.

## 7. The team

| Role | Person |
|---|---|
| Owner / Sponsor (product + pricing decisions) | **Shaik Ishaq** |
| Frontend + acting PM | **Nazir Hasan** |
| Backend | **Asrar** |
| Mobile | **unowned** — vacancy (biggest scope risk) |
| QA | **Najeeb** (lead) · **Farhana** |
| Infra | **Nayan** |

## 8. History (short)

The product was scoped as a ~5-week MVP with a June QA-handover target. That date passed; the build continued and **grew well beyond the original MVP** — the employer monetization system (credits, Razorpay, GST invoices, a paid candidate database, team seats) and the 3-level taxonomy were all designed and shipped after the original plan.

Pricing was originally a provisional flat ₹999/month. **That is superseded** — the confirmed model is the 8-plan credits system in [MONETIZATION.md](MONETIZATION.md).

*Superseded planning docs (charter, sprint plans, scope-lock, decisions log, execution playbook) were consolidated into this file, STATUS.md and MONETIZATION.md on 2026-07-12. They remain in git history.*
