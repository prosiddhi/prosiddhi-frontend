'use client'

import { useTranslation } from 'react-i18next'
import { MapPin } from 'lucide-react'
import type { PreferredCity } from '@/lib/api'
import { cityDisplayName, toSelectedCity } from '@/components/location/StateCitySelect'

// A seeker's preferred work cities, as "City, State" names, for the employer screens
// (search cards, unlocked cards, candidate page). Renders nothing for a seeker who has
// none: there is no location to fall back to, since the BE no longer sends employers the
// seeker's home text, and inventing one would be wrong.
export function PreferredCities({
  cities,
  iconClassName = 'w-3.5 h-3.5',
  className = '',
}: {
  cities: PreferredCity[] | null | undefined
  iconClassName?: string
  className?: string
}) {
  const { t } = useTranslation()
  if (!cities || cities.length === 0) return null
  return (
    <span className={`flex min-w-0 items-start gap-1.5 ${className}`}>
      <MapPin className={`${iconClassName} mt-0.5 flex-shrink-0`} aria-hidden="true" />
      <span className="min-w-0 break-words">
        <span className="sr-only">{t('employer:workers.preferredCitiesLabel')}: </span>
        {cities.map(({ city }) => cityDisplayName(toSelectedCity(city))).join(' · ')}
      </span>
    </span>
  )
}
