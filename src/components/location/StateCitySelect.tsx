'use client'

// State → City picker, driven by the backend's own lists (useStates / useCities).
//
// It speaks in backend IDs: what comes out is a SelectedCity whose `id` is the
// value the BE wants (`cityId`, `cityIds[]`, `preferredCityIds[]`). Two modes:
//
//   single   one city.            value: SelectedCity | null
//   multiple up to `max` cities.  value: SelectedCity[]   (jobs: 5, seeker preferred: 3)
//
// In multiple mode the cities may come from different states (a job posted in
// Mumbai and Hyderabad), so the State select only chooses which list to browse;
// chosen cities stay in the list under it, each labelled "City, State". City
// names repeat across states (31 do — Bilaspur is in three), so the state is
// always shown next to a chosen city.
//
// PRE-FILLING `value` (edit forms): the BE sends a saved city's state as a NAME
// only (`city.state.name`), never a code. Pass that name as `stateName`:
//
//     { id: city.id, name: city.name, stateName: city.state.name }
//
// Single mode finds the state in the list by that name and shows its cities. A
// city picked here always carries its `stateName`. A value WITHOUT `stateName`
// still works — it is shown, and kept if the user browses to the state it belongs
// to — but the component can only tell it is in the wrong state once that state's
// cities have loaded, so prefer to supply the name.

import { memo, useEffect, useId, useImperativeHandle, useRef, useState, type ReactElement, type Ref } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { useCities, useStates } from '@/hooks/useLocations'
import type { LocationCitySummary } from '@/lib/api'
import { FieldError, INVALID_CLS } from '@/components/form/FieldError'
import { SELECT_CHEVRON_CLS } from '@/components/form/selectChevron'
import { DEFAULT_SELECT_CLS, DEFAULT_LABEL_CLS } from '@/components/form/selectClasses'

/** A city the user picked, or one a form pre-fills from a saved record. */
export interface SelectedCity {
  /** The BE city id — what gets sent. */
  id: string
  name: string
  /** `city.state.name` from the BE. Needed to label the city and, in single mode, to show its state. */
  stateName?: string
}

interface CommonProps {
  disabled?: boolean
  /** Marks the city control required (asterisk + aria-required). */
  required?: boolean
  /** Already-translated message for the city control; shows under it and marks it invalid. */
  error?: string
  /** Lets the host form focus the city select on a failed submit. */
  cityRef?: Ref<HTMLSelectElement>
  /**
   * Called when the USER changes the State select, with the state's code or null for "no
   * state". It is how a host learns of a state chosen WITHOUT a city (a "whole state" filter);
   * the city callbacks never fire for that. Pair it with `initialStateCode` if the host can
   * unmount and remount the picker. Optional and additive: a form that only cares about the
   * city, like the job form, ignores both.
   */
  onStateChange?: (stateCode: number | null) => void
  /** The state to start on, read once on mount: a host restoring a state it saved from `onStateChange`. */
  initialStateCode?: number | null
  onBlur?: () => void
  /** Override the default "State" / "City" labels (already translated). */
  stateLabel?: string
  cityLabel?: string
  className?: string
  selectClassName?: string
  labelClassName?: string
}

interface SingleProps extends CommonProps {
  multiple?: false
  value: SelectedCity | null
  onChange: (next: SelectedCity | null) => void
}

interface MultipleProps extends CommonProps {
  multiple: true
  /** Most cities that can be picked. */
  max: number
  value: SelectedCity[]
  onChange: (next: SelectedCity[]) => void
}

export type StateCitySelectProps = SingleProps | MultipleProps

/** A city as the BE embeds it (`city`, `cities[].city`) in the shape this picker holds. */
export function toSelectedCity(city: Pick<LocationCitySummary, 'id' | 'name' | 'state'>): SelectedCity {
  return { id: city.id, name: city.name, stateName: city.state.name }
}

/** "Pune, Maharashtra" — the state is dropped when it is not known. */
export function cityDisplayName(city: SelectedCity): string {
  return city.stateName ? `${city.name}, ${city.stateName}` : city.name
}

