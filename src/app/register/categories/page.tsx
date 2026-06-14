'use client'

import { useState, useEffect } from 'react'
import { ChevronRight, ChevronLeft, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSeekerRegistration } from '../SeekerRegistrationContext'

// BR-3 (docs/be-requests.md) — curated static taxonomy until the BE exposes a
// public categories lookup. Sectors/titles mirror the unskilled-labour domains
// in docs/_context/02-scope-locked.md. preferredSector/preferredJobTitle are
// free-text on the BE, so these just constrain input to sensible values.
const SECTORS: { sector: string; jobTitles: string[] }[] = [
  { sector: 'Construction', jobTitles: ['Mason', 'Helper', 'Carpenter', 'Painter', 'Electrician', 'Plumber', 'Welder', 'Bar Bender'] },
  { sector: 'Manufacturing', jobTitles: ['Machine Operator', 'Assembly Line Worker', 'Packing Helper', 'Quality Checker', 'Loader'] },
  { sector: 'Food Products', jobTitles: ['Kitchen Helper', 'Cook', 'Food Packer', 'Delivery Helper'] },
  { sector: 'Automobile', jobTitles: ['Mechanic', 'Auto Electrician', 'Denter', 'Painter', 'Washing Boy'] },
  { sector: 'Renewable Energy', jobTitles: ['Solar Panel Installer', 'Helper', 'Technician'] },
  { sector: 'Medical Assistance', jobTitles: ['Ward Boy', 'Nursing Assistant', 'Caretaker', 'Ambulance Helper'] },
  { sector: 'Repair Services', jobTitles: ['AC Technician', 'Electrician', 'Plumber', 'Mobile Repair Technician'] },
  { sector: 'Domestic Help', jobTitles: ['House Maid', 'Cook', 'Babysitter', 'Elderly Caretaker', 'Driver'] },
  { sector: 'Delivery', jobTitles: ['Delivery Boy', 'Courier', 'Loader', 'Rider'] },
  { sector: 'Retail', jobTitles: ['Sales Assistant', 'Cashier', 'Store Helper', 'Security Guard'] },
  { sector: 'Common Works', jobTitles: ['General Helper', 'Cleaner', 'Office Boy', 'Security Guard', 'Gardener'] },
]

export default function RegisterCategoriesPage() {
  const router = useRouter()
  const { data, update } = useSeekerRegistration()
  const [sector, setSector] = useState(data.preferredSector)
  const [jobTitle, setJobTitle] = useState(data.preferredJobTitle)
  const [error, setError] = useState('')

  // Guard: must have completed the profile step (email set).
  useEffect(() => {
    if (!data.email) router.replace('/register/phone')
  }, [data.email, router])

  const jobTitles = SECTORS.find((s) => s.sector === sector)?.jobTitles ?? []

  const handleSectorChange = (value: string) => {
    setSector(value)
    setJobTitle('') // reset dependent title when sector changes
    if (error) setError('')
  }

  const handleNext = () => {
    if (!sector) {
      setError('Please select your work sector')
      return
    }
    if (!jobTitle) {
      setError('Please select the job you are looking for')
      return
    }
    update({ preferredSector: sector, preferredJobTitle: jobTitle })
    router.push('/register/experience')
  }

  const handleBack = () => router.push('/register/profile')

  return (
    <div className="relative min-h-screen bg-white">
      <div className="flex min-h-screen">
        {/* Left blue panel (desktop) */}
        <div className="hidden lg:block w-[527px] bg-primary-50 relative flex-shrink-0">
          <div className="relative h-full flex flex-col">
            <div className="px-12 pt-20">
              <h2 className="text-[40px] font-bold text-white leading-[1.2] max-w-[448px]">
                What Work Are You Looking For?
              </h2>
            </div>
            <div className="absolute bottom-0 left-0 w-full">
              <div className="relative w-[522px] h-[348px]">
                <Image src="/assets/421.svg" alt="Illustration" fill className="object-contain" priority />
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 bg-white overflow-auto">
          <div className="max-w-[1400px] mx-auto px-4 lg:px-16 py-8 lg:py-16">
            <div className="flex items-start justify-between mb-10 lg:mb-24">
              <div className="relative w-[160px] lg:w-[236px] h-[44px] lg:h-[66px]">
                <Image src="/assets/logo.png" alt="Logo" fill className="object-contain object-left" priority />
              </div>
              <Link href="/" className="flex items-center gap-2 bg-error-500 text-white px-3 lg:px-5 py-2 lg:py-3 rounded-lg hover:bg-error-600">
                <span className="text-sm lg:text-[18px]">Close</span>
                <X className="w-4 h-4 lg:w-5 lg:h-5" />
              </Link>
            </div>

            <div className="flex items-center gap-3 mb-10 lg:mb-16">
              <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-lg">
                <ChevronLeft className="w-6 h-6 text-gray-600" />
              </button>
              <span className="text-[#767676] text-[16px] ml-2">Step 5 of 7</span>
            </div>

            <div className="max-w-[953px]">
              <div className="mb-10 lg:mb-16">
                <h1 className="text-3xl lg:text-[56px] font-bold text-black leading-tight mb-4">Your work preferences</h1>
                <p className="text-base lg:text-[24px] text-[#767676]">Pick the sector and job you want</p>
              </div>

              {error && (
                <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600">{error}</p>
                </div>
              )}

              <div className="space-y-8 mb-12">
                <div>
                  <label className="text-base lg:text-[20px] font-medium text-black mb-4 lg:mb-6 block">Work Sector *</label>
                  <select
                    value={sector}
                    onChange={(e) => handleSectorChange(e.target.value)}
                    className="w-full h-14 lg:h-[69px] px-3 border border-[#b5b5b5] rounded-[10px] text-base lg:text-[20px]"
                  >
                    <option value="">Select a sector</option>
                    {SECTORS.map((s) => (
                      <option key={s.sector} value={s.sector}>{s.sector}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-base lg:text-[20px] font-medium text-black mb-4 lg:mb-6 block">Job You Want *</label>
                  <select
                    value={jobTitle}
                    onChange={(e) => { setJobTitle(e.target.value); if (error) setError('') }}
                    disabled={!sector}
                    className="w-full h-14 lg:h-[69px] px-3 border border-[#b5b5b5] rounded-[10px] text-base lg:text-[20px] disabled:opacity-50"
                  >
                    <option value="">{sector ? 'Select a job' : 'Select a sector first'}</option>
                    {jobTitles.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 bg-primary-50 text-white px-8 lg:px-12 py-3 rounded-lg hover:bg-primary-60"
                >
                  <span className="text-base lg:text-[20px]">Next</span>
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
