'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { User, Briefcase, Settings, LogOut } from 'lucide-react'

interface UserDropdownProps {
  userName?: string
  userImage?: string
}

export function UserDropdown({ 
  userName = 'Sanjay RK', 
  userImage = '' 
}: UserDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close dropdown on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleLogout = () => {
    // Add logout logic here
    console.log('Logging out...')
    // For now, just close the dropdown
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* User Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
      >
        <div className="w-8 h-8 sm:w-[38px] sm:h-[38px] rounded-full bg-primary-50 overflow-hidden flex items-center justify-center">
          {userImage ? (
            <Image
              src={userImage}
              alt="Profile"
              width={38}
              height={38}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-5 h-5 text-white" />
          )}
        </div>
        <span className="hidden sm:block text-sm lg:text-base">{userName}</span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <div 
            className="fixed inset-0 z-40 md:hidden" 
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Content */}
          <div className="absolute right-0 mt-2 w-[200px] bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 animate-fadeIn">
            {/* Profile */}
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <User className="w-4 h-4 text-gray-700" />
              <span className="text-sm text-gray-900">Profile</span>
            </Link>

            {/* My Application */}
            <Link
              href="/my-applications"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <Briefcase className="w-4 h-4 text-gray-700" />
              <span className="text-sm text-gray-900">My Application</span>
            </Link>

            {/* Setting */}
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-4 h-4 text-gray-700" />
              <span className="text-sm text-gray-900">Setting</span>
            </Link>

            {/* Divider */}
            <div className="h-px bg-gray-200 my-2" />

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors w-full text-left"
            >
              <LogOut className="w-4 h-4 text-gray-700" />
              <span className="text-sm text-gray-900">Logout</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
