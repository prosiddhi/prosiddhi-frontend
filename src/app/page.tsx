'use client'

import { Header } from '@/components/home/Header'
import { HeroSection } from '@/components/home/HeroSection'
import { GetStartedSection } from '@/components/home/GetStartedSection'
import { Footer } from '@/components/home/Footer'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <GetStartedSection />
      </main>
      <Footer />
    </div>
  )
}
