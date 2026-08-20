// TD-12: the trust claim must be above the fold on both landing pages, in
// every language, and actually readable.
const { chromium, LAUNCH, FE, OUT } = require('./lib-smoke')

// One page + one language at a time; i18next persists the choice in localStorage.
const LANGS = ['en', 'hi', 'ta', 'bn']
const CLAIMS = {
  en: 'Job seekers are free, forever.',
  hi: 'नौकरी तलाशने वालों के लिए हमेशा मुफ़्त।',
  ta: 'வேலை தேடுபவர்களுக்கு எப்போதும் இலவசம்.',
  bn: 'চাকরিপ্রার্থীদের জন্য সবসময় ফ্রি।',
}

// WCAG relative-luminance contrast between two rgb() strings.
function contrast(fg, bg) {
  const parse = (s) => s.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number)
  const lum = (rgb) =>
    rgb
      .map((v) => v / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
      .reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0)
  const a = lum(parse(fg))
  const b = lum(parse(bg))
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

;(async () => {
  const browser = await chromium.launch(LAUNCH)

  for (const path of ['/', '/employee']) {
    for (const lang of LANGS) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 840 } })
      const page = await ctx.newPage()
      await page.goto(FE + '/', { waitUntil: 'domcontentloaded' })
      await page.evaluate((l) => localStorage.setItem('preferredLanguage', l), lang)
      await page.goto(FE + path, { waitUntil: 'networkidle' })
      await page.waitForTimeout(1500)

      const found = await page.evaluate((claim) => {
        // INNERMOST match only. A wrapper div has the same textContent as the
        // span inside it, and in document order the div comes first — matching
        // it measures the inherited body colour instead of the text's own.
        const matches = [...document.querySelectorAll('span,p,div')].filter(
          (e) => e.textContent.trim() === claim && e.getBoundingClientRect().height > 0,
        )
        const el = matches.find((e) => !matches.some((o) => o !== e && e.contains(o)))
        if (!el) return null
        const r = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        // Walk up for the first non-transparent background.
        let bg = 'rgb(255, 255, 255)'
        for (let n = el; n; n = n.parentElement) {
          const c = getComputedStyle(n).backgroundColor
          if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) { bg = c; break }
        }
        return { top: Math.round(r.top + window.scrollY), color: cs.color, bg }
      }, CLAIMS[lang])

      if (!found) {
        console.log(`  FAIL  ${path.padEnd(11)} ${lang}  claim not rendered`)
      } else {
        const ratio = contrast(found.color, found.bg)
        const aboveFold = found.top < 840
        const readable = ratio >= 4.5
        console.log(
          `  ${aboveFold && readable ? 'PASS' : 'FAIL'}  ${path.padEnd(11)} ${lang}  top=${String(found.top).padStart(4)}px  contrast=${ratio.toFixed(2)}:1`,
        )
      }
      if (lang === 'en') await page.screenshot({ path: `${OUT}/td12${path.replace(/\//g, '-') || '-home'}.png` })
      await ctx.close()
    }
  }

  await browser.close()
})().catch((e) => {
  console.error('SMOKE FAILED:', e)
  process.exit(1)
})
