'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, Loader2, RefreshCw } from 'lucide-react'
import { meAPI, type NotificationCategory, type NotificationPrefs } from '@/lib/api'
import { showToast } from '@/lib/toast'
import { ToggleSwitch } from '@/components/settings/ToggleSwitch'
import { cardCls, outlineBtnBaseCls, sectionHeadingCls, sectionHeadingIconCls } from '@/components/settings/formClasses'

/** A switch is either one of the BE categories or the separate WhatsApp consent. */
type PrefKey = NotificationCategory | 'WHATSAPP'

interface Row {
  key: PrefKey
  titleKey: string
  descKey: string
}

/** Applications and Verification read per role; Messages is the same for both. */
function rowsFor(isEmployer: boolean): Row[] {
  const role = isEmployer ? 'Employer' : 'Seeker'
  const rows: Row[] = [
    { key: 'APPLICATIONS', titleKey: 'applications', descKey: `applicationsDesc${role}` },
    { key: 'VERIFICATION', titleKey: 'verification', descKey: `verificationDesc${role}` },
  ]
  // Job posts and Billing are employer-only. The BE sends a seeker neither: JOB_POSTS covers
  // only job approval / rejection / review, and nobody bills a seeker. UI-only — the BE
  // accepts either category from any role.
  if (isEmployer) {
    rows.push({ key: 'JOB_POSTS', titleKey: 'jobPosts', descKey: 'jobPostsDesc' })
    rows.push({ key: 'BILLING', titleKey: 'billing', descKey: 'billingDesc' })
  }
  rows.push({ key: 'MESSAGES', titleKey: 'messages', descKey: 'messagesDesc' })
  return rows
}

function valueOf(prefs: NotificationPrefs, key: PrefKey): boolean {
  return key === 'WHATSAPP' ? prefs.whatsappConsent : prefs.categories[key]
}

function withValue(prefs: NotificationPrefs, key: PrefKey, value: boolean): NotificationPrefs {
  return key === 'WHATSAPP'
    ? { ...prefs, whatsappConsent: value }
    : { ...prefs, categories: { ...prefs.categories, [key]: value } }
}

/**
 * Notification preferences (R1-BE-03): which subjects reach the user by SMS / WhatsApp /
 * email / push, plus the separate WhatsApp consent. OTP codes are not a preference.
 */
export function NotificationPrefsSection({ isEmployer }: { isEmployer: boolean }) {
  const { t } = useTranslation()
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  // Keys with a save in flight. The ref is the synchronous guard (a double-tap can land
  // before the next render); the state only drives the disabled / busy look.
  const pendingRef = useRef(new Set<PrefKey>())
  const [pending, setPending] = useState<ReadonlySet<PrefKey>>(new Set())

  useEffect(() => {
    let ignore = false
    setPrefs(null)
    setLoadFailed(false)
    const run = async () => {
      try {
        const loaded = await meAPI.getNotificationPrefs()
        if (!ignore) setPrefs(loaded)
      } catch {
        if (!ignore) setLoadFailed(true)
      }
    }
    run()
    return () => {
      ignore = true
    }
  }, [reloadKey])

  const toggle = async (key: PrefKey, next: boolean) => {
    if (!prefs || pendingRef.current.has(key)) return
    const previous = valueOf(prefs, key)

    pendingRef.current.add(key)
    setPending(new Set(pendingRef.current))
    setPrefs((cur) => cur && withValue(cur, key, next))

    try {
      // Only the changed preference goes out.
      const saved = await meAPI.updateNotificationPrefs(
        key === 'WHATSAPP' ? { whatsappConsent: next } : { categories: { [key]: next } },
      )
      // Take only the key this request changed. The response is the full state as the BE
      // saw it when it answered, so another switch's value in it can be older than what the
      // user has since chosen (or what a later response already confirmed).
      pendingRef.current.delete(key)
      setPrefs((cur) => cur && withValue(cur, key, valueOf(saved, key)))
    } catch {
      pendingRef.current.delete(key)
      setPrefs((cur) => cur && withValue(cur, key, previous))
      showToast(t('settings.notifications.updateFailed'), 'error')
    } finally {
      setPending(new Set(pendingRef.current))
    }
  }

  const loading = prefs === null && !loadFailed
  const whatsappLabel = isEmployer
    ? t('employerRegister:account.whatsappConsentLabel')
    : t('auth:password.whatsappConsentLabel')

  return (
    <section className={cardCls} aria-labelledby="notificationPrefsTitle" aria-busy={loading}>
      <h2 id="notificationPrefsTitle" className={sectionHeadingCls + ' mb-1'}>
        <Bell className={sectionHeadingIconCls} /> {t('settings.notifications.title')}
      </h2>
      <p className="text-sm text-[#717182] mb-2">{t('settings.notifications.description')}</p>

      {loading && (
        <div role="status" className="flex items-center justify-center gap-2 py-6 text-sm text-[#717182]">
          <Loader2 className="w-4 h-4 animate-spin" />
          {t('status.loading')}
        </div>
      )}

      {loadFailed && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-3">
          <p role="alert" className="text-sm text-error-600">{t('settings.notifications.loadFailed')}</p>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className={`${outlineBtnBaseCls} border border-primary-50 text-primary-50 hover:bg-primary-50 hover:text-primary-100 focus-visible:ring-primary-50`}
          >
            <RefreshCw className="w-4 h-4" />
            {t('buttons.retry')}
          </button>
        </div>
      )}

      {prefs && (
        <>
          <ul className="divide-y divide-[#eee]">
            {rowsFor(isEmployer).map((row) => (
              <li key={row.key}>
                <ToggleSwitch
                  label={t(`settings.notifications.${row.titleKey}`)}
                  description={t(`settings.notifications.${row.descKey}`)}
                  checked={valueOf(prefs, row.key)}
                  busy={pending.has(row.key)}
                  onChange={(next) => toggle(row.key, next)}
                />
              </li>
            ))}
            <li>
              <ToggleSwitch
                label={whatsappLabel}
                description={t('settings.notifications.whatsappDesc')}
                checked={prefs.whatsappConsent}
                busy={pending.has('WHATSAPP')}
                onChange={(next) => toggle('WHATSAPP', next)}
              />
            </li>
          </ul>
          <p className="text-sm text-[#717182] mt-3 pt-3 border-t border-[#eee]">
            {t('settings.notifications.otpNote')}
          </p>
        </>
      )}
    </section>
  )
}
