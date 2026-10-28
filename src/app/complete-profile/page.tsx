'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { LogOut } from 'lucide-react'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { StateCitySelect, type SelectedCity } from '@/components/location/StateCitySelect'
import { UseMyLocation } from '@/components/location/UseMyLocation'
import { TaxonomyPicker } from '@/components/taxonomy/TaxonomyPicker'
import { SELECT_CHEVRON_CLS, SELECT_ONLY_CHEVRON_CLS } from '@/components/form/selectChevron'
import { useAuth } from '@/contexts/AuthContext'
import { useStates } from '@/hooks/useLocations'
import { nearestCityNote, useNearestCity } from '@/hooks/useNearestCity'
import {
  PROFILE_READ_TIMEOUT_MS,
  PROFILE_WRITE_TIMEOUT_MS,
  jobSeekerAPI,
  type TaxonomyTriple,
} from '@/lib/api'
import { afterReadBack, saveFailureKind, settleReadBack, type ReadBack } from '@/lib/jobPreferences'
import { homeCityProblem, type HomeCityProblem } from '@/lib/homeCityValidation'
import { destinationAfterAuth } from '@/lib/routes'

/**
 * The job-preferences page: where JobPreferencesGate sends a seeker who has no home city, sector
 * or job title. It asks for the city and the job, saves them with the ordinary profile update,
 * reads the profile back, and only moves on once the server says nothing is missing.
 */
function CompleteProfileContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const returnUrl = useSearchParams().get('returnUrl')
  const { user, profileSync, confirmSeekerProfile, logout } = useAuth()

  const [homeCity, setHomeCity] = useState<SelectedCity | null>(null)
  const [homeStateCode, setHomeStateCode] = useState<number | null>(null)
  const [locationProblem, setLocationProblem] = useState<HomeCityProblem | null>(null)
  const [triple, setTriple] = useState<TaxonomyTriple>({})
  const [error, setError] = useState('')
  // Set when the save's outcome cannot be read back: 'unsure' after a PUT that may or may not have
  // landed, 'confirm' after one that did but could not be checked. Offers a read-only Try again.
  const [recheck, setRecheck] = useState<'unsure' | 'confirm' | null>(null)
  const [saving, setSaving] = useState(false)
  const stateRef = useRef<HTMLSelectElement>(null)
  const cityRef = useRef<HTMLSelectElement>(null)

  // Nothing left to complete (a confirmed `false`): leave. This is also what carries the seeker
  // on after a save, once confirmSeekerProfile has stored the answer. The gate only ever sends
  // people here on `true`, so the two cannot bounce each other.
  const done = profileSync === 'ready' && user?.needsJobPreferences === false
  useEffect(() => {
    if (done) router.replace(destinationAfterAuth(user?.role, returnUrl))
  }, [done, user?.role, returnUrl, router])

  const { states } = useStates()
  // "Use my current location" fills in the city; the picker only reports a state code when the
  // user picks one, so look the code up by name (same as the registration profile step).
  const applyLocatedCity = useCallback(
    (city: SelectedCity) => {
      setHomeCity(city)
      setHomeStateCode(states.find((s) => s.name === city.stateName)?.code ?? null)
      setLocationProblem(null)
    },
    [states]
  )
  const { locate, begin: beginLocate, cancel: cancelLocate, locating, outcome } = useNearestCity(applyLocatedCity)
  // A hand-made pick ends any lookup still running: its late answer must not overwrite it.
  const changeCity = useCallback(
    (next: SelectedCity | null) => {
      cancelLocate()
      setHomeCity(next)
      setLocationProblem(null)
    },
    [cancelLocate]
  )
  const changeState = useCallback(
    (code: number | null) => {
      cancelLocate()
      setHomeStateCode(code)
      setLocationProblem(null)
    },
    [cancelLocate]
  )
  const locationNote = nearestCityNote(outcome, t, 'auth:profile.locationPicked')

  const handleSave = async () => {
    if (saving) return
    const cityProblem = homeCityProblem(homeStateCode, homeCity?.id)
    if (cityProblem || !homeCity) {
      setLocationProblem(cityProblem ?? 'cityRequired')
      ;(cityProblem === 'stateRequired' ? stateRef : cityRef).current?.focus()
      return
    }
    if (!triple.category || !triple.sector || !triple.jobTitle) {
      setError(
        t(
          !triple.category
            ? 'auth:categories.errorCategory'
            : !triple.sector
              ? 'auth:categories.errorSector'
              : 'auth:categories.errorJob'
        )
      )
      return
    }

    setSaving(true)
    setError('')
    setRecheck(null)
    try {
      let ambiguous = false
      try {
        // Exactly the four fields this page owns; the exact names from GET /categories and the
        // city id, nothing else, so no other part of the profile can be overwritten. Bounded, so a
        // stalled save ends as an error instead of an endless "Saving…".
        await jobSeekerAPI.updateProfile(
          {
            cityId: homeCity.id,
            preferredCategory: triple.category,
            preferredSector: triple.sector,
            preferredJobTitle: triple.jobTitle,
          },
          { timeoutMs: PROFILE_WRITE_TIMEOUT_MS }
        )
      } catch (err) {
        const kind = saveFailureKind(err)
        // The API client has already opened the consent dialog: not a failed save. Saving again
        // works once they have agreed.
        if (kind === 'consent') return
        // The server answered with an error: this request did not save.
        if (kind === 'definite') {
          setError(t('auth:completeProfile.errorSave'))
          return
        }
        // Timed out, no reply, or a gateway answered: the save MAY have gone through. The PUT is
        // never repeated for the user; the profile is read back below and decides.
        ambiguous = true
      }
      applyReadBack(await readBack(), ambiguous)
    } finally {
      setSaving(false)
    }
  }

  // Reads the profile back and returns what the server says. Stored (and so able to end this
  // page) only for a reply that carries the flag as a boolean; anything else is 'unsure'.
  const readBack = async (): Promise<ReadBack> => {
    let fresh
    try {
      fresh = await jobSeekerAPI.getProfile({ timeoutMs: PROFILE_READ_TIMEOUT_MS })
    } catch {
      return 'unsure'
    }
    // A reply that is empty (no profile at all) or has no usable flag is 'unsure', and nothing is
    // stored: settleReadBack calls confirmSeekerProfile only for a real boolean.
    return settleReadBack(fresh, confirmSeekerProfile)
  }

  // 'saved' shows nothing: the effect above moves on once the stored flag is false.
  const applyReadBack = (result: ReadBack, putWasAmbiguous: boolean) => {
    const next = afterReadBack(result, putWasAmbiguous)
    setRecheck(next.recheck)
    if (next.errorKey) setError(t(next.errorKey))
  }

  // "Try again" on the uncertainty message: repeats ONLY the read, never the PUT.
  const handleRecheck = async () => {
    if (saving || !recheck) return
    setSaving(true)
    setError('')
    try {
      applyReadBack(await readBack(), recheck === 'unsure')
    } finally {
      setSaving(false)
    }
  }

  const selectCls = 'w-full h-12 px-3 border border-[#b5b5b5] rounded-[10px] text-base bg-white disabled:opacity-50 disabled:cursor-not-allowed'
  const labelCls = 'text-base font-medium text-black mb-2 block'

  return (
    <div className="min-h-dvh flex flex-col bg-gradient-to-br from-blue-50 to-white">
      <header className="flex items-center justify-between gap-4 px-4 sm:px-6 py-3">
        <div className="relative w-[150px] sm:w-[180px] h-[44px]">
          <Image
            src="/assets/prosiddhi-logo-horizontal.png"
            alt={t('app.name')}
            fill
            className="object-contain object-left"
            priority
          />
        </div>
        <button
          type="button"
          // Wrapped, not passed by reference: logout() takes an optional redirect path.
          onClick={() => logout()}
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-50"
        >
          <LogOut className="w-4 h-4" />
          {t('nav.logout')}
        </button>
      </header>

      <main className="flex-1 flex items-start justify-center p-4">
        <div className="my-auto w-full max-w-[560px] bg-white border border-[#dedede] rounded-[10px] px-6 sm:px-8 py-6 sm:py-8 shadow-xl">
          <h1 className="text-2xl font-semibold text-black mb-2 leading-tight">{t('auth:completeProfile.title')}</h1>
          <p className="text-base text-[#777776] mb-6">{t('auth:completeProfile.subtitle')}</p>

          {error && (
            <div role="alert" className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {recheck && (
            <div role="alert" className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600">
                {t(recheck === 'unsure' ? 'auth:completeProfile.errorUnsure' : 'auth:completeProfile.errorConfirm')}
              </p>
              <button
                type="button"
                // Repeats only the profile read. Never the save.
                onClick={handleRecheck}
                disabled={saving}
                className="mt-3 min-h-[44px] font-semibold text-primary-70 underline hover:text-primary-80 disabled:opacity-50"
              >
                {t('buttons.tryAgain')}
              </button>
            </div>
          )}

          <div role="group" aria-labelledby="complete-profile-location" className="mb-6">
            <p id="complete-profile-location" className={labelCls}>{t('profile:seeker.location')}</p>
            <StateCitySelect
              value={homeCity}
              onChange={changeCity}
              stateCode={homeStateCode}
              onStateChange={changeState}
              required
              stateLabel={`${t('location.stateLabel')} *`}
              stateRef={stateRef}
              cityRef={cityRef}
              stateError={locationProblem === 'stateRequired' ? t('auth:profile.errorState') : undefined}
              error={locationProblem === 'cityRequired' ? t('auth:profile.errorCity') : undefined}
              disabled={saving}
              selectClassName={`${selectCls} ${SELECT_CHEVRON_CLS}`}
              labelClassName={labelCls}
            />
            <div className="mt-2">
              <UseMyLocation onLocated={locate} onRequest={beginLocate} disabled={saving || locating} />
            </div>
            <p
              className={`text-sm mt-1.5 ${locationNote ? (locationNote.ok ? 'text-green-700' : 'text-red-600') : 'text-[#767676]'}`}
              role="status"
            >
              {locating ? t('profile:seeker.locationLookingUp') : (locationNote?.text ?? t('profile:seeker.locationHint'))}
            </p>
          </div>

          <TaxonomyPicker
            value={triple}
            onChange={(next) => {
              setTriple(next)
              if (error) setError('')
            }}
            required
            disabled={saving}
            className="space-y-6 mb-8"
            labelClassName={labelCls}
            selectClassName={`${selectCls} ${SELECT_ONLY_CHEVRON_CLS}`}
          />

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full min-h-[48px] bg-primary-50 text-primary-100 px-8 py-3 rounded-lg text-base hover:bg-primary-60 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-50"
          >
            {saving ? t('auth:completeProfile.saving') : t('auth:completeProfile.submit')}
          </button>
        </div>
      </main>
    </div>
  )
}

export default function CompleteProfilePage() {
  // `useSearchParams` (for returnUrl) needs a Suspense boundary or the static prerender of this
  // route fails at build time — same as /login and /change-password.
  return (
    <Suspense fallback={null}>
      <ProtectedRoute requiredRole="seeker">
        <CompleteProfileContent />
      </ProtectedRoute>
    </Suspense>
  )
}
