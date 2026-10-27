import {
  Car,
  ClipboardList,
  GraduationCap,
  Handshake,
  Headset,
  Palette,
  Plane,
  RadioTower,
  Scissors,
  ShieldCheck,
  Store,
  UtensilsCrossed,
  Wrench,
  type LucideIcon,
} from 'lucide-react'

/**
 * The Figma tile pictures, keyed by the backend's category name.
 *
 * GET /categories carries no icon and no stable id, so this map is keyed by name.
 * A category that is missing here — renamed or added on the backend — still gets
 * a tile, with the generic briefcase instead of a picture. Wrong would be worse
 * than plain, so nothing is guessed from part of a name, and a picture is only
 * reused where it honestly fits the category.
 *
 * A name is in this map or in CATEGORY_LUCIDE_ICONS, never both. Checked by
 * scripts/verify-categories.mjs.
 */
export const CATEGORY_ICONS: Record<string, string> = {
  // Current category list.
  'Construction & Infrastructure': '/assets/categories/construction.png',
  'Manufacturing, Industrial & MSMEs': '/assets/categories/manufacturing.png',
  'Logistics, Transport & Supply Chain': '/assets/categories/logistics.png',
  'Healthcare Support, Paramedical & Pharmacy': '/assets/categories/healthcare.png',
  'Renewable Energy & Clean Tech (Solar & Wind)': '/assets/categories/energy.png',
  'Power & Energy Distribution (Conventional Utilities)': '/assets/categories/energy.png',

  // The previous seven names. The backend still serves these until it is re-seeded
  // with the current list, so they keep their pictures until then.
  'Agri & Food-Based Industries': '/assets/categories/food.png',
  'Consumer & Lifestyle': '/assets/categories/consumer.png',
  'Energy & Environment': '/assets/categories/energy.png',
  'Healthcare & Life Sciences': '/assets/categories/healthcare.png',
  'Infrastructure & Construction': '/assets/categories/construction.png',
  'Logistics & Mobility': '/assets/categories/logistics.png',
  'Manufacturing & Engineering': '/assets/categories/manufacturing.png',
}

/**
 * Line icons for the current categories that have no Figma picture, keyed by the
 * same backend name. Shown in the tile's round badge, like the briefcase fallback.
 */
export const CATEGORY_LUCIDE_ICONS: Record<string, LucideIcon> = {
  'Retail, Wholesale & Local Commerce': Store,
  'Hospitality, Hotels, Restaurants & Catering': UtensilsCrossed,
  'Sales, Field Marketing & Business Development': Handshake,
  'Office Administration, Accounting, Legal & Back-Office Support': ClipboardList,
  'Facility Management & Security Services': ShieldCheck,
  'Automobile Repair & Technical Services': Car,
  'Wellness, Personal Grooming, Salon & Beauty': Scissors,
  'Educational Institutions (Non-Teaching & Support Staff)': GraduationCap,
  'Consumer Electronics & Appliance Servicing': Wrench,
  'Handicrafts, Handloom & Artisan Crafts': Palette,
  'Telecom Operations & Infrastructure (Non-White Collar)': RadioTower,
  'IT & BPO Support Services (Non-White Collar)': Headset,
  'Aviation & Aerospace Ground Operations': Plane,
}
