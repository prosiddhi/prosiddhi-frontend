'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { X, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { authAPI, classifyRegisterError, employerAPI } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { invitePath, readInviteToken } from '@/lib/inviteToken'
import { useEmployerRegistration } from '../EmployerRegistrationContext'

// Mirrors the BE passwordRule (min 8 + upper + lower + digit).
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/

/**
 * Account details.
 *
 * The email moved OUT of this screen — it is collected and verified up front on
 * /contacts, because the backend requires both contacts verified before the
 * register call. What is left is the name/designation (individual only) and the
 * password. For an individual this is also the last step, so it registers and
 * logs in here; a business collects company details first.
 */
export default function AccountSetupPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { login } = useAuth()
  const { data, update, reset } = useEmployerRegistration()
  const isIndividual = data.companyType === 'individual'

  const [fullName, setFullName] = useState(data.fullName)
  const [designation, setDesignation] = useState(data.designation)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<string[]>([])
  const [needsReverify, setNeedsReverify] = useState(false)

  // Guard: both contacts must already be verified — register consumes both marks.
  useEffect(() => {
    if (!data.phoneVerified || !data.emailVerified) {
      router.replace('/employer/register/contacts')
    }
  }, [data.phoneVerified, data.emailVerified, router])

  const handleNext = async () => {
    if (isIndividual && fullName.trim().length < 2) {
      setError(t('employerRegister:account.nameTooShort'))
      return
    }
    if (!PASSWORD_RULE.test(password)) {
      setError(t('employerRegister:account.passwordWeak'))
      return
    }
    if (password !== confirmPassword) {
      setError(t('employerRegister:account.passwordMismatch'))
      return
    }

    // Held in memory only — never written to storage.
    update({ password, fullName: fullName.trim(), designation })

    // Corporate collects company details next, and registers there.
    if (!isIndividual) {
      router.push('/employer/register/company-details')
      return
    }

    try {
      setLoading(true)
      setError('')
      setFieldErrors([])
      setNeedsReverify(false)

      // Creates the account ACTIVE, with trial credits granted (1 post,
      // 3 downloads, 14 days). No verification step follows.
      await employerAPI.registerIndividual({
        email: data.email,
        password,
        fullName: fullName.trim(),
        phoneNumber: data.phoneNumber,
        designation: designation.trim() || undefined,
      })

      const result = await authAPI.login('employer', {
        identifier: data.email,
        password,
      })
      login(result.token, result.user)
      reset()

      // They may have started at a team invite (/invite/<token>) with no
      // account: registration is the detour, not the destination. Send them back
      // to finish it — the landing page auto-accepts and then hands them the
      // dashboard. The path is rebuilt from the stashed TOKEN, never a stored URL.
      const pendingInvite = readInviteToken()
      router.push(pendingInvite ? invitePath(pendingInvite) : '/employer')
    } catch (err) {
      const failure = classifyRegisterError(err)
      switch (failure.kind) {
        case 'fields':
          setFieldErrors(failure.fields.password ?? [])
          setError(
            failure.fields.password ? '' : Object.values(failure.fields).flat().join(' ')
          )
          break
        case 'phoneUnverified':
          // One message, three possible causes — never verified, mark already
          // consumed, or the phone belongs to an existing account. Re-verifying
          // is the only response that is right for all three; retrying the
          // register call would fail identically every time.
          setError(t('employerRegister:account.errorPhoneReverify'))
          setNeedsReverify(true)
          break
        case 'emailUnverified':
          setError(t('employerRegister:account.errorEmailUnverified'))
          setNeedsReverify(true)
          break
        case 'emailTaken':
          setError(t('employerRegister:account.errorEmailTaken'))
          break
        case 'phoneTaken':
          setError(t('employerRegister:account.errorPhoneTaken'))
          break
        default:
          setError(failure.message || t('employerRegister:account.createFailed'))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => router.push('/employer/register/verify')
  const handleClose = () => router.push('/')

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="relative bg-white border border-[#dedede] rounded-[10px] w-full max-w-[600px] px-6 sm:px-10 py-8 sm:py-10 shadow-xl max-h-[90vh] overflow-y-auto">
        <button onClick={handleClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded transition-colors" aria-label={t('employerRegister:closeAria')}>
          <X className="w-6 h-6 text-gray-600" />
        </button>

        <div className="w-full">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-semibold text-black mb-2">{t('employerRegister:title')}</h1>
            <p className="text-sm sm:text-base text-gray-600">{t('employerRegister:subtitle')}</p>
          </div>

          {error && (
            <div role="alert" className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
              {needsReverify && (
                <button
                  type="button"
                  onClick={() => router.push('/employer/register/verify')}
                  className="mt-3 text-sm font-semibold text-primary-50 underline hover:text-primary-60"
                >
                  {t('employerRegister:account.reverifyContacts')}
                </button>
              )}
            </div>
          )}

          <div className="mb-8 space-y-6">
            {isIndividual && (
              <>
                <div>
                  <label htmlFor="fullName" className="block text-base sm:text-lg font-medium text-black mb-3">
                    {t('employerRegister:account.fullName')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); if (error) setError('') }}
                    placeholder={t('employerRegister:account.fullNamePlaceholder')}
                    disabled={loading}
                    className="w-full h-12 sm:h-14 px-4 border border-gray-300 rounded-lg text-base text-black focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all disabled:opacity-50"
                  />
                </div>
                <div>
                  <label htmlFor="designation" className="block text-base sm:text-lg font-medium text-black mb-3">
                    {t('employerRegister:account.designation')} <span className="text-gray-400 text-sm">{t('employerRegister:account.designationOptional')}</span>
                  </label>
                  <input
                    id="designation"
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder={t('employerRegister:account.designationPlaceholder')}
                    disabled={loading}
                    className="w-full h-12 sm:h-14 px-4 border border-gray-300 rounded-lg text-base text-black focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all disabled:opacity-50"
                  />
                </div>
              </>
            )}

            {/* Email is NOT edited here — it was verified on /contacts and the
                register call consumes that verification, so changing it at this
                point would silently invalidate it. Shown read-only for
                confidence, with a link back to the step that can change it. */}
            <div>
              <p className="block text-base sm:text-lg font-medium text-black mb-1">
                {t('employerRegister:account.email')}
              </p>
              <p className="text-base text-black break-all">{data.email}</p>
              <button
                type="button"
                onClick={() => router.push('/employer/register/contacts')}
                className="mt-1 text-sm font-medium text-primary-50 hover:text-primary-60"
              >
                {t('employerRegister:account.changeEmail')}
              </button>
            </div>

            <div>
              <label htmlFor="password" className="block text-base sm:text-lg font-medium text-black mb-3">
                {t('employerRegister:account.password')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (error) setError('') }}
                  disabled={loading}
                  className="w-full h-12 sm:h-14 px-4 pr-12 border border-gray-300 rounded-lg text-base text-black focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all disabled:opacity-50"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="mt-2 text-xs sm:text-sm text-gray-500">{t('employerRegister:account.passwordHint')}</p>
              {/* Every rule the BE rejected — a weak password usually fails both
                  the length and the composition rule at once. */}
              {fieldErrors.length > 0 && (
                <ul role="alert" className="mt-2 list-disc pl-5 space-y-1">
                  {fieldErrors.map((message) => (
                    <li key={message} className="text-sm text-red-600">{message}</li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-base sm:text-lg font-medium text-black mb-3">
                {t('employerRegister:account.confirmPassword')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); if (error) setError('') }}
                  disabled={loading}
                  className="w-full h-12 sm:h-14 px-4 pr-12 border border-gray-300 rounded-lg text-base text-black focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all disabled:opacity-50"
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700">
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
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
              {loading ? t('employerRegister:account.creating') : isIndividual ? t('employerRegister:account.createAccount') : t('buttons.next')}
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
