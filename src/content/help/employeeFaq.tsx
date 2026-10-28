import type { FaqGroup } from '@/components/legal/FaqAccordion'
import { BulletList, HelpLink } from '@/components/legal/GuideParts'

/**
 * Employee (job seeker) FAQ — English only for now.
 *
 * Wording is deliberately cautious where the product rule or the live setting is not
 * confirmed; see docs/help-content-publication-blockers.md before changing or publishing it.
 */
export const employeeFaqGroups: FaqGroup[] = [
  {
    title: 'Registration and verification',
    items: [
      {
        q: 'What do I need to create an account?',
        a: (
          <p>
            A 10-digit Indian mobile number starting with 6, 7, 8 or 9. You also give your name,
            date of birth, gender, state and city, and the job you want, and you choose a password.
            Your photo, email, work history and a document are optional. You must be 18 or older.
          </p>
        ),
      },
      {
        q: 'How is my phone checked?',
        a: (
          <p>
            We send a 6-digit code to your phone. Type it in to continue. If it does not arrive, ask
            for a new code.
          </p>
        ),
      },
      {
        q: 'Do I need an email?',
        a: (
          <p>
            No. An email lets you reset a forgotten password. If you add one, you confirm it with a
            code.
          </p>
        ),
      },
      {
        q: 'Is ProSiddhi free?',
        a: (
          <p>
            Yes. No one may charge you a fee, deposit or any money to apply, get an interview or get
            a job. If anyone asks you for money, please report it.
          </p>
        ),
      },
    ],
  },
  {
    title: 'Login and account security',
    items: [
      {
        q: 'How do I sign in?',
        a: <p>With your phone number or email and your password, or with Google.</p>,
      },
      {
        q: 'What makes a good password?',
        a: <p>8 to 64 characters, with a small letter, a capital letter, a number and a symbol.</p>,
      },
      {
        q: 'I forgot my password.',
        a: (
          <p>
            Choose “Forgot password” on the sign-in page. If you added and confirmed an email, we
            send a code to it. If you signed up with only a phone number, please{' '}
            <HelpLink href="/contact">contact us</HelpLink>.
          </p>
        ),
      },
      {
        q: 'It says there were too many attempts.',
        a: <p>Wait a while and try again.</p>,
      },
      {
        q: 'How do I change my password or sign out?',
        a: <p>Both are in Settings. Signing out ends the session on the browser you are using.</p>,
      },
    ],
  },
  {
    title: 'Profile and documents',
    items: [
      {
        q: 'What can I add to my profile?',
        a: (
          <p>
            Your photo, name, date of birth, gender, a short introduction, home city, up to 3 cities
            where you would like to work, the job you want, work experience, skills, and “Actively
            looking for work”.
          </p>
        ),
      },
      {
        q: 'Which files can I upload?',
        a: (
          <p>
            Photos: JPG, PNG, WebP or GIF. Documents: PDF, JPG or PNG, up to 5 MB each. A document
            shows “Pending review”, then Approved or Rejected.
          </p>
        ),
      },
      {
        q: 'Can I change my phone number or email?',
        a: <p>Yes, in Profile. We send a code to the new one to confirm it.</p>,
      },
      {
        q: 'Who sees my phone number and email?',
        a: (
          <p>
            When you apply to a job, we share your profile and contact details with that employer.
            See our <HelpLink href="/privacy">Privacy Policy</HelpLink>.
          </p>
        ),
      },
    ],
  },
  {
    title: 'Finding and applying for jobs',
    items: [
      {
        q: 'How do I find jobs?',
        a: (
          <p>
            On Home, use the search box or the tabs: All Jobs, Recommended and Nearby. Job Feed has
            filters for place, job type, salary, department, role and urgent openings. You can save
            jobs to look at later.
          </p>
        ),
      },
      {
        q: 'How do I apply?',
        a: (
          <p>
            Open a job and choose Apply. You can add a short message (up to 1,000 characters), or
            apply without one. The employer sees your profile.
          </p>
        ),
      },
      {
        q: 'Can I apply to the same job twice?',
        a: <p>No.</p>,
      },
      {
        q: 'What does “Applications closed” mean?',
        a: (
          <p>
            A job can take up to 50 applications. When it reaches 50, Apply is switched off.
            Applications that were withdrawn are not counted, so a place can open again for someone
            else.
          </p>
        ),
      },
    ],
  },
  {
    title: 'Application status and withdrawal',
    items: [
      {
        q: 'What do the statuses mean?',
        a: (
          <BulletList
            items={[
              'Applied: you have applied and the employer has not acted yet.',
              'Shortlisted: the employer is considering you.',
              'Accepted: the employer selected you. An interview may be set.',
              'Rejected: the employer did not select you.',
              'Withdrawn: you cancelled the application.',
            ]}
          />
        ),
      },
      {
        q: 'How do I withdraw an application?',
        a: (
          <p>
            Open the application in My Applications and choose Withdraw. You can do this while it
            shows Applied or Shortlisted.
          </p>
        ),
      },
      {
        q: 'Can I apply again after I withdraw?',
        a: (
          <p>
            No. A withdrawn application cannot be sent again for the same job, so withdraw only if
            you are sure.
          </p>
        ),
      },
    ],
  },
  {
    title: 'Interviews and notifications',
    items: [
      {
        q: 'How will I know about an interview?',
        a: (
          <p>
            You get a message under the bell icon, and the date and time show in My Interviews. If
            something is missing, it says “To be confirmed”. There is no reschedule button in the
            app.
          </p>
        ),
      },
      {
        q: 'Can I choose which updates I get?',
        a: <p>Yes, in Settings. Sign-in codes are always sent.</p>,
      },
    ],
  },
  {
    title: 'Safety, reporting and support',
    items: [
      {
        q: 'How do I report a job?',
        a: (
          <p>
            Open the job and choose “Report this job”, then tell us what is wrong. Our{' '}
            <HelpLink href="/terms">Terms</HelpLink> say we review reported job posts within 36
            hours.
          </p>
        ),
      },
      {
        q: 'Can I report or block a person?',
        a: (
          <p>
            There is no button for that yet. Please <HelpLink href="/contact">contact us</HelpLink>.
          </p>
        ),
      },
      {
        q: 'How do I stay safe?',
        a: (
          <p>
            Never pay money or share bank details to get a job. Meet employers in safe, public
            places. ProSiddhi never asks you to pay for a job or for your Aadhaar.
          </p>
        ),
      },
      {
        q: 'What are my responsibilities?',
        a: (
          <p>
            Keep your profile and documents true and your own. Do not post fake or harmful content
            or pretend to be someone else. See our <HelpLink href="/terms">Terms</HelpLink>.
          </p>
        ),
      },
    ],
  },
  {
    title: 'Account deletion and privacy',
    items: [
      {
        q: 'How do I delete my account?',
        a: (
          <p>
            Go to Settings, choose Delete account, and confirm with your password or Google. See{' '}
            <HelpLink href="/delete-account">Delete your account</HelpLink>.
          </p>
        ),
      },
      {
        q: 'What happens after I delete my account?',
        a: (
          <p>
            You are signed out. We keep the closed account for 30 days, then erase it as our{' '}
            <HelpLink href="/privacy">Privacy Policy</HelpLink> explains. You cannot undo it
            yourself, but our team may be able to restore it within the 30 days.
          </p>
        ),
      },
      {
        q: 'Where can I get more help?',
        a: (
          <p>
            Visit <HelpLink href="/help">Help</HelpLink> or{' '}
            <HelpLink href="/contact">Contact Us</HelpLink>.
          </p>
        ),
      },
    ],
  },
]
