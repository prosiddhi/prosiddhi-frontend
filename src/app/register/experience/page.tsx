'use client'

import { useState, useRef, ChangeEvent } from 'react'
import { Volume2, ChevronRight, ChevronLeft, X, Upload, Plus } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Experience {
  id: string
  designation: string
  fromYear: string
  toYear: string
}

export default function RegisterExperiencePage() {
  const router = useRouter()
  const [experiences, setExperiences] = useState<Experience[]>([
    { id: '1', designation: '', fromYear: '', toYear: '' }
  ])
  const [document, setDocument] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAddExperience = () => {
    const newExperience: Experience = {
      id: Date.now().toString(),
      designation: '',
      fromYear: '',
      toYear: ''
    }
    setExperiences([...experiences, newExperience])
  }

  const handleExperienceChange = (id: string, field: keyof Omit<Experience, 'id'>, value: string) => {
    setExperiences(experiences.map(exp => 
      exp.id === id ? { ...exp, [field]: value } : exp
    ))
  }

  const handleDocumentUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      if (validTypes.includes(file.type)) {
        setDocument(file)
      } else {
        alert('Please upload a valid document (JPG, PDF, or DOC)')
      }
    }
  }

  const handleDocumentClick = () => {
    fileInputRef.current?.click()
  }

  const handleNext = () => {
    // Save experience data
    const validExperiences = experiences.filter(exp => 
      exp.designation.trim() || exp.fromYear.trim() || exp.toYear.trim()
    )
    
    localStorage.setItem('experiences', JSON.stringify(validExperiences))
    if (document) {
      localStorage.setItem('documentName', document.name)
    }
    
    console.log('Experience data:', { experiences: validExperiences, document: document?.name })
    
    // Navigate to success page
    router.push('/register/success')
  }

  const handleBack = () => {
    router.push('/register/profile')
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

        {/* Right Side - Form Section */}
        <div className="flex-1 bg-white overflow-auto">
          <div className="max-w-[1400px] mx-auto px-16 py-16">
            {/* Header */}
            <div className="flex items-start justify-between mb-12">
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

            {/* Main Content */}
            <div className="max-w-[1200px]">
              {/* Page Title */}
              <div className="mb-8">
                <h1 className="text-[56px] font-bold text-black mb-4 leading-tight">
                  Create Account
                </h1>
                <p className="text-[24px] text-[#767676]">
                  Complete the full profile set up for the job search
                </p>
              </div>

              {/* Progress Stepper */}
              <div className="flex items-center mb-16 max-w-[1075px]">
                {/* Step 1 - Profile (Completed) */}
                <div className="flex flex-col items-center">
                  <div className="w-[37px] h-[37px] rounded-full bg-primary-50 flex items-center justify-center mb-3">
                    <span className="text-[24px] font-medium text-white">1</span>
                  </div>
                  <span className="text-[16px] font-medium text-black">Profile</span>
                </div>

                {/* Progress Line 1 (Completed) */}
                <div className="flex-1 h-[5px] bg-secondary-70 rounded-[4px] mx-4 max-w-[427px]" />

                {/* Step 2 - Categories (Completed) */}
                <div className="flex flex-col items-center">
                  <div className="w-[37px] h-[37px] rounded-full bg-primary-50 flex items-center justify-center mb-3">
                    <span className="text-[24px] font-medium text-white">2</span>
                  </div>
                  <span className="text-[16px] font-medium text-black">Categories</span>
                </div>

                {/* Progress Line 2 (Completed) */}
                <div className="flex-1 h-[5px] bg-secondary-70 rounded-[4px] mx-4 max-w-[427px]" />

                {/* Step 3 - Experience (Active) */}
                <div className="flex flex-col items-center">
                  <div className="w-[37px] h-[37px] rounded-full bg-primary-50 flex items-center justify-center mb-3">
                    <span className="text-[24px] font-medium text-white">3</span>
                  </div>
                  <span className="text-[16px] font-medium text-black">Experience</span>
                </div>
              </div>

              {/* Work Experiences Section */}
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-6">
                  <h2 className="text-[28px] font-medium text-black">
                    Add Work Experiences (Optional)
                  </h2>
                  <button
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    aria-label="Play audio"
                  >
                    <Volume2 className="w-[22px] h-[22px] text-gray-600" />
                  </button>
                </div>

                {/* Experience Entries */}
                <div className="space-y-6 mb-4">
                  {experiences.map((exp) => (
                    <div key={exp.id} className="grid grid-cols-[434px_265px_265px] gap-6">
                      {/* Designation */}
                      <div>
                        <label className="text-[20px] font-medium text-black mb-4 block">
                          Designation
                        </label>
                        <input
                          type="text"
                          value={exp.designation}
                          onChange={(e) => handleExperienceChange(exp.id, 'designation', e.target.value)}
                          placeholder="Enter Designation"
                          className="w-full h-[69px] px-3 border border-[#b5b5b5] rounded-[10px] text-[20px] text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all"
                        />
                      </div>

                      {/* From Year */}
                      <div>
                        <label className="text-[20px] font-medium text-black mb-4 block">
                          From Year
                        </label>
                        <input
                          type="text"
                          value={exp.fromYear}
                          onChange={(e) => handleExperienceChange(exp.id, 'fromYear', e.target.value)}
                          placeholder="Start Year"
                          className="w-full h-[69px] px-3 border border-[#b5b5b5] rounded-[10px] text-[20px] text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all"
                        />
                      </div>

                      {/* To Year */}
                      <div>
                        <label className="text-[20px] font-medium text-black mb-4 block">
                          To Year
                        </label>
                        <input
                          type="text"
                          value={exp.toYear}
                          onChange={(e) => handleExperienceChange(exp.id, 'toYear', e.target.value)}
                          placeholder="End Year"
                          className="w-full h-[69px] px-3 border border-[#b5b5b5] rounded-[10px] text-[20px] text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Experience Button */}
                <button
                  onClick={handleAddExperience}
                  className="flex items-center gap-2 text-[20px] font-medium text-[#4d4d4d] hover:text-primary-70 transition-colors"
                >
                  <Plus className="w-6 h-6" />
                  <span>Add Experiences</span>
                </button>
              </div>

              {/* Document Upload Section */}
              <div className="mb-20">
                <div className="flex items-center gap-3 mb-6">
                  <label className="text-[20px] font-medium text-black">
                    Upload Document (Optional)
                  </label>
                  <button
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    aria-label="Play audio"
                  >
                    <Volume2 className="w-[22px] h-[22px] text-gray-600" />
                  </button>
                </div>

                {/* Upload Area */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.doc,.docx"
                  onChange={handleDocumentUpload}
                  className="hidden"
                />
                
                <button
                  onClick={handleDocumentClick}
                  className="w-full max-w-[1006px] h-[142px] border border-[#b5b5b5] rounded-[10px] bg-white hover:bg-gray-50 transition-colors flex flex-col items-center justify-center"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Upload className="w-6 h-6 text-black" />
                    <span className="text-[20px] font-medium text-black">Upload</span>
                  </div>
                  
                  <p className="text-[16px] text-black mb-1">
                    {document ? document.name : 'Drag or drop file here or choose file'}
                  </p>
                  
                  <p className="text-[12px] font-medium text-[#4d4d4d]">
                    Jpg, Doc, Pdf are accpet
                  </p>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between max-w-[1006px] mb-16">
                {/* Back Button */}
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 border border-secondary-70 hover:bg-secondary-10 text-black px-5 py-3 rounded-lg transition-colors h-[50px]"
                >
                  <ChevronLeft className="w-6 h-6" />
                  <span className="text-[18px]">Back</span>
                </button>

                {/* Next Button */}
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 bg-primary-50 hover:bg-primary-60 text-white px-12 py-3 rounded-lg transition-colors"
                >
                  <span className="text-[20px]">Next</span>
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>

              {/* Sign In Link */}
              <div className="text-center max-w-[1006px]">
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
        <div className="flex-1 bg-white px-4 py-8 overflow-auto">
          {/* Page Title */}
          <div className="mb-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-black mb-2">
              Create Account
            </h1>
            <p className="text-base text-[#767676]">
              Complete the full profile set up for the job search
            </p>
          </div>

          {/* Progress Stepper - Mobile */}
          <div className="flex items-center mb-8">
            {/* Step 1 */}
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center mb-2">
                <span className="text-lg font-medium text-white">1</span>
              </div>
              <span className="text-xs font-medium text-black">Profile</span>
            </div>

            {/* Line 1 */}
            <div className="flex-1 h-1 bg-secondary-70 mx-2" />

            {/* Step 2 */}
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center mb-2">
                <span className="text-lg font-medium text-white">2</span>
              </div>
              <span className="text-xs font-medium text-black">Categories</span>
            </div>

            {/* Line 2 */}
            <div className="flex-1 h-1 bg-secondary-70 mx-2" />

            {/* Step 3 */}
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center mb-2">
                <span className="text-lg font-medium text-white">3</span>
              </div>
              <span className="text-xs font-medium text-black">Experience</span>
            </div>
          </div>

          {/* Work Experiences Section */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-xl font-medium text-black">
                Add Work Experiences (Optional)
              </h2>
              <button
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                aria-label="Play audio"
              >
                <Volume2 className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Experience Entries */}
            <div className="space-y-6 mb-4">
              {experiences.map((exp) => (
                <div key={exp.id} className="space-y-4">
                  {/* Designation */}
                  <div>
                    <label className="text-base font-medium text-black mb-2 block">
                      Designation
                    </label>
                    <input
                      type="text"
                      value={exp.designation}
                      onChange={(e) => handleExperienceChange(exp.id, 'designation', e.target.value)}
                      placeholder="Enter Designation"
                      className="w-full h-14 px-3 border border-[#b5b5b5] rounded-[10px] text-base text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all"
                    />
                  </div>

                  {/* Year Inputs */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* From Year */}
                    <div>
                      <label className="text-base font-medium text-black mb-2 block">
                        From Year
                      </label>
                      <input
                        type="text"
                        value={exp.fromYear}
                        onChange={(e) => handleExperienceChange(exp.id, 'fromYear', e.target.value)}
                        placeholder="Start Year"
                        className="w-full h-14 px-3 border border-[#b5b5b5] rounded-[10px] text-base text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all"
                      />
                    </div>

                    {/* To Year */}
                    <div>
                      <label className="text-base font-medium text-black mb-2 block">
                        To Year
                      </label>
                      <input
                        type="text"
                        value={exp.toYear}
                        onChange={(e) => handleExperienceChange(exp.id, 'toYear', e.target.value)}
                        placeholder="End Year"
                        className="w-full h-14 px-3 border border-[#b5b5b5] rounded-[10px] text-base text-black placeholder:text-[#aaaaaa] focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Experience Button */}
            <button
              onClick={handleAddExperience}
              className="flex items-center gap-2 text-base font-medium text-[#4d4d4d] hover:text-primary-70 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Add Experiences</span>
            </button>
          </div>

          {/* Document Upload Section */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <label className="text-base font-medium text-black">
                Upload Document (Optional)
              </label>
              <button
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                aria-label="Play audio"
              >
                <Volume2 className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.doc,.docx"
              onChange={handleDocumentUpload}
              className="hidden"
            />
            
            <button
              onClick={handleDocumentClick}
              className="w-full h-32 border border-[#b5b5b5] rounded-[10px] bg-white hover:bg-gray-50 transition-colors flex flex-col items-center justify-center"
            >
              <div className="flex items-center gap-2 mb-1">
                <Upload className="w-5 h-5 text-black" />
                <span className="text-base font-medium text-black">Upload</span>
              </div>
              
              <p className="text-sm text-black mb-1 px-4 text-center">
                {document ? document.name : 'Drag or drop file here'}
              </p>
              
              <p className="text-xs font-medium text-[#4d4d4d]">
                Jpg, Doc, Pdf accepted
              </p>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 mb-8">
            {/* Next Button */}
            <button
              onClick={handleNext}
              className="w-full flex items-center justify-center gap-2 bg-primary-50 hover:bg-primary-60 text-white px-6 py-3 rounded-lg transition-colors"
            >
              <span className="text-lg">Next</span>
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Back Button */}
            <button
              onClick={handleBack}
              className="w-full flex items-center justify-center gap-2 border border-secondary-70 hover:bg-secondary-10 text-black px-6 py-3 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-lg">Back</span>
            </button>
          </div>

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
