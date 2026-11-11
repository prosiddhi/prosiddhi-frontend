/**
 * The rule for designation, company name, job title, work-experience position
 * and each skill. It mirrors the backend's `nameText` (prosiddhi-backend
 * src/validators/common.ts, commit 33a8fc5) character for character: keep the two
 * in step.
 *
 * Allowed: letters in any script (with their vowel signs), digits, spaces and
 * . , - & / ( ) ' — plus what phones and paste produce: the curly apostrophe, any
 * dash, a no-break space, the Devanagari and Urdu commas, and the ZWNJ/ZWJ joiners
 * Indian scripts need. At least one letter is required. `+` and `#` are NOT
 * allowed, so the skills "C++" and "C#" are invalid.
 *
 * This is a usability check, not a security control. The backend is the authority.
 */
export const NAME_TEXT_PATTERN =
  /^(?=.*\p{L})[\p{L}\p{M}\p{Nd}  .,\p{Pd}&/()'’॰،‌‍]+$/u

/** True when `value` passes the rule. A blank value passes: the "is it required" check is the form's own. */
export function isValidNameText(value: string): boolean {
  const text = value.trim()
  return text === '' || NAME_TEXT_PATTERN.test(text)
}

/** True when a comma-separated skills box holds a skill the rule refuses. */
export function hasInvalidSkill(skills: string): boolean {
  for (const skill of skills.split(',')) {
    if (!isValidNameText(skill)) return true
  }
  return false
}

/**
 * Sort a 400's field errors into those a form can show at an input and those it
 * cannot. `known` says whether the form has an input for a BE path (dotted for
 * lists, like `workExperiences.0.position`). `shown` maps each known path to its
 * message; `rest` holds the messages of every other path, for the form's general error.
 */
export function splitServerFieldErrors(
  byPath: Record<string, string[]>,
  known: (path: string) => boolean,
): { shown: Record<string, string>; rest: string[] } {
  const shown: Record<string, string> = {}
  const rest: string[] = []
  for (const [path, messages] of Object.entries(byPath)) {
    if (known(path)) shown[path] = messages.join(' ')
    else rest.push(...messages)
  }
  return { shown, rest }
}

/** i18n key of the message for a value that fails the rule. Takes `{ field }`, the field's label. */
export const NAME_TEXT_KEY = 'common:fieldErrors.nameText'
