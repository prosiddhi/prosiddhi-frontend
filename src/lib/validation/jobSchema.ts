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
  category: { max: 100 },
  description: { min: 50, max: 5000 },
  cities: { min: 1, max: 5 },
  requirements: { max: 3000 },
  skills: { max: 20 },
  positions: { min: 1, max: 1000 },
} as const

/** Most cities a job can be posted in (BE `cityIds` max). The picker and the schema both use it. */
export const MAX_JOB_CITIES = LIMITS.cities.max

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

/**
 * The cities picked in the form: `{ id, name, stateName }` as StateCitySelect holds them.
 * Only the ids are sent; the names and states are there to show the chips.
 *
 * `requireCities` is false for exactly one case: editing a job that was posted
 * before cities existed and has none. That job must stay editable without picking
 * one, so zero is allowed there and JobForm then leaves `cityIds` out of the
 * payload altogether. The upper limit holds in every mode; it is the BE's
 * (job.validator.ts: `cityIds` is 1 to 5).
 */
function cities(requireCities: boolean) {
  return z
    .array(
      z.object({
        // A city without an id cannot be sent; reported like having picked none.
        id: z.string().min(1, V + 'citiesRequired'),
        name: z.string(),
        stateName: z.string().optional(),
      })
    )
    .superRefine((value, ctx) => {
      if (value.length < LIMITS.cities.min && requireCities) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: V + 'citiesRequired' })
      } else if (value.length > LIMITS.cities.max) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: V + 'citiesMax' })
      }
    })
}

export function buildJobFormSchema({ requireCities }: { requireCities: boolean }) {
  return z
    .object({
      title: text(LIMITS.title.min, LIMITS.title.max, V + 'titleMin', V + 'titleMax'),
      companyName: maxText(LIMITS.companyName.max, V + 'companyMax'),
      // Optional, like sector and job title. Only the upper limit applies.
      category: maxText(LIMITS.category.max, V + 'categoryMax'),
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
      cities: cities(requireCities),
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
}

/** The strict form: a city is required. New posts and jobs that already have cities. */
export const jobFormSchema = buildJobFormSchema({ requireCities: true })

export type JobFormValues = z.infer<typeof jobFormSchema>
