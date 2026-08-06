# Defect Report — Template & Standards
**How every defect is logged.** Consistency here is what makes the defect log triage-able and the metrics trustworthy. Log rows go in [defect-log.csv](defect-log.csv).

---

## Per-defect fields

| Field | Description |
|---|---|
| **Defect ID** | `DEF-###` (sequential) |
| **Title** | One-line summary: `[Surface] what is wrong` |
| **Surface / Module** | Web / Admin / Mobile / API / System · module (e.g. Employer › Billing) |
| **Linked Test Case** | The `WEB-…`/`ADM-…`/`MOB-…`/`API-…`/`E2E-…`/`SYS-…` ID that found it |
| **Severity** | S1–S4 (impact — see below) |
| **Priority** | P1–P3 (fix urgency — see below) |
| **Environment** | Build/version, surface URL, device/browser, backend mode |
| **Preconditions** | State/data required to hit it |
| **Steps to Reproduce** | Numbered, minimal, deterministic |
| **Expected Result** | What should happen |
| **Actual Result** | What happened (with the error/code/screenshot) |
| **Evidence** | Screenshot / video / response body / logs |
| **Reproducibility** | Always / Intermittent (X of Y) / Once |
| **Reported By / Date** | — |
| **Assigned To** | Dev owner (Asrar/Nazir) |
| **Status** | New → Open → In Progress → Fixed → Retest → Closed / Rejected / Deferred |
| **Root Cause / Fix** | Filled by dev |
| **Retest Result** | Pass / Fail (re-opens on Fail) |

## Severity (business/technical impact)

| Sev | Meaning | Examples |
|---|---|---|
| **S1 Blocker** | Core flow broken, data loss, money/security | Credit double-spent · IDOR exposes contact · payment double-grant · can't log in |
| **S2 Major** | Important function broken, no clean workaround | Unlock confirm missing · seat downgrade wrong · i18n reverts · admin approve half-flips |
| **S3 Minor** | Works but wrong/ugly; workaround exists | Salary not grouped · missing empty state · copy error |
| **S4 Trivial** | Cosmetic | Alignment, minor wording |

## Priority (fix urgency)

| Pri | Meaning |
|---|---|
| **P1** | Fix before go-live / next build |
| **P2** | Fix this release |
| **P3** | Backlog / nice-to-have |

> Severity ≠ Priority. A **S1** security IDOR is **P1**. A **S3** typo on the pricing page can be **P1** (customer-facing) while a S2 in an unused admin corner might be P2.

## Money / security defects — extra rule
Anything touching **credits, payments, unlock, seats, auth, or PII** is **S1/P1 by default** and needs a `/security-review` on the fix. Attach the exact request/response (with the error `code`).

## "Do NOT file" (by-design, from the suites)
Google OAuth not working · no real SMS/email/WhatsApp/push · Razorpay only in test mode · admin invoice-PDF disabled · admin desktop-only (no mobile bugs) · mobile FAQ/Help "Coming soon" · Pending/Violation moderation tabs lacking count badges. These are `Not-yet-built`/`by-design` in the case `Feature State` column.

## Defect lifecycle
`New → (triage) → Open → In Progress → Fixed → Retest → Closed`. A failed retest **re-opens**. Deferred needs Product sign-off.
