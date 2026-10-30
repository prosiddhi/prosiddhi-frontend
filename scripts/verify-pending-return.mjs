#!/usr/bin/env node
/**
 * Registration-intent check — the mechanical gate for src/lib/pendingReturn.ts: the job
 * a visitor was heading to when they chose "Sign up" on /login, carried through the
 * registration steps and used when registration finishes.
 *
 *   node scripts/verify-pending-return.mjs
 *
 * Runs the REAL TypeScript source, transpiled in memory with the project's own
 * `typescript` (same approach as verify-login-session.mjs). No network, no new
 * dependencies, and no account: this is what covers the return-to-job flow while the
 * local demo accounts cannot sign in.
 *
 * What it proves: a safe same-site path survives; anything external, protocol-relative,
 * an employer area, stale, tampered with or malformed does not; and the final
 * destination still goes through destinationAfterAuth.
 * What it cannot prove: that the registration screens call these functions in the right
 * order — that is read from the code (login: link onClick; success: handleStartExplore).
 *
 * Exit code 0 = clean, 1 = at least one failure.
 */

import { createChecker, loadLib } from './lib-verify.mjs'

// safeInternalPath resolves targets against the page's origin.
globalThis.window = { location: { origin: 'https://prosiddhi.test' } }

const { rememberPendingReturn, takePendingReturn, clearPendingReturn, destinationAfterSeekerRegistration } =
  loadLib('pendingReturn')

const KEY = 'prosiddhi.pendingReturn'
const HOME = '/home'
const NOW = 1_800_000_000_000
const MIN = 60 * 1000

const { expect, finish } = createChecker()

function fakeStore(initial = {}) {
  const m = new Map(Object.entries(initial))
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => void m.set(k, String(v)),
    removeItem: (k) => void m.delete(k),
    _has: (k) => m.has(k),
  }
}
// The API stamps `Date.now()`; pin it so age checks are exact.
const realNow = Date.now
Date.now = () => NOW

const JOB = '/job-details/e7adbe71-27c0-402d-8ecc-b91b13a61f5f?from=employee'

// --- the happy path ---
{
  const s = fakeStore()
  rememberPendingReturn(JOB, s)
  expect('job path is stored', s._has(KEY), true)
  expect('take returns the same path', takePendingReturn(s, NOW + MIN), JOB)
  expect('take clears it (second take is empty)', takePendingReturn(s, NOW + MIN), null)
}

// --- registration finishes: back to the job ---
{
  const s = fakeStore()
  rememberPendingReturn(JOB, s)
  expect('after registration: the job', destinationAfterSeekerRegistration(s, NOW + MIN), JOB)
  expect('after registration, nothing pending: seeker home', destinationAfterSeekerRegistration(s, NOW + MIN), HOME)
}
expect('no storage at all: seeker home', destinationAfterSeekerRegistration(null, NOW), HOME)

// --- what must NOT be remembered ---
for (const [name, bad] of [
  ['absolute external URL', 'https://evil.example/steal'],
  ['protocol-relative URL', '//evil.example/steal'],
  ['backslash trick', '/\\evil.example'],
  ['javascript: URL', 'javascript:alert(1)'],
  ['empty string', ''],
  ['not a string', 42],
  ['null', null],
]) {
  const s = fakeStore()
  rememberPendingReturn(bad, s)
  expect(`rejected on the way in: ${name}`, takePendingReturn(s, NOW + MIN), null)
}

// --- a rejected value clears what was there (no stale job left behind) ---
{
  const s = fakeStore()
  rememberPendingReturn(JOB, s)
  rememberPendingReturn(null, s)
  expect('a later rejected value clears the old one', takePendingReturn(s, NOW + MIN), null)
}
{
  const s = fakeStore()
  rememberPendingReturn(JOB, s)
  clearPendingReturn(s)
  expect('clearPendingReturn empties it', takePendingReturn(s, NOW + MIN), null)
}

// --- age ---
{
  const s = fakeStore()
  rememberPendingReturn(JOB, s)
  expect('29 minutes later: still there', takePendingReturn(s, NOW + 29 * MIN), JOB)
  rememberPendingReturn(JOB, s)
  expect('31 minutes later: gone', takePendingReturn(s, NOW + 31 * MIN), null)
}

// --- storage is never trusted: tampering is re-validated on the way out ---
for (const [name, raw] of [
  ['external URL written straight to storage', JSON.stringify({ path: 'https://evil.example', at: NOW })],
  ['protocol-relative written straight to storage', JSON.stringify({ path: '//evil.example', at: NOW })],
  ['timestamp in the future', JSON.stringify({ path: JOB, at: NOW + 60 * MIN })],
  ['no timestamp', JSON.stringify({ path: JOB })],
  ['malformed JSON', '{not json'],
  ['wrong shape', JSON.stringify(['/home'])],
]) {
  const s = fakeStore({ [KEY]: raw })
  expect(`tampered storage ignored: ${name}`, takePendingReturn(s, NOW + MIN), null)
}

// --- an employer address is remembered like any safe path, but never landed on ---
{
  const s = fakeStore()
  rememberPendingReturn('/employer/jobs/new', s)
  expect('employer area from the login card: seeker home', destinationAfterSeekerRegistration(s, NOW + MIN), HOME)
}

// --- the final landing is still destinationAfterAuth's call ---
for (const [name, path] of [
  ['the login screen', '/login'],
  ['the front page', '/'],
  ['an employer area', '/employer/jobs/new'],
]) {
  const s = fakeStore({ [KEY]: JSON.stringify({ path, at: NOW }) })
  expect(`not a place to land a new seeker: ${name} -> home`, destinationAfterSeekerRegistration(s, NOW + MIN), HOME)
}

// --- storage that throws must not break registration ---
{
  const boom = {
    getItem() { throw new Error('blocked') },
    setItem() { throw new Error('blocked') },
    removeItem() { throw new Error('blocked') },
  }
  let threw = false
  try {
    rememberPendingReturn(JOB, boom)
    clearPendingReturn(boom)
    expect('blocked storage: take is empty', takePendingReturn(boom, NOW), null)
    expect('blocked storage: seeker home', destinationAfterSeekerRegistration(boom, NOW), HOME)
  } catch {
    threw = true
  }
  expect('blocked storage never throws', threw, false)
}

Date.now = realNow

finish('pending-return')
