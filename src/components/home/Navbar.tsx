'use client'

import { Home, Briefcase, Bookmark, Languages, Mail, Bell } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

interface NavbarProps {
  userName?: string
  userAvatar?: string
  currentLanguage?: string
  onLanguageClick?: () => void
  unreadMessages?: number
  unreadNotifications?: number
}

export function Navbar({
  userName = 'Sanjay RK',
  userAvatar = '/assets/default-avatar.png',
  currentLanguage = 'English',
  onLanguageClick,
  unreadMessages = 0,
  unreadNotifications = 0,
}: NavbarProps) {
  return (
    <nav className="bg-white w-full">
      <div className="max-w-[1920px] mx-auto px-[119px] py-[18px] flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex-shrink-0">
          <div className="relative w-[142px] h-[39px]">
            <Image
              src="/assets/logo.png"
              alt="AZKASHINE Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-11">
          <Link
            href="/"
            className="flex items-center gap-1 text-black text-[18px] hover:text-primary-50 transition-colors"
          >
            <Home className="w-[18px] h-[18px]" strokeWidth={1.5} />
            <span>Home</span>
          </Link>

          <Link
            href="/jobs"
            className="flex items-center gap-1 text-black text-[18px] hover:text-primary-50 transition-colors"
          >
            <Briefcase className="w-[18px] h-[18px]" strokeWidth={1.5} />
            <span>Job Feed</span>
          </Link>

          <Link
            href="/saved-jobs"
            className="flex items-center gap-1 text-black text-[18px] hover:text-primary-50 transition-colors"
          >
            <Bookmark className="w-[18px] h-[18px]" strokeWidth={1.5} />
            <span>Saved Jobs</span>
          </Link>

          <button
            onClick={onLanguageClick}
            className="flex items-center gap-1 text-black text-[18px] hover:text-primary-50 transition-colors"
          >
            <Languages className="w-4 h-4" strokeWidth={1.5} />
            <span>Languages: {currentLanguage}</span>
          </button>
        </div>

        {/* Right Section - Icons and Profile */}
        <div className="flex items-center gap-8">
          {/* Mail Icon */}
          <button
            className="relative hover:opacity-70 transition-opacity"
            aria-label="Messages"
          >
            <Mail className="w-6 h-6 text-black" strokeWidth={1.5} />
            {unreadMessages > 0 && (
              <span className="absolute -top-1 -right-1 bg-error-500 text-white text-[10px] font-semibold rounded-full w-4 h-4 flex items-center justify-center">
                {unreadMessages > 9 ? '9+' : unreadMessages}
              </span>
            )}
          </button>

          {/* Notification Icon */}
          <button
            className="relative hover:opacity-70 transition-opacity"
            aria-label="Notifications"
          >
            <Bell className="w-6 h-6 text-black" strokeWidth={1.5} />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 bg-error-500 text-white text-[10px] font-semibold rounded-full w-4 h-4 flex items-center justify-center">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </button>

          {/* User Profile */}
          <Link
            href="/profile"
            className="flex items-center gap-2 hover:opacity-70 transition-opacity"
          >
            <div className="relative w-[38px] h-[38px] rounded-full overflow-hidden bg-gray-200">
              <Image
                src={userAvatar}
                alt={userName}
                fill
                className="object-cover"
              />
            </div>
            <span className="text-base text-black font-normal">{userName}</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}
