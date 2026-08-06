# ProSiddhi — Logo Asset Brief

**For:** the designer producing the ProSiddhi brand assets
**From:** ProSiddhi product team · **Date:** 6 August 2026
**Deliverable:** the file list in §7. Everything else here is the detail needed to produce it.

---

## 1. The one thing to fix first

The current artwork spells the name **"Prosiddhi"**.

The correct spelling is **ProSiddhi** — capital **P**, capital **S**, one word, no space.

> ✅ **ProSiddhi**  ❌ Prosiddhi  ❌ Pro Siddhi  ❌ ProSidhdhi

Please correct the wordmark before generating any files from it. This name goes into an app-store icon, browser tabs and tax invoices, where it is expensive to change later.

The tagline **"PROGRESS TOWARDS SUCCESS"** stays as-is.

---

## 2. What ProSiddhi is

A mobile-first job portal connecting blue-collar workers with employers in India. Three products share the brand:

- a **public web portal** (job seekers + employers)
- an **internal admin console**
- an **Android app**

Many users are low-literacy and on basic phones, so **the logo must stay readable when it is very small** — see §5.

*ProSiddhi is the product brand. Azkashine Software and Services Private Limited is the parent company — see §8.*

---

## 3. Two lockups required

### A — Horizontal *(primary, and currently missing)*

Icon on the **left**, "ProSiddhi" on the **right**. Tagline optional — include a version with and one without.

- **Aspect ratio: 3.6 : 1** (e.g. 720 × 200)
- This is the most-used asset. Every website header, app sidebar and sign-in screen uses this shape.

### B — Stacked *(this is the artwork already supplied)*

Icon above the wordmark, tagline beneath.

- **Aspect ratio: ~1.3 : 1**, roughly square
- Used for the phone app icon, the app's loading screen, and square placements.

### C — Icon only

The symbol alone, no text. Must work inside a **square**.

- Used for browser tab icons and small placements where the wordmark is unreadable.

---

## 4. Colour variants — needed for each lockup

| Variant | Used on | Note |
|---|---|---|
| **Full colour** | white and light backgrounds | The existing blue + orange |
| **Light / knockout** | **dark backgrounds** | Our website footer is dark charcoal **#232323** |

⚠️ **The light variant is not optional.** The file supplied has a solid white background, which shows as a **white rectangle** on the dark footer.

Please also confirm the exact brand colours as **hex values** (the blue, the lighter blue and the orange) so they can be matched in code.

---

## 5. Technical requirements — all files

1. **Transparent background.** No white box, no coloured card behind the artwork.
2. **SVG is the master format.** This logo is scaled from 28 pixels tall to 1024 pixels; only vector survives that. Supply PNG alongside it.
3. **Convert text to outlines** in the SVG, so the wordmark renders identically without the font installed.
4. **Clear space:** roughly 8% of the logo height as padding inside the artboard on all sides. No extra empty space beyond that — the artwork should fill its frame.
5. **Legible at 28 pixels tall.** That is the smallest place the horizontal lockup appears. Please check it at that size; if the tagline becomes mud, supply the no-tagline version as the default.
6. **No drop shadows or effects** that fail against arbitrary backgrounds.

---

## 6. Where each asset is used — exact display sizes

These are the real dimensions from the built products. Supply vector; these are for checking legibility, not for exporting at.

### Web portal (public site)

| Placement | Displayed size | Lockup | Variant |
|---|---|---|---|
| Site header | 142 × 39 px | A horizontal | Full colour |
| Employer screens (≈10 pages) | 142 × 39, scaling to 100 × 28 on mobile | A horizontal | Full colour |
| Sign-in / registration screens | 236 × 66 desktop · 140 × 40 mobile | A horizontal | Full colour |
| Page footer | 192 × 53 | A horizontal | **Light / knockout** on #232323 |
| Browser tab | 16–32 px square | C icon only | Full colour |

### Admin console (internal)

| Placement | Displayed size | Lockup | Variant |
|---|---|---|---|
| Sidebar | 142 × 39 px | A horizontal | Full colour |
| Login screen | 236 × 66 and 140 × 40 | A horizontal | Full colour |
| Browser tab | 16–32 px square | C icon only | Full colour |

### Android app

Currently ships with the default placeholder icon — **all of this is new.**

| Placement | Requirement |
|---|---|
| **App icon (store + home screen)** | **1024 × 1024 px PNG.** Square. **No transparency, no rounded corners** — the app stores add the corners themselves and reject files that pre-apply them. Lockup **B** or **C**; icon-only usually reads better at phone size |
| **Android adaptive icon** | **432 × 432 px transparent PNG**, with **all artwork inside the centred 264 × 264 px area**. Android crops the outside to a circle/squircle depending on the phone. Plus a background colour (hex) or a 432 × 432 background layer |
| **Loading / splash screen** | **1152 × 1152 px transparent PNG**, lockup **B**, artwork within the middle two-thirds |
| **In-app header** | Lockup **A** horizontal, SVG + PNG |

---

## 7. Deliverables checklist

**Minimum set — these five unblock everything:**

- [ ] **1.** Horizontal lockup — SVG, full colour, transparent
- [ ] **2.** Horizontal lockup — SVG, light/knockout, transparent
- [ ] **3.** Icon only — SVG, transparent, square
- [ ] **4.** App icon master — 1024 × 1024 PNG, **no transparency**
- [ ] **5.** Android adaptive foreground — 432 × 432 transparent PNG, safe zone respected

**Also needed:**

- [ ] **6.** Horizontal lockup — PNG, full colour, transparent, ~1440 × 400
- [ ] **7.** Horizontal lockup — PNG, light/knockout, transparent, ~1440 × 400
- [ ] **8.** Stacked lockup — SVG + PNG, full colour, transparent
- [ ] **9.** Splash artwork — 1152 × 1152 transparent PNG
- [ ] **10.** Brand colours as hex values (blue, light blue, orange) + the Android adaptive-icon background colour
- [ ] **11.** Editable source file (AI / Figma / SVG) for future edits

**Nice to have:**

- [ ] **12.** Horizontal lockup **without** the tagline, if the tagline is unreadable at 28 px
- [ ] **13.** Single-colour black and single-colour white versions (for print, faxed documents, watermarks)

---

## 8. Azkashine — yes, one small asset

Azkashine Software and Services Private Limited is the **parent company**. It is currently — incorrectly — being used as the product logo across the whole portal; that is what this brief replaces.

Azkashine still has one legitimate place: a **small parent-company attribution** in the website footer ("A company of Azkashine"), linking to the Azkashine website.

If we keep that attribution, please supply:

- [ ] **A1.** Azkashine horizontal mark — SVG, transparent, **light/knockout** variant *(the footer is dark #232323)*
- [ ] **A2.** Azkashine horizontal mark — SVG, transparent, full colour *(for any light-background use)*

It should be visibly **secondary** to ProSiddhi — smaller, quieter. ProSiddhi is the brand the user is dealing with; Azkashine is who they are legally contracting with.

*Not needed anywhere else. Tax invoices are currently text-only with no image, so no invoice artwork is required.*

---

## 9. Anything unclear

Ask before producing. The two most likely questions are answered above: **the name is ProSiddhi with a capital S**, and **the horizontal lockup is the one we are missing**.
