'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Footer } from '@/components/home/Footer'
import { 
  Phone,
  Facebook,
  Instagram,
  Github,
  Linkedin,
  Eye,
  EyeOff,
  ArrowRight,
  Check,
  PhoneCall,
  MessageCircle
} from 'lucide-react'

export default function EmployerLandingPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const offers = [
    {
      title: 'Real Workers Near You',
      description: 'Get candidates who live nearby, ready to work.Get candidates who live nearby, ready to work.',
      gradient: 'from-[#fef1ed] to-white'
    },
    {
      title: 'Easy Job Post',
      description: 'Fill just a few fields — job title, Category, location and post the job',
      gradient: 'from-[#edfefa] to-white'
    },
    {
      title: 'Contact Directly',
      description: 'Message or call applicants — no delays and no hassle',
      gradient: 'from-[#f0edfe] to-white'
    }
  ]

  const freePlanFeatures = [
    '0 Job Posting',
    'No Access to candidate database',
    'No Email Support',
    'No Technical support',
    'Free Explore the candidate list',
    'No Standard matching algorithm'
  ]

  const enterprisePlanFeatures = [
    'Unlimited job postings',
    'Dedicated support manager',
    'Advanced analytics & reporting',
    '24/7 priority support',
    'Free job listing duration',
    'Custom integration options',
    'Featured & premium listings',
    'Advanced Near Employee Find Solution',
    'Voice Message with Native Languages'
  ]

  return (
    <div className="min-h-screen bg-white relative">
      {/* Background Pattern - Dimmed and Responsive */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Overlay to dim the background */}
        <div className="absolute inset-0 bg-white/70"></div>
        
        {/* Background Images - Responsive */}
        <div className="absolute top-[200px] sm:top-[300px] lg:top-[380px] left-0 w-[400px] sm:w-[600px] lg:w-[740px] h-[300px] sm:h-[450px] lg:h-[555px] opacity-8 lg:opacity-12">
          <Image
            src="/assets/group_2.png"
            alt=""
            fill
            className="object-contain"
          />
        </div>
        <div className="hidden lg:block absolute top-[380px] left-[58.333%] w-[740px] h-[555px] opacity-12">
          <Image
            src="/assets/group_2.png"
            alt=""
            fill
            className="object-contain"
          />
        </div>
        <div className="hidden md:block absolute top-[250px] sm:top-[320px] lg:top-[380px] left-[20%] sm:left-[25%] w-[400px] sm:w-[600px] lg:w-[740px] h-[300px] sm:h-[450px] lg:h-[555px] opacity-8 lg:opacity-12">
          <Image
            src="/assets/group_2.png"
            alt=""
            fill
            className="object-contain"
          />
        </div>
      </div>

      {/* Header */}
      <header className="bg-white shadow-[10px_10px_50px_0px_rgba(0,0,0,0.05)] h-[65px] sm:h-[75px] fixed top-0 left-0 right-0 z-40">
        <div className="max-w-[1920px] mx-auto h-full px-4 sm:px-6 lg:px-12 xl:px-[120px] flex items-center justify-between">
          {/* Logo and Navigation */}
          <div className="flex items-center gap-4 sm:gap-6 lg:gap-11">
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
            <nav className="hidden md:flex items-center gap-4 lg:gap-8 xl:gap-11">
              <button className="text-black text-sm lg:text-base xl:text-[18px] hover:text-primary-50 transition-colors whitespace-nowrap">
                Post Job
              </button>
              
              <button className="text-black text-sm lg:text-base xl:text-[18px] hover:text-primary-50 transition-colors whitespace-nowrap">
                Find Workers
              </button>
              
              <button className="text-black text-sm lg:text-base xl:text-[18px] hover:text-primary-50 transition-colors whitespace-nowrap">
                Pricing
              </button>
            </nav>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3 sm:gap-4 lg:gap-8">
            <button className="hidden sm:flex items-center gap-1 text-sm lg:text-base text-black hover:text-primary-50 transition-colors">
              <Phone className="w-3 h-3 lg:w-4 lg:h-4" />
              <span className="hidden lg:inline">Help/Support</span>
              <span className="lg:hidden">Help</span>
            </button>
            
            <Link href="/employer/register" className="px-2 sm:px-3 py-1.5 sm:py-2 bg-primary-50 text-white rounded-lg text-xs sm:text-sm lg:text-base hover:bg-primary-60 transition-colors whitespace-nowrap">
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section with Sign-In */}
      <section className="relative z-10 pt-20 sm:pt-24 lg:pt-32 xl:pt-[147px] pb-12 sm:pb-16 lg:pb-20 xl:pb-[72px]">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-12 xl:px-[120px]">
          <div className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 xl:gap-[114px]">
            {/* Left Content */}
            <div className="flex-1 w-full lg:max-w-[1028px]">
              {/* Badge */}
              <div className="inline-flex items-center justify-center px-4 sm:px-5 py-1.5 sm:py-2 bg-white border border-[#f2f2f2] rounded-full mb-4 sm:mb-6 lg:mb-8">
                <span className="text-xs text-primary-50">For Employers</span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-[72px] font-bold text-black leading-tight sm:leading-tight lg:leading-[86px] mb-4 sm:mb-6">
                Find Workers for Your Business Fast & Simple
              </h1>

              <p className="text-base sm:text-lg lg:text-xl text-[#717182] leading-relaxed lg:leading-8 max-w-[745px] mb-6 sm:mb-8">
                Connect with top professionals and build your dream team. Post jobs, review applications, and hire faster with our advanced recruitment platform.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 lg:gap-5">
                <button className="px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 bg-primary-50 text-white rounded-lg text-sm sm:text-base hover:bg-primary-60 transition-colors">
                  Post a Job
                </button>
                <button className="px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3 border border-[#3a7a96] rounded-lg text-sm sm:text-base text-black hover:bg-gray-50 transition-colors">
                  Contact Us
                </button>
              </div>
            </div>

            {/* Sign-In Form */}
            <div className="bg-white border border-[#dfdfdf] rounded-[10px] p-6 sm:p-8 lg:p-10 xl:p-12 w-full lg:w-auto lg:min-w-[450px] xl:min-w-[535px]">
              <div className="space-y-4 sm:space-y-5 lg:space-y-6">
                {/* Email */}
                <div>
                  <label className="block text-lg sm:text-xl font-medium text-black mb-2 sm:mb-3 lg:mb-4">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="Enter Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-12 sm:h-14 px-3 sm:px-4 border border-[#b5b5b5] rounded-lg text-sm sm:text-base placeholder-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-lg sm:text-xl font-medium text-black mb-2 sm:mb-3 lg:mb-4">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter the Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-14 px-3 pr-12 border border-[#b5b5b5] rounded-lg text-base placeholder-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                    >
                      {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                    </button>
                  </div>
                </div>

                {/* Forgot Password */}
                <div className="text-right">
                  <a href="#" className="text-base font-medium text-[#aaaaaa] hover:text-primary-50">
                    Forgot Password ?
                  </a>
                </div>

                {/* Sign In Button */}
                <button className="w-full py-3 bg-primary-50 text-white rounded-lg text-xl hover:bg-primary-60 transition-colors">
                  Sign In
                </button>

                {/* Sign Up Link */}
                <div className="text-center text-xl">
                  <span className="text-black">Don't have an account? </span>
                  <Link href="/employer/register" className="font-semibold text-[#1e5166] hover:underline">
                    Sign up here
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What We Offer Section */}
      <section className="relative z-10 py-12 sm:py-16 lg:py-20 bg-white">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-12 xl:px-[120px]">
          <div className="text-center mb-8 sm:mb-10 lg:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-[40px] font-medium mb-2 sm:mb-3">What We Offer</h2>
            <p className="text-base sm:text-lg lg:text-xl text-[#717182] max-w-[672px] mx-auto px-4">
              Everything you need to find and hire the best talent for your organization
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-12 xl:gap-24 mb-8 sm:mb-10 lg:mb-12">
            {offers.map((offer, index) => (
              <div
                key={index}
                className="bg-neutral-50 border-2 border-white rounded-[20px] p-3 sm:p-4 w-full max-w-[494px] mx-auto"
              >
                <div className={`bg-gradient-to-b ${offer.gradient} h-[250px] sm:h-[280px] lg:h-[316px] rounded-xl mb-4 relative overflow-hidden`}>
                  {/* Visual elements for each card */}
                  {index === 0 && (
                    <div className="absolute inset-0 p-12">
                      {/* Candidate list visual */}
                      <div className="space-y-3">
                        <div className="bg-white border border-[#b5b5b5] rounded-lg p-3 flex items-center gap-3">
                          <div className="w-11 h-11 bg-[#42b2b1] rounded" />
                          <div className="flex-1 space-y-2">
                            <div className="h-1 bg-gray-300 rounded w-3/4" />
                            <div className="h-1 bg-gray-300 rounded w-1/2" />
                          </div>
                          <button className="px-3 py-1 bg-gray-300 rounded text-xs text-white">
                            Select
                          </button>
                        </div>
                        <div className="bg-white rounded-lg p-3 flex items-center gap-3 shadow-lg">
                          <div className="w-11 h-11 bg-primary-50 rounded" />
                          <div className="flex-1 space-y-2">
                            <div className="h-1 bg-gray-300 rounded w-3/4" />
                            <div className="h-1 bg-gray-300 rounded w-1/2" />
                          </div>
                          <button className="px-3 py-1 bg-primary-50 rounded text-xs text-white">
                            Selected
                          </button>
                        </div>
                        <div className="bg-white border border-[#b5b5b5] rounded-lg p-3 flex items-center gap-3">
                          <div className="w-11 h-11 bg-[#1a5252] rounded" />
                          <div className="flex-1 space-y-2">
                            <div className="h-1 bg-gray-300 rounded w-3/4" />
                            <div className="h-1 bg-gray-300 rounded w-1/2" />
                          </div>
                          <button className="px-3 py-1 bg-gray-300 rounded text-xs text-white">
                            Select
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {index === 1 && (
                    <div className="absolute inset-0 p-12">
                      {/* Job post form visual */}
                      <div className="bg-white rounded-lg p-4 space-y-4">
                        <div className="space-y-2">
                          <div className="h-2 bg-gray-300 rounded w-full" />
                          <div className="h-3 bg-gray-300 rounded w-3/4" />
                          <div className="h-2 bg-gray-300 rounded w-1/2" />
                        </div>
                        <div className="space-y-2">
                          <div className="h-2 bg-gray-300 rounded w-full" />
                          <div className="h-3 bg-gray-300 rounded w-3/4" />
                          <div className="h-2 bg-gray-300 rounded w-1/2" />
                        </div>
                        <div className="space-y-2">
                          <div className="h-2 bg-gray-300 rounded w-full" />
                          <div className="h-3 bg-gray-300 rounded w-3/4" />
                          <div className="h-2 bg-gray-300 rounded w-1/2" />
                        </div>
                        <button className="px-4 py-1 bg-primary-50 rounded text-xs text-white ml-auto block">
                          Post a Job
                        </button>
                      </div>
                    </div>
                  )}
                  {index === 2 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      {/* Contact visual */}
                      <div className="bg-white rounded-lg p-3 flex items-center gap-3 shadow-lg">
                        <div className="w-11 h-11 bg-primary-50 rounded" />
                        <div className="flex-1 space-y-2">
                          <div className="h-1 bg-gray-300 rounded w-3/4" />
                          <div className="h-1 bg-gray-300 rounded w-1/2" />
                        </div>
                        <button className="p-2 bg-primary-50 rounded">
                          <PhoneCall className="w-3 h-3 text-white" />
                        </button>
                        <button className="p-2 bg-gray-600 rounded">
                          <MessageCircle className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <h3 className="text-xl sm:text-2xl lg:text-[32px] font-semibold text-center mb-3 sm:mb-4">{offer.title}</h3>
                <p className="text-sm sm:text-base lg:text-[18px] text-[#717182] text-center px-4 sm:px-6">
                  {offer.description}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button className="px-4 sm:px-6 py-2 sm:py-2.5 border border-[#1e5166] rounded-lg text-base sm:text-lg lg:text-xl text-black hover:bg-gray-50 transition-colors">
              Call For Help?
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="relative z-10 py-12 sm:py-16 lg:py-20 bg-white">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-12 xl:px-[120px]">
          <div className="text-center mb-8 sm:mb-10 lg:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-[40px] font-medium mb-2 sm:mb-3">Pricing</h2>
            <p className="text-base sm:text-lg lg:text-xl text-[#717182] px-4">
              Choose the perfect plan for your hiring needs.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 xl:gap-[38px] max-w-[1100px] mx-auto">
            {/* Free Plan */}
            <div className="bg-neutral-50 border-2 border-white rounded-[20px] p-6 sm:p-8 lg:p-[37px] w-full">
              <div className="space-y-4 sm:space-y-5">
                <h3 className="text-2xl sm:text-3xl lg:text-[32px] font-semibold">Free</h3>
                <p className="text-base sm:text-lg lg:text-[18px] text-[#717182]">Just for browsers and limited plan</p>
                
                <div className="flex items-baseline gap-1">
                  <span className="text-6xl sm:text-7xl lg:text-[96px] font-bold">₹0</span>
                  <span className="text-base sm:text-lg lg:text-[18px] text-[#717182]">Lifetime</span>
                </div>

                <div className="space-y-2 sm:space-y-3 py-3 sm:py-4">
                  {freePlanFeatures.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2 sm:gap-3">
                      <Check className="w-4 h-4 sm:w-5 sm:h-5 text-primary-50 mt-0.5 flex-shrink-0" />
                      <span className="text-sm sm:text-base text-neutral-950">{feature}</span>
                    </div>
                  ))}
                </div>

                <button className="px-3 sm:px-4 py-2 sm:py-2.5 bg-primary-50 text-white rounded-lg text-sm sm:text-base w-full hover:bg-primary-60 transition-colors">
                  Start Paid Plan
                </button>
              </div>
            </div>

            {/* Enterprise Plan */}
            <div className="bg-neutral-50 border-[3px] border-primary-50 rounded-[20px] p-6 sm:p-8 lg:p-[42px] w-full">
              <div className="space-y-4 sm:space-y-5">
                <h3 className="text-2xl sm:text-3xl lg:text-[32px] font-semibold">Enterprise</h3>
                <p className="text-base sm:text-lg lg:text-[18px] text-[#717182]">Just for browsers and limited plan</p>
                
                <div className="flex items-baseline gap-1">
                  <span className="text-6xl sm:text-7xl lg:text-[96px] font-bold">₹250</span>
                  <span className="text-base sm:text-lg lg:text-[18px] text-[#717182]">Monthly</span>
                </div>

                <div className="space-y-2 sm:space-y-3 py-3 sm:py-4">
                  {enterprisePlanFeatures.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2 sm:gap-3">
                      <Check className="w-4 h-4 sm:w-5 sm:h-5 text-primary-50 mt-0.5 flex-shrink-0" />
                      <span className="text-sm sm:text-base text-neutral-950">{feature}</span>
                    </div>
                  ))}
                </div>

                <button className="px-3 sm:px-4 py-2 sm:py-2.5 bg-primary-50 text-white rounded-lg text-sm sm:text-base w-full hover:bg-primary-60 transition-colors">
                  Start Free Plan
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-12 sm:py-16 lg:py-20 bg-white">
        <div className="max-w-[1632px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
          <div className="bg-[#f8f8f8] border-2 border-white rounded-[20px] sm:rounded-[30px] lg:rounded-[40px] px-6 sm:px-8 lg:px-16 xl:px-[144px] py-8 sm:py-12 lg:py-16 xl:py-[69px]">
            <div className="flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-8 xl:gap-[29px]">
              {/* Illustration */}
              <div className="relative w-full max-w-[400px] sm:max-w-[500px] lg:max-w-[600px] xl:max-w-[871px] h-[300px] sm:h-[400px] lg:h-[500px] xl:h-[580px] order-2 lg:order-1">
                <Image
                  src="/assets/group_7.svg"
                  alt="Recruit Easy"
                  fill
                  className="object-contain"
                />
              </div>

              {/* Content */}
              <div className="w-full lg:max-w-[702px] order-1 lg:order-2">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-[48px] font-medium mb-4 sm:mb-6 lg:mb-[15px] leading-tight">
                  Recruiting made easy for you!
                </h2>
                
                <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8 lg:mb-[46px]">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-primary-50 flex-shrink-0 mt-1" />
                    <p className="text-base sm:text-lg lg:text-xl text-black">Connect and hire employees</p>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-primary-50 flex-shrink-0 mt-1" />
                    <p className="text-base sm:text-lg lg:text-xl text-black">
                      Communicate with employees in their native language and hire for your firm
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-lg sm:text-xl lg:text-2xl font-medium mb-3 sm:mb-4">Download our App platform</p>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    <a href="#" className="w-full sm:w-[140px] h-[40px] sm:h-[43px] bg-black rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors">
                      <span className="text-white text-xs sm:text-sm">App Store</span>
                    </a>
                    <a href="#" className="w-full sm:w-[132px] h-[40px] bg-black rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors">
                      <span className="text-white text-xs sm:text-sm">Google Play</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
