'use client'

import { Header } from '@/components/home/Header'
import { HeroSection } from '@/components/home/HeroSection'
import { LanguageSection } from '@/components/home/LanguageSection'
import { Footer } from '@/components/home/Footer'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <LanguageSection />
      </main>
      <Footer />
    </div>
  )
}
