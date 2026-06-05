'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Footer } from '@/components/home/Footer'
import { UserDropdown } from '@/components/navigation/UserDropdown'
import {
  Mail,
  Bell,
  Home,
  Briefcase,
  Bookmark,
  Languages,
  Clock,
  MapPin,
  IndianRupee,
  CheckCircle2
} from 'lucide-react'

// Sample applied jobs data with application status
const appliedJobsData = Array(5).fill(null).map((_, index) => ({
  id: index + 1,
  title: 'Engine Operator',
  company: 'TATA Steel and Iron Power Plant',
  companyInitials: 'TA',
  salary: '15,000 - 25,000',
  location: 'Bangalore, India',
  type: 'Full Time',
  industry: 'Steel Industry',
  appliedTime: '15 minutes ago',
  applicationDate: '2024-01-15',
  status: 'Applied' // Could be: Applied, Under Review, Interview Scheduled, Rejected, Accepted
}))

export default function MyApplicationsPage() {
  const [appliedJobs, setAppliedJobs] = useState(appliedJobsData)

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header/Navbar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[119px] h-[65px] sm:h-[75px] flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <div className="relative w-[100px] sm:w-[120px] lg:w-[142px] h-[28px] sm:h-[33px] lg:h-[39px]">
              <Image
                src="/assets/logo.png"
                alt="Job Portal Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden lg:flex items-center gap-8 xl:gap-11">
            <Link href="/" className="flex items-center gap-1 text-black hover:text-primary-50 transition-colors">
              <Home className="w-[18px] h-[18px]" />
              <span className="text-[18px]">Home</span>
            </Link>
            <Link href="/job-feed" className="flex items-center gap-1 text-black hover:text-primary-50 transition-colors">
              <Briefcase className="w-[18px] h-[18px]" />
              <span className="text-[18px]">Job Feed</span>
            </Link>
            <Link href="/saved-jobs" className="flex items-center gap-1 text-black hover:text-primary-50 transition-colors">
              <Bookmark className="w-[18px] h-[18px]" />
              <span className="text-[18px]">Saved Jobs</span>
            </Link>
            <button className="flex items-center gap-1 text-black hover:text-primary-50 transition-colors">
              <Languages className="w-[16px] h-[16px]" />
              <span className="text-[18px]">Languages: English</span>
            </button>
          </nav>

          {/* Right side - User profile */}
          <div className="flex items-center gap-4 sm:gap-6 lg:gap-8">
            <button className="hidden sm:block hover:text-primary-50 transition-colors">
              <Mail className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <button className="hidden sm:block hover:text-primary-50 transition-colors">
              <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <UserDropdown />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-8 sm:py-12 lg:py-16">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px]">
          {/* Page Header */}
          <div className="mb-8 sm:mb-10 lg:mb-12">
            <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-bold text-black mb-2">
              My Applications
            </h1>
            <p className="text-sm sm:text-base text-[#717182]">
              {appliedJobs.length > 0 ? `${appliedJobs.length < 10 ? '0' : ''}${appliedJobs.length}` : '00'} Applications
            </p>
          </div>

          {/* Applied Jobs List */}
          {appliedJobs.length > 0 ? (
            <div className="space-y-4 sm:space-y-5 lg:space-y-6">
              {appliedJobs.map((job, index) => (
                <div
                  key={index}
                  className="bg-white border border-[#dddddd] rounded-[10px] p-4 sm:p-6 lg:p-8 hover:shadow-lg transition-shadow"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
                    {/* Company Logo */}
                    <div className="flex items-start lg:items-center gap-4 flex-1">
                      <div className="w-[52px] h-[51px] bg-[#a9e5ff] rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-[24px] font-semibold text-[#236987]">
                          {job.companyInitials}
                        </span>
                      </div>

                      {/* Job Details */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg sm:text-xl lg:text-[24px] font-semibold mb-1 sm:mb-2">
                          {job.title}
                        </h3>
                        <p className="text-sm sm:text-base text-black mb-3 sm:mb-4">
                          {job.company}
                        </p>

                        {/* Salary */}
                        <div className="flex items-center gap-1 mb-3 sm:mb-4">
                          <IndianRupee className="w-4 h-4" />
                          <span className="text-xs sm:text-sm lg:text-[14px]">
                            {job.salary} Rupee/Monthly
                          </span>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2 sm:gap-3 lg:gap-5">
                          <div className="bg-[#efefef] px-3 py-1 rounded-full flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#3386a9]" />
                            <span className="text-xs text-black">{job.type}</span>
                          </div>
                          <div className="bg-[#efefef] px-3 py-1 rounded-full flex items-center gap-1">
                            <Briefcase className="w-3 h-3 text-[#3386a9]" />
                            <span className="text-xs text-black">{job.industry}</span>
                          </div>
                          <div className="bg-[#efefef] px-3 py-1 rounded-full flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#3386a9]" />
                            <span className="text-xs text-black">{job.location}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Side - Time and Actions */}
                    <div className="flex flex-col items-end gap-4 lg:min-w-[300px]">
                      <span className="text-sm sm:text-base text-black">
                        {job.appliedTime}
                      </span>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full lg:w-auto">
                        <div className="px-4 py-3 bg-[#22c55e] text-white rounded-lg flex items-center justify-center gap-2 min-w-[140px]">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="text-sm sm:text-base font-medium">Applied</span>
                        </div>
                        <Link
                          href={`/my-applications/${job.id}`}
                          className="px-4 py-3 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors min-w-[140px] text-sm sm:text-base text-center"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 lg:py-24">
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <Briefcase className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400" />
              </div>
              <h2 className="text-xl sm:text-2xl font-semibold text-black mb-3">
                No Applications Yet
              </h2>
              <p className="text-sm sm:text-base text-[#717182] mb-6 text-center max-w-md">
                Start applying to jobs and track your applications here.
              </p>
              <Link
                href="/job-feed"
                className="px-6 py-3 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors"
              >
                Browse Jobs
              </Link>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  )
}
