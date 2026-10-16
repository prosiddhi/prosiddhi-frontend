// Company + legal constants, in ONE place.
//
// Sources (verified 16 Oct 2026): Certificate of Incorporation, GST REG-06, and the
// Dun & Bradstreet record (D-U-N-S 766393348). The address is written exactly as D&B
// and the Google Play / Razorpay accounts hold it — do not "tidy" it, they must match.
// The policy text these appear in still needs a lawyer's review (docs/compliance/).
//
// Nothing here may be a placeholder that renders. If a value is unknown, leave it
// empty and let the component skip it.

/**
 * Registered legal entity (PRODUCT.md §1). The product brand is ProSiddhi.
 *
 * The exact form matters: this string is the counterparty named in the Terms
 * preamble, both Privacy contact blocks and the footer copyright. It was
 * `'Azkashine Software & Services Pvt. Ltd.'` until 2026-08-18 — an abbreviated
 * form that does not match the incorporation record. Confirmed against the source
 * legal documents; do not "tidy" the capitals or expand/contract the words.
 */
export const COMPANY_LEGAL_NAME = 'AZKASHINE SOFTWARE AND SERVICES PRIVATE LIMITED'
export const PRODUCT_NAME = 'ProSiddhi'

/** Public support / grievance contact. */
export const SUPPORT_EMAIL = 'biz-ops@azkashine.com'

/** Corporate Identification Number (Certificate of Incorporation). */
export const CIN = 'U62013KA2024PTC195985'

/** Registered office, as on the D&B record and the Play / Razorpay accounts. */
export const REGISTERED_OFFICE = [
  '73, Fountain Head, Varthur Road,',
  'C.V. Raman Nagar, Bengaluru,',
  'Karnataka 560093, India',
].join('\n')

/** GSTIN (GST REG-06). */
export const GSTIN = '29ABBCA8287G1ZA'

/** Public phone — the same number published as the developer phone on Google Play. */
export const SUPPORT_PHONE = '+91 70265 54789'

/**
 * Grievance Officer — required by the IT (Intermediary) Rules 2021 Rule 3(2), the
 * Consumer Protection (E-Commerce) Rules 2020 Rule 4, and (from 2027) the DPDP Act
 * s.8(9). Name, designation and contact must be published. Email only, by decision.
 * ⚠️ The mailbox must exist and be read: the 24-hour acknowledgement clock is legal.
 */
export const GRIEVANCE_OFFICER = {
  name: 'Rambabu Gorantla',
  designation: 'Grievance Officer',
  email: 'grievance@prosiddhi.com',
} as const

/**
 * Last substantive revision of each policy. Bump the matching one whenever its
 * wording changes — it is what users and auditors read as the effective date.
 * Kept separate so a privacy change never re-dates the Terms.
 */
// Keep each equal to the matching version in prosiddhi-backend src/config/legal.ts:
// that is the version people are asked to accept.
export const TERMS_LAST_UPDATED = '2026-10-17'
export const PRIVACY_LAST_UPDATED = '2026-10-17'
export const REFUND_LAST_UPDATED = '2026-10-16'
export const DELIVERY_LAST_UPDATED = '2026-10-16'

/** Current year, for the footer copyright — never hardcode it again. */
export function currentYear(): number {
  return new Date().getFullYear()
}
