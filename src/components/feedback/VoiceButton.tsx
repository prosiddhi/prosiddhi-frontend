'use client'

import { Volume2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { showToast } from '@/lib/toast'

/**
 * VoiceButton — the single, consistent 🔊 "read this aloud" affordance.
 *
 * Voice/TTS playback is deferred to v2 (locked scope Q2), so this is NOT wired to
 * any audio engine. But it must not be a dead no-op: it is a real, labelled
 * button with a "Coming soon" tooltip that, on tap, shows a toast — so a
 * low-literacy user who taps it gets clear feedback instead of silence.
 *
 * Replaces the ad-hoc `<button><Volume2/></button>` blocks scattered across the
 * UI. Pass `iconClassName` to preserve each call site's icon size/colour and
 * `className` for the button padding/hit-area, so adoption is visually lossless.
 */
export function VoiceButton({
  iconClassName = 'w-5 h-5 text-gray-600',
  className,
  label = 'Listen',
}: {
  iconClassName?: string
  className?: string
  label?: string
}) {
  return (
    <button
      type="button"
      onClick={() => showToast('🔊 Voice assistance is coming soon.', 'info')}
      aria-label={`${label} — voice assistance coming soon`}
      title="Voice assistance — coming soon"
      className={cn(
        'inline-flex items-center justify-center rounded-lg transition-colors hover:bg-grey-100 active:bg-grey-200 flex-shrink-0',
        className
      )}
    >
      <Volume2 className={iconClassName} aria-hidden="true" />
    </button>
  )
}

export default VoiceButton
