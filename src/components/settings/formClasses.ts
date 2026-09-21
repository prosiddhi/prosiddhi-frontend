// Same input recipe Profile uses for its bordered fields (`#b5b5b5` border,
// `#aaaaaa` placeholder). `pr-10` clears room for the in-field visibility-toggle
// icon (eyeToggleCls), which every password field on Settings carries.
export const passwordInputCls =
  'w-full h-11 px-3 pr-10 border border-[#b5b5b5] rounded-lg text-sm text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all'

// Layout + focus ring shared by Settings' right-hand outline buttons (Retry,
// Delete account); each appends its own border/text/hover/ring colours.
export const outlineBtnBaseCls =
  'flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-lg transition-colors flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2'

export const eyeToggleCls =
  'absolute inset-y-0 right-0 flex items-center px-3 text-[#717182] hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-50 rounded-r-lg'
