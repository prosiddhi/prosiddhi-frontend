// The one place we decide whether a redirect target is safe to navigate to.
//
// Two callers, one rule: /login's `returnUrl` (attacker-supplied, via a link) and
// AuthContext's `logout(redirectTo)`. Both used to carry their own half-check, and
// half-checks are how open redirects ship — the sign-in page is exactly where a
// phishing bounce pays off, and an invite link is exactly what primes a user to
// click through one.
//
// Why this is fiddly enough to deserve its own module:
//
//   1. Resolving against our origin and comparing `.origin` is necessary but NOT
//      sufficient. `https://ours.com//evil.com` resolves to OUR origin — the origin
//      really is ours — while its PATHNAME is `//evil.com`. Forward that pathname to
//      the router and Next resolves it as protocol-relative and hard-navigates to
//      https://evil.com. The origin check passes and you are still redirected.
//   2. Pattern-matching the raw string instead is worse: `/\evil.com` is normalised
//      to `//evil.com` by the URL parser, and the parser also STRIPS raw tab/CR/LF,
//      so `/\t/evil.com` sneaks past a naive `startsWith('//')` test.
//
// So: strip the characters the parser would strip, resolve against our origin, check
// the origin, and then re-check the resulting PATH for protocol-relative forms.

/** Characters the WHATWG URL parser removes outright — strip them before testing. */
const URL_STRIPPED_CHARS = /[\t\n\r]/g

/** `//evil.com` and `/\evil.com` both become cross-origin once the router sees them. */
const PROTOCOL_RELATIVE = /^\/[/\\]/

/**
 * Normalise an untrusted redirect target to a safe SAME-ORIGIN path, or null.
 *
 * Returns the path (with query + hash preserved) only when it is unambiguously
 * internal. Everything else — off-origin URLs, protocol-relative paths,
 * `javascript:`, garbage — returns null, and the caller falls back to a default.
 */
export function safeInternalPath(target: unknown): string | null {
  if (typeof target !== 'string') return null
  if (typeof window === 'undefined') return null

  const cleaned = target.replace(URL_STRIPPED_CHARS, '')
  if (!cleaned.startsWith('/') || PROTOCOL_RELATIVE.test(cleaned)) return null

  let path: string
  try {
    const url = new URL(cleaned, window.location.origin)
    if (url.origin !== window.location.origin) return null
    path = url.pathname + url.search + url.hash
  } catch {
    return null
  }

  // The pathname of an accepted, same-origin URL can STILL be protocol-relative
  // (see note 1 above). This second test is the one that actually stops the bounce.
  if (!path.startsWith('/') || PROTOCOL_RELATIVE.test(path)) return null

  return path
}
