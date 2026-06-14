'use client'

import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { UserDropdown } from '@/components/navigation/UserDropdown'
import { JobForm } from '@/components/job/JobForm'
import { employerAPI, type PostJobData } from '@/lib/api'
import { ChevronLeft } from 'lucide-react'

function NewJobContent() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (data: PostJobData) => {
    setSubmitting(true)
    setError('')
    try {
      await employerAPI.postJob(data)
      router.push('/employer/jobs')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish the job. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7fbfd] flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[119px] h-[65px] sm:h-[75px] flex items-center justify-between">
          <Link href="/employer/jobs" className="flex items-center">
            <div className="relative w-[100px] sm:w-[120px] lg:w-[142px] h-[28px] sm:h-[33px] lg:h-[39px]">
              <Image src="/assets/logo.png" alt="Job Portal Logo" fill className="object-contain" priority />
            </div>
          </Link>
          <UserDropdown />
        </div>
      </header>

      <main className="flex-1 py-8 sm:py-10 lg:py-12">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px]">
          <Link href="/employer/jobs" className="inline-flex items-center gap-2 text-black hover:text-primary-50 transition-colors mb-6">
            <ChevronLeft className="w-5 h-5" />
            <span>Back to My Jobs</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-bold text-black mb-6 sm:mb-8">Post a Job</h1>
          <JobForm submitLabel="Publish Job" submitting={submitting} error={error} onSubmit={handleSubmit} />
        </div>
      </main>
    </div>
  )
}

export default function NewJobPage() {
  return (
    <ProtectedRoute requiredRole="employer">
      <NewJobContent />
    </ProtectedRoute>
  )
}
