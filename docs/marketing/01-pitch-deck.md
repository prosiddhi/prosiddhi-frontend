# Azkashine Job Portal — Pitch Deck

**Format:** This document is structured as a slide-by-slide narrative. Each section between `---` separators is one slide. Designed to be converted to PowerPoint, Google Slides, Canva, or Marp/Reveal.js without rework.

**Author:** Nazir Hasan (PM)
**For:** Azkashine internal + investor / partner conversations
**Date:** 2026-05-11
**Brand owner:** Shaik Ishaq, Azkashine Software & Services Pvt. Ltd.

**Conversion tips:**
- For **PowerPoint / Google Slides:** copy each section into a slide; the headline becomes the title, bullets become the body
- For **Marp:** open this file directly — the `---` separators are already Marp-compatible
- For **Canva:** import as markdown via the Canva markdown import option, or copy section-by-section
- For **Pandoc → PPTX:** `pandoc 01-pitch-deck.md -o azkashine-deck.pptx --reference-doc=template.pptx`

---

## Slide 1 — Title

# **Azkashine Job Portal**

### *Your Next Opportunity Is Just a Click Away*

Connecting Potential Workers & Domain Specialists with Employers — in 10 Indian Languages.

> Coming June 15, 2026

`[ICON: Azkashine logo — apps/web/public/assets/logo.png]`

---

## Slide 2 — The Indian Workforce Today

**300 million+** workers in India outside agriculture work in blue-collar and domain-specialist roles.

**70%** of India's new jobs by 2030 will be in these segments. — *McKinsey & Co.*

**56%** of Indian employers plan to hire in the second half of FY26. — *2026 Job Market Trends*

Tier-3 and Tier-4 cities are hiring fastest — **12–15% year-on-year growth** — yet remain underserved by existing platforms.

> The opportunity is large. The current platforms aren't built for it.

---

## Slide 3 — Where Today's Platforms Fall Short

| Gap | What it means for workers |
|---|---|
| **English / Hindi only** | Workers from Tamil Nadu, Karnataka, Kerala, Odisha, West Bengal, Gujarat get a partial product or none |
| **Text-heavy applications** | Workers who think and speak fluently in their language struggle to compete on a typed resume |
| **SMS-only notifications** | Modern Indian workers live on WhatsApp; SMS gets lost in spam |
| **Aadhaar friction at signup** | Government-ID barriers turn workers away at the front door |
| **Per-post pricing for employers** | Casual / individual hirers pay premium prices designed for enterprises |

We saw these gaps and built around them.

---

## Slide 4 — Our Solution

**A job portal designed for India — not adapted to it.**

🌐 **10 Indian languages from day one** — English, Hindi, Tamil, Kannada, Malayalam, Marathi, Gujarati, Odia, Telugu, Bengali.

🎙️ **Voice-first applications** — workers apply with a 2-minute audio message describing themselves. Their voice tells employers what a typed paragraph can't.

📱 **WhatsApp-native communication** — all status updates, interview reminders, and recruiter messages reach workers where they already are. WhatsApp open rates are 80%+ vs ~30% for SMS.

📲 **Phone-only signup** — workers register in under 60 seconds with just a phone number. No government ID. No paperwork friction.

💼 **Verified employers** — corporate employers are reviewed by our admin team before going live; AI-assisted content moderation catches scam postings.

---

## Slide 5 — For Workers

**Find work in the language you speak. In under a minute.**

✓ Sign up with **just your phone number** (no government ID required)
✓ Browse jobs in your **10 language options**
✓ See **Recommended jobs** (based on your profile + location) and **Nearby jobs** (sorted by distance)
✓ Apply with **text OR a 2-minute voice message** — your voice does the talking
✓ **Chat directly with employers** — text or 60-second voice notes
✓ **Easy interview scheduling** with WhatsApp + SMS reminders 24 hours and 2 hours before
✓ Available on **Android, iPhone, and web** — same features everywhere

> Worker access is **free forever.** No premium tier in v1.

---

## Slide 6 — For Employers

**Reach verified workers across India. Pay only when you're ready.**

