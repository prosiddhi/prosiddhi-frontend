/**
 * Fonts — Latin + every Indic script the product ships in.
 *
 * DM Sans is the brand face but it only carries **Latin** glyphs. Until this file
 * existed, every non-English string rendered through whatever the operating system
 * happened to have installed. Hindi survives that on most devices; Odia, Malayalam
 * and Telugu frequently do not, and a missing glyph renders as a tofu box (□□□) —
 * which on a job board for low-literacy users is indistinguishable from the app
 * being broken.
 *
 * These Noto faces are appended to the Tailwind `font-sans` stack (tailwind.config.js),
 * AFTER DM Sans. Font matching is per-character: Latin text still renders in DM Sans,
 * and only characters DM Sans lacks fall through to the matching Noto face.
 *
 * Cost: the browser downloads a face only when a character actually needs it, so a
 * Hindi user fetches Devanagari alone — not all eight. That laziness is the whole
 * reason this is a stack rather than a per-locale switch.
 *
 * Weights are limited to 400/700 for the Indic faces (DM Sans keeps its full range);
 * intermediate weights synthesise acceptably and each extra weight is a real download
 * on a 2G connection.
 */
import {
  DM_Sans,
  Noto_Sans_Bengali,
  Noto_Sans_Devanagari,
  Noto_Sans_Gujarati,
  Noto_Sans_Kannada,
  Noto_Sans_Malayalam,
  Noto_Sans_Oriya,
  Noto_Sans_Tamil,
  Noto_Sans_Telugu,
} from 'next/font/google'

export const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
  display: 'swap',
})

/** Devanagari covers BOTH Hindi (hi) and Marathi (mr). */
const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  weight: ['400', '700'],
  variable: '--font-noto-devanagari',
  display: 'swap',
})

const notoTamil = Noto_Sans_Tamil({
  subsets: ['tamil'],
  weight: ['400', '700'],
  variable: '--font-noto-tamil',
  display: 'swap',
})

const notoKannada = Noto_Sans_Kannada({
  subsets: ['kannada'],
  weight: ['400', '700'],
  variable: '--font-noto-kannada',
  display: 'swap',
})

const notoMalayalam = Noto_Sans_Malayalam({
  subsets: ['malayalam'],
  weight: ['400', '700'],
  variable: '--font-noto-malayalam',
  display: 'swap',
})

const notoGujarati = Noto_Sans_Gujarati({
  subsets: ['gujarati'],
  weight: ['400', '700'],
  variable: '--font-noto-gujarati',
  display: 'swap',
})

/** Google's family for the Odia script is still named "Oriya". */
const notoOdia = Noto_Sans_Oriya({
  subsets: ['oriya'],
  weight: ['400', '700'],
  variable: '--font-noto-odia',
  display: 'swap',
})

const notoTelugu = Noto_Sans_Telugu({
  subsets: ['telugu'],
  weight: ['400', '700'],
  variable: '--font-noto-telugu',
  display: 'swap',
})

const notoBengali = Noto_Sans_Bengali({
  subsets: ['bengali'],
  weight: ['400', '700'],
  variable: '--font-noto-bengali',
  display: 'swap',
})

/**
 * Every font variable, for the <html> className. The variables must all be in scope
 * for the Tailwind `font-sans` stack to resolve them.
 */
export const fontVariables = [
  dmSans.variable,
  notoDevanagari.variable,
  notoTamil.variable,
  notoKannada.variable,
  notoMalayalam.variable,
  notoGujarati.variable,
  notoOdia.variable,
  notoTelugu.variable,
  notoBengali.variable,
].join(' ')
