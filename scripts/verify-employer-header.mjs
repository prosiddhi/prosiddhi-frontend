#!/usr/bin/env node
/**
 * Employer header responsiveness — the mechanical gate for EmployerHeader and the shared
 * HeaderActions / NotificationBell / UserDropdown it uses.
 *
 *   node scripts/verify-employer-header.mjs
 *
 * WIRING checks on the component sources (no new dependencies, same approach as
 * verify-seeker-nav.mjs). They prove the responsive classes are present and that the seeker
 * header did not change. They read text: they do NOT prove how a browser lays the header out.
 * For that, use the manual QA matrix in the PR (no browser smoke script exists for this yet).
 *
 * Exit code 0 = clean, 1 = at least one failure.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'src')
const read = (rel) => fs.readFileSync(path.join(SRC, rel), 'utf8')

let failed = 0
function ok(name, cond) {
  if (!cond) failed++
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`)
}

const header = read('components/employer/EmployerHeader.tsx')
const actions = read('components/navigation/HeaderActions.tsx')
const bell = read('components/navigation/NotificationBell.tsx')
const dropdown = read('components/navigation/UserDropdown.tsx')
const seeker = read('components/navigation/EmployeeHeader.tsx')

// The <Link ...> opening tag that points at `href`.
const linkTag = (src, href) => src.match(new RegExp(`<Link\\s[^>]*href="${href}"[^>]*>`))?.[0] ?? ''

// --- Header row
ok('logo link cannot shrink', /<Link href="\/employer" className="[^"]*\bshrink-0\b/.test(header))
ok('logo always goes to the dashboard (no logoHref prop)', !/logoHref/.test(header))
ok('right group has tighter gaps on a phone', /gap-2 sm:gap-3 lg:gap-5/.test(header))
ok('HeaderActions is compact in the employer header', /<HeaderActions compact \/>/.test(header))

// --- Below lg the bottom bar replaces these three links; from lg they show, labels from xl.
for (const [href, labelKey] of [
  ['/employer/workers', 'findWorkers'],
  ['/employer/team', 'team'],
]) {
  const tag = linkTag(header, href)
  ok(`${href}: hidden below lg (the bottom bar / More sheet carries it)`, tag.includes('hidden lg:inline-flex'))
  ok(`${href}: aria-label`, tag.includes(`aria-label={t('employer:dashboard.${labelKey}')}`))
  ok(`${href}: label text only from xl`, header.includes(`<span className="hidden xl:inline">{t('employer:dashboard.${labelKey}')}</span>`))
}
const cta = linkTag(header, '/employer/jobs/new')
ok('Post a Job: hidden below lg (it is the bottom bar\'s fourth tab)', cta.includes('hidden lg:inline-flex'))

const linkCls = header.match(/employerHeaderLinkCls =\s*'([^']*)'/)?.[1] ?? ''
const ctaCls = header.match(/employerHeaderCtaCls =\s*'([^']*)'/)?.[1] ?? ''
ok('link class: 44px tap target both ways', linkCls.includes('min-h-[44px]') && linkCls.includes('min-w-[44px]'))
ok('CTA class: 44px tall', ctaCls.includes('min-h-[44px]'))
for (const [name, cls] of [['link', linkCls], ['CTA', ctaCls]]) {
  ok(`${name} class: does not shrink or wrap`, cls.includes('shrink-0') && cls.includes('whitespace-nowrap'))
  ok(`${name} class: no display utility (callers add it, see comment)`, !/(^|\s)(hidden|flex|inline-flex|block)(\s|$)/.test(cls))
}

// --- Shared components: new behaviour is opt-in or phone-only, seeker untouched
ok('HeaderActions: seeker gaps unchanged', actions.includes("'flex items-center gap-4 sm:gap-6 lg:gap-8'"))
ok('HeaderActions: compact gaps', actions.includes("'flex items-center gap-2 sm:gap-4 lg:gap-6'"))
ok('HeaderActions: compact defaults to false', /compact = false/.test(actions))
ok('seeker header does not pass compact', !/<HeaderActions[^>]*compact/.test(seeker))

ok('bell panel: pinned to the screen below sm', bell.includes('fixed inset-x-4 top-[73px]'))
ok('bell panel: original anchored placement from sm', bell.includes('sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[360px] sm:max-w-[calc(100vw-2rem)]'))
ok('bell list: scrolls within a short screen', bell.includes('max-h-[min(380px,calc(100dvh-10rem))] overflow-y-auto'))

ok('account menu: scrolls on a short screen', dropdown.includes('max-h-[calc(100dvh-5rem)] overflow-y-auto'))
ok('account menu: still lists Find Workers and Team for employers', dropdown.includes('href="/employer/workers"') && dropdown.includes('href="/employer/team"'))

// --- No employer bottom nav
ok('employer header does not render the bottom nav (the layout mounts it once)', !/^import .*BottomNav/m.test(header) && !/<EmployerBottomNav/.test(header))

console.log(failed ? `\n${failed} check(s) FAILED` : '\nAll checks passed')
process.exit(failed ? 1 : 0)
