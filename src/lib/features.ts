// Build-time feature flags. NEXT_PUBLIC_* values are inlined by `next build`, so
// changing one needs a rebuild. Each flag is off unless set to exactly "true".

// Chat (messages). The backend gates its own APIs with CHAT_ENABLED and answers
// 404 CHAT_DISABLED when off; this hides the portal side. Code is kept so it can
// be switched back on.
export const CHAT_ENABLED = process.env.NEXT_PUBLIC_CHAT_ENABLED === 'true'

// Employer contact. The backend gates the data with EMPLOYER_CONTACT_VISIBLE
// (GET /jobs/:id/recruiter-contact answers `{}` when off); this hides the seeker's
// "Contact the Recruiter" button and modal. Code is kept so it can be switched back on.
export const EMPLOYER_CONTACT_VISIBLE = process.env.NEXT_PUBLIC_EMPLOYER_CONTACT_VISIBLE === 'true'
