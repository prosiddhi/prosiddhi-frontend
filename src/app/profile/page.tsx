'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useState, useEffect, useRef, useCallback, useMemo, ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import Image from 'next/image'
import Link from 'next/link'
import { UserDropdown } from '@/components/navigation/UserDropdown'
import { DocumentsSection } from '@/components/profile/DocumentsSection'
import { useAuth } from '@/contexts/AuthContext'
import {
  jobSeekerAPI,
  resolveMediaUrl,
  type SeekerProfile,
  type ProfileWorkExperience,
  type JobSeekerSkillLink,
  type SkillCatalogItem,
  type TaxonomyTriple,
} from '@/lib/api'
import { LANGUAGES } from '@/lib/jobCategories'
import { coordsToWrite, cityLabelKey, type Coords } from '@/lib/cities'
import { UseMyLocation } from '@/components/location/UseMyLocation'
import { TaxonomyPicker } from '@/components/taxonomy/TaxonomyPicker'
import { VoiceButton } from '@/components/feedback/VoiceButton'
import {
  Camera,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Search,
} from 'lucide-react'
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'
import { nameProblem } from '@/lib/nameValidation'

// Local editable work-experience row (carries a stable key for the list).
interface ExpRow extends ProfileWorkExperience {
  key: string
}

const SEEKER_DOC_TYPES = [
  { value: 'IDENTITY_PROOF', label: 'Identity Proof' },
  { value: 'ADDRESS_PROOF', label: 'Address Proof' },
  { value: 'EDUCATION_CERTIFICATE', label: 'Education Certificate' },
  { value: 'SKILL_CERTIFICATE', label: 'Skill Certificate' },
  { value: 'OTHER', label: 'Other' },
] as const