✓ **Two registration paths:** Individual (instant approval) and Corporate (we verify your business documents)
✓ **14-day free trial** — full features, no payment required
✓ **Unlimited job posts** during your subscription
✓ **Audio + text applications** — get a richer signal than text-only platforms
✓ **Smart candidate management** — Accept / Reject / Bookmark, with sorting by experience and location
✓ **Schedule interviews** in three modes: In-person / Phone / Video
✓ **WhatsApp candidate communication** — your messages get read, not lost in SMS spam
✓ Available on **web and mobile** — review candidates from anywhere

> **Provisional pricing:** ₹999 / month after the 14-day trial. *Final pricing pending Owner confirmation.*

---

## Slide 7 — Built on Trust

Trust is the difference between a job board and a job marketplace.

🔒 **Corporate employers verified** by Azkashine's admin team before going live (GST, CIN, business documents reviewed)

🤖 **AI-assisted content moderation** — OpenAI's free moderation engine (strong on Indian regional languages) plus our own India-specific scam pattern detection

🚩 **Job reporting** — workers can flag suspicious postings; admin reviews within 24 hours

🚫 **Active scam prevention** — we filter out classic patterns: "registration fees," MLM language, free-mail HR contacts impersonating real corporates, upfront-payment demands

📜 **Compliant by design** — DPDP Act 2023 aligned; RBI-compliant payment flows; manual renewal (no surprise auto-debits)

---

## Slide 8 — How It Works

```
👷 WORKER                                  🏢 EMPLOYER
   │                                          │
   ├── Signs up (phone OTP)                   ├── Registers (Individual or Corporate)
   │                                          │
   ├── Picks 1 of 10 languages                ├── Gets 14-day free trial
   │                                          │
   ├── Completes profile                      ├── Posts a job
   │                                          │
   ├── Browses "Recommended" + "Nearby"       │
   │                                          │
   ├── Applies with text OR voice ────────────┼──► Sees applicants
   │                                          │
   ├── Chats with employer ◄──────────────────┼──► Reviews + shortlists
   │                                          │
   ├── Schedules interview ◄──────────────────┼──► Schedules interview
   │                                          │
   └── Gets hired                             └── Hires
```

> Wages are settled directly between workers and employers. **Azkashine never touches the money.** Our revenue is subscriptions only.

---

## Slide 9 — Mobile + Web, Same Experience

📱 **Mobile App** (React Native — Android + iPhone)
- Worker app: full feature set, primary mode
- Employer app: register, post jobs, manage candidates, chat, schedule interviews — full parity with the web

🖥️ **Web App** (Next.js)
- Same features as mobile, mobile-friendly responsive design
- Admin dashboard is web-only (built for desk work, not the move)

🌐 **One backend, three apps** — Express + Prisma + PostgreSQL — workers, employers, and admins all on the same source of truth.

---

## Slide 10 — Notifications That Actually Reach

**Most platforms send SMS and hope.** We send WhatsApp first.

| Channel | When we use it | Why |
|---|---|---|
| **WhatsApp Business** | Application status updates, interview reminders, recruiter messages, payment confirmations | 80%+ open rate in India; workers reply right in the app |
| **In-app push** (FCM) | All notifications, real-time | Free; native experience |
| **SMS** | OTP, payment confirmation | DLT-compliant fallback when WhatsApp can't deliver |
| **Email** | Password reset, employer-approval outcomes | Only when WhatsApp isn't appropriate |

**Cost benefit:** WhatsApp templates are about 50% cheaper per message than DLT-registered SMS — and dramatically more engaging.

---

## Slide 11 — Simple, Honest Pricing

| | **Workers** | **Employers** |
|---|---|---|
| **Free tier** | Forever. Full access. | 14-day trial. Unlimited posts. |
| **Paid tier** | No paid tier in v1 | ₹999 / month *(provisional)* |
| **What's included** | All features | Unlimited posts, candidate management, audio applications, WhatsApp notifications, voice messages in native languages |
| **Renewal** | N/A | Manual — you renew when you want. No auto-debit surprises. |

> Pricing is under final review with the Owner. The recommended option is presented above; alternatives are available.

**What we will never charge for:**
- Per-application fees from workers
- Per-post fees from employers (subscription includes unlimited posts)
- Platform commissions on wages
- Workers will never pay to apply

