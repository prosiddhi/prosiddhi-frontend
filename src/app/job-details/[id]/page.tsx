'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Footer } from '@/components/home/Footer'
import { ApplyModal } from '@/components/job/ApplyModal'
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
  ChevronLeft,
  Phone,
  BookmarkCheck
} from 'lucide-react'

// Sample job data - in real app, this would come from API/database
const jobData = {
  id: '1',
  title: 'Engine Operator',
  company: 'TATA Steel and Iron Power Plant',
  companyInitials: 'TA',
  salary: '15,000 - 25,000',
  location: 'Bangalore, India',
  type: 'Full Time',
  industry: 'Steel Industry',
  postedTime: '15 minutes ago',
  description: [
    'Operation: Start up, shut down, and operate engines and associated systems (like generators, compressors, cooling systems) according to standard operating procedures (SOPs) and management directives.',
    'Monitoring: Observe gauges, meters, and system performance to ensure equipment is operating within specified parameters and to detect any malfunctions.',
    'Maintenance: Perform routine preventative maintenance, lubrication, and basic repairs on engines and related equipment to ensure reliability and prevent breakdowns.',
    'Safety: Adhere strictly to all safety regulations, including lockout/tagout procedures, and execute emergency protocols to protect personnel and equipment.',
    'Record Keeping: Accurately document operational data, fuel consumption, maintenance activities, and any reported issues.',
    'Troubleshooting: Identify and troubleshoot operational disturbances, malfunctions, or equipment failures, taking corrective action or reporting to senior staff.'
  ],
  qualifications: [
    'Mechanical aptitude and basic understanding of engine principles.',
    'Ability to follow complex instructions and safety procedures.',
    'Good communication skills for reporting issues and coordinating with teams.',
    'Physical fitness to perform tasks, potentially in challenging environments with loud noise or temperature variations.',
    'Often requires a high school diploma or equivalent, with vocational training or experience being a strong advantage.'
  ]
}

// Related jobs data
const relatedJobs = [
  {
    id: '2',
    title: 'Engine Operator',
    company: 'TATA Steel and Iron Power Plant',
    companyInitials: 'TA',
    type: 'Full Time',
    industry: 'Steel Industry',
    location: 'Bangalore, India'
  },
  {
    id: '3',
    title: 'Engine Operator',
    company: 'TATA Steel and Iron Power Plant',
    companyInitials: 'TA',
    type: 'Full Time',
    industry: 'Steel Industry',
    location: 'Bangalore, India'
  },
  {
    id: '4',
    title: 'Engine Operator',
    company: 'TATA Steel and Iron Power Plant',
    companyInitials: 'TA',
    type: 'Full Time',
    industry: 'Steel Industry',
    location: 'Bangalore, India'
  }
]

