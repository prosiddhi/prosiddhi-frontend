import type { FaqGroup } from '@/components/legal/FaqAccordion'
import { BulletList, HelpLink } from '@/components/legal/GuideParts'

/**
 * Employer FAQ — English only for now.
 *
 * Wording is deliberately cautious where the product rule is not final; see
 * docs/help-content-publication-blockers.md before changing or publishing it.
 */
export const employerFaqGroups: FaqGroup[] = [
  {
    title: 'Getting started',
    items: [
      {
        q: 'Who can register as an employer?',
        a: (
          <p>
            Any business, or any person who hires workers. You choose “Individual” or “Corporate”
            when you register.
          </p>
        ),
      },
      {
        q: 'What do I need to register?',
        a: (
          <p>
            A mobile number and an email address. You confirm each one with a 6-digit code.
            Businesses also give company details, a GST number and a registration number. One GST
            number or registration number can be used by only one account.
          </p>
        ),
      },
      {
        q: 'Can I post a job straight away?',
        a: (
          <p>
            No. Our team must approve every new employer account before you can post jobs or buy
            plans. This applies to individuals and to businesses. A business uploads its documents
            for review, and we usually review them within 48 hours. An individual does not upload
            documents when signing up. Our team approves the account itself. Until you are approved
            you can sign in, but you cannot post. See our <HelpLink href="/terms">Terms</HelpLink>.
          </p>
        ),
      },
      {
        q: 'Which documents can I upload?',
        a: (
          <p>
            PDF, JPG, PNG, DOC or DOCX files, up to 5 MB each. If you change your documents, GST
            number or registration number later, your account may go back to review. Jobs that are
            already live stay live.
          </p>
        ),
      },
      {
        q: 'Is there a free trial?',
        a: (
          <p>
            Yes. Every new employer gets one free trial: 1 Job Post and 3 Candidate Unlocks for 14
            days. You can see it in My Plans. If you cannot see it, please{' '}
            <HelpLink href="/contact">contact us</HelpLink>.
          </p>
        ),
      },
    ],
  },
  {
    title: 'Posting jobs',
    items: [
      {
        q: 'How do I post a job?',
        a: <p>Choose Post a Job, fill in the details and submit. One Job Post is used.</p>,
      },
      {
        q: 'Does my job go live straight away?',
        a: (
          <p>
            No. Our team checks every job first. It goes live once it is approved. If it is not
            approved, you will see a reason.
          </p>
        ),
      },
      {
        q: 'How long does a job stay live?',
        a: <p>30 days once it goes live.</p>,
      },
      {
        q: 'Can I edit a live job?',
        a: (
          <p>
            Yes. Small changes usually keep it live. Bigger changes, such as the title, description,
            pay or requirements, send it back for review, and it goes offline until it is approved
            again. The 30 days keep running during the review.
          </p>
        ),
      },
      {
        q: 'Can I delete a job and get my Job Post back?',
        a: (
          <p>
            If you delete a job within 24 hours of publishing it and nobody has applied, we give the
            Job Post back.
          </p>
        ),
      },
      {
        q: 'How many people can apply to one job?',
        a: (
          <p>
            Up to 50. When a job has 50 applications, new people cannot apply. Job seekers see
            “Applications closed” on the job. You see the number of candidates, for example “50
            candidates for this job”. People who withdraw are not counted.
          </p>
        ),
      },
    ],
  },
  {
    title: 'Plans, payments and invoices',
    items: [
      {
        q: 'What does it cost?',
        a: (
          <p>
            See the Plans page in your account. Prices are shown before GST. GST at 18% is added at
            checkout.
          </p>
        ),
      },
      {
        q: 'How do I pay?',
        a: <p>Through Razorpay. We do not receive or store your card, UPI or bank details.</p>,
      },
      {
        q: 'Do I get an invoice?',
        a: (
          <p>
            Yes. We issue a GST invoice for every purchase. You can download it from your account.
          </p>
        ),
      },
      {
        q: 'What happens when my plan ends?',
        a: (
          <p>
            Job Posts and Candidate Unlocks that came with a plan are lost when the plan ends. The
            one-time pack does not expire. After a plan ends you have 3 days’ grace. After that,
            your live jobs are closed. See our <HelpLink href="/terms">Terms</HelpLink>.
          </p>
        ),
      },
      {
        q: 'Can I get a refund?',
        a: (
          <p>
            Purchases cannot be cancelled and are not refundable, except as our{' '}
            <HelpLink href="/refund-policy">Refund &amp; Cancellation Policy</HelpLink> says. For
            example, we always refund failed or duplicate payments. For how plans are added to your
            account, see our <HelpLink href="/delivery-policy">Delivery Policy</HelpLink>.
          </p>
        ),
      },
    ],
  },
  {
    title: 'Applicants, interviews and candidates',
    items: [
      {
        q: 'How do I see who applied?',
        a: (
          <p>
            Open My Jobs, choose the job, and look at its applicants. You can shortlist, accept or
            reject each one.
          </p>
        ),
      },
      {
        q: 'How do I set up an interview?',
        a: (
          <p>
            When you accept an application, you can add a date, time and notes. The job seeker is
            notified. There is no reschedule button in the app.
          </p>
        ),
      },
      {
        q: 'What is a Candidate Unlock?',
        a: (
          <p>
            It lets you see a candidate’s contact details. It uses 1 Candidate Unlock the first time
            you open that person. Looking again is free.
          </p>
        ),
      },
    ],
  },
  {
    title: 'Rules and safety',
    items: [
      {
        q: 'What are my responsibilities as an employer?',
        a: (
          <BulletList
            items={[
              'Post only real, current jobs, with true details of the work, the pay and the place.',
              'Pay at least the legal minimum wage and follow labour laws. Do not post jobs that discriminate unlawfully.',
              'Never ask a job seeker for money, a deposit, original documents to keep, or bank details.',
              'Post only jobs in India. Jobs abroad are not allowed.',
              'Use job seekers’ details only to recruit for your jobs. Do not sell, share or misuse them.',
            ]}
          />
        ),
      },
      {
        q: 'What is not allowed?',
        a: (
          <p>
            Fake jobs, fake companies or fake profiles, pretending to be someone else, content you
            have no right to use, harmful or hateful content, spam, copying our data with automated
            tools, and anything that breaks Indian law. See our{' '}
            <HelpLink href="/terms">Terms</HelpLink>.
          </p>
        ),
      },
      {
        q: 'What can happen if I break the rules?',
        a: (
          <p>
            We may check, refuse or remove content, and warn, suspend or close accounts. If we act
            on your content or account, we will tell you why. You can complain to our Grievance
            Officer — details are on the <HelpLink href="/contact">Contact Us</HelpLink> page.
          </p>
        ),
      },
    ],
  },
  {
    title: 'Account and privacy',
    items: [
      {
        q: 'How do I delete my account?',
        a: (
          <p>
            See <HelpLink href="/delete-account">Delete your account</HelpLink>. Earlier purchases
            are not refunded, except as the{' '}
            <HelpLink href="/refund-policy">Refund &amp; Cancellation Policy</HelpLink> says.
          </p>
        ),
      },
      {
        q: 'How is my information used?',
        a: (
          <p>
            Read our <HelpLink href="/privacy">Privacy Policy</HelpLink>.
          </p>
        ),
      },
    ],
  },
]
