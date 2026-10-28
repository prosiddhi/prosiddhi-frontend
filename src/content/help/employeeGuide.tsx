import type { GuideStepData } from '@/components/legal/GuideParts'
import { BulletList, guideImage, HelpLink } from '@/components/legal/GuideParts'

/**
 * Employee (job seeker) User Guide — English only for now.
 *
 * The screenshots are real captures of the portal showing SAMPLE data (made-up names, numbers and
 * dates). The Withdraw confirmation is a native browser dialog, which cannot be captured, so Step 9
 * describes it in text. Files live in public/guides/employee/. Details are in
 * docs/help-content-publication-blockers.md.
 */
const DIMS: Record<string, readonly [number, number]> = {
  '01-register-role': [1280, 800],
  '02-register-phone': [1280, 800],
  '03-register-otp': [1280, 800],
  '04-register-profile': [1280, 1350],
  '05-register-categories': [1280, 800],
  '06-register-experience': [1280, 800],
  '07-register-password': [1280, 800],
  '08-register-success': [1280, 800],
  '09-login': [1280, 800],
  '10-forgot-password': [1280, 800],
  '11-profile': [1280, 1500],
  '11b-profile-edit': [1280, 2392],
  '12-profile-documents': [673, 487],
  '13-home': [1280, 1250],
  '14-job-feed': [1280, 1350],
  '15-saved-jobs': [1280, 1180],
  '16-job-details': [1280, 1269],
  '17-apply-modal': [1280, 800],
  '18-apply-success': [1280, 800],
  '19-my-applications': [1280, 1500],
  '20-application-detail': [1280, 1100],
  '21-applications-closed': [1280, 1100],
  '22-bell-menu': [1280, 800],
  '23-my-interviews': [1280, 800],
  '24-notification-settings': [1045, 377],
  '25-report-modal': [1280, 800],
  '26-contact': [1280, 800],
  '27-delete-account': [1045, 138],
  '28-delete-modal': [1280, 1000],
}
const shot = (file: string, alt: string, caption?: string) =>
  guideImage('employee', `${file}.webp`, DIMS[file], alt, caption)

