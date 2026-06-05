'use client'

import { useState } from 'react'
import { CheckCircle, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function RegisterSuccessPage() {
  const router = useRouter()
  const [showTutorial, setShowTutorial] = useState(true)

  const handleStartExplore = () => {
    // Save tutorial preference
    localStorage.setItem('showTutorial', showTutorial.toString())
    console.log('Show tutorial:', showTutorial)
    
    // Navigate to job explore or dashboard
    if (showTutorial) {
      router.push('/tutorial')
    } else {
      router.push('/jobs')
    }
  }

  return (
    <div className="relative min-h-screen bg-white">
      {/* Desktop Layout */}
      <div className="hidden lg:flex min-h-screen">
        {/* Left Side - Blue Section (Fixed Width) */}
        <div className="w-[527px] bg-primary-50 relative flex-shrink-0">
          <div className="relative h-full flex flex-col">
            {/* Text Content */}
            <div className="px-12 pt-20">
              <h2 className="text-[40px] font-bold text-white leading-[1.2] max-w-[448px]">
                Your Next Opportunity Is Just a Click Away
              </h2>
            </div>

            {/* Illustration at Bottom */}
            <div className="absolute bottom-0 left-0 w-full">
              <div className="relative w-[522px] h-[348px]">
                <Image
                  src="/assets/421.svg"
                  alt="Job Portal Illustration"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Success Content */}
        <div className="flex-1 bg-white overflow-auto">
          <div className="max-w-[1400px] mx-auto px-16 py-16">
            {/* Header */}
            <div className="flex items-start justify-between mb-24">
              {/* Logo */}
              <div className="relative w-[236px] h-[66px]">
                <Image
                  src="/assets/logo.png"
                  alt="Job Portal Logo"
                  fill
                  className="object-contain object-left"
                  priority
                />
              </div>

              {/* Close Button */}
              <Link
                href="/"
                className="flex items-center gap-2 bg-error-500 hover:bg-error-600 text-white px-5 py-3 rounded-lg transition-colors"
              >
                <span className="text-[18px]">Close</span>
                <X className="w-5 h-5" />
              </Link>
            </div>

            {/* Main Content - Centered */}
            <div className="flex flex-col items-center justify-center min-h-[600px]">
              {/* Success Title */}
              <h1 className="text-[48px] font-semibold text-black text-center mb-16 leading-tight">
                Profile Create Successfully
              </h1>

              {/* Success Icon */}
              <div className="mb-24">
                <CheckCircle className="w-[213px] h-[213px] text-primary-50" strokeWidth={1.5} />
              </div>

              {/* Tutorial Toggle */}
              <div className="flex items-center justify-center gap-6 mb-12">
                <label htmlFor="tutorial" className="text-[28px] font-medium text-black">
                  Show the tutorial/Welcome
                </label>

                {/* Toggle Switch */}
                <button
                  id="tutorial"
                  onClick={() => setShowTutorial(!showTutorial)}
                  className={`relative w-[59px] h-[33px] rounded-full transition-colors ${
                    showTutorial ? 'bg-primary-50' : 'bg-[#d9d9d9]'
                  }`}
                >
                  <div
                    className={`absolute top-[2px] w-[29px] h-[29px] rounded-full bg-white shadow-md transition-transform ${
                      showTutorial ? 'translate-x-[28px]' : 'translate-x-[2px]'
                    }`}
                  />
                </button>
              </div>

              {/* Start Button */}
              <button
                onClick={handleStartExplore}
                className="bg-primary-50 hover:bg-primary-60 text-white px-12 py-3 rounded-lg transition-colors"
              >
                <span className="text-[20px]">Start Job Explore</span>
              </button>
            </div>

            {/* Sign In Link */}
            <div className="text-center mt-16">
              <p className="text-[20px]">
                <span className="text-black">Already have an account? </span>
                <Link
                  href="/login"
                  className="text-primary-70 font-semibold hover:text-primary-80 transition-colors"
                >
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile & Tablet Layout */}
      <div className="lg:hidden min-h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white px-4 py-4 flex items-center justify-between border-b border-gray-200">
          {/* Logo */}
          <div className="relative w-[140px] h-[40px]">
            <Image
              src="/assets/logo.png"
              alt="Job Portal Logo"
              fill
              className="object-contain object-left"
              priority
            />
          </div>

          {/* Close Button */}
          <Link
            href="/"
            className="flex items-center gap-2 bg-error-500 hover:bg-error-600 text-white px-3 py-2 rounded-lg transition-colors"
          >
            <span className="text-sm">Close</span>
            <X className="w-4 h-4" />
          </Link>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white px-4 py-8 overflow-auto flex flex-col items-center justify-center">
          {/* Success Title */}
          <h1 className="text-3xl sm:text-4xl font-semibold text-black text-center mb-12 leading-tight">
            Profile Create Successfully
          </h1>

          {/* Success Icon */}
          <div className="mb-16">
            <CheckCircle className="w-32 h-32 sm:w-40 sm:h-40 text-primary-50" strokeWidth={1.5} />
          </div>

          {/* Tutorial Toggle */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <label className="text-lg sm:text-xl font-medium text-black">
              Show tutorial/Welcome
            </label>

            <button
              onClick={() => setShowTutorial(!showTutorial)}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                showTutorial ? 'bg-primary-50' : 'bg-[#d9d9d9]'
              }`}
            >
              <div
                className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
                  showTutorial ? 'translate-x-[22px]' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStartExplore}
            className="w-full max-w-xs bg-primary-50 hover:bg-primary-60 text-white px-8 py-3 rounded-lg transition-colors mb-8"
          >
            <span className="text-lg">Start Job Explore</span>
          </button>

          {/* Sign In Link */}
          <div className="text-center">
            <p className="text-base">
              <span className="text-black">Already have an account? </span>
              <Link
                href="/login"
                className="text-primary-70 font-semibold hover:text-primary-80 transition-colors"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>

        {/* Blue Decorative Section at Bottom */}
        <div className="bg-primary-50 py-8 px-4">
          <h2 className="text-2xl font-bold text-white text-center leading-tight">
            Your Next Opportunity Is Just a Click Away
          </h2>
        </div>
      </div>
    </div>
  )
}
