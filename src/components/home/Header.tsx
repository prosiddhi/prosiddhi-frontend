'use client'

import { Search, Building2, Languages, UserPlus, LogIn } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export function Header() {
  return (
    <header className="bg-white shadow-[10px_10px_50px_0px_rgba(0,0,0,0.05)] h-[75px] fixed top-0 left-0 right-0 z-40">
      <div className="container mx-auto h-full px-8 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <div className="relative w-[142px] h-[39px]">
            <Image
              src="/assets/logo.png"
              alt="Job Portal Logo"
              fill
              className="object-contain"
            />
          </div>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-10">
          <Link 
            href="/employee"
            className="flex items-center gap-1 text-black text-[18px] hover:text-primary-50 transition-colors"
          >
            <Search className="w-4 h-4" />
            <span>Find Jobs</span>
          </Link>
          
          <Link 
            href="/employer"
            className="flex items-center gap-1 text-black text-[18px] hover:text-primary-50 transition-colors"
          >
            <Building2 className="w-4 h-4" />
            <span>Companies</span>
          </Link>
          
          <button className="flex items-center gap-1 text-black text-[18px] hover:text-primary-50 transition-colors">
            <Languages className="w-4 h-4" />
            <span>Languages: English</span>
          </button>
        </nav>

        {/* Auth Buttons */}
        <div className="flex items-center gap-5">
          <Link 
            href="/register"
            className="flex items-center gap-2 px-3 py-2 border border-secondary-70 rounded-lg text-base text-black hover:bg-secondary-10 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register</span>
          </Link>
          
          <Link 
            href="/login"
            className="flex items-center gap-2 px-3 py-2 bg-primary-50 rounded-lg text-base text-white hover:bg-primary-60 transition-colors"
          >
            <LogIn className="w-5 h-5" />
            <span>Login</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