export const employeeGuideSteps: GuideStepData[] = [
  {
    title: 'Create your account',
    body: (
      <>
        <p>
          Choose “I want a job”. Enter your phone number and the 6-digit code we send. Then give
          your name, date of birth, gender, state and city, and the job you want. Add work
          experience and a document if you wish. Choose a password, agree to the Terms and the
          Privacy Policy, and create your account.
        </p>
        <p>
          You must be 18 or older. An email is optional. If you add one, you confirm it with a code.
        </p>
        <p>
          <em>
            The screenshots in this guide use sample data: made-up names, numbers and dates. Your
            own screen will show your own details.
          </em>
        </p>
      </>
    ),
    screenshots: [
      shot(
        '01-register-role',
        'Start of registration: choose a language, then “I want a job” or “I want to hire”.'
      ),
      shot('02-register-phone', 'Phone number screen with a sample 10-digit number typed in.'),
      shot('03-register-otp', 'Verification code screen with a sample 6-digit code entered.'),
      shot(
        '04-register-profile',
        'Profile form with name, date of birth, gender, state and city filled in with sample details.'
      ),
      shot(
        '05-register-categories',
        'Work preferences screen with a category, sector and job title chosen.'
      ),
      shot(
        '06-register-experience',
        'Work experience screen with one sample entry and the optional document upload box.'
      ),
      shot(
        '07-register-password',
        'Create a password screen with the password rules ticked and the Terms and Privacy checkbox.'
      ),
      shot(
        '08-register-success',
        '“Profile created successfully” screen with a Start looking for jobs button.'
      ),
    ],
  },
  {
    title: 'Sign in',
    body: (
      <>
        <p>Use your phone number or email with your password, or choose Google.</p>
        <p>
          If you forget your password, choose “Forgot password” and use the email on your account.
          If you only have a phone number on your account, please{' '}
          <HelpLink href="/contact">contact us</HelpLink>.
        </p>
      </>
    ),
    screenshots: [
      shot(
        '09-login',
        'Sign-in screen with phone or email and password fields, Forgot Password, and Continue with Google.'
      ),
      shot('10-forgot-password', 'Forgot password screen asking for an email or mobile number.'),
    ],
  },
  {
    title: 'Complete your profile',
    body: (
      <p>
        Add your photo, a short introduction, up to 3 cities where you would like to work, your work
        experience and your skills. Turn on “Actively looking for work” when you want employers to
        know.
      </p>
    ),
    screenshots: [
      shot(
        '11-profile',
        'My Profile page with the profile card, about me, home city, job wanted and work experience.'
      ),
      shot(
        '11b-profile-edit',
        'My Profile in edit mode: editable fields for name, date of birth, gender, about you, home city, job wanted and work experience, with Save Changes and Cancel buttons.'
      ),
    ],
  },
  {
    title: 'Upload documents and a photo',
    body: (
      <p>
        Photos can be JPG, PNG, WebP or GIF. Documents can be PDF, JPG or PNG, up to 5 MB each. A
        new document shows “Pending review”, then Approved or Rejected.
      </p>
    ),
    screenshots: [
      shot(
        '12-profile-documents',
        'Documents section with one document Approved, one Pending review, and one Rejected with a reason.'
      ),
    ],
  },
  {
    title: 'Find jobs',
    body: (
      <p>
        On Home, use the search box or the tabs: All Jobs, Recommended and Nearby. Job Feed has more
        filters, for place, job type, salary, department, role and urgent openings. Save jobs to
        look at them later.
      </p>
    ),
    screenshots: [
      shot(
        '13-home',
        'Home screen with the search box, the All Jobs, Recommended and Nearby tabs, and job cards.'
      ),
      shot('14-job-feed', 'Job Feed with the filters on the left and job results on the right.'),
      shot('15-saved-jobs', 'Saved Jobs page listing three saved jobs.'),
    ],
  },
  {
    title: 'Read a job carefully',
    body: (
      <p>
        Check the description, the pay, the place and the number of openings. If the job says
        “Applications closed”, it has reached its limit of 50 applications.
      </p>
    ),
    screenshots: [
      shot(
        '16-job-details',
        'Job page with the pay, place and description, the Apply button and the Report this job link.'
      ),
    ],
  },
  {
    title: 'Apply',
    body: (
      <>
        <p>
          Choose Apply. You can add a short message (up to 1,000 characters), or apply without one.
          Then submit. The employer sees your profile, and we share your contact details with that
          employer, as our <HelpLink href="/privacy">Privacy Policy</HelpLink> explains.
        </p>
        <p>You cannot apply to the same job twice.</p>
      </>
    ),
    screenshots: [
      shot(
        '17-apply-modal',
        'The Add a message box with a sample message and the Apply for this Job button.'
      ),
      shot('18-apply-success', 'The “Application Submitted” message with a Done button.'),
    ],
  },
  {
    title: 'Track your applications',
    body: (
      <>
        <p>Open My Applications. Use the status buttons at the top to filter your list.</p>
        <BulletList
          items={[
            'Applied: you have applied and the employer has not acted yet.',
            'Shortlisted: the employer is considering you.',
            'Accepted: the employer selected you. An interview may be set.',
            'Rejected: the employer did not select you.',
            'Withdrawn: you cancelled the application.',
          ]}
        />
        <p>Please check this page often. You may not get a message for every change.</p>
      </>
    ),
    screenshots: [
      shot(
        '19-my-applications',
        'My Applications with the status buttons and five applications, one for each status.'
      ),
      shot(
        '20-application-detail',
        'One application’s page with its status, an interview box, and the View Job and Withdraw Application buttons.',
        'Sample data: the interview date here is an example.'
      ),
    ],
  },
  {
    title: 'Withdraw an application',
    body: (
      <>
        <p>
          Open the application and choose Withdraw. You can do this while it shows Applied or
          Shortlisted. The Withdraw Application button is at the bottom of the application page,
          shown in Step 8.
        </p>
        <p>
          Your browser asks: ‘Withdraw this application? This cannot be undone.’ Choose OK to
          withdraw or Cancel to keep your application.
        </p>
        <p>
          After you withdraw, you cannot apply to that job again, so withdraw only if you are sure.
        </p>
      </>
    ),
    screenshots: [],
  },
  {
    title: 'Understand the 50-application limit',
    body: (
      <p>
        Each job can take up to 50 applications. When it is full, Apply is switched off, but you can
        still read the job. Applications that were withdrawn are not counted, so a place can open
        again for someone else.
      </p>
    ),
    screenshots: [
      shot(
        '21-applications-closed',
        'Job page where the Apply button is grey and says Applications closed.'
      ),
    ],
  },
  {
    title: 'Interviews and notifications',
    body: (
      <>
        <p>
          When an employer sets an interview, you get a message under the bell icon, and the date
          and time show in My Interviews. If something is missing, it says “To be confirmed”.
        </p>
        <p>
          There is no reschedule button in the app. You can choose which updates you get in
          Settings. Sign-in codes are always sent.
        </p>
      </>
    ),
    screenshots: [
      shot('22-bell-menu', 'The bell menu open, with an Interview scheduled message at the top.'),
      shot(
        '23-my-interviews',
        'My Interviews page with two interview cards showing a date, a time and notes.',
        'Sample data: the dates here are examples.'
      ),
      shot(
        '24-notification-settings',
        'Notifications section of Settings with switches for Applications, Verification and WhatsApp updates.'
      ),
    ],
  },
  {
    title: 'Stay safe and report a job',
    body: (
      <>
        <BulletList
          items={[
            'Never pay money or share bank details to get a job.',
            'Meet employers in safe, public places.',
            'ProSiddhi never asks you to pay for a job or for your Aadhaar.',
          ]}
        />
        <p>
          If a job looks fake or asks for money, open it, choose “Report this job” and tell us what
          is wrong. Our <HelpLink href="/terms">Terms</HelpLink> say we review reported job posts
          within 36 hours. For anything else, visit <HelpLink href="/help">Help</HelpLink> or{' '}
          <HelpLink href="/contact">Contact Us</HelpLink>.
        </p>
      </>
    ),
    screenshots: [
      shot('25-report-modal', 'The Report this job box with a space to describe the problem.'),
      shot(
        '26-contact',
        'The Contact Us page with the support email and phone numbers.',
        'Contact details can change, so always check the Contact Us page itself.'
      ),
    ],
  },
  {
    title: 'Delete your account',
    body: (
      <>
        <p>
          Go to Settings, choose Delete account, and confirm with your password or Google. You are
          signed out. We keep the closed account for 30 days, then erase it as our{' '}
          <HelpLink href="/privacy">Privacy Policy</HelpLink> explains. You cannot undo it yourself,
          but our team may be able to restore it within the 30 days.
        </p>
        <p>
          See <HelpLink href="/delete-account">Delete your account</HelpLink> for more.
        </p>
      </>
    ),
    screenshots: [
      shot('27-delete-account', 'The Delete account card in Settings.'),
      shot(
        '28-delete-modal',
        'The Delete account box asking for your current password. Nothing is deleted until you confirm.'
      ),
    ],
  },
]

export const employeeResponsibilities = [
  'Keep your profile and documents true and your own.',
  'Do not post fake or harmful content, or pretend to be someone else.',
  'Never pay money or share bank details to get a job, and report anyone who asks.',
]
