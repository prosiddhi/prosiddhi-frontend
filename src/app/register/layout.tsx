import { SeekerRegistrationProvider } from './SeekerRegistrationContext'

// Wraps every /register/* step so they share one registration state. The
// provider stays mounted across client-side step navigation (App Router keeps
// the layout alive). The PASSWORD lives in memory only and is never written to
// any web storage; non-secret progress is mirrored to sessionStorage so a
// refresh does not restart the flow. See SeekerRegistrationContext.tsx.
export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <SeekerRegistrationProvider>{children}</SeekerRegistrationProvider>
}
