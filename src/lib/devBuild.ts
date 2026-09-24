/**
 * True only in a development build. `process.env.NODE_ENV` is inlined by Next at
 * build time, so in production this is `false` and the code behind it is dead-code
 * eliminated — the dev OTP banner cannot render there, however the server behaves.
 *
 * Gate a server-echoed OTP at BOTH ends: where it is captured
 * (`setDevOtp(IS_DEV_BUILD ? res?.otp : undefined)`, so it never enters state —
 * nor a React devtools dump — in production) and where it is rendered
 * (`IS_DEV_BUILD && devOtp && …`). Do not rely on the server omitting `otp` in
 * production: the backend has echoed it on the public internet (docs/STATUS.md §1).
 */
export const IS_DEV_BUILD = process.env.NODE_ENV !== 'production'
