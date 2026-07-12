// Company + legal constants, in ONE place.
//
// ⚠️ BEFORE GO-LIVE these must be confirmed by the business (and the policy text
// they appear in must be reviewed by a lawyer — see docs/STATUS.md):
//   - SUPPORT_EMAIL   — is biz-ops@ really the public-facing support address?
//   - REGISTERED_OFFICE — an Indian privacy policy should carry the registered
//     office address. We do NOT have it, so it is intentionally EMPTY and the UI
//     omits the block entirely rather than print an invented address.
//   - GSTIN — Azkashine's real GSTIN (also needed on invoices, MONETIZATION.md §6.4).
//
// Nothing here may be a placeholder that renders. If a value is unknown, leave it
// empty and let the component skip it.

/** Registered legal entity (PRODUCT.md §1). The product brand is ProSiddhi. */
export const COMPANY_LEGAL_NAME = 'Azkashine Software & Services Pvt. Ltd.'
export const PRODUCT_NAME = 'ProSiddhi'

/** Public support / grievance contact. */
export const SUPPORT_EMAIL = 'biz-ops@azkashine.com'

/** Registered office. EMPTY until the business confirms it — do not invent one. */
export const REGISTERED_OFFICE = ''

/** GSTIN shown on invoices. EMPTY until confirmed. */
export const GSTIN = ''

/**
 * Last substantive revision of the policies. Bump this whenever the wording
 * changes — it is what users and auditors read as the effective date.
 */
export const POLICY_LAST_UPDATED = '2026-07-12'

/** Current year, for the footer copyright — never hardcode it again. */
export function currentYear(): number {
  return new Date().getFullYear()
}
