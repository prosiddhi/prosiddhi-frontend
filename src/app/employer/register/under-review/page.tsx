'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Clock, FileText } from 'lucide-react'

// Corporate employers land here after email-verify: accountStatus is
// PENDING_DOCUMENTS. They can browse + edit their profile, but POST /api/jobs is
// 403 until they upload GST/CIN/ISO docs and admin approves (flips to ACTIVE).
// The document-upload UI itself is a separate flow (BE POST /me/documents).
export default function EmployerUnderReviewPage() {
  const router = useRouter()
  const { t } = useTranslation()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
      <div className="bg-white border border-[#dedede] rounded-[20px] w-full max-w-[560px] px-6 sm:px-12 py-12 sm:py-14 shadow-xl text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 rounded-full bg-primary-10 flex items-center justify-center">
            <Clock className="w-10 h-10 text-primary-50" />
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-black mb-3">{t('employerRegister:underReview.title')}</h1>
        <p className="text-sm sm:text-base text-gray-600 mb-8 max-w-md mx-auto">
          {t('employerRegister:underReview.description')}
        </p>

        <div className="text-left bg-blue-50 border border-blue-100 rounded-lg p-4 mb-8 flex items-start gap-3">
          <FileText className="w-5 h-5 text-secondary-70 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-secondary-70">
            {t('employerRegister:underReview.browseNotice')}
          </p>
        </div>

        {/* The screen said "we're reviewing you" but never said where to upload the
            documents that unblock the review. That is the whole point of the page. */}
        <p className="text-sm text-[#717182] mb-3">
          {t('employerRegister:underReview.uploadDocsHint')}
        </p>
        <Link
          href="/employer/profile"
          className="block w-full px-8 py-3 mb-3 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors text-base font-medium text-center"
        >
          {t('employerRegister:underReview.uploadDocs')}
        </Link>

        <button
          onClick={() => router.push('/employer')}
          className="w-full px-8 py-3 border border-primary-50 text-primary-50 rounded-lg hover:bg-primary-50/5 transition-colors text-base font-medium"
        >
          {t('employerRegister:underReview.continueToDashboard')}
        </button>
      </div>
    </div>
  )
}
