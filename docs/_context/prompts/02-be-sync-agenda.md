# Prompt 2 — Backend Sync Agenda for Asrar

Open a fresh Claude Code session in `/Users/nazirhasan/Documents/GitHub/Job_Portal/` and paste everything below the line.

---

```
Read these in order before anything else:
1. docs/_context/README.md
2. docs/_context/01-product-summary.md
3. docs/_context/02-scope-locked.md
4. docs/_context/03-codebase-audit.md
5. docs/technical/job-portal-research.md
6. docs/managerial/01-project-charter.md
7. docs/managerial/03-pricing-decision-memo.md (so you understand
   what's pending from Shaik on pricing)

Your single task: produce a focused sync document Nazir can send
to Asrar (the BE dev) to confirm scope, capacity, and resolve
the bugs/gaps the audit found, with the 2026-05-09 scope
revisions applied. Output is markdown — Nazir will paste it
into Slack, attach to email, or print for a meeting.

==== OUTPUT ====

CREATE docs/managerial/02-be-sync-agenda.md (~150 lines max,
overwrites the existing stale version).

Structure:

1. **Header** — Title "Backend Sync — Job Portal v1 Scope
   Confirmation"; From / To / Date (blank for Nazir); Goal.

2. **Context** — 1 paragraph. Charter is locked, audit done,
   research done, scope was MAJORLY REVISED on 2026-05-09.
   Point to docs/_context/02-scope-locked.md as canonical.
   Acknowledge upfront that Asrar has shipped substantial work.

3. **Headline 2026-05-09 changes affecting BE** — bulleted
   list. Asrar needs to know these BEFORE the rest:
   - Aadhaar code paths to be DELETED (Verhoeff validator,
     AadhaarVerification model, send/verify endpoints,
     aadhaarNumber field on User schema)
   - Auth flow rework: phone-first for BOTH seeker and
     employer (no Aadhaar). Email + Google OAuth as
     alternative login methods.
   - WhatsApp Business via MSG91 is now in v1 (was v2)
   - Application audio cap: 2 minutes (was 5 min)
   - Escrow / payment-intent code: do not build (Q12 out
     forever)
   - Pricing model still pending Shaik Ishaq's decision —
     subscription module schema can be built but specific
     tier names and prices are TBD until 2026-05-18

4. **Capacity confirmation (highest priority)** — table with
   Module / Estimate / Sprint / Notes. Updated estimates
   reflecting 2026-05-09 scope:
   - Subscription module (Razorpay + webhook + plan tiers
     + metering) — 5–7d — S1 (specific tier prices pending
     Shaik)
   - Auth flow rework (phone-first for seeker AND employer,
     drop Aadhaar entirely) — 3–4d — S1
   - Email + Google OAuth login — 2d — S1
   - Notification channels (FCM + MSG91 SMS + Sendgrid email
     + WhatsApp Business via MSG91) — 7–9d — S1/S2 (extra
     time for WhatsApp template integration)
   - Audio messaging (chat AUDIO + apply audio + storage
     abstraction; 2-min cap on apply, 60s on chat) — 3–5d — S2
   - Content moderation (`omni-moderation-latest` + scam
     regex) — 1–2d — S2
   - Recommendation tweaks (location 10→20, decay, recency,
     cold-start) — 1d — S2
   Total: ~22–30 dev-days across S1+S2 (~5 weeks).
   Direct question to Asrar: can you commit, and if not, what
   comes out or what's the resourcing gap?

5. **Bugs from audit — confirm or refute** — for each, file:line,
   2-line description, and three checkbox options:
   a. ApplicationStatus validator omits BOOKMARKED
      (validators/application.validator.ts ~line 4)
   b. "Cannot reject accepted" guard commented out
      (services/application.service.ts ~1070–1073)
   c. Math.random() in utils/crypto.ts for OTP — not
      cryptographically secure
   d. JWT_SECRET defaults to literal 'your-secret-key' in
      utils/jwt.ts if env unset
   e. OTP returned in API response body across phone/email
      OTP — confirm strategy: kept through QA, removed
      before prod cutover

6. **Auth flow rework specifics (2026-05-09 revised)** —
   confirm both seeker AND employer flow:
   Phone Number → Phone OTP → Profile (incl. email) →
   Categories (seeker) / Company Details (employer) →
   Experience / Documents → Password → email verification.
   Ask: backward-compat plan for already-registered users?
   Will the BE delete the Aadhaar* code paths or guard them
   off? Confirm Email + Google OAuth login wiring (passport-
   google-oauth20 or equivalent).

7. **WhatsApp Business integration (NEW in v1)** — confirm:
   - MSG91 as BSP (already in stack for SMS)
   - 8–12 templates to draft + submit for Meta approval
     (OTP, application accepted/rejected/shortlisted,
     interview scheduled / 24h reminder / 2h reminder,
     payment confirmation, document approved/rejected,
     employer-message-to-seeker, password reset)
   - Engineering integration ~5–7 dev-days once templates
     approved
   - Shaik Ishaq runs Meta verification process; Asrar
     coordinates on technical artefacts (template content,
     webhook URLs)

8. **Decision log + tagging convention** — audit found inline
   Q## / NC-## / T## tags across BE source. Where does the
   master log live? Can FE/Mobile get write access? Confirm
   FE/Mobile will use Q-FE-NN / Q-MOB-NN prefixes.

9. **In-flight work + branch state** — anything on
   prabhazkashine/asrar-dev not yet merged? Anything in flight
   that conflicts with locked scope (especially Aadhaar code
   that needs deletion)? Cleanup plan before May 11?

10. **External dependencies** — table:
    - MSG91 SMS DLT registration — initiate May 11; 2–3 weeks
    - MSG91 WhatsApp BSP onboarding — Shaik owns; 1–3 weeks
    - Meta Business verification — Shaik owns
    - Razorpay merchant KYC — Nazir initiates May 11
    - Sendgrid (or alt email sender) — Asrar to recommend
    - OpenAI API key — Nazir / Asrar
    - FCM project (Firebase) — joint

11. **API documentation gap** — audit found ~115 endpoints
    exist, ~68 documented. Plan to close in S1?
    [ ] Manually update API_DOCUMENTATION.md
    [ ] Auto-generate OpenAPI from existing Zod validators
    [ ] Other: _____

12. **Scope confirmations (one line each, 2026-05-09 revised)**:
    [ ] OpenAI omni-moderation-latest as Scan Content engine
    [ ] Local disk for audio v1 with S3 abstraction
    [ ] Polling-based chat (no websockets, ever)
    [ ] Manual subscription renewal (no auto-debit, no
        e-mandate)
    [ ] Phone-OTP-only registration (no Aadhaar of any kind)
    [ ] Email + Google OAuth login (alternative auth methods)
    [ ] WhatsApp Business via MSG91 (8–12 templates pending)
    [ ] Mobile employer parity (full mobile app for both
        seeker and employer, Dheeraj owns)
    [ ] Recommendation tweaks per Q9
    [ ] No escrow / no payment-intent / no commission code
        (out forever)

13. **Next steps & deadlines** — Asrar's written response by
    target date; standups start May 11; scope changes go
    through 02-scope-locked.md not chat.

14. **Sign-off block** — Asrar signs to confirm:
    [ ] I can deliver in S1+S2 / [ ] I cannot, here's what
        changes
    [ ] Bugs above addressed (see notes per item)
    [ ] External dependencies on track
    Signature: ____  Date: ____

==== TONE ====

Polite but direct. Engineering-to-engineering. No corporate
filler. Time-boxed (response within 2 days). Acknowledge upfront
that Asrar has shipped substantial work already — the audit was
about understanding state, not critiquing. Easy to skim:
tables, checkboxes, clear questions.

==== CONSTRAINTS ====

- Do NOT modify any other doc.
- Do NOT generate the PRD or any other artifact this session.
- ~150 lines max. Compress prose, keep tables and checkboxes.
- Use Opus 4.7 1M context model.
- After saving, report a 3-line chat summary: file path, what
  needs Asrar's answer first, suggested deadline.

Today's date is 2026-05-09 (or later — use real date). The
user is Nazir Hasan. The Owner whose approval is needed for
big decisions is Shaik Ishaq.
```

---

## Companion files to send Asrar with the agenda

When forwarding the agenda to Asrar, **also share these so he has full context**:

| File | Why |
|---|---|
| `docs/_context/02-scope-locked.md` | Canonical scope (revised 2026-05-09); he should read this first |
| `docs/_context/03-codebase-audit.md` | The audit that surfaced his work + gaps; transparency about what we read |
| `docs/managerial/01-project-charter.md` | Stakeholder-level commitment he's signing up to deliver |
| `docs/managerial/03-pricing-decision-memo.md` | Context on what's still pending from Shaik (so he understands the subscription module's TBD bits) |

Tell him: *"Read 02-scope-locked.md first; the agenda is the write-up. Reply inline with checkboxes filled."*
