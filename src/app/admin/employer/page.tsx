'use client'

import { useState } from 'react'
import { Search, Eye, MoreVertical, Home, Users, Briefcase, FileText, LogOut, Mail, Bell } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import EmployerDetailModal from '@/components/admin/EmployerDetailModal'

const mockEmployers = [
  {
    id: '1',
    employerType: 'Individual',
    companyName: 'Man power Solutions pvt ltd',
    phoneNumber: '+91 8989898989',
    email: 'admin@manpower.com',
    paymentStatus: 'VERIFIED' as const,
    contactPerson: 'Raj Kumar',
    address: '12/09, Gandhi Street, Mount High way road, Bangalore',
    foundedDate: '2010',
    employeeSize: '100',
    gstNumber: 'KJ347856437895789HGV',
    cinNumber: 'KJ347856437895789HGV',
    documents: [{ name: 'Company ISO Certificate', status: 'VERIFIED' as const }],
    paymentHistory: [{ description: 'Employer Subscription 100 Rupee Paid', date: '01/01/2025', status: 'PAID' as const }],
  },
  {
    id: '2',
    employerType: 'Corporate',
    companyName: 'Car Spare Automobile ltd',
    phoneNumber: '+91 7070707070',
    email: 'hrautomobile.car@carpare.com',
    paymentStatus: 'PENDING' as const,
    contactPerson: 'Sarah Khan',
    address: 'Sector 18, Noida, Delhi NCR',
    foundedDate: '2015',
    employeeSize: '250',
    gstNumber: 'DL2378564378957HGV',
    cinNumber: 'DL2378564378957HGV',
    documents: [{ name: 'Company ISO Certificate', status: 'PENDING' as const }],
    paymentHistory: [{ description: 'Employer Subscription 100 Rupee Pending', date: '', status: 'PENDING' as const }],
  },
  {
    id: '3',
    employerType: 'Corporate',
    companyName: 'Solar energy keeper pvt ltd',
    phoneNumber: '+91 9630258741',
    email: 'hr@solarkeepr.com',
    paymentStatus: 'REJECTED' as const,
    contactPerson: 'Amit Patel',
    address: 'Whitefield, Bangalore, Karnataka',
    foundedDate: '2018',
    employeeSize: '50',
    gstNumber: 'KA963025874189HGV',
    cinNumber: 'KA963025874189HGV',
    documents: [{ name: 'Company ISO Certificate', status: 'REJECTED' as const }],
    paymentHistory: [{ description: 'Employer Subscription 100 Rupee Pending', date: '', status: 'PENDING' as const }],
  },
]

export default function AdminEmployerPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSidebarItem, setActiveSidebarItem] = useState('employer')
  const [selectedEmployer, setSelectedEmployer] = useState<typeof mockEmployers[0] | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleViewEmployer = (employer: typeof mockEmployers[0]) => {
    setSelectedEmployer(employer)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedEmployer(null)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#D4F4DD] text-[#4CAF50]">Verified</span>
      case 'PENDING':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#FFF4E5] text-[#FF9800]">Pending</span>
      case 'REJECTED':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#FFE4E1] text-[#E57373]">Rejected</span>
      default:
        return null
    }
  }

  return (
    <div className="flex h-screen bg-[#F8FAFB]">
      <aside className="w-[195px] bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="relative w-[142px] h-[39px]">
            <Image src="/assets/logo.png" alt="Logo" fill className="object-contain" priority />
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <Link href="/admin/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50">
            <Home className="w-5 h-5" />
            <span className="text-sm font-medium">Dashboard</span>
          </Link>
          <Link href="/admin/employee" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50">
            <Users className="w-5 h-5" />
            <span className="text-sm font-medium">Employee</span>
          </Link>
          <Link href="/admin/employer" className={`flex items-center gap-3 px-4 py-3 rounded-lg ${activeSidebarItem === 'employer' ? 'bg-[#E3F5FF] text-[#0095FF]' : 'text-gray-700 hover:bg-gray-50'}`}>
            <Briefcase className="w-5 h-5" />
            <span className="text-sm font-medium">Employer</span>
          </Link>
          <Link href="/admin/post-moderation" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50">
            <FileText className="w-5 h-5" />
            <span className="text-sm font-medium">Post Moderation</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <Link href="/admin/login" className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg w-full">
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Logout</span>
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="text" placeholder="Search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button className="p-2 hover:bg-gray-100 rounded-lg"><Mail className="w-5 h-5 text-gray-600" /></button>
              <button className="p-2 hover:bg-gray-100 rounded-lg"><Bell className="w-5 h-5 text-gray-600" /></button>
              <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                <div className="w-8 h-8 bg-primary-50 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">AD</span>
                </div>
                <span className="text-sm font-medium text-gray-700">Admin</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto px-8 py-6">
          <div className="mb-6">
            <h1 className="text-[32px] font-bold text-gray-900 mb-1">Employer Management</h1>
            <p className="text-gray-500 text-sm">Manage and verify employer accounts</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200">
            <div className="border-b border-gray-200 p-6">
              <div className="flex items-center gap-2">
                <button onClick={() => setActiveTab('all')} className={`px-4 py-2 rounded-lg ${activeTab === 'all' ? 'bg-primary-50 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>All</button>
                <button onClick={() => setActiveTab('verified')} className={`px-4 py-2 rounded-lg ${activeTab === 'verified' ? 'bg-primary-50 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>Verified</button>
                <button onClick={() => setActiveTab('pending')} className={`px-4 py-2 rounded-lg ${activeTab === 'pending' ? 'bg-primary-50 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>Pending</button>
                <button onClick={() => setActiveTab('rejected')} className={`px-4 py-2 rounded-lg ${activeTab === 'rejected' ? 'bg-primary-50 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>Rejected</button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employer Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">View</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {mockEmployers.map((employer) => (
                    <tr key={employer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{employer.employerType}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{employer.companyName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{employer.phoneNumber}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{employer.email}</td>
                      <td className="px-6 py-4">{getStatusBadge(employer.paymentStatus)}</td>
                      <td className="px-6 py-4">
                        <button onClick={() => handleViewEmployer(employer)} className="p-1 hover:bg-gray-100 rounded transition-colors">
                          <Eye className="w-5 h-5 text-gray-600" />
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <button className="p-1 hover:bg-gray-100 rounded transition-colors">
                          <MoreVertical className="w-5 h-5 text-gray-600" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {selectedEmployer && (
        <EmployerDetailModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          employer={selectedEmployer}
        />
      )}
    </div>
  )
}