// ISO datetime → yyyy-mm-dd for <input type="date">.
function toDateInput(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

let rowSeq = 0
const newKey = () => `row-${rowSeq++}`

function SeekerProfileContent() {
  const { t } = useTranslation()
  const { user, updateUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saved, setSaved] = useState(false)

  // Profile fields
  const [jobSeekerId, setJobSeekerId] = useState<string | null>(null)
  const [photo, setPhoto] = useState<string | null>(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')
  // TD-02. `savedCoords` is what the server holds; `gpsFix` is a precise fix
  // taken during THIS edit and not yet saved.
  const [savedCoords, setSavedCoords] = useState<Coords | null>(null)
  const [gpsFix, setGpsFix] = useState<Coords | null>(null)
  const [triple, setTriple] = useState<TaxonomyTriple>({})
  const [language, setLanguage] = useState('en')
  const [experiences, setExperiences] = useState<ExpRow[]>([])
  const photoRef = useRef<HTMLInputElement>(null)
  // Original name — the DEF-030 rule fires only on an edit, never on a legacy
  // value the server sent us. See the note in handleSave.
  const originalFullName = useRef('')

  const hydrate = useCallback((p: SeekerProfile) => {
    const js = p.jobSeeker
    setJobSeekerId(js?.id ?? null)
    setPhoto(js?.profilePhoto ?? null)
    setFullName(js?.fullName ?? '')
    originalFullName.current = (js?.fullName ?? '').trim()
    setBio(js?.bio ?? '')
    setLocation(js?.location ?? '')
    // Stored coordinates are all-or-nothing — the backend writes both or neither.
    const lat = js?.latitude
    const lon = js?.longitude
    setSavedCoords(lat != null && lon != null ? { lat, lon } : null)
    // A fix belongs to the edit session that took it, not to the record we just
    // loaded, so a re-fetch after saving clears it.
    setGpsFix(null)
    setTriple({
      category: js?.preferredCategory || undefined,
      sector: js?.preferredSector || undefined,
      jobTitle: js?.preferredJobTitle || undefined,
    })
    setLanguage(p.preferredLanguage ?? 'en')
    setExperiences(
      (js?.workExperience ?? []).map((w) => ({
        key: newKey(),
        position: w.position ?? '',
        companyName: w.companyName ?? '',
        startDate: toDateInput(w.startDate),
        endDate: toDateInput(w.endDate),
        currentlyWorking: w.currentlyWorking ?? false,
        description: w.description ?? '',
      }))
    )
  }, [])

  useEffect(() => {
    let ignore = false
    const run = async () => {
      setLoading(true)
      setLoadError('')
      try {
        const p = await jobSeekerAPI.getProfile()
        if (!ignore) hydrate(p)
      } catch (err) {
        if (!ignore) setLoadError(err instanceof Error ? err.message : t('profile:seeker.loadError'))
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    run()
    return () => {
      ignore = true
    }
  }, [hydrate])

  const handlePhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (photoRef.current) photoRef.current.value = ''
    if (!file) return
    setPhotoUploading(true)
    setSaveError('')
    try {
      const res = await jobSeekerAPI.updateProfilePhoto(file)
      setPhoto(res.profilePhoto)
      // Keep the header avatar in step with the new photo.
      updateUser({ profile: { ...user?.profile, profilePhoto: res.profilePhoto } })
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('profile:seeker.photoError'))
    } finally {
      setPhotoUploading(false)
    }
  }

  const setExp = (key: string, field: keyof ProfileWorkExperience, value: string | boolean) => {
    setExperiences((rows) =>
      rows.map((r) => (r.key === key ? { ...r, [field]: value } : r))
    )
  }
  const addExp = () =>
    setExperiences((rows) => [
      ...rows,
      { key: newKey(), position: '', companyName: '', startDate: '', endDate: '', currentlyWorking: false, description: '' },
    ])
  const removeExp = (key: string) => setExperiences((rows) => rows.filter((r) => r.key !== key))

  // The coordinate this save would write, if any (TD-02). The rule itself lives
  // in @/lib/cities because the employer job form needs exactly the same one —
  // see coordsToWrite for why distance decides it and not the location text.
  //
  // Memoised because this sits in the body of a large form: without it, every
  // keystroke in the bio, the name or any experience row rebuilds the ten
  // translated city labels — ~10 t() calls and a Map — to recompute a value
  // that cannot have changed.
  const pendingFix = useMemo(
    () =>
      coordsToWrite({
        gpsFix,
        saved: savedCoords,
        text: location,
        translate: (key) => t(cityLabelKey(key)),
      }),
    [gpsFix, savedCoords, location, t]
  )

  const handleSave = async () => {
    // Clear BOTH banners before validating. The "Saved ✓" confirmation lingers for
    // a few seconds, so a guard that returns early without clearing it leaves the
    // green tick sitting next to the new red error — the screen says the save both
    // worked and failed.
    setSaveError('')
    setSaved(false)

    // Registration rejects a numeric name (DEF-030); without the same guard here
    // the rule is one edit away from being undone.
    //
    // Only on an EDIT. Validating the value the server sent would lock out any
    // account whose stored name predates this rule — and those exist, since the
    // backend mirror is still open, so "Test User 1" is creatable via the API
    // today. Such a user could not save ANY profile change, not even their bio,
    // and the error would point at a field they never touched.
    const problem = fullName.trim() !== originalFullName.current ? nameProblem(fullName) : null
    if (problem) {
      setSaveError(t(problem === 'tooShort' ? 'auth:profile.errorName' : 'auth:profile.errorNameLetters'))
      return
    }
    setSaving(true)
    try {
      // Only send rows with BOTH a position and a parseable startDate — the BE
      // requires both. workExperiences (when present) FULL-REPLACES server-side.
      const workExperiences = experiences
        .filter((r) => r.position.trim() && r.startDate)
        .map((r) => ({
          position: r.position.trim(),
          companyName: r.companyName?.trim() || undefined,
          startDate: r.startDate as string,
          endDate: r.currentlyWorking ? undefined : r.endDate || undefined,
          currentlyWorking: !!r.currentlyWorking,
          description: r.description?.trim() || undefined,
        }))

      await jobSeekerAPI.updateProfile({
        fullName: fullName.trim() || undefined,
        bio: bio.trim() || undefined,
        location: location.trim() || undefined,
        // TD-02. The backend has accepted these for months and this client never
        // sent them, so every seeker carried a null coordinate: "Near By" returned
        // nothing for everybody and the 20-point location component of the
        // recommendation score was always 0. Sent as undefined (dropped by
        // JSON.stringify) when there is no fix — the BE schema is `.optional()`,
        // NOT `.nullable()`, so an explicit null is a 400.
        latitude: pendingFix?.lat,
        longitude: pendingFix?.lon,
        preferredCategory: triple.category || undefined,
        preferredSector: triple.sector || undefined,
        preferredJobTitle: triple.jobTitle || undefined,
        preferredLanguage: language || undefined,
        workExperiences,
      })
      // PUT returns the bare record; re-fetch the wrapped profile to refresh state.
      const fresh = await jobSeekerAPI.getProfile()
      hydrate(fresh)
      // The header reads the name from the session user, so a rename here has to
      // land there too — otherwise the old name sticks until the next login.
      updateUser({
        profile: {
          ...user?.profile,
          fullName: fresh.jobSeeker?.fullName,
          profilePhoto: fresh.jobSeeker?.profilePhoto,
        },
      })
      setSaved(true)
      window.setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : t('profile:seeker.saveError'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7fbfd] flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[119px] h-[65px] sm:h-[75px] flex items-center justify-between">
          <Link href="/job-feed" className="flex items-center min-h-[44px]">
            <div className="relative w-[100px] sm:w-[120px] lg:w-[142px] h-[28px] sm:h-[33px] lg:h-[39px]">
              <Image src="/assets/prosiddhi-logo-horizontal.png" alt={t('app.name')} fill className="object-contain" priority />
            </div>
          </Link>
          <UserDropdown />
        </div>
      </header>

      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px] pt-4">
        <Breadcrumbs />
      </div>


      <main className="flex-1 py-8 sm:py-10 lg:py-12">
        <div className="max-w-[900px] mx-auto px-4 sm:px-6">
          <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-bold text-black mb-6 sm:mb-8">{t('profile:seeker.heading')}</h1>

          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-[#717182]">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary-50" />
              <p>{t('profile:seeker.loading')}</p>
            </div>
          )}

          {!loading && loadError && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
              <p className="text-red-600 max-w-md">{loadError}</p>
            </div>
          )}

          {!loading && !loadError && (
            <div className="space-y-6">
              {/* Basic details */}
              <section className="bg-white border border-[#dddddd] rounded-[10px] p-5 sm:p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative w-20 h-20 rounded-full bg-[#a9e5ff] overflow-hidden flex items-center justify-center flex-shrink-0">
                    {photo ? (
                      <Image src={resolveMediaUrl(photo)} alt="Profile photo" fill className="object-cover" />
                    ) : (
                      <span className="text-2xl font-semibold text-[#236987]">
                        {(fullName || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handlePhoto} className="hidden" />
                    <button
                      type="button"
                      onClick={() => photoRef.current?.click()}
                      disabled={photoUploading}
                      className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors disabled:opacity-60"
                    >
                      {photoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                      {photoUploading ? t('profile:seeker.uploading') : t('profile:seeker.changePhoto')}
                    </button>
                    <p className="text-xs text-[#717182] mt-1">{t('profile:seeker.photoHint')}</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label={t('profile:seeker.fullName')}>
                    <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t('profile:seeker.fullNamePlaceholder')} className={inputCls} />
                  </Field>
                  <Field label={t('profile:seeker.location')}>
                    {/* Typing must NOT discard a fix already taken: pressing the
                        button and then naming your area is the ordinary way to
                        use this, and clearing here threw the good coordinate
                        away and saved nothing. */}
                    <input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder={t('profile:seeker.locationPlaceholder')}
                      className={inputCls}
                    />
                    <UseMyLocation onLocated={setGpsFix} className="mt-2" />
                    {/* Three states, and the difference matters: the coordinate
                        is invisible, so this line is the only feedback there is.
                        It must never call an unsaved change saved. */}
                    <p className={`text-xs mt-1.5 ${pendingFix || savedCoords ? 'text-green-700' : 'text-[#717182]'}`}>
                      {t(
                        pendingFix
                          ? 'profile:seeker.locationCaptured'
                          : savedCoords
                          ? 'profile:seeker.locationOn'
                          : 'profile:seeker.locationOff'
                      )}
                    </p>
                  </Field>
                  {/* Preferred Category → Sector → JobTitle (PJP-112). */}
                  <TaxonomyPicker
                    value={triple}
                    onChange={setTriple}
                    className="sm:col-span-2 grid sm:grid-cols-3 gap-4"
                    selectClassName={inputCls}
                    labelClassName="text-sm font-medium text-black mb-1.5 block"
                  />
                  <Field label={t('profile:seeker.preferredLanguage')}>
                    <select value={language} onChange={(e) => setLanguage(e.target.value)} className={inputCls}>
                      {LANGUAGES.map((l) => (
                        <option key={l.value} value={l.value}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={t('profile:seeker.aboutYou')} full>
                    <textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} rows={3} placeholder={t('profile:seeker.aboutYouPlaceholder')} className="w-full px-3 py-2 border border-[#b5b5b5] rounded-lg text-sm text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all resize-none" />
                  </Field>
                </div>
              </section>

              {/* Work experience */}
              <section className="bg-white border border-[#dddddd] rounded-[10px] p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg sm:text-xl font-semibold text-black flex items-center gap-2">
                    {t('profile:seeker.workExperience')}
                    <VoiceButton label={t('profile:seeker.workExperienceVoiceLabel')} iconClassName="w-4 h-4 text-gray-500" className="p-1" />
                  </h2>
                  <button type="button" onClick={addExp} className="inline-flex items-center gap-1.5 min-h-[44px] text-sm text-primary-50 hover:text-primary-60">
                    <Plus className="w-4 h-4" /> {t('profile:seeker.add')}
                  </button>
                </div>
                {experiences.length === 0 ? (
                  <p className="text-sm text-[#717182]">{t('profile:seeker.noExperience')}</p>
                ) : (
                  <div className="space-y-5">
                    {experiences.map((exp) => (
                      <div key={exp.key} className="border border-[#eee] rounded-lg p-4 relative">
                        <button
                          type="button"
                          onClick={() => removeExp(exp.key)}
                          className="absolute top-3 right-3 text-gray-400 hover:text-red-500"
                          aria-label={t('profile:seeker.removeExperience')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <Field label={t('profile:seeker.position')}>
                            <input value={exp.position} onChange={(e) => setExp(exp.key, 'position', e.target.value)} placeholder={t('profile:seeker.positionPlaceholder')} className={inputCls} />
                          </Field>
                          <Field label={t('profile:seeker.company')}>
                            <input value={exp.companyName ?? ''} onChange={(e) => setExp(exp.key, 'companyName', e.target.value)} placeholder={t('profile:seeker.companyPlaceholder')} className={inputCls} />
                          </Field>
                          <Field label={t('profile:seeker.startDate')}>
                            <input type="date" value={exp.startDate ?? ''} onChange={(e) => setExp(exp.key, 'startDate', e.target.value)} className={inputCls} />
                          </Field>
                          <Field label={t('profile:seeker.endDate')}>
                            <input
                              type="date"
                              value={exp.endDate ?? ''}
                              disabled={exp.currentlyWorking}
                              onChange={(e) => setExp(exp.key, 'endDate', e.target.value)}
                              className={`${inputCls} disabled:bg-gray-100`}
                            />
                          </Field>
                        </div>
                        <label className="flex items-center gap-2 mt-3 text-sm text-[#4d4d4d]">
                          <input
                            type="checkbox"
                            checked={!!exp.currentlyWorking}
                            onChange={(e) => setExp(exp.key, 'currentlyWorking', e.target.checked)}
                            className="w-4 h-4 accent-primary-50"
                          />
                          {t('profile:seeker.currentlyWorking')}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-[#717182] mt-3">{t('profile:seeker.experienceHint')}</p>
              </section>

              {/* Save bar for profile + experience */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors disabled:opacity-60"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? t('profile:seeker.saving') : t('buttons.saveChanges')}
                </button>
                {saved && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-green-700">
                    <CheckCircle2 className="w-4 h-4" /> {t('profile:seeker.saved')}
                  </span>
                )}
                {saveError && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-red-600">
                    <AlertCircle className="w-4 h-4" /> {saveError}
                  </span>
                )}
              </div>

              {/* Documents */}
              <section className="bg-white border border-[#dddddd] rounded-[10px] p-5 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-black mb-4">{t('profile:seeker.documents')}</h2>
                <DocumentsSection
                  allowedTypes={[...SEEKER_DOC_TYPES]}
                  accept=".pdf,.jpg,.jpeg,.png"
                  list={jobSeekerAPI.listDocuments}
                  upload={jobSeekerAPI.uploadDocument}
                  remove={jobSeekerAPI.deleteDocument}
                />
              </section>

              {/* Skills */}
              <section className="bg-white border border-[#dddddd] rounded-[10px] p-5 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-black mb-4">{t('profile:seeker.skills')}</h2>
                {jobSeekerId === null ? (
                  <p className="text-sm text-[#717182]">{t('profile:seeker.skillsLocked')}</p>
                ) : (
                  <SkillsSection />
                )}
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// ---- Skills (my skills + catalog picker) ----------------------------------
function SkillsSection() {
  const { t } = useTranslation()
  const [mine, setMine] = useState<JobSeekerSkillLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [catalog, setCatalog] = useState<SkillCatalogItem[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadMine = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await jobSeekerAPI.getMySkills()
      setMine(Array.isArray(res) ? res : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : t('profile:seeker.skillsError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    loadMine()
  }, [loadMine])

  // Debounced catalog search while the picker is open.
  useEffect(() => {
    if (!showPicker) return
    let ignore = false
    setCatalogLoading(true)
    const t = window.setTimeout(async () => {
      try {
        const res = await jobSeekerAPI.getSkillsCatalog({ search: search.trim() || undefined, limit: 50 })
        if (!ignore) setCatalog(res.skills ?? [])
      } catch {
        if (!ignore) setCatalog([])
      } finally {
        if (!ignore) setCatalogLoading(false)
      }
    }, 300)
    return () => {
      ignore = true
      window.clearTimeout(t)
    }
  }, [search, showPicker])

  const mineSkillIds = new Set(mine.map((m) => m.skillId))

  const add = async (skillId: string) => {
    setBusyId(skillId)
    setError('')
    try {
      await jobSeekerAPI.addSkill(skillId)
      await loadMine()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('profile:seeker.addSkillError'))
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (link: JobSeekerSkillLink) => {
    setBusyId(link.id)
    setError('')
    try {
      await jobSeekerAPI.removeSkill(link.id)
      setMine((prev) => prev.filter((m) => m.id !== link.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : t('profile:seeker.removeSkillError'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      {error && (
        <div className="flex items-start gap-2 mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-[#717182] py-4">
          <Loader2 className="w-5 h-5 animate-spin" /> {t('profile:seeker.skillsLoading')}
        </div>
      ) : mine.length === 0 ? (
        <p className="text-sm text-[#717182] mb-3">{t('profile:seeker.noSkills')}</p>
      ) : (
        <div className="flex flex-wrap gap-2 mb-3">
          {mine.map((m) => (
            <span key={m.id} className="inline-flex items-center gap-1.5 bg-[#eaf6fd] text-[#236987] rounded-full pl-3 pr-2 py-1.5 text-sm">
              {m.skill?.name ?? t('profile:seeker.skillFallback')}
              <button
                type="button"
                onClick={() => remove(m)}
                disabled={busyId === m.id}
                aria-label={t('profile:seeker.removeSkill')}
                className="hover:text-red-600 disabled:opacity-50"
              >
                {busyId === m.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
              </button>
            </span>
          ))}
        </div>
      )}

      {!showPicker ? (
        <button type="button" onClick={() => setShowPicker(true)} className="inline-flex items-center gap-1.5 min-h-[44px] text-sm text-primary-50 hover:text-primary-60">
          <Plus className="w-4 h-4" /> {t('profile:seeker.addSkill')}
        </button>
      ) : (
        <div className="border border-[#eee] rounded-lg p-3 mt-2">
          <div className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('profile:seeker.searchSkills')}
                className="w-full h-10 pl-9 pr-3 border border-[#b5b5b5] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-50"
              />
            </div>
            <button type="button" onClick={() => setShowPicker(false)} className="text-sm text-[#717182] hover:text-black px-2">
              {t('profile:seeker.done')}
            </button>
          </div>
          {catalogLoading ? (
            <div className="flex items-center gap-2 text-[#717182] py-3 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> {t('profile:seeker.searching')}
            </div>
          ) : catalog.length === 0 ? (
            <p className="text-sm text-[#717182] py-2">{t('profile:seeker.noSkillsFound')}</p>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-48 overflow-auto">
              {catalog.map((s) => {
                const already = mineSkillIds.has(s.id)
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={already || busyId === s.id}
                    onClick={() => add(s.id)}
                    className="inline-flex items-center gap-1.5 border border-gray-300 rounded-full px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {busyId === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    {s.name}
                    {already && <span className="text-xs text-[#717182]">{t('profile:seeker.added')}</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---- small presentational helpers -----------------------------------------
const inputCls =
  'w-full h-11 px-3 border border-[#b5b5b5] rounded-lg text-sm text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all'

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="text-sm font-medium text-black mb-1.5 block">{label}</label>
      {children}
    </div>
  )
}

export default function SeekerProfilePage() {
  return (
    <ProtectedRoute requiredRole="seeker">
      <SeekerProfileContent />
    </ProtectedRoute>
  )
}