---

## Slide 12 — Why Azkashine

**Built in India. For India. By people who understand the workforce we serve.**

1. **🇮🇳 Broadest language coverage** in the segment — 10 Indian languages from launch
2. **🎙️ Voice-first design** — recognizing that India hires in speech, not in writing
3. **💬 WhatsApp-native** — meeting workers where they already are
4. **🆓 Workers stay free** — we monetize the employer side, not the worker who needs the job
5. **🇮🇳 Local + compliant** — DPDP-aligned, RBI-aware, designed around how Indian SMBs actually hire
6. **📱 Mobile parity for employers** — review candidates on the go; not just at a desktop

> We're not a clone of Apna or Naukri. We're a focused alternative for workers and employers who got left out of those platforms.

---

## Slide 13 — Team

| Role | Person |
|---|---|
| **Owner & Sponsor** | **Shaik Ishaq** — Azkashine Software & Services Pvt. Ltd. |
| **Product Owner / Acting PM / Frontend** | Nazir Hasan |
| **Backend Engineering** | Asrar |
| **Mobile Engineering** | Dheeraj |
| **Quality Assurance** | Najeeb |
| **Infrastructure & Hosting** | Nayan |
| **Operations + WhatsApp Owner** | Shaik Ishaq |

A small, focused team. No bloat. Every member is delivery-critical.

---

## Slide 14 — Timeline

| Date | Milestone |
|---|---|
| **2026-05-11** | Sprint 1 starts (today) |
| **2026-05-12 to 24** | Sprint 1: Auth, subscription module, FE/BE reconciliation, mobile + admin app skeletons, WhatsApp + DLT infrastructure |
| **2026-05-25 to Jun 7** | Sprint 2: Core flows — apply with audio, candidate management, chat, content moderation, English + Hindi UI |
| **2026-06-08 to 14** | Sprint 3: Bug fixes, performance, security audit, seed data, staging deploy |
| **2026-06-14** | Code freeze |
| **2026-06-15** | **QA handover** |
| **2026-07-01** *(target)* | Public launch |

> **6-week build window. Hard deadline. We're on track.**

---

## Slide 15 — What's Next

We are currently:
- ✅ All planning artifacts complete (Charter, PRD, RTM, Sprint Plan, DoD, Test Plan, Security spec)
- 🔄 Engineering execution begins **today**
- 🤝 Open conversations with employers for early-access partnerships
- 📱 WhatsApp Business verification process active

**For partnership inquiries, early-employer access, or investor conversations:**

📧 [Contact email]
📞 [Contact phone]
🌐 [Website URL when live]

**Azkashine Software & Services Pvt. Ltd.**
*Your Next Opportunity Is Just a Click Away*

---

## Slide 16 (Optional — for investor decks) — The Ask

We are bootstrapping v1 to launch on **2026-06-15**.

Post-launch we will be looking for:
- **Strategic partnerships** with corporate hiring teams (15–25 employers signed on at launch is the goal)
- **Translation partnerships** to maintain the 10-language UI as the product evolves
- **Distribution partnerships** to reach workers in Tier-3 / Tier-4 cities

We are not yet raising institutional capital, but conversations welcome.

---

## Notes for the presenter

**Brand colours:**
- Primary blue: `#5cc2ed`
- Secondary teal: `#164e65`

**Hero illustration:** "Your Next Opportunity Is Just a Click Away" — already available in `apps/web/public/assets/`

**When presenting:**
- Slides 2–3 set the market context
- Slides 4–7 are the product pitch
- Slides 8–10 are the "how it works" detail
- Slides 11–12 cover differentiation and pricing
- Slides 13–15 are team, timeline, and CTA

**Slide-cut guidance for short pitches:**
- For a 5-min pitch: 1, 2, 4, 6, 11, 12, 15 (skip the deep-dive slides)
- For a 10-min pitch: 1, 2, 3, 4, 5, 6, 8, 11, 13, 14, 15
- For a 15-min pitch: use all slides

**To export this to PDF:**
```
python3 docs/_context/tools/md_to_pdf.py docs/marketing/01-pitch-deck.md docs/marketing/01-pitch-deck.pdf
```