function StateCitySelectInner(props: StateCitySelectProps) {
  const {
    disabled = false,
    required = false,
    error: errorText,
    cityRef,
    onBlur,
    className,
    selectClassName = DEFAULT_SELECT_CLS,
    labelClassName = DEFAULT_LABEL_CLS,
  } = props
  const { t } = useTranslation()
  const id = useId()

  // The City select is kept in a ref of our own as well as handed to the host's
  // `cityRef`: removing a chip deletes the button that had focus, and focus is put
  // back on this select. useImperativeHandle hands the same element to the host's
  // ref (function or object, e.g. a form library's), attached and detached for it.
  const cityElement = useRef<HTMLSelectElement>(null)
  useImperativeHandle(cityRef, () => cityElement.current as HTMLSelectElement, [])
  // The State select, for the one case the City select cannot take focus (see removeCity).
  const stateElement = useRef<HTMLSelectElement>(null)

  // The two modes, pulled apart once so the rest reads without `props.multiple` checks.
  const multi = props.multiple ? props : null
  const single = props.multiple ? null : props
  const singleValue = single?.value ?? null
  const singleOnChange = single?.onChange

  const { states, loading: statesLoading, error: statesError, reload: reloadStates } = useStates()

  // The state being browsed. `null` until the user picks one; in single mode the
  // saved city's state fills in until then (matched by name — see the header).
  const [browsed, setBrowsed] = useState<number | null>(props.initialStateCode ?? null)
  const savedState = singleValue?.stateName ? states.find((s) => s.name === singleValue.stateName) : undefined

  // The form handed us a different city (another record loaded, or a reset): if it
  // lives in another state than the one being browsed, the browsing is over and
  // the new city's own state wins. Done while rendering, not in an effect, so the
  // two selects never paint out of step. Only a NON-EMPTY value counts: the user
  // clearing the city must not also clear the state they are browsing, and
  // picking a city in the browsed state changes nothing (same state).
  const valueId = singleValue?.id ?? null
  const [seenValueId, setSeenValueId] = useState(valueId)
  if (valueId !== seenValueId) {
    setSeenValueId(valueId)
    if (valueId !== null && browsed !== null && savedState && savedState.code !== browsed) setBrowsed(null)
  }

  const stateCode = browsed ?? savedState?.code ?? null
  const stateName = states.find((s) => s.code === stateCode)?.name

  const { cities, loading: citiesLoading, error: citiesError, reload: reloadCities } = useCities(stateCode)

  // A pre-filled city with no `stateName` cannot be matched to a state, so when the
  // user browses to one it is checked against that state's list once it arrives,
  // and dropped if it is not in it. (With a `stateName` this is decided at once,
  // in handleState.)
  useEffect(() => {
    if (!singleValue || !singleOnChange || singleValue.stateName) return
    if (browsed === null || citiesLoading || citiesError) return
    if (!cities.some((c) => c.id === singleValue.id)) singleOnChange(null)
  }, [singleValue, singleOnChange, browsed, cities, citiesLoading, citiesError])

  const atMax = !!multi && multi.value.length >= multi.max

  const handleState = (raw: string) => {
    const next = raw === '' ? null : Number(raw)
    setBrowsed(next)
    props.onStateChange?.(next)
    if (!single?.value) return
    // Single mode: a city of another state no longer applies. Choosing the state
    // the city is already in keeps it. With no `stateName` to compare, the effect
    // above decides once the list loads — except for "no state", which always clears.
    const nextName = states.find((s) => s.code === next)?.name
    if (next === null || (single.value.stateName && single.value.stateName !== nextName)) single.onChange(null)
  }

  const handleCity = (cityId: string) => {
    if (cityId === '') {
      single?.onChange(null)
      return
    }
    const city = cities.find((c) => c.id === cityId)
    if (!city) return
    const next: SelectedCity = { id: city.id, name: city.name, stateName }
    if (multi) {
      if (multi.value.length < multi.max && !multi.value.some((v) => v.id === next.id)) {
        multi.onChange([...multi.value, next])
      }
    } else {
      single?.onChange(next)
    }
  }

  const removeCity = (cityId: string) => {
    multi?.onChange(multi.value.filter((v) => v.id !== cityId))
    // The remove button unmounts with its chip, which would drop focus to <body>
    // and restart a keyboard user's Tab order from the top of the page. The City
    // select is there to take it, and stays focusable at the limit. It is disabled only
    // while its list loads or after a failed load, and a disabled control ignores
    // focus(), so then the State select (which the user has just been browsing) takes it.
    const target = cityElement.current?.disabled ? stateElement.current : cityElement.current
    target?.focus()
  }

  const loadFailed = statesError || citiesError
  const retry = () => (statesError ? reloadStates() : reloadCities())
  // Neither the limit nor a missing state disables the select. A control that goes
  // disabled under the keyboard focus drops focus to <body>, and a disabled one
  // cannot be sent focus by a form that wants to point at its error (a failed Submit
  // with no city picked). In both cases it stays focusable and offers only its prompt
  // ("limit reached" / "select a state first"). It is disabled only while a list loads
  // or after a failed load, when there is nothing to choose.
  const cityControlsDisabled = disabled || citiesLoading || citiesError

  // One pass over the list builds the options and notes whether a single-mode
  // value is among them (if not, it is added below so a pre-filled form never
  // looks empty). In multiple mode cities already picked are left out.
  const pickedIds = multi ? new Set(multi.value.map((v) => v.id)) : null
  const cityOptions: ReactElement[] = []
  let valueInList = false
  for (const c of cities) {
    if (c.id === singleValue?.id) valueInList = true
    if (atMax || pickedIds?.has(c.id)) continue
    cityOptions.push(
      <option key={c.id} value={c.id}>
        {c.name}
      </option>
    )
  }

  let emptyHint = multi ? t('location.addCityPlaceholder') : t('location.cityPlaceholder')
  if (atMax) emptyHint = t('location.limitReached', { max: multi?.max })
  else if (stateCode === null) emptyHint = t('location.cityPlaceholderNoState')
  else if (citiesLoading) emptyHint = t('location.loading')
  else if (cities.length === 0 && !citiesError) emptyHint = t('location.noCities')

  // Multiple mode: "required" means at least one city, so it stops being true of the
  // select once there is one. The count line is read with the select either way.
  const hasPick = !!multi && multi.value.length > 0
  const describedBy = [errorText ? `${id}-city-error` : null, multi ? `${id}-count` : null]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClassName} htmlFor={`${id}-state`}>
            {props.stateLabel ?? t('location.stateLabel')}
          </label>
          <select
            id={`${id}-state`}
            ref={stateElement}
            className={`${selectClassName} ${SELECT_CHEVRON_CLS}`}
            value={stateCode ?? ''}
            onChange={(e) => handleState(e.target.value)}
            disabled={disabled || statesLoading || statesError}
          >
            <option value="">
              {statesLoading ? t('location.loading') : t('location.statePlaceholder')}
            </option>
            {states.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClassName} htmlFor={`${id}-city`}>
            {props.cityLabel ?? (multi ? t('location.citiesLabel') : t('location.cityLabel'))}
            {required && (
              <span className="text-red-500" aria-hidden="true">
                {' '}
                *
              </span>
            )}
          </label>
          <select
            id={`${id}-city`}
            ref={cityElement}
            className={`${selectClassName} ${SELECT_CHEVRON_CLS}${errorText ? ` ${INVALID_CLS}` : ''}`}
            // Multiple mode keeps this empty: a pick is added to the list below and
            // the select goes back to its prompt, ready for the next one.
            value={multi ? '' : (singleValue?.id ?? '')}
            onChange={(e) => handleCity(e.target.value)}
            onBlur={onBlur}
            disabled={cityControlsDisabled}
            aria-required={required && !hasPick ? true : undefined}
            aria-invalid={errorText ? true : undefined}
            aria-describedby={describedBy || undefined}
          >
            <option value="">{emptyHint}</option>
            {singleValue && !valueInList && (
              <option value={singleValue.id}>{cityDisplayName(singleValue)}</option>
            )}
            {cityOptions}
          </select>
          <FieldError id={`${id}-city-error`} message={errorText} />
        </div>
      </div>

      {loadFailed && (
        <p className="mt-2 text-xs text-red-600" role="status">
          {t('location.loadFailed')}{' '}
          <button type="button" onClick={retry} className="underline font-medium">
            {t('location.retry')}
          </button>
        </p>
      )}

      {multi && (
        <div className="mt-2">
          {multi.value.length > 0 && (
            <ul className="flex flex-wrap gap-2" aria-label={t('location.citiesLabel')}>
              {multi.value.map((city) => (
                <li
                  key={city.id}
                  className="inline-flex items-center gap-1 rounded-full bg-gray-100 pl-3 pr-1 py-1 text-sm text-black"
                >
                  {cityDisplayName(city)}
                  <button
                    type="button"
                    onClick={() => removeCity(city.id)}
                    disabled={disabled}
                    aria-label={t('location.removeCity', { city: cityDisplayName(city) })}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-gray-200 disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p id={`${id}-count`} className="mt-1 text-xs text-gray-600" aria-live="polite">
            {t('location.selectedCount', { selected: multi.value.length, max: multi.max })}
          </p>
        </div>
      )}
    </div>
  )
}

// Memoised: a host form that re-renders on every keystroke (JobForm watches the whole
// form) would otherwise rebuild up to ~270 <option>s each time. Its props are stable
// between keystrokes, so unrelated typing now skips the picker.
export const StateCitySelect = memo(StateCitySelectInner)

export default StateCitySelect
