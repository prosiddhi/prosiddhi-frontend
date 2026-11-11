/**
 * Two phones for the "Get the app" band: the job-seeker home screen and a job's
 * details, drawn in HTML/CSS in the app's own style rather than a screenshot, so
 * they stay sharp and are easy to update.
 *
 * ⚠️ Content rules: only REAL job posts that are live on prosiddhi.com — no test
 * accounts and no IT roles. The two jobs below were copied from the live job list
 * on 11 Nov 2026 (Sanzz Elevators Escalators, Bengaluru). If either job is taken
 * down, swap in another live post.
 *
 * The phones are a picture of the app: decorative, hidden from screen readers
 * (the heading beside them says what they are), and in English like the app's
 * default screens.
 */

import type { ReactNode } from 'react'

type PreviewJob = {
  title: string
  company: string
  salary: string
  type: string
  category: string
  location: string
  positions: string
}

const JOBS: PreviewJob[] = [
  {
    title: 'Technician',
    company: 'Sanzz Elevators Escalators',
    salary: '₹15,000 – 25,000',
    type: 'Full Time',
    category: 'Manufacturing, Industrial & MSMEs',
    location: 'Bengaluru (Bangalore)',
    positions: '2 Positions',
  },
  {
    title: 'Sales Executive',
    company: 'Sanzz Elevators Escalators',
    salary: '₹20,000 – 30,000 /Month',
    type: 'Full Time',
    category: 'Sales, Field Marketing & Business Development',
    location: 'Bengaluru (Bangalore)',
    positions: '2 Positions',
  },
]

const DETAIL_SKILLS = ['Electrical', 'Electromechanical', 'Fitter']

function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    // lg is the tightest width (phones beside the text), so they shrink back there.
    <div className="w-[210px] sm:w-[230px] lg:w-[210px] xl:w-[250px] rounded-[2rem] bg-gray-900 p-2 shadow-2xl ring-1 ring-black/10">
      <div className="relative flex h-[420px] sm:h-[460px] lg:h-[420px] xl:h-[500px] flex-col overflow-hidden rounded-[1.6rem] bg-slate-50 text-slate-900">
        {/* Status bar with the camera hole. */}
        <div className="flex items-center justify-between px-5 pt-2.5 pb-1 text-[9px] font-semibold">
          <span>9:41</span>
          <span className="h-2.5 w-2.5 rounded-full bg-gray-900" />
          <span className="rounded-sm bg-emerald-500 px-1 text-[8px] leading-tight text-white">80</span>
        </div>
        {children}
      </div>
    </div>
  )
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="max-w-full truncate rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] text-slate-700">
      {children}
    </span>
  )
}

function Avatar({ letter }: { letter: string }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-sky-50 text-sm font-semibold text-sky-900">
      {letter}
    </span>
  )
}

function JobCard({ job }: { job: PreviewJob }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
      <div className="flex items-start gap-2">
        <Avatar letter={job.company[0]} />
        <div className="min-w-0">
          <p className="truncate text-[12px] font-bold leading-tight">{job.title}</p>
          <p className="truncate text-[9px] text-slate-500">{job.company}</p>
        </div>
      </div>
      <p className="mt-1.5 text-[11px] font-bold">
        <span className="text-sky-500">₹</span> {job.salary.replace('₹', '')}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1">
        <Chip>{job.type}</Chip>
        <Chip>{job.location}</Chip>
        <Chip>{job.positions}</Chip>
      </div>
      <p className="mt-1.5 text-right text-[9px] font-semibold text-sky-500">View the Job ›</p>
    </div>
  )
}

function BottomNav({ items, active }: { items: string[]; active: number }) {
  return (
    <div className="mt-auto flex justify-around border-t border-slate-200 bg-white py-1.5">
      {items.map((label, i) => (
        <span key={label} className={`flex flex-col items-center text-[8px] ${i === active ? 'font-semibold text-sky-500' : 'text-slate-500'}`}>
          <span className={`mb-0.5 h-3 w-3 rounded ${i === active ? 'bg-sky-400' : 'bg-slate-300'}`} />
          {label}
        </span>
      ))}
    </div>
  )
}

/** Phone 1: the job-seeker home screen. */
function HomeScreen() {
  return (
    <PhoneFrame>
      <div className="flex flex-1 flex-col gap-2 overflow-hidden px-3 pt-1">
        <div>
          <p className="text-[15px] font-bold">Hi Suresh</p>
          <p className="text-[9px] text-slate-500">📍 Bengaluru</p>
          <p className="mt-0.5 text-[9px] font-semibold text-emerald-600">✓ Job seekers are free, forever.</p>
        </div>
        <div className="flex gap-1.5">
          <span className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[9px] text-slate-400">Search</span>
          <span className="flex w-8 items-center justify-center rounded-lg bg-sky-400 text-[11px] text-white">⌕</span>
        </div>
        <div>
          <p className="text-[11px] font-bold">Jobs based on your profile</p>
          <p className="text-[8px] text-slate-500">{JOBS.length} results</p>
        </div>
        {JOBS.map((job) => (
          <JobCard key={job.title} job={job} />
        ))}
      </div>
      <BottomNav items={['Home', 'Job Feed', 'My List', 'Profile']} active={0} />
    </PhoneFrame>
  )
}

/** Phone 2: the details of the first job, with the Apply button. */
function DetailScreen() {
  const job = JOBS[0]
  return (
    <PhoneFrame>
      <div className="flex flex-1 flex-col gap-2 overflow-hidden px-3 pt-1">
        <p className="text-[12px] text-slate-500">‹</p>
        <div className="flex items-start gap-2">
          <Avatar letter={job.company[0]} />
          <div className="min-w-0">
            <p className="text-[14px] font-bold leading-tight">{job.title}</p>
            <p className="text-[9px] text-slate-500">{job.company}</p>
          </div>
        </div>
        <p className="text-[13px] font-bold">
          <span className="text-sky-500">₹</span> {job.salary.replace('₹', '')}
        </p>
        <div className="flex flex-wrap gap-1">
          <Chip>{job.type}</Chip>
          <Chip>{job.category}</Chip>
          <Chip>{job.location}</Chip>
          <Chip>{job.positions}</Chip>
        </div>
        <span className="rounded-lg bg-sky-400 py-2 text-center text-[11px] font-semibold text-white">Apply for this job</span>
        <p className="text-[8px] text-slate-500">Urgent hiring</p>
        <div>
          <p className="text-[11px] font-bold">Job Description</p>
          <p className="mt-1 text-[9px] leading-snug text-slate-700">
            Looking for an electrical technician with experience in elevators and escalators. Must have
            completed an ITI technical course.
          </p>
        </div>
        <div>
          <p className="text-[11px] font-bold">Skills</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {DETAIL_SKILLS.map((skill) => (
              <Chip key={skill}>{skill}</Chip>
            ))}
          </div>
        </div>
      </div>
      <BottomNav items={['Home', 'Job Feed', 'My List', 'Profile']} active={1} />
    </PhoneFrame>
  )
}

/**
 * The two phones side by side, the second lower and overlapping, like a product
 * shot. Below `sm` only the home screen shows: two phones do not fit a phone.
 */
export function AppPhonePreview() {
  return (
    <div aria-hidden="true" className="flex items-start justify-center select-none">
      <div className="sm:-rotate-3">
        <HomeScreen />
      </div>
      <div className="hidden sm:block -ml-10 mt-14 lg:mt-16 rotate-3">
        <DetailScreen />
      </div>
    </div>
  )
}

export default AppPhonePreview
