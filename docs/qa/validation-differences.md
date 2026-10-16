# Validation differences — Phase 0 record (2026-10-16)

Facts only. Nothing here was changed; this records what the code does today.
Checked against the portal at `f8019fd` and the sibling `prosiddhi-backend` checkout at `f6012d0` (HEAD, no uncommitted changes under `src`; read from the working tree on 2026-10-16).
Golden tables: `node scripts/verify-validation.mjs` (rules below) and `node scripts/verify-email.mjs` (email).
Cases tagged `DIFFERENCE` or `QUIRK` in those scripts pin the items below.

## 1. GSTIN — two rules, one character apart

| | File | Pattern | Normalises first? |
|---|---|---|---|
| Registration + profile | `src/lib/businessIdentifiers.ts` (backend `validators/identifiers.ts`) | `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$` | Yes, in `isValidGstNumber` (trim + upper-case) |
| Checkout | `src/lib/gst.ts` `GSTIN_REGEX` (backend `utils/gst.ts`) | `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$` | No. `CheckoutModal` trims and upper-cases before testing; the backend `billing.validator.ts` does too |

The only structural difference is position 13 (the character after the PAN check letter):
`[0-9A-Z]` at registration, `[1-9A-Z]` at checkout. So `0` is accepted at registration and rejected at checkout.

| Input | Registration / profile | Checkout |
|---|---|---|
| `29ABCDE1234F1Z5` | accepted | accepted |
| `29ABCDE1234FAZ5` | accepted | accepted |
| `29ABCDE1234F0Z5` | **accepted** | **rejected** |

Consequence: an employer can register with a GSTIN ending `…F0Z5`, then be refused the same number at checkout.
This matches the backend (the two backend files disagree the same way), so it is a backend item, not a portal bug.
The two patterns were not merged. Everything else (state code not checked against the real list, checksum not verified, literal `Z` at 14) is the same in both.

## 2. Email — one portal rule, six backend behaviours

Portal (`src/lib/email.ts` `checkEmail`): trims, rejects empty, rejects over the max, runs zod `.email()`, returns the **lowercased** value. Default max 254.

Verified vs unverified:
- **Verified (run):** zod's `z.string().email()` rejects `' a@b.com'` (leading space) and accepts `A@B.com`. The route schemas in `auth.validator.ts`, `email-otp.validator.ts` and `team.validator.ts` are plain `z.string().email()` with no `.trim()`, so *if* the raw body reaches them, padded input fails there. The portal trims first, so it is more lenient for padded input.
- **Read in source, not exercised against a running backend:** `trim().toLowerCase()` in `auth.service.ts` (register, verify, resend), `email-otp.service.ts` and `team.service.ts`.
- **Not verified:** what the backend does with `companyEmail` after validation, and the change-email service path. The "as typed" cells below are inferred from the portal sending its own `.trim()`, not from backend code.

| Flow | Portal call | Portal max | Backend schema max | Backend stores |
|---|---|---|---|---|
| Seeker register (optional email) | `register/profile` | 254 | none | trimmed + lowercased (`auth.service`) |
| Employer register, account email | `employer/register/contacts` | 254 | none | trimmed + lowercased |
| Employer `companyEmail` (register) | `employer/register/company-details` | 254 | none | not verified (portal sends `.trim()` only) |
| Employer `companyEmail` (profile edit) | `employer/profile` | 254 | none | not verified |
| Email OTP / verify / resend | `EmailVerifyModal` | 254 | 254 | trimmed + lowercased (read in `email-otp.service.ts` / `auth.service.ts`) |
| Change email | `EmailVerifyModal` | 254 | 254 (`changeEmailSchema`) | not verified (service path not read) |
| Team invite | `employer/team` | 200 (local constant) | 200 | trimmed + lowercased (`team.service`) |
| Login identifier | `toIdentifier` | 254 | none (login), 254 (forgot-password) | trimmed + lowercased |

Notes:
- `checkEmail` always returns a lowercased value. For `companyEmail` the portal ignores that value and sends its own trimmed original, so the portal does not lowercase that field. Whether the backend does is not verified.
- The 254 cap is the portal's own on routes where the backend has none (register, `companyEmail`). An address of 255–N characters is blocked by the portal but would reach the backend schema.
- Admin routes (`admin-user`, `admin-add-user`) are outside the portal.

## 3. Other confirmed differences

1. **Phone.** Portal `toE164` is strict Indian mobile: `^(?:\+91|91|0)?([6-9]\d{9})$`, nothing trimmed. Backend `phoneRegex` is `^\+?[1-9]\d{1,14}$` (any country, 2–15 digits) and `normalizePhoneNumber` strips whitespace and accepts bare 10-digit or 12-digit-with-91. The portal is stricter; API callers can register numbers the portal would refuse. Phase 2 territory; no change made.
2. **Person name length.** Backend `personNameSchema` has a 100-character maximum. Portal `nameProblem` has no maximum (101 and 1000 characters both return `null`). Character rules are otherwise identical, including the allowlist.
3. **Password.** Same rule on both sides (8–64, lower, upper, digit, non-alphanumeric). Length is counted in UTF-16 units on both, so an emoji counts as 2.
4. **Registration number.** Same rule on both sides (trim, upper-case, 5–50 characters, no pattern). Length is measured after upper-casing, so `ß` counts as 2 (`SS`).

## 4. Quirks pinned as-is (not differences, not changed)

- `toMobileDigits('9198765432')` returns `9198765432`: ten digits starting `91` is read as a bare number, not a prefix.
- `toMobileInputDigits` keeps up to ten typed digits even when they can never be a mobile number (`1234567890`); `toE164` rejects it at submit.
- Password: an accented letter such as `é` counts as a special character, not as a lowercase letter.
- Name: newline is allowed (`\s`); one astral letter (`𠀀`) passes the 2-character minimum because length counts UTF-16 units.
- GSTIN normalisation: `ı` (dotless i) upper-cases to `I`, so `29abcde1234fız5` is accepted at registration.

## 5. Open decisions (need product / backend)

1. Which GSTIN position-13 rule is right? The official rule is **unverified**: it has not been checked in this phase and needs confirming against the authoritative GSTN specification. Until then neither pattern is treated as correct. Backend decision.
2. Should the portal phone rule stay India-only, or follow the backend's E.164? (Phase 2.)
3. Should the portal enforce the 100-character name maximum the backend already enforces?
4. Should the 254 cap apply on routes where the backend has none?
