'use client'

import { Header } from '@/components/home/Header'
import { HeroSection } from '@/components/home/HeroSection'
import { GetStartedSection } from '@/components/home/GetStartedSection'
import { Footer } from '@/components/home/Footer'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      {/* One soft blue wash behind the hero and the role choice, so the opening
          screen is not plain white. The Figma landing sections (categories, how
          it works, …) live on /employee only. */}
      <main className="flex-1 bg-gradient-to-b from-primary-10 via-white to-white">
        <HeroSection />
        <GetStartedSection />
      </main>
      <Footer />
    </div>
  )
}
