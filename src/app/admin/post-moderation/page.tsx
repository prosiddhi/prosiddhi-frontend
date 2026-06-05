'use client'

import { useState } from 'react'
import { Search, Eye, CheckCircle, XCircle, Home, Users, Briefcase, FileText, LogOut, Mail, Bell } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

const mockPosts = [
  {
    id: '1',
    title: 'Senior React Developer',
    companyName: 'Tech Corp Solutions',
    postedDate: '2025-01-15',
    location: 'Mumbai',
    jobType: 'Full-time',
    salary: '₹15-20 LPA',
    status: 'PENDING',
  },
  {
    id: '2',
    title: 'Marketing Manager',
    companyName: 'Global Marketing Ltd',
    postedDate: '2025-01-14',
    location: 'Delhi',
    jobType: 'Full-time',
    salary: '₹10-15 LPA',
    status: 'APPROVED',
  },
  {
    id: '3',
    title: 'Data Analyst',
    companyName: 'Analytics Pro',
    postedDate: '2025-01-13',
    location: 'Bangalore',
    jobType: 'Contract',
    salary: '₹8-12 LPA',
    status: 'REJECTED',
  },
]

export default function AdminPostModerationPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSidebarItem, setActiveSidebarItem] = useState('post-moderation')

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#D4F4DD] text-[#4CAF50]">Approved</span>
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
          <Link href="/admin/employer" className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50">
            <Briefcase className="w-5 h-5" />
            <span className="text-sm font-medium">Employer</span>
          </Link>
          <Link href="/admin/post-moderation" className={`flex items-center gap-3 px-4 py-3 rounded-lg ${activeSidebarItem === 'post-moderation' ? 'bg-[#E3F5FF] text-[#0095FF]' : 'text-gray-700 hover:bg-gray-50'}`}>
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
                <input type="text" placeholder="Search job posts" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm" />
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
            <h1 className="text-[32px] font-bold text-gray-900 mb-1">Post Moderation</h1>
            <p className="text-gray-500 text-sm">Review and approve job postings</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200">
            <div className="border-b border-gray-200 p-6">
              <div className="flex items-center gap-2">
                <button onClick={() => setActiveTab('all')} className={`px-4 py-2 rounded-lg ${activeTab === 'all' ? 'bg-primary-50 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>All</button>
                <button onClick={() => setActiveTab('pending')} className={`px-4 py-2 rounded-lg ${activeTab === 'pending' ? 'bg-primary-50 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>Pending</button>
                <button onClick={() => setActiveTab('approved')} className={`px-4 py-2 rounded-lg ${activeTab === 'approved' ? 'bg-primary-50 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>Approved</button>
                <button onClick={() => setActiveTab('rejected')} className={`px-4 py-2 rounded-lg ${activeTab === 'rejected' ? 'bg-primary-50 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>Rejected</button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Posted Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Job Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salary</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {mockPosts.map((post) => (
                    <tr key={post.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{post.title}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{post.companyName}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{post.postedDate}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{post.location}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{post.jobType}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{post.salary}</td>
                      <td className="px-6 py-4">{getStatusBadge(post.status)}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button className="p-1.5 hover:bg-gray-100 rounded transition-colors" title="View Details">
                            <Eye className="w-4 h-4 text-gray-600" />
                          </button>
                          {post.status === 'PENDING' && (
                            <>
                              <button className="p-1.5 hover:bg-green-100 rounded transition-colors" title="Approve">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                              </button>
                              <button className="p-1.5 hover:bg-red-100 rounded transition-colors" title="Reject">
                                <XCircle className="w-4 h-4 text-red-600" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
