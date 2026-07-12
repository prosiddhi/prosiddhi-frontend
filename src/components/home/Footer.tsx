'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { COMPANY_LEGAL_NAME, currentYear } from '@/lib/legal'

/**
 * Footer — every link here goes somewhere real.
 *
 * It used to carry 11 links to routes that do not exist (Careers, Blog, Help
 * Centre, FAQ, About, Career Advice, Employer Resources, Pricing, …), plus four
 * `href="#"` social icons. Dead Privacy / Terms / Contact links are a compliance
 * problem for a product that takes payments and holds PII, so those three are now
 * real pages; everything else that led nowhere is gone rather than faked.
 *
 * Social icons were removed outright: we have no confirmed accounts to point at,
 * and an icon that goes nowhere is worse than no icon. Add them back with real
 * URLs when the business has them.
 *
 * Auth-gated destinations (job feed, post a job, …) are intentional: a logged-out
 * visitor is sent to /login, which is a real screen — not a 404.
 */
export function Footer() {
  const { t } = useTranslation('legal')

  const linkClass = 'hover:text-white transition-colors'

  return (
    <footer className="bg-[#232323] text-white py-[47px]">
      <div className="max-w-[1920px] mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-12 lg:gap-8 mb-[73px]">
          {/* Logo */}
          <div className="w-full lg:w-auto">
            <div className="relative w-[192px] h-[53px]">
              <Image
                src="/assets/footer_logo.png"
                alt={t('app.name', { ns: 'common' })}
                fill
                className="object-contain"
              />
            </div>
          </div>

          {/* Footer Links */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 lg:gap-[100px] flex-1">
            <div>
              <h3 className="text-[18px] mb-4">{t('footer.candidates')}</h3>
              <ul className="space-y-2 text-sm text-[rgba(255,255,255,0.7)]">
                <li><Link href="/job-feed" className={linkClass}>{t('footer.browseJobs')}</Link></li>
                <li><Link href="/saved-jobs" className={linkClass}>{t('footer.savedJobs')}</Link></li>
                <li><Link href="/my-applications" className={linkClass}>{t('footer.myApplications')}</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-[18px] mb-4">{t('footer.employers')}</h3>
              <ul className="space-y-2 text-sm text-[rgba(255,255,255,0.7)]">
                <li><Link href="/employer/jobs/new" className={linkClass}>{t('footer.postJob')}</Link></li>
                <li><Link href="/employer/workers" className={linkClass}>{t('footer.findWorkers')}</Link></li>
                <li><Link href="/employer/plans" className={linkClass}>{t('footer.pricing')}</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-[18px] mb-4">{t('footer.companyLegal')}</h3>
              <ul className="space-y-2 text-sm text-[rgba(255,255,255,0.7)]">
                <li><Link href="/contact" className={linkClass}>{t('footer.contact')}</Link></li>
                <li><Link href="/privacy" className={linkClass}>{t('footer.privacy')}</Link></li>
                <li><Link href="/terms" className={linkClass}>{t('footer.terms')}</Link></li>
              </ul>
            </div>
          </div>

          {/* Mobile app — honest about not having shipped yet, instead of two
              dead store buttons. */}
          <div className="w-full lg:w-auto lg:max-w-[340px]">
            <h3 className="text-xl sm:text-2xl font-medium mb-3 leading-tight">
              {t('footer.mobileTitle')}
            </h3>
            <p className="text-sm text-[rgba(255,255,255,0.7)] leading-relaxed">
              {t('footer.mobileBody')}
            </p>
          </div>
        </div>

        <div className="border-t border-white/10 pt-[18px] text-center">
          <p className="text-sm sm:text-base text-white">
            {t('footer.copyright', {
              year: currentYear(),
              company: COMPANY_LEGAL_NAME,
            })}
          </p>
        </div>
      </div>
    </footer>
  )
}
