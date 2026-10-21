/**
 * Run the caller's refresh after the server has CONFIRMED a contact change (email or phone).
 *
 * By then the new value is saved and the one-time code is spent, so a failure here (a profile
 * refetch that hit a network blip or a 5xx) says nothing about the change. It must not be shown
 * as a failed verification, and the user must not be asked to submit the used code again.
 * Returns whether the refresh worked. It never throws, and it is NOT for the change request
 * itself: an error from that must still reach the caller.
 */
export async function refreshAfterContactChange(refresh: () => void | Promise<void>): Promise<boolean> {
  try {
    await refresh()
    return true
  } catch {
    return false
  }
}
