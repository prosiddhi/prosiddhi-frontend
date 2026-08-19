'use client'

/**
 * VoiceButton — the single, consistent 🔊 "read this aloud" affordance.
 *
 * ⚠️ RENDERS NOTHING TODAY (TD-21, 2026-08-19). Voice/TTS is deferred to v2
 * (locked scope Q2), and until it ships this button's only job was to announce
 * that a feature is missing.
 *
 * That is a product decision, not a code one. It appeared at **17 call sites**,
 * including TWO on the login screen — beside Email and beside Password, the
 * first form a new user ever fills in. A competitor teardown found no rival
 * shipping an icon whose sole purpose is to admit an absence; it was the single
 * loudest "unfinished" signal in the product.
 *
 * The component is deliberately kept (rather than deleting 17 call sites) so
 * that shipping voice is one edit here, with every label, icon size and
 * hit-area already positioned. The previous implementation — a labelled button
 * that toasted "coming soon" — is in git at 699d0c0; the `voice.comingSoon` and
 * `feedback.voiceComingSoon` strings are retained for it.
 *
 * Props stay in the signature for that restore; they are unused while this
 * returns null.
 */
export function VoiceButton(_props: {
  iconClassName?: string
  className?: string
  label?: string
}) {
  return null
}

export default VoiceButton
