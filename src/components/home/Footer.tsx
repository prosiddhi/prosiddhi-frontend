'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Linkedin, Github, Instagram, Facebook } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-[#232323] text-white py-[47px]">
      <div className="max-w-[1920px] mx-auto px-6 sm:px-8 lg:px-12">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-12 lg:gap-8 mb-[73px]">
          {/* Logo and Social */}
          <div className="w-full lg:w-auto">
            <div className="relative w-[192px] h-[53px] mb-5">
              <Image
                src="/assets/footer_logo.png"
                alt="Job Portal Logo"
                fill
                className="object-contain"
              />
            </div>
            <div className="flex gap-[30px]">
              <a href="#" className="w-7 h-7 flex items-center justify-center hover:text-primary-50 transition-colors">
                <Linkedin className="w-7 h-7" />
              </a>
              <a href="#" className="w-7 h-7 flex items-center justify-center hover:text-primary-50 transition-colors">
                <Github className="w-7 h-7" />
              </a>
              <a href="#" className="w-7 h-7 flex items-center justify-center hover:text-primary-50 transition-colors">
                <Instagram className="w-7 h-7" />
              </a>
              <a href="#" className="w-7 h-7 flex items-center justify-center hover:text-primary-50 transition-colors">
                <Facebook className="w-7 h-7" />
              </a>
            </div>
          </div>

          {/* Footer Links */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 lg:gap-[132px] flex-1">
            <div>
              <h3 className="text-[18px] mb-4">For Candidates</h3>
              <ul className="space-y-2 text-sm text-[rgba(255,255,255,0.7)]">
                <li><Link href="/employee" className="hover:text-white transition-colors">Browse Jobs</Link></li>
                <li><Link href="/employee#categories" className="hover:text-white transition-colors">Browse Categories</Link></li>
                <li><Link href="/career-advice" className="hover:text-white transition-colors">Career Advice</Link></li>
                <li><Link href="/saved-jobs" className="hover:text-white transition-colors">Saved Jobs</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-[18px] mb-4">For Employers</h3>
              <ul className="space-y-2 text-sm text-[rgba(255,255,255,0.7)]">
                <li><Link href="/employer" className="hover:text-white transition-colors">Post a Job</Link></li>
                <li><Link href="/employer#candidates" className="hover:text-white transition-colors">Browse Candidates</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/employer-resources" className="hover:text-white transition-colors">Employer Resources</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-[18px] mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-[rgba(255,255,255,0.7)]">
                <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="/careers" className="hover:text-white transition-colors">Careers</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-[18px] mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-[rgba(255,255,255,0.7)]">
                <li><Link href="/help" className="hover:text-white transition-colors">Help Centre</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms and Conditions</Link></li>
                <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
              </ul>
            </div>
          </div>

          {/* Mobile App Download */}
          <div className="w-full lg:w-auto lg:max-w-[379px]">
            <h3 className="text-2xl sm:text-[32px] font-medium mb-6 leading-tight sm:leading-[38px]">
              Download our Mobile App platform
            </h3>
            <div className="flex gap-4">
              <a href="#" className="w-[140px] h-[43px] bg-black rounded-lg flex items-center justify-center border border-white/20 hover:bg-white/10 transition-colors">
                <span className="text-white text-sm">App Store</span>
              </a>
              <a href="#" className="w-[132px] h-[40px] bg-black rounded-lg flex items-center justify-center border border-white/20 hover:bg-white/10 transition-colors">
                <span className="text-white text-sm">Google Play</span>
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-[18px] text-center">
          <p className="text-sm sm:text-base text-white">
            © Azkashine Software Services Pvt. Ltd. 2025
          </p>
        </div>
      </div>
    </footer>
  )
}
