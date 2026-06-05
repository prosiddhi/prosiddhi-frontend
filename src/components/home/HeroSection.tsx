'use client'

export function HeroSection() {
  return (
    <section className="pt-16 sm:pt-20 lg:pt-24 pb-4 sm:pb-6 lg:pb-8 px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto">
        {/* Badge */}
        <div className="flex justify-center mb-3 sm:mb-4">
          <div className="bg-white border border-[#f2f2f2] rounded-[20px] px-3 sm:px-4 py-1 sm:py-1.5 inline-flex items-center">
            <span className="text-xs text-primary-50 text-center">
              Work Opportunities for Everyone
            </span>
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight text-primary-100 text-center max-w-[940px] mx-auto mb-2 sm:mb-3 px-4">
          Find Jobs Near You — Easy and Fast
        </h1>

        {/* Subheading */}
        <p className="text-xs sm:text-sm lg:text-base text-[#818181] text-center px-4">
          Search and apply for jobs in your language. No degree needed, just your effort.
        </p>
      </div>
    </section>
  )
}
