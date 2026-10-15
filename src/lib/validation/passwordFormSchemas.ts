import { z } from 'zod'
import { isStrongPassword } from './passwordPolicy'

/**
 * Whole-form schemas for change-password and the forgot-password reset stage.
 * Same rule order (strength, then match); the i18n KEYS are a parameter so each
 * form keeps its own copy. Free of React and i18n, like passwordPolicy.ts.
 *
 * One refinement per schema, stopping at the first failure: per-field rules
 * would not keep "first error wins", because zod skips object-level checks once
 * a field-level one fails. Values are never trimmed or transformed.
 */

export interface NewPasswordKeys {
  weak: string
  mismatch: string
}

interface NewPasswordFields {
  newPassword: string
  confirmPassword: string
}

/**
 * The message key of the one issue a form schema reports. Lives here because
 * this file owns the issue paths the key is read from.
 */
export function passwordFormMessageKey(errors: {
  newPassword?: { message?: string }
  confirmPassword?: { message?: string }
}): string | undefined {
  return errors.newPassword?.message ?? errors.confirmPassword?.message
}

/** Adds the first failing strength/match issue. Returns true if it added one. */
function addNewPasswordIssue(
  { newPassword, confirmPassword }: NewPasswordFields,
  ctx: z.RefinementCtx,
  keys: NewPasswordKeys,
): boolean {
  if (!isStrongPassword(newPassword)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['newPassword'], message: keys.weak })
    return true
  }
  if (newPassword !== confirmPassword) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['confirmPassword'], message: keys.mismatch })
    return true
  }
  return false
}

/** New + confirm only — the forgot-password reset stage. */
export function newPasswordSchema(keys: NewPasswordKeys) {
  return z
    .object({ newPassword: z.string(), confirmPassword: z.string() })
    .superRefine((values, ctx) => {
      addNewPasswordIssue(values, ctx, keys)
    })
}
export type NewPasswordValues = z.infer<ReturnType<typeof newPasswordSchema>>

/**
 * Current + new + confirm. The extra rule is checked last, only once the new
 * password is strong and confirmed. An empty current password is not an error
 * here — the input's `required` attribute handles it.
 */
export function changePasswordSchema(keys: NewPasswordKeys & { sameAsCurrent: string }) {
  return z
    .object({ currentPassword: z.string(), newPassword: z.string(), confirmPassword: z.string() })
    .superRefine((values, ctx) => {
      if (addNewPasswordIssue(values, ctx, keys)) return
      if (values.newPassword === values.currentPassword) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['newPassword'], message: keys.sameAsCurrent })
      }
    })
}
export type ChangePasswordValues = z.infer<ReturnType<typeof changePasswordSchema>>
