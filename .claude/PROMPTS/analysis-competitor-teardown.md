# analysis: why our product feels like a cheap copy — competitor teardown

**Status:** ready to run · **Written:** 2026-08-18 · **Requested by:** Nazir
**Type:** ANALYSIS ONLY. Write no code. Change no files except the report.

---

## 1. The actual question

Nazir's words: *"When I look at the product we have built, it looks like a weak /
cheap knock off."*

He is not asking for a feature comparison table. He is asking **why it feels
that way**, and what to do about it. Treat that feeling as real data and go and
find its cause.

## 2. You now have a browser — use it

Chrome DevTools MCP is connected. **Do not write this report from search results
or from memory.** Open the products and use them. Reading *about* Apna is what
the last pass did; it is not enough.

### Competitors to actually open and use

| Product | Why it matters |
|---|---|
| **apna.co** | The market leader. ~60M users. Study its **sign-up** and how fast a seeker reaches a phone number. |
| **workindia.in** | Closest to us. Deliberately shows a seeker only **5–10 jobs** instead of a search feed — understand why. |
| **jobhai.com** | Naukri's blue-collar arm. Brand trust, filters. |
| **vahan.co** | Hires over WhatsApp, barely an app at all. |
| naukri.com / indeed.co.in | White-collar reference points only. Do not copy them — their user can read. |

For each, walk the **seeker** path and the **employer** path as far as you can
without paying. Count screens. Count taps. Count decisions forced on the user.
Screenshot the moments that matter.

### Our own product

Run it locally (`npm run dev` in `prosiddhi-frontend`) and walk the SAME journeys.
Accounts that work: `qa.seeker@prosiddhi.test / Seeker@12345` and
`qa.employer@prosiddhi.test / Employer@12345`.

⚠️ `.env.local` points at **`https://api.prosiddhi.com`** — the live production
database. Reading and logging in are safe. **Ask before anything that writes.**

## 3. Start from what is already known — do not rediscover it

These are established facts from reading the code this month. Use them; spend your
time on what is NOT yet known.

**Our flows ask too much.** `src/app/login/page.tsx:19` is literally
`type Tab = 'email' | 'phoneOtp' | 'phonePassword' | 'google'` — four login
methods, plus a seeker/employer toggle on the same screen. Eight combinations
before a low-literacy user can get in. Apna asks for a phone number. Seeker
registration is an eight-step flow.

**Features that exist but do nothing** (this is the likeliest source of the
"cheap" feeling — the parts are all there and several do not turn):
- **"Near By" returns every job.** Nothing in the product — not the job form, not
  the seeker profile, not mobile — ever captures a coordinate.
- The recommendation score has a **20-point location component that is always 0**,
  for every job, for every user. Same root cause.
- Mobile's **entire seeker filter panel is marked inert in the code** (`search_tab.dart:471`, pending PJP-155) while the UI still says "{count} filters applied".
- The distance filter offers 0–5, 10–25, 40+ km. **5–10 and 25–40 are unreachable.**
- The experience filter **overlaps at 6, 8 and 10 years and covers nothing at 3–4**.
- A **"Shortlisted" tab that nothing could fill** (fixed 18-Aug, but it shipped that way).
- Until 18-Aug the home search box **discarded the keyword you typed**.

**The money model may be backwards.** We charge per job post AND per contact
unlock. Apna posts free and charges a subscription for tooling. Our paywall sits
exactly between the two people who want to talk to each other — and ~60% of
Apna's hires happen within two days of the seeker calling the employer directly.

**We may have built for the wrong buyer.** Team seats, a credit ledger, GST
invoices, 8 plans, seat-suspension rules — enterprise machinery. WorkIndia says
**90% of its customers are SMEs**. Our real buyer may be a shop owner with one
vacancy.

## 4. What to judge

Not the feature list. These:

1. **Time to value.** How many screens/taps before a seeker sees a real job? Before an employer sees a real candidate? Count it for every product, ours included.
2. **How many decisions we force.** Every toggle, tab and picker is a decision. Our audience is low-literacy — count them and compare.
3. **Where the money gate sits**, in each product, relative to the moment of value.
4. **What we show that is not true** — inert filters, empty tabs, counts that lie.
5. **Density and reading load.** How much text must a person read to act? Compare screenshots honestly.
6. **The phone.** How fast does each product get two humans talking?
7. **Trust signals.** Verified badges, scam warnings, "no fees" promises. This market is full of fraud; what do they do that we do not?

## 5. Rules for the report

- **Be blunt.** Nazir asked for this. Do not soften it into a list of "opportunities".
- **Every claim gets evidence** — a screenshot, a file:line, a counted number of taps. No "feels cleaner".
- **Separate the three causes:** things that are broken, things that are missing, and things that are *built but wrong*. The third is the interesting one.
- **Some fixes will contradict locked decisions** — the monetization model especially (MONETIZATION.md, decision D2). **Flag them explicitly as "this contradicts X, it is Shaik's call."** Do not quietly recommend around a locked decision, and do not refuse to raise it either.
- **Say what is genuinely good too.** Ten languages and the billing engine are real work. An all-negative report is not an accurate one.
- **Prioritise the recommendations** — what would move the needle most for the least work, in order.

## 6. Output

One document: `docs/competitor-teardown.md`. Structure it as:

1. **The verdict** — why it feels cheap, in a paragraph.
2. **Journey comparison** — the counted numbers, ours vs theirs, with screenshots.
3. **What they do that we do not.**
4. **What we do that hurts us** (including the built-but-wrong list).
5. **What we do well.**
6. **Recommendations, ranked**, each marked: cheap / medium / expensive, and whether it contradicts a locked decision.

**Write no code. Change no other file.** If a fix is obvious, describe it; do not
build it.

## 7. Bootstrap prompt

```
Read .claude/PROMPTS/analysis-competitor-teardown.md and do it.

Short version: our product feels like a cheap knock-off and I want to know why.
Chrome is connected — go and USE apna.co, workindia.in, jobhai.com and vahan.co
yourself, then walk the same journeys in our app, and compare. Judge the flows and
the number of decisions we force on people, not the feature list. My own example:
our login has FOUR methods plus a role toggle — it is a pain.

Analysis only, no code. Be blunt. Every claim needs evidence.
Output: docs/competitor-teardown.md

Talk to me in very simple English, with examples.
```
