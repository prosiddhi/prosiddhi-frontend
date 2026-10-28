import ProtectedRoute from '@/components/auth/ProtectedRoute'
import {
  BulletList,
  EnglishOnlyNotice,
  GuideSteps,
  HelpLink,
  PageNote,
} from '@/components/legal/GuideParts'
import { LegalPage, LegalSection } from '@/components/legal/LegalPage'
import { employerGuideSteps, employerResponsibilities } from '@/content/help/employerGuide'

/** Signed-in employers only. */
export default function EmployerGuidePage() {
  return (
    <ProtectedRoute requiredRole="employer">
      <LegalPage
        title="Employer Guidelines"
        intro="A step-by-step guide to registering, posting jobs and hiring on ProSiddhi."
        showLastUpdated={false}
      >
        <EnglishOnlyNotice />
        <PageNote>
          Looking for quick answers? See the <HelpLink href="/faq/employer">Employer FAQ</HelpLink>.
        </PageNote>
        <GuideSteps steps={employerGuideSteps} />
        <LegalSection title="Your responsibilities">
          <BulletList items={employerResponsibilities} />
          <p>
            If these rules are broken, we may remove content, and warn, suspend or close accounts. If
            we act, we will tell you why, and you can complain to our Grievance Officer. See our{' '}
            <HelpLink href="/terms">Terms</HelpLink> and{' '}
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
