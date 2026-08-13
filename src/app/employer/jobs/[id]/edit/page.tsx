'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { UserDropdown } from '@/components/navigation/UserDropdown'
import { JobForm } from '@/components/job/JobForm'
import {
  jobSeekerAPI,
  employerAPI,
  type PostJobData,
  type JobTypeValue,
  type PaymentTypeValue,
  type UrgencyLevelValue,
} from '@/lib/api'
import { ChevronLeft, Loader2, AlertCircle } from 'lucide-react'

function EditJobContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const params = useParams()
  const jobId = Array.isArray(params.id) ? params.id[0] : (params.id as string)

  const [initial, setInitial] = useState<Partial<PostJobData> | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    const run = async () => {
      setLoading(true)
      setLoadError('')
      try {
        const job = await jobSeekerAPI.getJobDetails(jobId)
        if (ignore) return
        setInitial({
          title: job.title,
          description: job.description ?? '',
          category: job.category ?? '',
          sector: job.sector ?? undefined,
          jobTitle: job.jobTitle ?? undefined,
          requirements: job.requirements ?? undefined,
          skillsRequired: job.skillsRequired ?? [],
          location: job.location ?? '',
          latitude: job.latitude ?? undefined,
          longitude: job.longitude ?? undefined,
          radius: job.radius ?? undefined,
          salaryMin: job.salaryMin ?? undefined,
          salaryMax: job.salaryMax ?? undefined,
          paymentType: (job.paymentType as PaymentTypeValue) ?? undefined,
          jobType: (job.jobType as JobTypeValue) ?? undefined,
          urgencyLevel: (job.urgencyLevel as UrgencyLevelValue) ?? undefined,
          duration: job.duration ?? undefined,
          numberOfPositions: job.numberOfPositions ?? undefined,
          expiresAt: job.expiresAt ?? undefined,
          companyName: job.companyName ?? undefined,
          showEmailToSeekers: job.showEmailToSeekers ?? false,
          showPhoneToSeekers: job.showPhoneToSeekers ?? false,
        })
      } catch (err) {
        if (!ignore) setLoadError(err instanceof Error ? err.message : t('employer:jobEdit.loadFailed'))
      } finally {
        if (!ignore) setLoading(false)
      }
    }
    if (jobId) run()
    return () => {
      ignore = true
    }
  }, [jobId])

  const handleSubmit = async (data: PostJobData) => {
    setSubmitting(true)
    setError('')
    try {
      await employerAPI.updateJob(jobId, data)
      router.push('/employer/jobs')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('employer:jobEdit.saveFailed'))
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7fbfd] flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[119px] h-[65px] sm:h-[75px] flex items-center justify-between">
          <Link href="/employer/jobs" className="flex items-center">
            <div className="relative w-[100px] sm:w-[120px] lg:w-[142px] h-[28px] sm:h-[33px] lg:h-[39px]">
              <Image src="/assets/prosiddhi-logo-horizontal.png" alt={t('employer:jobEdit.logoAlt')} fill className="object-contain" priority />
            </div>
          </Link>
          <UserDropdown />
        </div>
      </header>

      <main className="flex-1 py-8 sm:py-10 lg:py-12">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px]">
          <Link href="/employer/jobs" className="inline-flex items-center gap-2 text-black hover:text-primary-50 transition-colors mb-6">
            <ChevronLeft className="w-5 h-5" />
            <span>{t('employer:jobEdit.backToMyJobs')}</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-bold text-black mb-6 sm:mb-8">{t('employer:jobEdit.title')}</h1>

          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-[#717182]">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-primary-50" />
              <p>{t('employer:jobEdit.loading')}</p>
            </div>
          )}

          {!loading && loadError && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
              <p className="text-red-600 max-w-md">{loadError}</p>
            </div>
          )}

          {!loading && !loadError && initial && (
            <JobForm initial={initial} submitLabel={t('employer:jobEdit.submitLabel')} submitting={submitting} error={error} onSubmit={handleSubmit} />
          )}
        </div>
      </main>
    </div>
  )
}

export default function EditJobPage() {
  return (
    <ProtectedRoute requiredRole="employer">
      <EditJobContent />
    </ProtectedRoute>
  )
}
