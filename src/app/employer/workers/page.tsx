'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Users } from 'lucide-react'

export default function WorkersPage() {
  const router = useRouter()
  const [showWelcome, setShowWelcome] = useState(true)

  useEffect(() => {
    // Hide welcome message after 3 seconds
    const timer = setTimeout(() => {
      setShowWelcome(false)
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Welcome Message */}
      {showWelcome && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slideInRight z-50">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-medium">Registration Successful!</span>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Icon */}
          <div className="mb-8 flex justify-center">
            <div className="w-24 h-24 bg-primary-50 rounded-full flex items-center justify-center">
              <Users className="w-12 h-12 text-white" />
            </div>
          </div>

          {/* Welcome Text */}
          <h1 className="text-4xl sm:text-5xl font-bold text-black mb-6">
            Welcome to Workers Dashboard
          </h1>
          
          <p className="text-xl text-gray-600 mb-12">
            Your employer account has been created successfully!
          </p>

          {/* Info Card */}
          <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-12 border border-gray-200">
            <h2 className="text-2xl font-semibold text-black mb-4">
              Coming Soon
            </h2>
            <p className="text-lg text-gray-600 mb-8">
              The workers page is currently under development. You will soon be able to:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left max-w-2xl mx-auto">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-black mb-1">Post Jobs</h3>
                  <p className="text-sm text-gray-600">Create and manage job listings</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-black mb-1">Find Workers</h3>
                  <p className="text-sm text-gray-600">Search through candidate database</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-black mb-1">Review Applications</h3>
                  <p className="text-sm text-gray-600">Manage candidate applications</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-black mb-1">Contact Candidates</h3>
                  <p className="text-sm text-gray-600">Message or call applicants directly</p>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push('/employer')}
              className="px-8 py-3 bg-primary-50 text-white rounded-lg hover:bg-primary-60 transition-colors text-base font-medium"
            >
              Go to Employer Dashboard
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-8 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-base font-medium"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>

      {/* Registration Details (for debugging) */}
      <div className="fixed bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 border border-gray-200 max-w-xs hidden">
        <h3 className="font-semibold text-sm mb-2">Registration Info:</h3>
        <pre className="text-xs text-gray-600 overflow-auto">
          {JSON.stringify({
            companyType: typeof window !== 'undefined' ? localStorage.getItem('companyType') : null,
            phone: typeof window !== 'undefined' ? localStorage.getItem('employerPhone') : null,
            otpVerified: typeof window !== 'undefined' ? localStorage.getItem('otpVerified') : null,
            complete: typeof window !== 'undefined' ? localStorage.getItem('registrationComplete') : null,
          }, null, 2)}
        </pre>
      </div>
    </div>
  )
}
