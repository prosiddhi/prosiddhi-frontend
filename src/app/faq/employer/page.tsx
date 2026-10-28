import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { FaqAccordion } from '@/components/legal/FaqAccordion'
import { EnglishOnlyNotice, HelpLink, PageNote } from '@/components/legal/GuideParts'
import { LegalPage } from '@/components/legal/LegalPage'
import { employerFaqGroups } from '@/content/help/employerFaq'

/** Signed-in employers only. */
export default function EmployerFaqPage() {
  return (
    <ProtectedRoute requiredRole="employer">
      <LegalPage
        title="Employer FAQ"
        intro="Short answers to common questions about hiring on ProSiddhi."
        showLastUpdated={false}
      >
        <EnglishOnlyNotice />
        <PageNote>
          Want step-by-step help? Read the full{' '}
          <HelpLink href="/guides/employer">Employer Guidelines</HelpLink>.
        </PageNote>
        <FaqAccordion groups={employerFaqGroups} />
        <PageNote>
          Still need help? Visit <HelpLink href="/help">Help</HelpLink> or{' '}
          <HelpLink href="/contact">Contact Us</HelpLink>.
        </PageNote>
      </LegalPage>
    </ProtectedRoute>
  )
}
