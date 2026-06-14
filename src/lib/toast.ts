// Toast — framework-free notification helper.
//
// Mirrors the decoupled window-event pattern used by lib/api.ts (`auth:unauthorized`):
// any module — including the framework-free API client — can surface a toast by
// dispatching a window event, and the global <ToastViewport> renders it. No React
// context/provider plumbing needed, so this is safe to call from anywhere.

export type ToastVariant = 'error' | 'success' | 'info'

export interface ToastDetail {
  message: string
  variant: ToastVariant
}

export const TOAST_EVENT = 'app:toast'

/**
 * Surface a transient toast. No-op on the server (window-guarded).
 * @param message human-readable text (already localized by the caller).
 * @param variant visual style — defaults to 'info'.
 */
export function showToast(message: string, variant: ToastVariant = 'info'): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent<ToastDetail>(TOAST_EVENT, { detail: { message, variant } })
  )
}
