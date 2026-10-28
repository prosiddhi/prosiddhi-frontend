import type { GuideStepData } from '@/components/legal/GuideParts'
import { BulletList, guideImage, HelpLink } from '@/components/legal/GuideParts'

/**
 * Employer Guidelines — English only for now.
 *
 * The screenshots are real captures of the portal showing SAMPLE data (made-up names, numbers and
 * dates). The Plans page stays a placeholder until an authorised owner confirms whether the Launch
 * Offer is live. The payment summary and the Invoices list show clearly synthetic sample amounts.
 * Files live in public/guides/employer/. Details are in docs/help-content-publication-blockers.md.
 */
const DIMS: Record<string, readonly [number, number]> = {
  '01-register-role': [601, 520],
  '02-register-account': [601, 768],
  '03-register-company-details': [1280, 1250],
  '04-register-code': [601, 592],
  '05-under-review': [1280, 800],
  '06-individual-awaiting-approval': [1280, 800],
  '07-profile-documents': [673, 391],
  '08-dashboard': [1280, 1721],
  '08b-dashboard-menu': [1280, 800],
  '09-my-plans': [1280, 800],
  '10-post-job': [1280, 1458],
  '10b-post-job-success': [1280, 900],
  '11-my-jobs': [1280, 800],
  '11b-my-jobs-awaiting-review': [1280, 800],
  '11c-my-jobs-rejected': [1280, 800],
  '12b-job-edit': [1280, 800],
  '13b-payment-summary': [1280, 900],
  '14b-invoices-sample': [1280, 470],
  '15-applicants': [1280, 800],
  '16-applicant-detail': [1280, 1004],
  '17-applications-closed': [1280, 800],
  '18-accept-interview': [1280, 1000],
  '19-find-workers': [1280, 1000],
  '20-unlock-confirm': [1280, 1000],
  '21-employer-profile': [1280, 1380],
  '22-employer-settings': [1280, 2085],
}
const shot = (file: string, alt: string, caption?: string) =>
  guideImage('employer', `${file}.webp`, DIMS[file], alt, caption)

