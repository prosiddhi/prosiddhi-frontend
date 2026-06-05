'use client'

import { useState } from 'react'
import { Search, Home, Users, Briefcase, FileText, LogOut, Mail, Bell, TrendingUp, FileCheck } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export default function AdminDashboardPage() {
  const [activeSidebarItem] = useState('dashboard')

  const stats = [
    { title: 'Total Employees', value: '23', change: '+12%', icon: Users, color: 'bg-blue-100 text-blue-600' },
    { title: 'Total Employers', value: '15', change: '+8%', icon: Briefcase, color: 'bg-green-100 text-green-600' },
    { title: 'Pending Verifications', value: '10', change: '-5%', icon: FileCheck, color: 'bg-yellow-100 text-yellow-600' },
    { title: 'Active Job Posts', value: '42', change: '+15%', icon: TrendingUp, color: 'bg-purple-100 text-purple-600' },
  ]

  return (
    <div className="flex h-screen bg-[#F8FAFB]">
      <aside className="w-[195px] bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="relative w-[142px] h-[39px]">
            <Image src="/assets/logo.png" alt="Logo" fill className="object-contain" priority />
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <Link href="/admin/dashboard" className={`flex items-center gap-3 px-4 py-3 rounded-lg ${activeSidebarItem === 'dashboard' ? 'bg-[#E3F5FF] text-[#0095FF]' : 'text-gray-700 hover:bg-gray-50'}`}>
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
                <input type="text" placeholder="Search" className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm" />
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
          <div className="mb-8">
            <h1 className="text-[32px] font-bold text-gray-900 mb-1">Dashboard</h1>
            <p className="text-gray-500 text-sm">Welcome to your admin dashboard</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium text-green-600">{stat.change}</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
                <p className="text-sm text-gray-600">{stat.title}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Link href="/admin/employee" className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <Users className="w-10 h-10 text-primary-50 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Employees</h3>
              <p className="text-sm text-gray-600">View and manage employee documents and payments</p>
            </Link>
            <Link href="/admin/employer" className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <Briefcase className="w-10 h-10 text-primary-50 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Employers</h3>
              <p className="text-sm text-gray-600">Oversee employer accounts and activities</p>
            </Link>
            <Link href="/admin/post-moderation" className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow">
              <FileText className="w-10 h-10 text-primary-50 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Moderate Posts</h3>
              <p className="text-sm text-gray-600">Review and approve job postings</p>
            </Link>
          </div>
        </main>
      </div>
    </div>
  )
}
