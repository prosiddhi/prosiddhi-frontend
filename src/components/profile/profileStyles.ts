// Shared styling constants for the Employer and Job Seeker profile pages, so
// both read as one visual hierarchy in both view and edit mode.

export const inputCls =
  'w-full h-11 px-3 border border-[#b5b5b5] rounded-lg text-sm text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all'

// Same label style used by BOTH editable (Field) and read-only fields, so Edit
// Mode and View Mode read as one hierarchy.
export const fieldLabelCls = 'text-xs text-gray-500 mb-1 block'

export const sectionHeadingCls = 'flex items-center gap-2 text-lg sm:text-xl font-semibold text-black'
export const sectionHeadingIconCls = 'w-5 h-5 text-[#3386a9] flex-shrink-0'

// ---- Seeker profile only --------------------------------------------------
// Added beside the shared constants above, never in place of them: the Employer
// profile and the shared field components still use inputCls / fieldLabelCls.

export const seekerCardCls = 'bg-white border border-[#dddddd] rounded-xl p-4 sm:p-6'

// 16px text on a phone, because iOS zooms the page in on focus below that. 48px tall there.
export const seekerInputCls =
  'w-full h-12 sm:h-11 px-3 border border-[#b5b5b5] rounded-lg text-base sm:text-sm text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all'

export const seekerLabelCls = 'text-sm font-medium text-gray-700 mb-1.5 block'

// EmailStatusField, PhoneStatusField and ReadOnlyField are shared with the Employer profile and
// carry small grey labels and small action links. Wrapped in this, they read like the rest of the
// seeker card without editing them. It targets their markup (`p.text-gray-500` is the label,
// `button.text-primary-50` the Add / Change action); if that markup changes the override stops
// matching and they fall back to their own look.
export const seekerSharedFieldsCls =
  '[&_p.text-gray-500]:text-sm [&_p.text-gray-500]:font-medium [&_p.text-gray-500]:text-gray-700 ' +
  '[&_button.text-primary-50]:inline-flex [&_button.text-primary-50]:items-center [&_button.text-primary-50]:min-h-11'

// Preferred-city chips are drawn by StateCitySelect with fixed classes, and that component is
// shared by about ten screens. These win over them by selector specificity, on the profile only:
// a chip 44px tall, and a remove button 44 x 44px (it was 24 x 24). Same pattern as the footer.
export const seekerCityChipsCls =
  '[&_ul>li]:min-h-11 [&_ul>li]:bg-[#eaf6fd] [&_ul>li]:py-0 [&_ul>li]:pl-4 [&_ul>li]:text-base ' +
  '[&_ul>li_button]:h-11 [&_ul>li_button]:w-11 [&_ul>li_button:hover]:bg-[#cfe9f7] ' +
  '[&_.mt-2>p]:text-sm'
