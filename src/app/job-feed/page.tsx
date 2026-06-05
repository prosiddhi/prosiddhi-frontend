'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Footer } from '@/components/home/Footer'
import { UserDropdown } from '@/components/navigation/UserDropdown'
import {
  Search,
  MapPin,
  ChevronDown,
  Mail,
  Bell,
  Home,
  Briefcase,
  Bookmark,
  Languages,
  VolumeX,
  Clock,
  ChevronRight,
  ChevronLeft,
  SlidersHorizontal,
  IndianRupee
} from 'lucide-react'

// Sample job data
const jobsData = Array(10).fill({
  id: 1,
  title: 'Engine Operator',
  company: 'TATA Steel and Iron Power Plant',
  companyInitials: 'TA',
  salary: '15,000 - 25,000',
  location: 'Bangalore, India',
  type: 'Full Time',
  industry: 'Steel Industry',
  postedTime: '15 minutes ago'
})

export default function JobFeedPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [location, setLocation] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const totalPages = 4

  return (
    <div className="min-h-screen bg-white">
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
            <Link href="/job-feed" className="flex items-center gap-1 text-primary-50">
              <Briefcase className="w-[18px] h-[18px]" />
              <span className="text-[18px] font-medium">Job Feed</span>
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

      {/* Hero Section */}
      <section className="relative bg-[#f5fcff] py-12 sm:py-16 lg:py-20 overflow-hidden">
        {/* Background decoration - Rotated pattern */}
        <div className="absolute right-0 top-0 bottom-0 w-full lg:w-[760px] opacity-10 lg:opacity-20 pointer-events-none">
          <div className="relative w-full h-full">
            <div className="absolute inset-0" style={{ transform: 'rotate(270deg)', transformOrigin: 'center' }}>
              <Image
                src="/assets/job_feed.png"
                alt=""
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px]">
          {/* Title */}
          <div className="text-center mb-8 sm:mb-10 lg:mb-12">
            <h1 className="text-3xl sm:text-4xl lg:text-6xl xl:text-[72px] font-bold text-[#164e65] leading-tight mb-3 sm:mb-4">
              Find Jobs Near You
            </h1>
            <p className="text-sm sm:text-base lg:text-[16px] text-[#818181] max-w-2xl mx-auto">
              Look for job? Browse our latest job openings view and apply to you suitable job today
            </p>
          </div>

          {/* Search Bar */}
          <div className="bg-white rounded-lg shadow-[0px_5px_15px_0px_rgba(184,184,184,0.1)] p-3 sm:p-4 lg:p-[12px] max-w-[1408px] mx-auto">
            <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 lg:gap-5">
              {/* Job Title Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Job title or keyword"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 pl-10 pr-4 bg-[#f3f3f5] rounded-lg text-base placeholder:text-[#717182] focus:outline-none focus:ring-2 focus:ring-primary-50"
                />
              </div>

              {/* Location Selector */}
              <div className="flex-1 lg:max-w-[416px] relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full h-12 pl-10 pr-10 bg-[#f3f3f5] rounded-lg text-base text-[#717182] focus:outline-none focus:ring-2 focus:ring-primary-50 appearance-none cursor-pointer"
                >
                  <option value="">Select location</option>
                  <option value="bangalore">Bangalore</option>
                  <option value="delhi">Delhi</option>
                  <option value="mumbai">Mumbai</option>
                  <option value="pune">Pune</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              {/* Search Button */}
              <button className="h-12 px-6 sm:px-8 lg:px-[43px] bg-primary-50 text-white rounded-lg flex items-center justify-center gap-2 hover:bg-primary-60 transition-colors whitespace-nowrap">
                <Search className="w-5 h-5" />
                <span className="text-base">Search Jobs</span>
              </button>

              {/* Filter Button */}
              <button className="h-12 px-4 bg-[#dddddd] rounded-lg flex items-center justify-center gap-2 hover:bg-gray-300 transition-colors lg:w-auto">
                <SlidersHorizontal className="w-4 h-4" />
                <span className="text-base">Filter</span>
              </button>

              {/* Voice Button */}
              <button className="h-12 w-12 flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors">
                <VolumeX className="w-6 h-6 text-[#4d4d4d]" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Job Listings Section */}
      <section className="py-8 sm:py-12 lg:py-16">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-[120px]">
          {/* Section Header */}
          <div className="mb-6 sm:mb-8 lg:mb-10">
            <h2 className="text-xl sm:text-2xl lg:text-[24px] font-semibold mb-2">
              Recommended Job - <span className="font-normal">Based on your details</span>
            </h2>
            <p className="text-sm sm:text-base text-[#717182]">100 Results</p>
          </div>

          {/* Job Cards */}
          <div className="space-y-4 sm:space-y-5 lg:space-y-6">
            {jobsData.map((job, index) => (
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
                      {job.postedTime}
                    </span>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full lg:w-auto">
                      <button className="px-4 py-3 bg-[#eeeeee] rounded-lg flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors min-w-[140px]">
                        <Bookmark className="w-5 h-5" />
                        <span className="text-sm sm:text-base">Save the Job</span>
                      </button>
                      <Link
                        href={`/job-details/${job.id}`}
                        className="px-4 py-3 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors min-w-[140px] text-sm sm:text-base text-center"
                      >
                        View the Job
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex justify-center items-center gap-2 mt-8 sm:mt-10 lg:mt-12">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="w-6 h-6 flex items-center justify-center border border-[#dddddd] rounded bg-[#eeeeee] hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {[...Array(totalPages)].map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPage(index + 1)}
                className={`w-6 h-6 flex items-center justify-center rounded text-base transition-colors ${
                  currentPage === index + 1
                    ? 'bg-[#eeeeee] border border-[#dddddd]'
                    : 'hover:bg-gray-100'
                }`}
              >
                {index + 1}
              </button>
            ))}

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="w-6 h-6 flex items-center justify-center border border-[#dddddd] rounded bg-[#eeeeee] hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  )
}
