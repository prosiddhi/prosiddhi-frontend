'use client'

import { Header } from '@/components/home/Header'
import { HeroSection } from '@/components/home/HeroSection'
import { LaunchBanner } from '@/components/home/LaunchRibbon'
import { GetStartedSection } from '@/components/home/GetStartedSection'
import { Footer } from '@/components/home/Footer'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />
      {/* One soft blue wash behind the hero and the role choice, so the opening
          screen is not plain white. The Figma landing sections (categories, how
          it works, …) live on /employee only. */}
      {/* Launch banner (LaunchRibbon.tsx) from md up.
          --lb-pad: space kept free on EACH side. Equal padding keeps the
            content centred; it only narrows the content on a tight screen
            (from ~1384px up the 1040px hero fits beside it untouched).
          --lb-m: the left space the banner is centred in — the reserve, or the
            real margin beside the 1040px hero when that is wider.
          --lb-w: the banner's width, 60px less than that space (140–240px). */}
      <main
        className="relative flex-1 bg-gradient-to-b from-primary-10 via-white to-white
          md:[--lb-pad:140px] md:[--lb-m:140px] md:[--lb-w:112px]
          lg:[--lb-pad:172px] lg:[--lb-m:max(172px,calc((100vw-1040px)/2))] lg:[--lb-w:clamp(140px,calc(var(--lb-m)-60px),240px)]
          md:px-[var(--lb-pad)]"
      >
        <LaunchBanner />
        <HeroSection />
        <GetStartedSection />
      </main>
      <Footer />
    </div>
  )
}
