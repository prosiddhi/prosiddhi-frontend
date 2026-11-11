// Cross-tab sign-in / sign-out.
//
// The session lives in each tab's memory (lib/api.ts), so tabs no longer see each
// other's changes through localStorage. They tell each other here instead. Only the
// EVENT travels, never a token: a tab that hears 'signed-in' fetches its own token
// through the shared HttpOnly refresh cookie (restoreSession).
//
// One channel object per tab, used for both sending and listening. A
// BroadcastChannel never delivers a message to the object that sent it, but it does
// deliver to a second object in the same tab, which would then act on its own tab's
// sign-out.

export type SessionEvent = 'signed-in' | 'signed-out'

const CHANNEL_NAME = 'prosiddhi-auth'
let channel: BroadcastChannel | null = null
const listeners = new Set<(event: SessionEvent) => void>()

function getChannel(): BroadcastChannel | null {
  if (channel) return channel
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null
  channel = new BroadcastChannel(CHANNEL_NAME)
  channel.onmessage = (e: MessageEvent) => {
    if (e.data === 'signed-in' || e.data === 'signed-out') {
      for (const listener of listeners) listener(e.data)
    }
  }
  return channel
}

export function announceSession(event: SessionEvent): void {
  getChannel()?.postMessage(event)
}

/** Subscribe to OTHER tabs' sign-in / sign-out. Returns the unsubscribe. */
export function onSessionEvent(listener: (event: SessionEvent) => void): () => void {
  getChannel()
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
