// Shared seeker taxonomy + language list.
//
// BR-3 (docs/be-requests.md) — curated static taxonomy until the BE exposes a
// public categories lookup. Sectors/titles mirror the unskilled-labour domains
// in docs/_context/02-scope-locked.md. `preferredSector`/`preferredJobTitle` are
// free-text on the BE, so these just constrain input to sensible values.
//
// Consumed by the registration Categories step AND the profile-edit screen
// (PJP-112) — single source of truth, no duplication.

export interface SectorOption {
  sector: string
  jobTitles: string[]
}

export const SECTORS: SectorOption[] = [
  { sector: 'Construction', jobTitles: ['Mason', 'Helper', 'Carpenter', 'Painter', 'Electrician', 'Plumber', 'Welder', 'Bar Bender'] },
  { sector: 'Manufacturing', jobTitles: ['Machine Operator', 'Assembly Line Worker', 'Packing Helper', 'Quality Checker', 'Loader'] },
  { sector: 'Food Products', jobTitles: ['Kitchen Helper', 'Cook', 'Food Packer', 'Delivery Helper'] },
  { sector: 'Automobile', jobTitles: ['Mechanic', 'Auto Electrician', 'Denter', 'Painter', 'Washing Boy'] },
  { sector: 'Renewable Energy', jobTitles: ['Solar Panel Installer', 'Helper', 'Technician'] },
  { sector: 'Medical Assistance', jobTitles: ['Ward Boy', 'Nursing Assistant', 'Caretaker', 'Ambulance Helper'] },
  { sector: 'Repair Services', jobTitles: ['AC Technician', 'Electrician', 'Plumber', 'Mobile Repair Technician'] },
  { sector: 'Domestic Help', jobTitles: ['House Maid', 'Cook', 'Babysitter', 'Elderly Caretaker', 'Driver'] },
  { sector: 'Delivery', jobTitles: ['Delivery Boy', 'Courier', 'Loader', 'Rider'] },
  { sector: 'Retail', jobTitles: ['Sales Assistant', 'Cashier', 'Store Helper', 'Security Guard'] },
  { sector: 'Common Works', jobTitles: ['General Helper', 'Cleaner', 'Office Boy', 'Security Guard', 'Gardener'] },
]

/** Job titles for a sector (empty array for unknown/blank sector). */
export function jobTitlesForSector(sector?: string): string[] {
  return SECTORS.find((s) => s.sector === sector)?.jobTitles ?? []
}

// The 10 v1 languages (Q6 / scope-locked). `value` is the BE `preferredLanguage`
// code; `label` is the human name shown in the picker.
export interface LanguageOption {
  value: string
  label: string
}

export const LANGUAGES: LanguageOption[] = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी (Hindi)' },
  { value: 'ta', label: 'தமிழ் (Tamil)' },
  { value: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
  { value: 'ml', label: 'മലയാളം (Malayalam)' },
  { value: 'mr', label: 'मराठी (Marathi)' },
  { value: 'gu', label: 'ગુજરાતી (Gujarati)' },
  { value: 'or', label: 'ଓଡ଼ିଆ (Odia)' },
  { value: 'te', label: 'తెలుగు (Telugu)' },
  { value: 'bn', label: 'বাংলা (Bengali)' },
]