export const employerGuideSteps: GuideStepData[] = [
  {
    title: 'Register',
    body: (
      <>
        <p>
          Choose “I want to hire”, then choose the company type: Individual or Corporate. Enter your
          account details and, for a Corporate account, your company details with your GST number
          and registration number. Then confirm your phone and your email with the 6-digit codes.
        </p>
        <p>One GST number or registration number can be used by only one account.</p>
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
        'Employer registration: choose the company type, Individual or Corporate.'
      ),
      shot(
        '02-register-account',
        'Account step with the email, password and confirm password fields.'
      ),
      shot(
        '03-register-company-details',
        'Company details form with company name, email, address, founded date, size, GST number and registration number, filled in with sample values.'
      ),
      shot('04-register-code', 'Phone verification step with a 6-digit code entered.'),
    ],
  },
  {
    title: 'Get your account approved',
    body: (
      <>
        <p>
          Our team must approve every new employer account before you can post jobs or buy plans.
          This applies to Individual and Corporate accounts. Until you are approved you can sign in,
          but you cannot post.
        </p>
        <p>
          <strong>Corporate accounts:</strong> upload your documents. You can use PDF, JPG, PNG, DOC
          or DOCX files, up to 5 MB each. We usually review documents within 48 hours.
        </p>
        <p>
          <strong>Individual accounts:</strong> you do not upload documents when you sign up. Our
          team approves the account itself. Your home screen shows “Your account is awaiting admin
          approval” until then.
        </p>
        <p>
          If you change your documents, GST number or registration number later, your account may go
          back to review. Jobs that are already live stay live.
        </p>
      </>
    ),
    screenshots: [
      shot(
        '07-profile-documents',
        'Documents section of the employer profile: one approved GST certificate and one company registration waiting for review.'
      ),
      shot(
        '05-under-review',
        '“Your account is under review” page with buttons to upload documents or continue to the dashboard.'
      ),
      shot(
        '06-individual-awaiting-approval',
        'Home screen of an Individual account showing “Your account is awaiting admin approval”.'
      ),
    ],
  },
  {
    title: 'Find your way around',
    body: (
      <p>
        Your employer home screen is the place to start. From the menu you can reach your jobs, your
        applicants, Find Workers, your plans, your invoices and your profile.
      </p>
    ),
    screenshots: [
      shot(
        '08-dashboard',
        'Employer home screen with job and application counts, recent applications and the free trial balance.',
        'Sample data: the numbers and dates here are examples.'
      ),
      shot(
        '08b-dashboard-menu',
        'The user menu open, listing pages such as Profile, My Jobs, Find workers, Candidates, Plans, My Plans, Invoices and Settings.'
      ),
    ],
  },
  {
    title: 'Check your free trial or plan',
    body: (
      <p>
        Open My Plans. Every new employer gets one free trial: 1 Job Post and 3 Candidate Unlocks
        for 14 days. If you cannot see it, please <HelpLink href="/contact">contact us</HelpLink>.
      </p>
    ),
    screenshots: [
      shot(
        '09-my-plans',
        'My Plans showing 1 Job Post and 3 Candidate Unlocks from the free trial.',
        'Sample data: the trial dates here are examples. Your own dates will be different.'
      ),
    ],
  },
  {
    title: 'Post a job',
    body: (
      <>
        <p>
          Choose Post a Job. Write true details of the work, the pay and the place, then submit. One
          Job Post is used.
        </p>
        <p>
          Post only real jobs in India. Never ask for money, a deposit, original documents or bank
          details.
        </p>
      </>
    ),
    screenshots: [
      shot(
        '10-post-job',
        'The Post a Job form filled in with a sample job, next to a live preview.'
      ),
      shot(
        '10b-post-job-success',
        'My Jobs, Pending Review tab, right after posting: a message says the job is with our team for review and goes live once it is approved, and the new job is listed.'
      ),
    ],
  },
  {
    title: 'Wait for the job to be approved',
    body: (
      <>
        <p>
          Our team checks every job. When it is approved, it goes live for 30 days. If it is not
          approved, you will see a reason.
        </p>
        <p>The job is not visible to job seekers until it is approved.</p>
        <p>Open My Jobs. Your jobs are shown in tabs:</p>
        <BulletList
          items={[
            'Pending Review: jobs our team is checking. They go live once approved.',
            'Active: jobs that are live.',
            'Inactive and Expired: jobs that are not live.',
            'Rejected: jobs our team did not approve. Each one shows the reason from our team.',
          ]}
        />
      </>
    ),
    screenshots: [
      shot(
        '11b-my-jobs-awaiting-review',
        'My Jobs, Pending Review tab, with a job that our team is checking.'
      ),
      shot(
        '11-my-jobs',
        'My Jobs, Active tab, with two live jobs and the Candidates, View, Edit, Deactivate and Delete buttons on each card.'
      ),
      shot(
        '11c-my-jobs-rejected',
        'My Jobs, Rejected tab, with a job and the reason from our team.'
      ),
    ],
  },
  {
    title: 'Edit or delete a job',
    body: (
      <>
        <p>
          Edit and Delete are on each job’s card in My Jobs (see the Active tab in Step 6). They are
          not on the job’s own detail page.
        </p>
        <p>
          Small changes usually keep the job live. Bigger changes, such as the title, description,
          pay or requirements, send the job back for review and take it offline until it is approved
          again. The 30 days keep running during the review.
        </p>
        <p>
          If you delete a job within 24 hours of publishing it and nobody has applied, we give the
          Job Post back.
        </p>
      </>
    ),
    screenshots: [shot('12b-job-edit', 'The Edit Job page with the job’s details filled in.')],
  },
  {
    title: 'Buy a plan',
    body: (
      <>
        <p>
          Open Plans, choose a plan or pack, and check the price before GST. GST at 18% is added at
          checkout. You pay through Razorpay. We do not receive or store your card, UPI or bank
          details. You can download your GST invoice from Invoices.
        </p>
        <BulletList
          items={[
            'Job Posts and Candidate Unlocks that come with a plan are lost when the plan ends. The one-time pack does not expire.',
            'After a plan ends you have 3 days’ grace. After that, your live jobs are closed.',
            'Purchases cannot be cancelled and are not refundable, except as our Refund & Cancellation Policy says.',
          ]}
        />
        <p>
          Please read the{' '}
          <HelpLink href="/refund-policy">Refund &amp; Cancellation Policy</HelpLink> and the{' '}
          <HelpLink href="/delivery-policy">Delivery Policy</HelpLink> before you buy.
        </p>
      </>
    ),
    screenshots: [
      'The Plans page.',
      shot(
        '13b-payment-summary',
        'The Complete your purchase box showing the price, 18% GST and the total, with the optional GSTIN field, the place of supply and a Pay button.',
        'Sample amounts, not real prices.'
      ),
      shot(
        '14b-invoices-sample',
        'The Invoices page listing two invoices, each with its number, date, description, total including GST and a Download button.',
        'Sample invoice list. The invoice numbers and amounts are made up, not real transactions.'
      ),
    ],
  },
  {
    title: 'Review your applicants',
    body: (
      <>
        <p>
          On a job’s card in My Jobs, choose Candidates to see the people who applied. You can
          shortlist, accept or reject each one.
        </p>
        <p>
          A job can receive up to 50 applications. When it reaches 50, new people cannot apply. Job
          seekers see “Applications closed” on the job. Your Candidates list shows how many
          candidates the job has, for example “50 candidates for this job”. Applications that were
          withdrawn are not counted toward the 50.
        </p>
      </>
    ),
    screenshots: [
      shot(
        '15-applicants',
        'Candidates list for one job with tabs for All, Pending, Accepted, Shortlisted, Rejected, Withdrawn and Bookmarked.'
      ),
      shot(
        '16-applicant-detail',
        'One applicant’s page with their application and the Accept, Reject, Shortlist and Bookmark buttons.'
      ),
      shot(
        '17-applications-closed',
        'Candidates list for a job showing “50 candidates for this job”.',
        'Job seekers see “Applications closed” on a job like this one. You see the number of candidates.'
      ),
    ],
  },
  {
    title: 'Set up an interview',
    body: (
      <p>
        When you accept an application, you can add a date, a time and some notes. The job seeker is
        notified. There is no reschedule button in the app.
      </p>
    ),
    screenshots: [
      shot(
        '18-accept-interview',
        'The Accept Candidate box with the option to schedule an interview, and the date, time and notes fields.'
      ),
    ],
  },
  {
    title: 'Find workers and use Candidate Unlocks',
    body: (
      <p>
        Use Find Workers to search for candidates. Seeing a candidate’s contact details uses 1
        Candidate Unlock the first time. Looking at the same person again is free.
      </p>
    ),
    screenshots: [
      shot('19-find-workers', 'Find workers search results with candidate cards.'),
      shot(
        '20-unlock-confirm',
        'The “Unlock this candidate?” box, which explains that it uses 1 Candidate Unlock.'
      ),
    ],
  },
  {
    title: 'Manage your account',
    body: (
      <p>
        You can update your company details in Profile and Settings. You can delete your account at
        any time — see <HelpLink href="/delete-account">Delete your account</HelpLink>.
      </p>
    ),
    screenshots: [
      shot(
        '21-employer-profile',
        'Employer profile with account, personal and business details, and documents.'
      ),
      shot(
        '22-employer-settings',
        'Settings with language, notification choices, change password, log out and delete account.'
      ),
    ],
  },
]

export const employerResponsibilities = [
  'Post only real, current jobs, with true details of the work, the pay and the place.',
  'Pay at least the legal minimum wage and follow labour laws. Do not post jobs that discriminate unlawfully.',
  'Never ask a job seeker for money, a deposit, original documents to keep, or bank details.',
  'Post only jobs in India. Jobs abroad are not allowed.',
  'Use job seekers’ details only to recruit for your jobs. Do not sell, share or misuse them.',
  'Do not post fake jobs or fake companies, pretend to be someone else, send spam, or break Indian law.',
]
