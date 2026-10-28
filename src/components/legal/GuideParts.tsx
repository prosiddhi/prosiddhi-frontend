import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { LegalSection } from '@/components/legal/LegalPage'

const linkClass = 'text-primary-90 underline'

/** An in-text link to another page of the site. */
export function HelpLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={linkClass}>
      {children}
    </Link>
  )
}

/** These help pages are written in English only for now (the language switcher stays in the header). */
export function EnglishOnlyNotice() {
  return (
    <p className="max-w-[900px] rounded-lg bg-gray-100 px-4 py-3 text-sm text-[#333]">
      This page is currently available in English only.
    </p>
  )
}

/** A short boxed pointer to the matching FAQ or guide. */
export function PageNote({ children }: { children: ReactNode }) {
  return (
    <p className="max-w-[900px] rounded-lg border border-gray-200 bg-white px-4 py-3 text-base text-[#333]">
      {children}
    </p>
  )
}

/** A bulleted list of plain strings. */
export function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-2 pl-5">
      {items.map(item => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

/**
 * Marks where a real screenshot will go. It is a labelled empty box on purpose, used only
 * for a screen that has not been captured: the page must not look as if one has.
 */
export function ScreenshotPlaceholder({ description }: { description: string }) {
  return (
    <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-[#555]">
      <p className="font-semibold">Screenshot to be added</p>
      <p>{description}</p>
    </div>
  )
}

/** A captured screenshot, served from public/guides/<guide>/. Width and height are the file's own size. */
export type GuideImage = {
  src: string
  alt: string
  width: number
  height: number
  caption?: string
}

/** One screenshot slot in a step: a captured image, or a text description of one still to be captured. */
export type GuideShot = string | GuideImage

/** Builds the entry for a file in public/guides/<guide>/. */
export function guideImage(
  guide: 'employer' | 'employee',
  file: string,
  size: readonly [number, number],
  alt: string,
  caption?: string
): GuideImage {
  return { src: `/guides/${guide}/${file}`, alt, width: size[0], height: size[1], caption }
}

/**
 * A real screenshot. The image scales down to the screen width, so on a phone small text can be hard
 * to read; it is a link to the full-size file so it can be opened and zoomed.
 */
export function ScreenshotImage({ image }: { image: GuideImage }) {
  return (
    <figure className="max-w-[900px] space-y-2">
      <a
        href={image.src}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open the full-size image: ${image.alt}`}
        className="block overflow-hidden rounded-lg border border-gray-300 bg-white"
      >
        <Image
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          unoptimized
          className="h-auto w-full"
        />
      </a>
      {image.caption && <figcaption className="text-sm text-[#555]">{image.caption}</figcaption>}
    </figure>
  )
}

export type GuideStepData = {
  title: string
  body: ReactNode
  /** Captured screenshots, or a description for each one still to be captured. */
  screenshots: GuideShot[]
}

/** The numbered steps of a user guide, each followed by its screenshots (or placeholders). */
export function GuideSteps({ steps }: { steps: GuideStepData[] }) {
  return (
    <>
      {steps.map((step, i) => (
        <LegalSection key={step.title} title={`Step ${i + 1}: ${step.title}`}>
          {step.body}
          {step.screenshots.map(shot =>
            typeof shot === 'string' ? (
              <ScreenshotPlaceholder key={shot} description={shot} />
            ) : (
              <ScreenshotImage key={shot.src} image={shot} />
            )
          )}
        </LegalSection>
      ))}
    </>
  )
}
