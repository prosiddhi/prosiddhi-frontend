'use client'

import { useState } from 'react'
import { Search, ChevronDown, Eye, MoreVertical, Home, Users, Briefcase, FileText, LogOut, Mail, Bell } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import EmployeeDetailModal from '@/components/admin/EmployeeDetailModal'

const mockEmployees = [
  {
    id: '1',
    name: 'Aaliyah Khan',
    location: 'Mumbai',
    language: 'Hindi',
    phoneNumber: '+91 8989898989',
    email: 'khan@gmail.com',
    paymentStatus: 'NOT_PAID' as const,
    documentStatus: 'VERIFIED' as const,
    jobSector: 'Automobile Manufacture',
    jobCategory: 'Engineer',
    workExperience: [{ position: 'Line Supervisor', company: 'MSC Co', startDate: 'Jan 2023', endDate: 'Dec 2024' }],
    documents: [{ name: 'Resume.pdf', status: 'VERIFIED' as const }],
    paymentHistory: [{ description: 'Employee Subscription 50 Rupee Paid', date: '01/01/2025', status: 'PAID' as const }],
  },
  {
    id: '2',
    name: 'Aryan Patel',
    location: 'Delhi',
    language: 'kannada',
    phoneNumber: '+91 7070707070',
    email: 'aryan@gmail.com',
    paymentStatus: 'PAID' as const,
    documentStatus: 'PENDING' as const,
    jobSector: 'Automobile Manufacture',
    jobCategory: 'Engineer',
    workExperience: [{ position: 'Line Supervisor', company: 'MSC Co', startDate: 'Jan 2023', endDate: 'Dec 2024' }],
    documents: [{ name: 'Resume.pdf', status: 'PENDING' as const }],
    paymentHistory: [{ description: 'Employee Subscription 50 Rupee Paid', date: '15/12/2024', status: 'PAID' as const }],
  },
  {
    id: '3',
    name: 'Diya Sharma',
    location: 'Bangalore',
    language: 'Gujarati',
    phoneNumber: '+91 9630258741',
    email: 'diya@gmail.com',
    paymentStatus: 'NOT_PAID' as const,
    documentStatus: 'REJECTED' as const,
    jobSector: 'Automobile Manufacture',
    jobCategory: 'Engineer',
    workExperience: [{ position: 'Line Supervisor', company: 'MSC Co', startDate: 'Jan 2023', endDate: 'Dec 2024' }],
    documents: [{ name: 'Resume.pdf', status: 'REJECTED' as const }],
    paymentHistory: [{ description: 'Employee Subscription 50 Rupee Pending', date: '', status: 'PENDING' as const }],
  },
]

export default function AdminEmployeePage() {
  const [activeTab, setActiveTab] = useState('all')
  const [locationFilter, setLocationFilter] = useState('')
  const [languageFilter, setLanguageFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSidebarItem, setActiveSidebarItem] = useState('employee')
  const [selectedEmployee, setSelectedEmployee] = useState<typeof mockEmployees[0] | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleViewEmployee = (employee: typeof mockEmployees[0]) => {
    setSelectedEmployee(employee)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedEmployee(null)
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

  const getPaymentBadge = (status: string) => {
    return status === 'PAID' ? 
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#D4F4DD] text-[#4CAF50]">Paid</span> :
      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#FFE4E1] text-[#E57373]">Not Paid</span>
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
          <Link href="/admin/employee" className={`flex items-center gap-3 px-4 py-3 rounded-lg ${activeSidebarItem === 'employee' ? 'bg-[#E3F5FF] text-[#0095FF]' : 'text-gray-700 hover:bg-gray-50'}`}>
            <Users className="w-5 h-5" />
            <span className="text-sm font-medium">Employee</span>
          </Link>
          <Link href="/admin/employer" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50">
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
            <h1 className="text-[32px] font-bold text-gray-900 mb-1">Employee Management</h1>
            <p className="text-gray-500 text-sm">Manage and verify employee accounts</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200">
            <div className="border-b border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <button onClick={() => setActiveTab('all')} className={`px-4 py-2 rounded-lg ${activeTab === 'all' ? 'bg-primary-50 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>All</button>
                  <button onClick={() => setActiveTab('verified')} className={`px-4 py-2 rounded-lg ${activeTab === 'verified' ? 'bg-primary-50 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>Verified</button>
                  <button onClick={() => setActiveTab('pending')} className={`px-4 py-2 rounded-lg ${activeTab === 'pending' ? 'bg-primary-50 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>Pending</button>
                  <button onClick={() => setActiveTab('rejected')} className={`px-4 py-2 rounded-lg ${activeTab === 'rejected' ? 'bg-primary-50 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>Rejected</button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm appearance-none pr-10">
                    <option value="">Location</option>
                    <option value="mumbai">Mumbai</option>
                    <option value="delhi">Delhi</option>
                    <option value="bangalore">Bangalore</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
                <div className="relative flex-1">
                  <select value={languageFilter} onChange={(e) => setLanguageFilter(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm appearance-none pr-10">
                    <option value="">Language</option>
                    <option value="hindi">Hindi</option>
                    <option value="kannada">Kannada</option>
                    <option value="gujarati">Gujarati</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Language</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">View</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {mockEmployees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{employee.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{employee.location}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{employee.language}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{employee.phoneNumber}</td>
                      <td className="px-6 py-4">{getPaymentBadge(employee.paymentStatus)}</td>
                      <td className="px-6 py-4">{getStatusBadge(employee.documentStatus)}</td>
                      <td className="px-6 py-4">
                        <button onClick={() => handleViewEmployee(employee)} className="p-1 hover:bg-gray-100 rounded transition-colors">
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

      {selectedEmployee && (
        <EmployeeDetailModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          employee={selectedEmployee}
        />
      )}
    </div>
  )
}
