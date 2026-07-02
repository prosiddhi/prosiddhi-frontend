// Shared language list for the seeker flows.
//
// The static 2-level sector/job-title stopgap (BR-3) was retired once the BE
// exposed the 3-level taxonomy at GET /api/categories — registration (PJP-81),
// profile edit (PJP-112), JobForm (PJP-106) and the feed filter (PJP-138) now
// use the live tree via useCategories + TaxonomyPicker. Only the language list
// remains here.

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
