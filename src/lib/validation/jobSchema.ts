import { z } from 'zod'
import type { JobTypeValue, PaymentTypeValue, UrgencyLevelValue } from '@/lib/api'

/**
 * Whole-form validation for the employer Post Job and Edit Job screens.
 *
 * One schema serves both. The backend's update schema (`updateJobSchema`) is the
 * create schema with every field optional and the same limits, and JobForm always
 * sends the required fields, so there is no rule that differs between the two.
 *
 * Every limit below is copied from prosiddhi-backend/src/validators/job.validator.ts
 * (audited 2026-10-16). Nothing here is stricter than the server; the point is to
 * say it at the field, before the request, instead of as a 400.
 *
 * The form holds STRINGS (that is what an <input> gives back), so this validates
 * the form's shape, not the payload. JobForm turns the validated values into a
 * `PostJobData`. Lengths are measured on the TRIMMED text because that is what is
 * sent.
 *
 * Message values are i18n KEYS, so this file stays free of React and i18next, like
 * the other files in this folder.
 */

// `satisfies` ties each list to the api.ts union, so the two cannot drift apart.
export const JOB_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'TEMPORARY', 'INTERNSHIP'] as const satisfies readonly JobTypeValue[]
export const PAYMENT_TYPES = ['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'FIXED'] as const satisfies readonly PaymentTypeValue[]
export const URGENCY_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const satisfies readonly UrgencyLevelValue[]

const V = 'employer:jobForm.validation.'

/** Backend limits, in one place. */
const LIMITS = {
  title: { min: 5, max: 200 },
  companyName: { max: 200 },
  category: { min: 2, max: 100 },
  description: { min: 50, max: 5000 },
  location: { min: 3, max: 255 },
  requirements: { max: 3000 },
  skills: { max: 20 },
  positions: { min: 1, max: 1000 },
} as const

/** Trimmed length between `min` and `max`; each side has its own message. */
function text(min: number, max: number, minKey: string, maxKey: string) {
  return z.string().superRefine((value, ctx) => {
    const length = value.trim().length
    if (length < min) ctx.addIssue({ code: z.ZodIssueCode.custom, message: minKey })
    else if (length > max) ctx.addIssue({ code: z.ZodIssueCode.custom, message: maxKey })
  })
}

/** Optional text: only an upper limit. */
function maxText(max: number, key: string) {
  return z.string().refine((value) => value.trim().length <= max, { message: key })
}

/** A number box as a number, or undefined while it is blank. */
function toNum(value: string): number | undefined {
  return value.trim() === '' ? undefined : Number(value)
}

/** Blank is fine (the field is optional); otherwise a number that passes `ok`. */
function optionalNumber(key: string, ok: (n: number) => boolean) {
  return z.string().refine((value) => {
    const n = toNum(value)
    return n === undefined || ok(n)
  }, { message: key })
}

/** The skills box is one comma-separated string; the payload wants the array. */
export function parseSkills(skills: string): string[] {
  return skills
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export const jobFormSchema = z
  .object({
    title: text(LIMITS.title.min, LIMITS.title.max, V + 'titleMin', V + 'titleMax'),
    companyName: maxText(LIMITS.companyName.max, V + 'companyMax'),
    category: text(LIMITS.category.min, LIMITS.category.max, V + 'categoryRequired', V + 'categoryMax'),
    // Chosen from the picker, which only offers valid names — nothing to check here.
    sector: z.string(),
    jobTitle: z.string(),
    description: text(LIMITS.description.min, LIMITS.description.max, V + 'descriptionMin', V + 'descriptionMax'),
    requirements: maxText(LIMITS.requirements.max, V + 'requirementsMax'),
    skills: z.string().superRefine((value, ctx) => {
      if (parseSkills(value).length > LIMITS.skills.max) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: V + 'skillsMax' })
      }
    }),
    location: text(LIMITS.location.min, LIMITS.location.max, V + 'locationRequired', V + 'locationMax'),
    salaryMin: optionalNumber(V + 'salaryInvalid', (n) => Number.isFinite(n) && n >= 0),
    salaryMax: optionalNumber(V + 'salaryInvalid', (n) => Number.isFinite(n) && n >= 0),
    paymentType: z.enum(PAYMENT_TYPES),
    jobType: z
      .string()
      .refine((v) => (JOB_TYPES as readonly string[]).includes(v), { message: V + 'jobTypeRequired' }),
    urgencyLevel: z.enum(URGENCY_LEVELS),
    // Blank is allowed: the payload sends 1 (its default). A typed value must be a
    // whole number the server accepts.
    numberOfPositions: optionalNumber(
      V + 'positionsRange',
      (n) => Number.isInteger(n) && n >= LIMITS.positions.min && n <= LIMITS.positions.max,
    ),
  })
  .superRefine((values, ctx) => {
    // Checked only when both are filled in; a bad number is already reported on its own field.
    const min = toNum(values.salaryMin)
    const max = toNum(values.salaryMax)
    if (min !== undefined && max !== undefined && max < min) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['salaryMax'], message: V + 'salaryRange' })
    }
  })

export type JobFormValues = z.infer<typeof jobFormSchema>