export default function JobDetailsPage() {
  const router = useRouter()
  const [isSaved, setIsSaved] = useState(false)
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false)

  const handleSaveJob = () => {
    setIsSaved(!isSaved)
  }

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
      <main className="flex-1 py-6 sm:py-8 lg:py-12">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px]">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-black hover:text-primary-50 transition-colors mb-6 sm:mb-8 lg:mb-10"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-base sm:text-lg">Back to Main Page</span>
          </button>

          {/* Job Header Card */}
          <div className="bg-white rounded-[10px] mb-8 sm:mb-10 lg:mb-12">
            <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-8">
              {/* Left Side - Job Info */}
              <div className="flex items-start gap-4 flex-1">
                <div className="w-[68px] h-[68px] sm:w-[78px] sm:h-[78px] bg-[#a9e5ff] rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-[32px] sm:text-[40px] font-semibold text-[#236987]">
                    {jobData.companyInitials}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-bold mb-2 sm:mb-3">
                    {jobData.title}
                  </h1>
                  <p className="text-base sm:text-lg lg:text-[18px] text-black mb-4 sm:mb-5">
                    {jobData.company}
                  </p>

                  {/* Salary */}
                  <div className="flex items-center gap-1 mb-4 sm:mb-5">
                    <IndianRupee className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-base sm:text-lg lg:text-[18px] font-medium">
                      {jobData.salary} Rupee/Monthly
                    </span>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    <div className="bg-[#efefef] px-3 sm:px-4 py-1.5 sm:py-2 rounded-full flex items-center gap-1.5">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-[#3386a9]" />
                      <span className="text-xs sm:text-sm text-black">{jobData.type}</span>
                    </div>
                    <div className="bg-[#efefef] px-3 sm:px-4 py-1.5 sm:py-2 rounded-full flex items-center gap-1.5">
                      <Briefcase className="w-3 h-3 sm:w-4 sm:h-4 text-[#3386a9]" />
                      <span className="text-xs sm:text-sm text-black">{jobData.industry}</span>
                    </div>
                    <div className="bg-[#efefef] px-3 sm:px-4 py-1.5 sm:py-2 rounded-full flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-[#3386a9]" />
                      <span className="text-xs sm:text-sm text-black">{jobData.location}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side - Actions */}
              <div className="flex flex-col items-end gap-4 lg:min-w-[300px]">
                <span className="text-sm sm:text-base text-black">
                  {jobData.postedTime}
                </span>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full lg:w-auto">
                  <button
                    onClick={handleSaveJob}
                    className={`px-4 sm:px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors min-w-[120px] ${
                      isSaved
                        ? 'bg-[#eeeeee] hover:bg-gray-200'
                        : 'bg-[#eeeeee] hover:bg-gray-200'
                    }`}
                  >
                    {isSaved ? (
                      <>
                        <BookmarkCheck className="w-5 h-5" />
                        <span className="text-sm sm:text-base">Saved</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-5 h-5" />
                        <span className="text-sm sm:text-base">Save</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setIsApplyModalOpen(true)}
                    className="px-4 sm:px-6 py-3 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors min-w-[140px] text-sm sm:text-base"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Job Description Section */}
          <section className="mb-8 sm:mb-10 lg:mb-12">
            <h2 className="text-xl sm:text-2xl lg:text-[32px] font-semibold mb-4 sm:mb-6">
              Job Description
            </h2>
            <ul className="space-y-3 sm:space-y-4">
              {jobData.description.map((item, index) => (
                <li key={index} className="flex gap-3 text-sm sm:text-base lg:text-[16px] leading-relaxed">
                  <span className="text-black mt-1.5">•</span>
                  <span className="flex-1 text-black">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Skills & Qualifications Section */}
          <section className="mb-8 sm:mb-10 lg:mb-12">
            <h2 className="text-xl sm:text-2xl lg:text-[32px] font-semibold mb-4 sm:mb-6">
              Skills & Qualifications
            </h2>
            <ul className="space-y-3 sm:space-y-4">
              {jobData.qualifications.map((item, index) => (
                <li key={index} className="flex gap-3 text-sm sm:text-base lg:text-[16px] leading-relaxed">
                  <span className="text-black mt-1.5">•</span>
                  <span className="flex-1 text-black">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-12 sm:mb-16 lg:mb-20">
            <button
              onClick={() => setIsApplyModalOpen(true)}
              className="px-6 sm:px-8 py-3 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors text-sm sm:text-base"
            >
              Apply
            </button>
            <button className="px-6 sm:px-8 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 text-sm sm:text-base">
              <Phone className="w-5 h-5" />
              Contact the Recruiter
            </button>
          </div>

          {/* Related Jobs Section */}
          <section>
            <h2 className="text-xl sm:text-2xl lg:text-[32px] font-semibold mb-6 sm:mb-8 lg:mb-10">
              Related Job
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
              {relatedJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/job-details/${job.id}`}
                  className="bg-white border border-[#dddddd] rounded-[10px] p-4 sm:p-5 lg:p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start gap-3 sm:gap-4 mb-4">
                    <div className="w-[48px] h-[48px] bg-[#a9e5ff] rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-[20px] font-semibold text-[#236987]">
                        {job.companyInitials}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold mb-1">
                        {job.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600">
                        {job.company}
                      </p>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    <div className="bg-[#efefef] px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#3386a9]" />
                      <span className="text-xs text-black">{job.type}</span>
                    </div>
                    <div className="bg-[#efefef] px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-[#3386a9]" />
                      <span className="text-xs text-black">{job.industry}</span>
                    </div>
                    <div className="bg-[#efefef] px-2.5 py-1 rounded-full flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#3386a9]" />
                      <span className="text-xs text-black">{job.location}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <Footer />

      {/* Apply Modal */}
      <ApplyModal
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        jobTitle={jobData.title}
        companyName={jobData.company}
      />
    </div>
  )
}
