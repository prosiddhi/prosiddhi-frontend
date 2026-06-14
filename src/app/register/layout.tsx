import { SeekerRegistrationProvider } from './SeekerRegistrationContext'

// Wraps every /register/* step so they share one in-memory registration state.
// The provider stays mounted across client-side step navigation (App Router
// keeps the layout alive), so accumulated data — including the password —
// survives without touching localStorage. See SeekerRegistrationContext.tsx.
export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <SeekerRegistrationProvider>{children}</SeekerRegistrationProvider>
}
