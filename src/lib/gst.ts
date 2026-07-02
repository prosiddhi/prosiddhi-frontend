// GST helpers for the checkout flow (mirror of BE src/utils/gst.ts).
//
// GSTIN_REGEX is a client-side convenience check — the BE re-validates. The
// state list must match the BE's STATE_CODE_TO_NAME values EXACTLY, because
// place-of-supply is compared by name against COMPANY_GST_STATE to decide
// CGST+SGST (intra-state) vs IGST (inter-state).

export const GSTIN_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/

// Indian states / UTs — names identical to the BE STATE_CODE_TO_NAME map so
// intra/inter-state GST resolves correctly. (Codes 97/99 = Other Territory /
// Centre are omitted — not buyer states.)
export const INDIAN_STATES: string[] = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli',
  'Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
]
