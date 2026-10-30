import { EmployerRegistrationProvider } from './EmployerRegistrationContext'
import { AuthLanguageRow } from '@/components/auth/AuthLanguageRow'

// Wraps every /employer/register/* step so they share one registration state.
// The PASSWORD lives in memory only and is never written to any web storage;
// non-secret progress is mirrored to sessionStorage so a refresh does not
// restart the flow. See EmployerRegistrationContext.tsx.
//
// The language control sits above every step, here, because these screens have no site
// header and none of the steps chooses a language (the jobseeker flow does, on its first
// screen). Same background as the steps, so the strip does not read as a separate bar.
export default function EmployerRegisterLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <EmployerRegistrationProvider>
      {/* Every step is a `min-h-screen` page. Left alone, the strip above would make each
          one a screen plus ~56px tall (a scrollbar on every step, and the centred card
          pushed down). So the wrapper is the screen-high column, the strip takes its own
          height, and the step fills what is left: its `min-h-screen` is replaced by
          `flex-1` for this subtree only. */}
      <div className="min-h-dvh flex flex-col bg-gradient-to-br from-blue-50 to-white [&>.min-h-screen]:min-h-0 [&>.min-h-screen]:flex-1">
        <AuthLanguageRow className="px-4 pt-3 shrink-0" />
        {children}
      </div>
    </EmployerRegistrationProvider>
  )
}
