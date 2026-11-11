import { NextRequest, NextResponse } from 'next/server'

// Content-Security-Policy with a fresh nonce on every page request (pen-test
// Report 01, "CSP Misconfiguration": script-src allowed 'unsafe-inline').
// The same design as the admin console's src/proxy.ts.
//
// The point of the policy is to stop an injected script from running at all, and
// failing that, from sending anything anywhere but our own API. With a nonce, the
// only inline scripts that run are the ones Next.js rendered into this response,
// which carry it. An injected <script> or onclick= cannot know it.
//
// How Next.js uses it: it reads the nonce out of the CSP request header set below
// and stamps it on its own <script> tags. That only happens at request time, so the
// root layout renders every page per request (await connection()).
//
//   - script-src 'strict-dynamic': a script that a nonce'd script adds is trusted
//     too. That covers the page chunks and the third parties we add from code:
//     Razorpay's checkout.js (lib/razorpay.ts), Google sign-in's gsi/client
//     (@react-oauth/google) and gtag.js (next/script). Browsers that understand
//     'strict-dynamic' ignore the host list after it; it stays for older ones.
//     Dev also needs 'unsafe-eval' (React's error overlay) and a websocket.
//   - style-src keeps 'unsafe-inline': React writes style="" attributes, which a
//     nonce cannot cover. A style cannot run code.
//   - Every other directive is unchanged from the static policy this replaced
//     (pen-test review WEB-2): Razorpay script + iframe + its two API hosts,
//     Google sign-in (accounts.google.com/gsi/*), storage.googleapis.com (profile
//     photos and the hop a signed document link redirects to), blob: for the
//     document viewer and downloads, and Google Analytics hosts only when the
//     build sets a measurement ID.
//
// CSP_API_ORIGIN, CSP_GA and CSP_REPORT_ONLY are fixed at BUILD time by
// next.config.js. CSP_REPORT_ONLY=true sends the policy as
// Content-Security-Policy-Report-Only: the browser blocks nothing and lists what it
// WOULD have blocked in its console. For the first staging deploy only.

const isDev = process.env.NODE_ENV === 'development'
const apiOrigin = process.env.CSP_API_ORIGIN
const gaEnabled = process.env.CSP_GA === 'true'
const ga = gaEnabled
  ? {
      script: ' https://www.googletagmanager.com',
      img: ' https://*.google-analytics.com https://www.googletagmanager.com',
      connect: ' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com',
    }
  : { script: '', img: '', connect: '' }
const headerName =
  process.env.CSP_REPORT_ONLY === 'true'
    ? 'Content-Security-Policy-Report-Only'
    : 'Content-Security-Policy'

function buildPolicy(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''} https://checkout.razorpay.com https://accounts.google.com/gsi/client${ga.script}`,
    "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style",
    `img-src 'self' data: blob: ${apiOrigin} https://storage.googleapis.com${ga.img}`,
    "font-src 'self' data:",
    `connect-src 'self' ${apiOrigin} https://storage.googleapis.com https://accounts.google.com/gsi/ https://api.razorpay.com https://lumberjack.razorpay.com${ga.connect}${isDev ? ' ws:' : ''}`,
    "frame-src 'self' blob: https://api.razorpay.com https://checkout.razorpay.com https://accounts.google.com/gsi/",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join('; ')
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const policy = buildPolicy(nonce)

  // On the request, so Next.js can find the nonce while it renders, and as x-nonce
  // for our own <Script> tags (the root layout passes it to GoogleAnalytics)...
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(headerName, policy)
  requestHeaders.set('x-nonce', nonce)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  // ...and on the response, so the browser enforces it.
  response.headers.set(headerName, policy)
  return response
}

export const config = {
  matcher: [
    {
      // Pages only. Static files, the image optimizer and public assets carry no
      // inline script, and link prefetches are not documents.
      source: '/((?!_next/static|_next/image|assets/|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
}
