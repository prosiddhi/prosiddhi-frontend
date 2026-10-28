// The page address Google Analytics is allowed to see. Pure — no window, no
// imports — so scripts/verify-analytics-path.mjs can run it as-is.
//
// Google must never receive a raw URL. Three things in ours are private:
//   - the query string and hash (search text, ?plan=<private code>, returnUrl, ...)
//   - record ids in the path (/job-details/<uuid>, /employer/workers/<uuid>, ...)
//   - /invite/<token>: the token is a login credential for a team seat.
// So the query and hash are dropped, and an id-like segment becomes `:id`.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// A long run of token characters: a cuid, a JWT-ish token, a hash.
const TOKEN_LIKE = /^[A-Za-z0-9_-]{20,}$/

/**
 * `/job-details/3f1c…?from=feed#top` → `/job-details/:id`.
 * The segment after `invite` is replaced whatever it looks like.
 */
export function cleanPath(path: string): string {
  const bare = path.split(/[?#]/, 1)[0]
  const segments = bare.split('/')
  const cleaned = segments.map((segment, i) =>
    (i > 0 && segments[i - 1].toLowerCase() === 'invite' && segment !== '') || UUID.test(segment) || TOKEN_LIKE.test(segment)
      ? ':id'
      : segment
  )
  return cleaned.join('/') || '/'
}

/**
 * The referrer GA may see. Our own pages are cleaned like any page; another site
 * is reduced to its origin; anything unreadable is dropped.
 */
export function cleanReferrer(referrer: string, ownOrigin: string): string {
  if (!referrer) return ''
  let url: URL
  try {
    url = new URL(referrer)
  } catch {
    return ''
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return ''
  return url.origin === ownOrigin ? ownOrigin + cleanPath(url.pathname) : `${url.origin}/`
}
