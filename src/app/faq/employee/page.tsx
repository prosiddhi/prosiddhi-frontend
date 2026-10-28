import { FaqAccordion } from '@/components/legal/FaqAccordion'
import { EnglishOnlyNotice, HelpLink, PageNote } from '@/components/legal/GuideParts'
import { LegalPage } from '@/components/legal/LegalPage'
import { employeeFaqGroups } from '@/content/help/employeeFaq'

/** Public on purpose — a job seeker should be able to read this before registering. */
export default function EmployeeFaqPage() {
  return (
    <LegalPage
      title="Job Seeker FAQ"
      intro="Short answers to common questions about finding a job on ProSiddhi."
      showLastUpdated={false}
    >
      <EnglishOnlyNotice />
      <PageNote>
        Want step-by-step help? Read the full{' '}
        <HelpLink href="/guides/employee">Job Seeker User Guide</HelpLink>.
      </PageNote>
      <FaqAccordion groups={employeeFaqGroups} />
      <PageNote>
        Still need help? Visit <HelpLink href="/help">Help</HelpLink> or{' '}
        <HelpLink href="/contact">Contact Us</HelpLink>.
      </PageNote>
    </LegalPage>
  )
}
