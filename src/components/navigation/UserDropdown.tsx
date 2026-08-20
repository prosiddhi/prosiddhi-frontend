'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { User, Briefcase, Settings, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { resolveMediaUrl } from '@/lib/api'
import { displayName, profilePhoto } from '@/lib/userDisplay'

/**
 * UserDropdown — the account menu in the global header on every authed screen.
 *
 * Identity comes from `useAuth()` alone. This component takes NO props: it used
 * to accept `userName`/`userImage` with a hardcoded default that every one of
 * its 22 call sites fell through to, so every logged-in user saw the same fake
 * name. Removing the props removes the only way that can happen again.
 *
 * The menu is role-aware — the middle item points an employer at their jobs and
 * a seeker at their applications, rather than sending everyone to the
 * seeker-only /my-applications screen.
 */
export function UserDropdown() {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { user, logout } = useAuth()

  const isEmployer = !!user?.role?.startsWith('EMPLOYER')
  const name = displayName(user)
  const photo = resolveMediaUrl(profilePhoto(user))

  // Employers get the company-profile screen; everyone else the seeker profile.
  const profileHref = isEmployer ? '/employer/profile' : '/profile'
  const workHref = isEmployer ? '/employer/jobs' : '/my-applications'
  const workLabel = isEmployer ? t('nav.myJobs') : t('nav.myApplications')

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
    setIsOpen(false)
    // Clears the token + user from storage/state and redirects to /login.
    logout()
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* User Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={t('nav.accountMenu')}
        // 44px target around a 32-38px avatar (TD-20).
        className="flex items-center justify-center gap-2 min-w-[44px] min-h-[44px] hover:opacity-80 transition-opacity"
      >
        <div className="w-8 h-8 sm:w-[38px] sm:h-[38px] rounded-full bg-primary-50 overflow-hidden flex items-center justify-center">
          {photo ? (
            <Image
              src={photo}
              alt=""
              width={38}
              height={38}
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-5 h-5 text-white" />
          )}
        </div>
        {name && <span className="hidden sm:block text-sm lg:text-base">{name}</span>}
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
          <div
            role="menu"
            className="absolute right-0 mt-2 w-[200px] bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 animate-fadeIn"
          >
            {/* Profile */}
            <Link
              href={profileHref}
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <User className="w-4 h-4 text-gray-700" />
              <span className="text-sm text-gray-900">{t('nav.profile')}</span>
            </Link>

            {/* My Jobs (employer) / My Applications (seeker) */}
            <Link
              href={workHref}
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <Briefcase className="w-4 h-4 text-gray-700" />
              <span className="text-sm text-gray-900">{workLabel}</span>
            </Link>

            {/* Settings */}
            <Link
              href="/settings"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-4 h-4 text-gray-700" />
              <span className="text-sm text-gray-900">{t('nav.settings')}</span>
            </Link>

            {/* Divider */}
            <div className="h-px bg-gray-200 my-2" />

            {/* Logout */}
            <button
              onClick={handleLogout}
              role="menuitem"
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors w-full text-left"
            >
              <LogOut className="w-4 h-4 text-gray-700" />
              <span className="text-sm text-gray-900">{t('nav.logout')}</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
