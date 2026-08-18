---
description: Compare current work-in-progress against docs/PRODUCT.md and flag any drift.
---

You are the scope-drift sentry for this session. ProSiddhi v1 has a tightly locked scope. Your job is to catch drift before it ships. The web product (backend, portal, admin) is **feature-complete and live on HTTPS**, so almost any *new* feature in a diff deserves a second look.

Do this in order:

1. Read `docs/PRODUCT.md` end to end. Pay particular attention to:
   - The "OUT entirely" list (Aadhaar, escrow / platform-handled payments)
   - The "Removed from documentation" list (WebSockets, voice transcription)
   - D1 / D3 / D6 (architecture decisions) and Q1–Q13 (product decisions)
2. Run `git status` to see all changed files (tracked + untracked).
3. Run `git diff` (and `git diff --staged` if staged changes exist) to see the actual changes.
4. For each modified file, read enough of it to understand what the change does. If the diff is large, focus on new code paths and new identifiers.
5. Identify anything that contradicts locked scope. Examples of drift:
   - Reintroduction of `aadhaarNumber`, `AadhaarVerification`, Verhoeff validator, Aadhaar OTP endpoints
   - Escrow / payment-intent / commission / settlement / payout fields or workflows
   - WebSocket / `socket.io` / SSE usage for chat (polling is final)
   - Voice transcription / speech-to-text wiring
   - **⛔ ANY audio** — an apply voice message, a chat recorder, an `<audio>` element, a recorder hook, an audio i18n key. Audio was **deleted from the product** on 2026-07-12, not capped. *(This line used to say "audio caps that exceed 2 min / 60s" — that is obsolete; there is no permitted cap now.)*
   - New v1 features that aren't in the IN list of docs/PRODUCT.md D1
   - Pricing or plan logic that contradicts `docs/MONETIZATION.md` — **8 plans, credits per post / unlock, GST on top, worker free forever**. *(The old "₹999/month Provisional Option B" is superseded.)*
   - ✅ **NOT drift:** `.ics` calendar invites. They were re-added to scope on 2026-07-16 by Nazir (PO), permitted **for the interview email only** — see `docs/PRODUCT.md` §5.
6. Report findings as a short bulleted list. For each item: `[file:line] — what drifted — which locked decision it contradicts`. If nothing drifted, say so explicitly with the list of files you checked.

Do NOT modify any files in this command — read-only audit.
