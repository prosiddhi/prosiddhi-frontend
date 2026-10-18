// Interview time display. The portal now submits "HH:mm" (24-hour, from
// <input type="time">), but rows saved before that hold free text such as
// "10:30 AM" or "2:30 pm". Both shapes show as a 12-hour time; anything else
// is returned untouched, so we never invent a time the employer did not enter.
const TIME_RE = /^(\d{1,2}):(\d{2})(?:\s*([ap])\.?m\.?)?$/i

export function formatInterviewTime(raw?: string | null): string {
  if (!raw) return ''
  const match = TIME_RE.exec(raw.trim())
  if (!match) return raw

  const hour = Number(match[1])
  const minute = Number(match[2])
  const meridiem = match[3]?.toLowerCase()

  if (minute > 59) return raw
  if (meridiem ? hour < 1 || hour > 12 : hour > 23) return raw

  const isPm = meridiem ? meridiem === 'p' : hour >= 12
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return `${hour12}:${match[2]} ${isPm ? 'PM' : 'AM'}`
}

export type Meridiem = 'AM' | 'PM'

export interface Time12 {
  /** 1-12 */
  hour12: number
  /** 0-59 */
  minute: number
  period: Meridiem
}

const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

/** Splits a strict 24-hour "HH:mm" into 12-hour parts. Null for anything else, '' included. */
export function parse24Hour(value?: string | null): Time12 | null {
  const match = value ? HHMM_RE.exec(value) : null
  if (!match) return null
  const hour = Number(match[1])
  return { hour12: hour % 12 === 0 ? 12 : hour % 12, minute: Number(match[2]), period: hour >= 12 ? 'PM' : 'AM' }
}

/** 12-hour parts to the 24-hour "HH:mm" the API takes: 12 AM is "00:xx", 12 PM is "12:xx". */
export function to24Hour({ hour12, minute, period }: Time12): string {
  const hour = (hour12 % 12) + (period === 'PM' ? 12 : 0)
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}
