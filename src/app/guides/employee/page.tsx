import ProtectedRoute from '@/components/auth/ProtectedRoute'
import {
  BulletList,
  EnglishOnlyNotice,
  GuideSteps,
  HelpLink,
  PageNote,
} from '@/components/legal/GuideParts'
import { LegalPage, LegalSection } from '@/components/legal/LegalPage'
import { employeeGuideSteps, employeeResponsibilities } from '@/content/help/employeeGuide'

/** Signed-in job seekers only. */
export default function EmployeeGuidePage() {
  return (
    <ProtectedRoute requiredRole="seeker">
      <LegalPage
        title="Job Seeker Guidelines"
        intro="A step-by-step guide to creating your account, finding jobs and applying on ProSiddhi."
        showLastUpdated={false}
      >
        <EnglishOnlyNotice />
        <PageNote>
          Looking for quick answers? See the <HelpLink href="/faq/employee">Job Seeker FAQ</HelpLink>.
        </PageNote>
        <GuideSteps steps={employeeGuideSteps} />
        <LegalSection title="Your responsibilities">
          <BulletList items={employeeResponsibilities} />
          <p>
            See our <HelpLink href="/terms">Terms</HelpLink> and{' '}
            <HelpLink href="/privacy">Privacy Policy</HelpLink>.
          </p>
        </LegalSection>
        <PageNote>
          Need help? Visit <HelpLink href="/help">Help</HelpLink> or{' '}
          <HelpLink href="/contact">Contact Us</HelpLink>.
        </PageNote>
      </LegalPage>
    </ProtectedRoute>
  )
}
