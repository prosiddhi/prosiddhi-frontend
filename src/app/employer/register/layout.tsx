import { EmployerRegistrationProvider } from './EmployerRegistrationContext'

// Wraps every /employer/register/* step so they share one in-memory
// registration state (password included) without touching localStorage.
// See EmployerRegistrationContext.tsx.
export default function EmployerRegisterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <EmployerRegistrationProvider>{children}</EmployerRegistrationProvider>
}
