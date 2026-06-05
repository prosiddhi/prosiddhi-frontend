# Standup Template — Job Portal v1

**Facilitator:** Nazir Hasan (Acting PM)
**Applies to:** Sprints 1–3 (May 18 – Jun 19, 2026)
**Post by:** 10:30 IST daily

---

## 1. Format

Daily **async standup** on the team's chosen channel (Slack or WhatsApp — pick one, stick to it). Async because Nazir, Asrar, and the mobile dev may be in different cities; a fixed video call adds friction and burns calendar time the timeline can't afford. Nazir is the standup facilitator: chases missing posts, summarises blockers, escalates when they stall.

**Required posters:** Nazir, Asrar, Mobile dev (TBD — Dheeraj off project 2026-05-15; new hire pending) daily. Najeeb (QA Lead) + Farhana (QA junior, Mohamad.farhana@azkashine.com) join from Sprint 2 onwards to absorb context. Shaik is on the channel but not required to post.

## 2. Three-question template (paste-able)

```
*Standup — [Name] — [YYYY-MM-DD]*
*Yesterday:* (1–3 lines — what shipped or progressed)
*Today:* (1–3 lines — top priority today)
*Blockers:* (or "None") — be specific about who you need
*Sprint backlog status:* (link to sprint board row, or ticket IDs touched)
```

Keep it boring. Same shape every day. Don't editorialise.

## 3. Blocker escalation

If a blocker isn't resolved within **4 hours of posting**, Nazir tags the right person:

- **Business / scope / pricing** → Shaik Ishaq (Owner & Sponsor)
- **Backend / API / data model** → Asrar
- **Mobile / RN / Expo** → Mobile dev (TBD)
- **Infrastructure / deploy / staging** → Nayan
- **QA / test pack** (from Sprint 2 onwards) → Najeeb / Farhana

If still unresolved by end of day, the blocker is reposted the next morning **with yesterday's status appended** — not as a fresh complaint. A blocker that repeats three days in a row gets a side-thread review with Shaik.

## 4. Friday demo + retro

Friday's standup is a **demo**. Each developer shares **one thing they shipped that week** (5 min each — recorded video or live screenshare). After the demo:

- **10-minute async retro** in a separate thread: one thing that went well, one thing to change next week.
- Nazir summarises the retro into `04-project-status.md` session log by Monday morning.

## 5. What NOT to do in standup

- **Don't diagnose problems in the thread.** "Asrar, why is auth broken?" → take it to a side-thread with both people.
- **Don't pass blame.** State what happened and what's needed — not whose fault it was.
- **Don't repeat yesterday's blocker without status.** If it's still blocked, say _why_ — not just "still waiting."
- **Don't skip without notice.** If you're out, post one line: "Out today — back tomorrow, ping me only if P0."
- **Don't write essays.** Three lines per question. If you need more, that's a side-thread.
