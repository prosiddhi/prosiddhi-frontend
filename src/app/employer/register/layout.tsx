import { EmployerRegistrationProvider } from './EmployerRegistrationContext'

// Wraps every /employer/register/* step so they share one registration state.
// The PASSWORD lives in memory only and is never written to any web storage;
// non-secret progress is mirrored to sessionStorage so a refresh does not
// restart the flow. See EmployerRegistrationContext.tsx.
export default function EmployerRegisterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <EmployerRegistrationProvider>{children}</EmployerRegistrationProvider>
}
