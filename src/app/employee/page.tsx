'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Footer } from '@/components/home/Footer'
import {
  Search,
  MapPin,
  ChevronDown,
  UserPlus,
  LogIn,
  User,
  Building2,
  Languages,
  Volume2,
  Facebook,
  Instagram,
  Github,
  Linkedin,
  Phone,
} from 'lucide-react'

export default function EmployeeLandingPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [location, setLocation] = useState('')

  const categories = [
    { name: 'Construction', icon: '/assets/constructions.png' },
    { name: 'Automobile', icon: '/assets/farmer.png' },
    { name: 'Food Products', icon: '/assets/vacuum.png' },
    { name: 'Manufacturing', icon: '/assets/chef 1.png' },
    { name: 'Renewable Energy', icon: '/assets/pallete.png' },
    { name: 'Medical', icon: '/assets/courier.png' },
    { name: 'Common Works', icon: '/assets/mpv.png' },
    { name: 'Repair Service', icon: '/assets/restaurant.png' },
  ]

  const whyChooseUsFeatures = [
    {
      title: 'Your Language, Your Way',
      description: 'Look through and apply for jobs translating more than 12+ languages.',
      image: '/assets/474.svg',
    },
    {
      title: 'Easy to Use',
      description: 'Simple steps — no complicated forms.',
      image: '/assets/421.svg',
    },
    {
      title: 'Low Cost, Big Help',
      description: 'Find jobs with a small subscription that fits your budget.',
      image: '/assets/171.svg',
    },
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-[10px_10px_50px_0px_rgba(0,0,0,0.05)] h-[75px] fixed top-0 left-0 right-0 z-40">
        <div className="max-w-[1920px] mx-auto h-full px-12 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <div className="relative w-[142px] h-[39px]">
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
          <nav className="hidden lg:flex items-center gap-11 absolute left-1/2 -translate-x-1/2">
            <Link href="/job-feed" className="flex items-center gap-1 text-black text-[18px] hover:text-primary-50 transition-colors">
              <Search className="w-4 h-4" />
              <span>Find Jobs</span>
            </Link>

            <button className="flex items-center gap-1 text-black text-[18px] hover:text-primary-50 transition-colors">
              <Building2 className="w-4 h-4" />
              <span>Companies</span>
            </button>

            <button className="flex items-center gap-1 text-black text-[18px] hover:text-primary-50 transition-colors">
              <Languages className="w-4 h-4" />
              <span>Languages: English</span>
            </button>
          </nav>

          {/* Auth Buttons */}
          <div className="flex items-center gap-5">
            <button className="flex items-center gap-2 px-3 py-2 border border-secondary-70 rounded-lg text-base text-black hover:bg-secondary-10 transition-colors">
              <UserPlus className="w-4 h-4" />
              <span>Register</span>
            </button>

            <button className="flex items-center gap-2 px-3 py-2 bg-primary-50 rounded-lg text-base text-white hover:bg-primary-60 transition-colors">
              <LogIn className="w-5 h-5" />
              <span>Login</span>
            </button>

            <Link
              href="/employer"
              className="flex items-center gap-1 text-base text-black hover:text-primary-50 transition-colors"
            >
              <User className="w-4 h-4" />
              <span>Employer</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-[194px] pb-20 text-center">
        <div className="max-w-[1920px] mx-auto px-8">
          {/* Badge */}
          <div className="inline-flex items-center justify-center px-5 py-2 bg-white border border-gray-200 rounded-full mb-10">
            <span className="text-sm text-primary-50">Work Opportunities for Everyone</span>
          </div>

          {/* Title */}
          <h1 className="text-[72px] font-bold text-primary-90 leading-[78px] max-w-[940px] mx-auto mb-8">
            Find Jobs Near You — Easy and Fast
          </h1>

          {/* Subtitle */}
          <p className="text-xl text-gray-600 mb-[111px]">
            Search and apply for jobs in your language. No degree needed, just your effort.
          </p>

          {/* Search Bar */}
          <div className="max-w-[928px] mx-auto bg-white border-2 border-[#f4f4f4] rounded-lg p-3">
            <div className="flex items-center gap-2">
              {/* Job Search Input */}
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Job title or keyword"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full h-12 pl-10 pr-3 bg-[#f3f3f5] rounded-lg text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-50"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              </div>

              {/* Location Selector */}
              <div className="w-[215px] relative">
                <button className="w-full h-12 px-10 bg-[#f3f3f5] rounded-lg text-base text-gray-500 flex items-center justify-between hover:bg-gray-100 transition-colors">
                  <span>Select location</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              </div>

              {/* Search Button */}
              <Link href="/job-feed" className="px-[43px] py-3.5 bg-primary-50 text-white rounded-lg flex items-center gap-2 hover:bg-primary-60 transition-colors">
                <Search className="w-5 h-5" />
                <span className="text-base">Search Jobs</span>
              </Link>

              {/* Voice Search */}
              <button className="p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <Volume2 className="w-6 h-6 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20 bg-white">
        <div className="max-w-[1920px] mx-auto px-8">
          <h2 className="text-[40px] font-semibold text-center mb-4">Category</h2>
          <p className="text-base text-[#717182] text-center mb-12">
            Find the type of work you know best — start earning today
          </p>

          <div className="flex flex-wrap justify-center gap-5 max-w-[1730px] mx-auto">
            {categories.map((category, index) => (
              <div
                key={index}
                className="flex flex-col items-center justify-center w-[205px] px-9 py-8 border border-[#ebebeb] rounded-[10px] hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="w-[65px] h-[65px] mb-2 relative">
                  <Image src={category.icon} alt={category.name} fill className="object-contain" />
                </div>
                <span className="text-[22px] text-black text-center">{category.name}</span>
              </div>
            ))}
          </div>

          <div className="text-center mt-[74px]">
            <button className="px-3 py-2 border border-secondary-70 rounded-lg text-base text-black hover:bg-secondary-10 transition-colors">
              View More Category
            </button>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-20 bg-white">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-8">
          <h2 className="text-3xl sm:text-[40px] font-semibold text-center mb-4">How it Works</h2>
          <p className="text-sm sm:text-base text-[#717182] text-center mb-12 sm:mb-[105px] px-4">
            Getting a job is now simple — just follow these steps.
          </p>

          <div className="flex flex-col lg:flex-row justify-center items-center lg:items-stretch gap-8 lg:gap-[75px] max-w-[1400px] mx-auto">
            {/* Step 1 */}
            <div className="bg-neutral-50 border-4 border-white rounded-[20px] p-8 sm:p-12 w-full max-w-[425px] min-h-[400px] sm:min-h-[425px] relative shadow-lg lg:transform lg:-rotate-[5deg] flex flex-col">
              {/* Register/Login Buttons - Inside box at top-left with rounded container */}
              <div className="mb-auto pb-8">
                <div className="bg-white border border-[#efefef] rounded-r-[32px] px-6 sm:px-7 py-3.5 sm:py-3.5 flex items-center gap-3 w-fit lg:transform lg:rotate-[5deg] -ml-8 sm:-ml-12">
                  <button className="px-3 py-2 border border-secondary-70 rounded-lg text-sm sm:text-base text-black whitespace-nowrap">
                    Register
                  </button>
                  <button className="px-3 py-2 bg-primary-50 text-white rounded-lg text-sm sm:text-base flex items-center gap-2 whitespace-nowrap">
                    <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
                    Login
                  </button>
                </div>
              </div>

              {/* Content at bottom */}
              <div className="lg:transform lg:rotate-[5deg] text-left">
                <p className="text-[#717182] text-lg sm:text-xl font-semibold mb-2">Step 1</p>
                <h3 className="text-[28px] sm:text-[32px] font-semibold mb-2 leading-tight">
                  Create your profile
                </h3>
                <p className="text-xl sm:text-2xl text-black leading-snug">
                  Just your name, skill, and phone number.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-neutral-50 border-4 border-white rounded-[20px] p-8 sm:p-12 w-full max-w-[425px] min-h-[400px] sm:min-h-[425px] shadow-lg flex flex-col items-center justify-center">
              <div className="w-24 h-24 sm:w-[136px] sm:h-[136px] mb-6 sm:mb-8 relative flex-shrink-0">
                <Image
                  src="/assets/recruitment.png"
                  alt="Get Matched"
                  fill
                  className="object-contain"
                />
              </div>
              <p className="text-[#717182] text-base sm:text-xl font-semibold mb-2">Step 2</p>
              <h3 className="text-2xl sm:text-[32px] font-semibold mb-2 text-center leading-tight">
                Get Matched Instantly
              </h3>
              <p className="text-lg sm:text-2xl text-black text-center">
                Get job matches — See work near your area.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-neutral-50 border-4 border-white rounded-[20px] p-8 sm:p-12 w-full max-w-[425px] min-h-[400px] sm:min-h-[425px] shadow-lg relative lg:transform lg:rotate-[7deg] flex flex-col">
              <div className="absolute top-8 sm:top-12 right-8 sm:right-12 w-24 h-24 sm:w-[136px] sm:h-[136px] flex-shrink-0">
                <Image
                  src="/assets/success_1.png"
                  alt="Apply & Connect"
                  width={136}
                  height={136}
                  className="object-contain"
                />
              </div>
              <div className="lg:transform lg:-rotate-[7deg] text-left mt-32 sm:mt-40 flex-1 flex flex-col justify-end">
                <p className="text-[#717182] text-base sm:text-xl font-semibold mb-2">Step 3</p>
                <h3 className="text-2xl sm:text-[32px] font-semibold mb-2 leading-tight">
                  Apply & Connect
                </h3>
                <p className="text-lg sm:text-2xl text-black">
                  Apply & Connect — Talk to employers directly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-20 bg-white">
        <div className="max-w-[1920px] mx-auto px-8">
          <h2 className="text-[40px] font-semibold text-center mb-4">Why Choose Us</h2>
          <p className="text-base text-[#717182] text-center mb-[115px]">
            We make job searching easy, safe, and in your language
          </p>

          {/* Feature 1 - Language Support */}
          <div className="flex items-center gap-16 mb-[260px] max-w-[1600px] mx-auto">
            <div className="flex-1 relative h-[454px]">
              <Image
                src="/assets/474.svg"
                alt="Your Language, Your Way"
                fill
                className="object-contain object-left"
              />
            </div>
            <div className="flex-1 max-w-[594px]">
              <p className="text-2xl text-[#767676] mb-[42px]">Your Language, Your Way</p>
              <h3 className="text-[36px] font-medium leading-normal">
                Look through and apply for jobs translating more than 12+ languages.
              </h3>
            </div>
          </div>

          {/* Feature 2 - Easy to Use */}
          <div className="flex items-center gap-16 mb-[163px] max-w-[1600px] mx-auto flex-row-reverse">
            <div className="flex-1 relative h-[490px]">
              <Image
                src="/assets/421.svg"
                alt="Easy to Use"
                fill
                className="object-contain object-right"
              />
            </div>
            <div className="flex-1 max-w-[594px] text-right ml-auto">
              <p className="text-2xl text-[#767676] mb-[42px]">Easy to Use</p>
              <h3 className="text-[36px] font-medium leading-normal">
                Simple steps — no complicated forms.
              </h3>
            </div>
          </div>

          {/* Feature 3 - Low Cost */}
          <div className="flex items-center gap-16 max-w-[1600px] mx-auto">
            <div className="flex-1 relative h-[459px]">
              <Image
                src="/assets/171.svg"
                alt="Low Cost, Big Help"
                fill
                className="object-contain object-left"
              />
            </div>
            <div className="flex-1 max-w-[594px]">
              <p className="text-2xl text-[#767676] mb-[42px]">Low Cost, Big Help</p>
              <h3 className="text-[36px] font-medium leading-normal">
                Find jobs with a small subscription that fits your budget.
              </h3>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-[1632px] mx-auto px-8">
          <div className="bg-[#f8f8f8] border-2 border-white rounded-[40px] px-[47px] py-[93px] flex items-center justify-between">
            <div>
              <h2 className="text-[48px] font-medium mb-[77px]">Ready to Find Your Next Job?</h2>
              <div className="flex items-center gap-4 mb-[80px]">
                <button className="px-3 py-2 bg-primary-50 text-white rounded-lg text-base flex items-center gap-2">
                  <LogIn className="w-5 h-5" />
                  Sign Up Today
                </button>
                <button className="px-3 py-2 border border-secondary-70 rounded-lg text-base text-black flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Contact Us
                </button>
              </div>
              <p className="text-2xl text-black">Download our App platform</p>
              <div className="flex gap-4 mt-6">
                <div className="w-[140px] h-[43px] bg-black rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">App Store</span>
                </div>
                <div className="w-[132px] h-[40px] bg-black rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">Google Play</span>
                </div>
              </div>
            </div>
            <div className="relative w-[900px] h-[600px]">
              <Image src="/assets/171.svg" alt="Mobile App" fill className="object-contain" />
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  )
}
