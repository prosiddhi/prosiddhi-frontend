'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Upload, Trash2, FileText, ChevronDown } from 'lucide-react'
import Link from 'next/link'

interface UploadedFile {
  name: string
  size: string
}

export default function CompanyDetailsPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    companyName: '',
    companyEmail: '',
    companyAddress: '',
    foundedDate: '',
    employeeSize: '',
    gstNumber: '',
    registrationNumber: '',
  })
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const employeeSizes = [
    '1-10',
    '11-50',
    '51-200',
    '201-500',
    '501-1000',
    '1000+'
  ]

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleEmployeeSizeSelect = (size: string) => {
    setFormData({
      ...formData,
      employeeSize: size
    })
    setIsDropdownOpen(false)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Only accept PDF
      if (file.type === 'application/pdf') {
        const sizeInKB = Math.round(file.size / 1024)
        setUploadedFile({
          name: file.name,
          size: `${sizeInKB} KB`
        })
      } else {
        alert('Please upload a PDF file')
      }
    }
  }

  const handleRemoveFile = () => {
    setUploadedFile(null)
  }

  const handleNext = () => {
    // Validate all required fields
    if (
      formData.companyName &&
      formData.companyEmail &&
      formData.companyAddress &&
      formData.foundedDate &&
      formData.employeeSize &&
      formData.gstNumber &&
      formData.registrationNumber &&
      uploadedFile
    ) {
      // Save company details
      localStorage.setItem('companyDetails', JSON.stringify(formData))
      console.log('Company details:', formData)
      console.log('Uploaded file:', uploadedFile)
      
      // Navigate to account setup
      router.push('/employer/register/account')
    } else {
      alert('Please fill all required fields')
    }
  }

  const handleBack = () => {
    router.push('/employer/register/otp')
  }

  const handleClose = () => {
    router.push('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white p-4">
      {/* Registration Modal */}
      <div className="relative bg-white border border-[#dedede] rounded-[10px] w-full max-w-[600px] px-6 sm:px-10 py-8 sm:py-10 shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded transition-colors z-10"
          aria-label="Close"
        >
          <X className="w-6 h-6 text-gray-600" />
        </button>

        {/* Content */}
        <div className="w-full">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-semibold text-black mb-2">
              Employer Registration
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Create a account for the Hiring People
            </p>
          </div>

          {/* Company Details Section */}
          <div className="mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-black mb-4">
              Company Details
            </h2>

            <div className="space-y-4">
              {/* Company Name */}
              <div>
                <label htmlFor="companyName" className="block text-sm font-medium text-black mb-2">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="companyName"
                  name="companyName"
                  type="text"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  placeholder="Enter company name"
                  className="w-full h-12 px-4 border border-gray-300 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all"
                />
              </div>

              {/* Company Email */}
              <div>
                <label htmlFor="companyEmail" className="block text-sm font-medium text-black mb-2">
                  Company Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="companyEmail"
                  name="companyEmail"
                  type="email"
                  value={formData.companyEmail}
                  onChange={handleInputChange}
                  placeholder="Enter company email"
                  className="w-full h-12 px-4 border border-gray-300 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all"
                />
              </div>

              {/* Company Address */}
              <div>
                <label htmlFor="companyAddress" className="block text-sm font-medium text-black mb-2">
                  Company Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="companyAddress"
                  name="companyAddress"
                  type="text"
                  value={formData.companyAddress}
                  onChange={handleInputChange}
                  placeholder="Enter company location"
                  className="w-full h-12 px-4 border border-gray-300 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all"
                />
              </div>

              {/* Company Founded Date */}
              <div>
                <label htmlFor="foundedDate" className="block text-sm font-medium text-black mb-2">
                  Company Founded Date <span className="text-red-500">*</span>
                </label>
                <input
                  id="foundedDate"
                  name="foundedDate"
                  type="date"
                  value={formData.foundedDate}
                  onChange={handleInputChange}
                  className="w-full h-12 px-4 border border-gray-300 rounded-lg text-sm text-black focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all"
                />
              </div>

              {/* Company Size */}
              <div>
                <label className="block text-sm font-medium text-black mb-2">
                  Company Size of Employee <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full h-12 px-4 border border-gray-300 rounded-lg text-sm text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all"
                  >
                    <span className={formData.employeeSize ? 'text-black' : 'text-gray-400'}>
                      {formData.employeeSize || 'Select the options'}
                    </span>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                      {employeeSizes.map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => handleEmployeeSizeSelect(size)}
                          className={`w-full px-4 py-3 text-left text-sm hover:bg-gray-50 transition-colors ${
                            formData.employeeSize === size ? 'bg-primary-10 text-primary-70' : 'text-black'
                          }`}
                        >
                          {size} employees
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* GST Number */}
              <div>
                <label htmlFor="gstNumber" className="block text-sm font-medium text-black mb-2">
                  GST Number <span className="text-red-500">*</span>
                </label>
                <input
                  id="gstNumber"
                  name="gstNumber"
                  type="text"
                  value={formData.gstNumber}
                  onChange={handleInputChange}
                  placeholder="BRXXXXXXXXXXXXXXX"
                  maxLength={15}
                  className="w-full h-12 px-4 border border-gray-300 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all"
                />
              </div>
            </div>
          </div>

          {/* Company Registration Details */}
          <div className="mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-black mb-4">
              Company Registration Details
            </h2>

            <div>
              <label htmlFor="registrationNumber" className="block text-sm font-medium text-black mb-2">
                Company Registration Number<span className="text-red-500">*</span>
              </label>
              <input
                id="registrationNumber"
                name="registrationNumber"
                type="text"
                value={formData.registrationNumber}
                onChange={handleInputChange}
                placeholder="Enter CIN Number"
                className="w-full h-12 px-4 border border-gray-300 rounded-lg text-sm text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-50 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Company Document Upload */}
          <div className="mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-black mb-4">
              Company Document
            </h2>

            {/* Upload Area */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-50 transition-colors">
              <input
                type="file"
                id="fileUpload"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label htmlFor="fileUpload" className="cursor-pointer">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-black mb-1">Upload</p>
                <p className="text-xs text-gray-500">
                  Drag or drop file here or choose file
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  up to 10c Pdf accepted
                </p>
              </label>
            </div>

            {/* Uploaded File List */}
            {uploadedFile && (
              <div className="mt-4">
                <p className="text-sm font-medium text-black mb-2">Uploaded List</p>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-red-500" />
                    <div>
                      <p className="text-sm font-medium text-black">{uploadedFile.name}</p>
                      <p className="text-xs text-gray-500">{uploadedFile.size}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveFile}
                    className="p-2 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-4">
            {/* Back Button */}
            <button
              onClick={handleBack}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-base font-medium min-w-[100px]"
            >
              Back
            </button>

            {/* Next Button */}
            <button
              onClick={handleNext}
              className="px-8 py-3 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors text-base font-medium min-w-[120px]"
            >
              Next
            </button>
          </div>

          {/* Sign In Link */}
          <div className="text-center mt-6">
            <p className="text-sm sm:text-base">
              <span className="text-gray-600">Already have an account? </span>
              <Link
                href="/login"
                className="font-semibold text-primary-50 hover:text-primary-60 transition-colors"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
