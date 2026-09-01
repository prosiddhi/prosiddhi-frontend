/**
 * Where a logged-in seeker lives. One constant so "which route is seeker
 * home" is a fact, not a convention six call sites have to agree on by hand
 * — ProtectedRoute's post-auth redirect, /login's post-login redirect, the
 * invite flow's "you're already signed in" link, /register/success's landing
 * push, and EmployeeHeader's logo + Home nav link all point here.
 */
export const SEEKER_HOME_ROUTE = '/home'
