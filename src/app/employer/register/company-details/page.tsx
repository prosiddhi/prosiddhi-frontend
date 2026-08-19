'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import Link from 'next/link'
import { authAPI, classifyRegisterError, employerAPI, type CompanySize } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { invitePath, readInviteToken } from '@/lib/inviteToken'
import { useEmployerRegistration } from '../EmployerRegistrationContext'

const SIZE_VALUES: CompanySize[] = [
  'SIZE_1_10',
  'SIZE_11_50',
  'SIZE_51_200',
  'SIZE_201_500',
  'SIZE_501_1000',
  'SIZE_1000_PLUS',
]

export default function CompanyDetailsPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { login } = useAuth()
  const { data, update, reset, hydrated } = useEmployerRegistration()
  const [form, setForm] = useState({
    companyName: data.companyName,
    companyEmail: data.companyEmail,
    companyAddress: data.companyAddress,
    companyFoundedDate: data.companyFoundedDate,
    companySize: data.companySize as CompanySize | '',
    gstNumber: data.gstNumber,
    registrationNumber: data.registrationNumber,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Stops the guard below judging a flow that has already succeeded.
  //
  // reset() empties the shared state while this page is still mounted, so the
  // guard re-read a blank `data`, saw companyType !== 'corporate' and replaced
  // the pending push with a bounce to /employer/register. For a corporate
  // employer that is the worst landing available: the account is
  // PENDING_DOCUMENTS, and the push they lost was the one carrying them to the
  // upload screen they must complete to be approved — which is also what starts
  // their 14-day trial clock.
  //
  // Per-page, not on the context: the provider outlives this page, and a
  // flow-wide flag would also disable the guards on steps a user can navigate
  // BACK into. Same fix as the seeker password step (4d65c71).
  const [accountCreated, setAccountCreated] = useState(false)

  // Guard: corporate only, both contacts verified, and a password chosen on the
  // previous step. The password is in memory only, so a hard refresh legitimately
  // sends them back to re-enter it.
  useEffect(() => {
    if (!hydrated || accountCreated) return
    if (data.companyType !== 'corporate') router.replace('/employer/register')
    else if (!data.phoneVerified || !data.emailVerified) {
      router.replace('/employer/register/contacts')
    } else if (!data.password) router.replace('/employer/register/account')
  }, [hydrated, accountCreated, data.companyType, data.phoneVerified, data.emailVerified, data.password, router])

  // Seed the company form from restored progress once, without clobbering typing.
  useEffect(() => {
    if (!hydrated) return
    setForm((prev) =>
      Object.values(prev).some(Boolean)
        ? prev
        : {
            companyName: data.companyName,
            companyEmail: data.companyEmail,
            companyAddress: data.companyAddress,
            companyFoundedDate: data.companyFoundedDate,
            companySize: data.companySize as CompanySize | '',
            gstNumber: data.gstNumber,
            registrationNumber: data.registrationNumber,
          }
    )
    // One-shot on hydrate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated])

  const set = (name: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    if (error) setError('')
  }

  const handleNext = async () => {
    if (!form.companyName.trim() || form.companyName.trim().length < 2) {
      setError(t('employerRegister:companyDetails.nameTooShort'))
      return
    }
    if (!form.companyEmail.includes('@')) {
      setError(t('employerRegister:companyDetails.emailInvalid'))
      return
    }
    if (form.companyAddress.trim().length < 5) {
      setError(t('employerRegister:companyDetails.addressTooShort'))
      return
    }
    if (!form.companyFoundedDate || isNaN(Date.parse(form.companyFoundedDate))) {
      setError(t('employerRegister:companyDetails.foundedInvalid'))
      return
    }
    if (!form.companySize) {
      setError(t('employerRegister:companyDetails.sizeRequired'))
      return
    }
    if (form.gstNumber.trim().length !== 15) {
      setError(t('employerRegister:companyDetails.gstInvalid'))
      return
    }
    if (!form.registrationNumber.trim()) {
      setError(t('employerRegister:companyDetails.cinRequired'))
      return
    }

    update({ ...form, companySize: form.companySize })

    try {
      setLoading(true)
      setError('')
      await employerAPI.registerBusiness({
        email: data.email,
        password: data.password,
        phoneNumber: data.phoneNumber,
        companyName: form.companyName.trim(),
        companyEmail: form.companyEmail.trim(),
        companyAddress: form.companyAddress.trim(),
        companyFoundedDate: form.companyFoundedDate,
        companySize: form.companySize,
        gstNumber: form.gstNumber.trim(),
        registrationNumber: form.registrationNumber.trim(),
      })

      // Creates the account PENDING_DOCUMENTS — no trial credits until an admin
      // approves the documents they upload next. Log in regardless: they need a
      // session to reach the upload screen at all.
      const result = await authAPI.login('employer', {
        identifier: data.email,
        password: data.password,
      })
      login(result.token, result.user)
      // Set alongside reset() — see the note on `accountCreated` above.
      setAccountCreated(true)
      reset()

      // Preserve the team-invite carry-through: they may have started at
      // /invite/<token> with no account. Rebuilt from the stashed TOKEN, never
      // from a stored URL.
      const pendingInvite = readInviteToken()
      router.push(
        pendingInvite ? invitePath(pendingInvite) : '/employer/register/under-review'
      )
    } catch (err) {
      const failure = classifyRegisterError(err)
      switch (failure.kind) {
        case 'fields':
          setError(Object.values(failure.fields).flat().join(' '))
          break
        case 'phoneUnverified':
          // Three causes, one message — see the account screen. Send them back
          // to re-verify rather than guessing which one it was.
          setError(t('employerRegister:account.errorPhoneReverify'))
          break
        case 'emailUnverified':
          setError(t('employerRegister:account.errorEmailUnverified'))
          break
        case 'emailTaken':
          setError(t('employerRegister:account.errorEmailTaken'))
          break
        case 'phoneTaken':
          setError(t('employerRegister:account.errorPhoneTaken'))
          break
        default:
          setError(failure.message || t('employerRegister:companyDetails.registerFailed'))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => router.push('/employer/register/account')
  const handleClose = () => router.push('/')

  const inputCls =
    'w-full h-12 px-4 border border-gray-300 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all disabled:opacity-50'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="relative bg-white border border-[#dedede] rounded-[10px] w-full max-w-[600px] px-6 sm:px-10 py-8 sm:py-10 shadow-xl max-h-[90vh] overflow-y-auto">
        <button onClick={handleClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded transition-colors z-10" aria-label={t('employerRegister:closeAria')}>
          <X className="w-6 h-6 text-gray-600" />
        </button>

        <div className="w-full">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-semibold text-black mb-2">{t('employerRegister:title')}</h1>
            <p className="text-sm sm:text-base text-gray-600">{t('employerRegister:companyDetails.subtitle')}</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-black mb-4">{t('employerRegister:companyDetails.sectionCompany')}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black mb-2">{t('employerRegister:companyDetails.companyName')} <span className="text-red-500">*</span></label>
                <input type="text" value={form.companyName} onChange={(e) => set('companyName', e.target.value)} placeholder={t('employerRegister:companyDetails.companyNamePlaceholder')} disabled={loading} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">{t('employerRegister:companyDetails.companyEmail')} <span className="text-red-500">*</span></label>
                <input type="email" value={form.companyEmail} onChange={(e) => set('companyEmail', e.target.value)} placeholder={t('employerRegister:companyDetails.companyEmailPlaceholder')} disabled={loading} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">{t('employerRegister:companyDetails.companyAddress')} <span className="text-red-500">*</span></label>
                <input type="text" value={form.companyAddress} onChange={(e) => set('companyAddress', e.target.value)} placeholder={t('employerRegister:companyDetails.companyAddressPlaceholder')} disabled={loading} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">{t('employerRegister:companyDetails.foundedDate')} <span className="text-red-500">*</span></label>
                <input type="date" value={form.companyFoundedDate} onChange={(e) => set('companyFoundedDate', e.target.value)} disabled={loading} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">{t('employerRegister:companyDetails.companySize')} <span className="text-red-500">*</span></label>
                <select value={form.companySize} onChange={(e) => set('companySize', e.target.value)} disabled={loading} className={inputCls}>
                  <option value="">{t('employerRegister:companyDetails.selectOption')}</option>
                  {SIZE_VALUES.map((value) => (
                    <option key={value} value={value}>{t(`employerRegister:companyDetails.sizeOptions.${value}`)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-2">{t('employerRegister:companyDetails.gstNumber')} <span className="text-red-500">*</span></label>
                <input type="text" value={form.gstNumber} onChange={(e) => set('gstNumber', e.target.value.toUpperCase())} placeholder={t('employerRegister:companyDetails.gstPlaceholder')} maxLength={15} disabled={loading} className={inputCls} />
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-black mb-4">{t('employerRegister:companyDetails.sectionRegistration')}</h2>
            <div>
              <label className="block text-sm font-medium text-black mb-2">{t('employerRegister:companyDetails.cin')} <span className="text-red-500">*</span></label>
              <input type="text" value={form.registrationNumber} onChange={(e) => set('registrationNumber', e.target.value)} placeholder={t('employerRegister:companyDetails.cinPlaceholder')} disabled={loading} className={inputCls} />
            </div>
          </div>

          <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
            <p className="text-sm text-secondary-70">
              {t('employerRegister:companyDetails.docsNotice')}
            </p>
          </div>

          <div className="flex items-center justify-between gap-4">
            <button onClick={handleBack} className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-base font-medium min-w-[100px]">
              {t('buttons.back')}
            </button>
            <button
              onClick={handleNext}
              disabled={loading}
              className="px-8 py-3 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base font-medium min-w-[120px]"
            >
              {loading ? t('employerRegister:account.creating') : t('employerRegister:account.createAccount')}
            </button>
          </div>

          <div className="text-center mt-6">
            <p className="text-sm sm:text-base">
              <span className="text-gray-600">{t('employerRegister:signInPrompt')}</span>
              <Link href="/login" className="font-semibold text-primary-50 hover:text-primary-60 transition-colors">{t('employerRegister:signInLink')}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
