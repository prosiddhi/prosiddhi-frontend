import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { FaqAccordion } from '@/components/legal/FaqAccordion'
import { EnglishOnlyNotice, HelpLink, PageNote } from '@/components/legal/GuideParts'
import { LegalPage } from '@/components/legal/LegalPage'
import { employeeFaqGroups } from '@/content/help/employeeFaq'

/** Signed-in job seekers only. */
export default function EmployeeFaqPage() {
  return (
    <ProtectedRoute requiredRole="seeker">
      <LegalPage
        title="Job Seeker FAQ"
        intro="Short answers to common questions about finding a job on ProSiddhi."
        showLastUpdated={false}
      >
        <EnglishOnlyNotice />
        <PageNote>
          Want step-by-step help? Read the full{' '}
          <HelpLink href="/guides/employee">Job Seeker Guidelines</HelpLink>.
        </PageNote>
        <FaqAccordion groups={employeeFaqGroups} />
        <PageNote>
          Still need help? Visit <HelpLink href="/help">Help</HelpLink> or{' '}
          <HelpLink href="/contact">Contact Us</HelpLink>.
        </PageNote>
      </LegalPage>
    </ProtectedRoute>
  )
}
